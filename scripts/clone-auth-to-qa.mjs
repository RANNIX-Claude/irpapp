// Copies Supabase Auth users (auth.users + auth.identities) from production to QA,
// preserving ids so existing public/prp rows (auth_user_id FKs) keep resolving,
// and preserving password hashes so people can log into QA with their prod credentials.
// auth schema/tables already exist in QA (Supabase-managed) — data only, no DDL.
import fs from "fs";
import pg from "pg";

const envText = fs.readFileSync("C:\\Users\\asus\\OneDrive\\work\\IRPAPP\\DEv\\.env.local", "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const prod = new pg.Client({
  host: "aws-1-us-west-2.pooler.supabase.com",
  port: 5432,
  user: "postgres.kusuoxwzdxfuybvyiakg",
  password: env.SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
const qa = new pg.Client({
  host: "db.wijcjdbmdbxzmwpdxoal.supabase.co",
  port: 5432,
  user: "postgres",
  password: env.QA_SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

await prod.connect();
await qa.connect();

async function cloneTable(schema, tbl) {
  const fq = `"${schema}"."${tbl}"`;
  const genColsRes = await prod.query(
    `select attname from pg_attribute
     where attrelid = ('"' || $1 || '"."' || $2 || '"')::regclass
       and attgenerated <> '' and attnum > 0 and not attisdropped`,
    [schema, tbl]
  );
  const generatedCols = new Set(genColsRes.rows.map((r) => r.attname));

  const data = await prod.query(`select * from ${fq}`);
  if (data.rows.length === 0) {
    console.log(`${fq}: 0 rows, skipped`);
    return;
  }

  const cols = Object.keys(data.rows[0]).filter((c) => !generatedCols.has(c));
  const colList = cols.map((c) => `"${c}"`).join(", ");

  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < data.rows.length; i += CHUNK) {
    const chunk = data.rows.slice(i, i + CHUNK);
    const values = [];
    const placeholders = chunk.map((row, ri) => {
      const base = ri * cols.length;
      values.push(...cols.map((c) => row[c]));
      return `(${cols.map((_, ci) => `$${base + ci + 1}`).join(", ")})`;
    });
    await qa.query(
      `INSERT INTO ${fq} (${colList}) VALUES ${placeholders.join(", ")} ON CONFLICT (id) DO NOTHING`,
      values
    );
    inserted += chunk.length;
  }
  console.log(`${fq}: ${inserted} rows copied`);
}

await qa.query("SET session_replication_role = replica;");
await cloneTable("auth", "users");
await cloneTable("auth", "identities");
await qa.query("SET session_replication_role = DEFAULT;");

await prod.end();
await qa.end();
console.log("\nDone.");
