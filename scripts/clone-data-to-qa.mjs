// Copies real data from production's `prp` + `public` tables into a FRESH,
// empty QA schema (no truncation — assumes QA was just bootstrapped from
// scripts/dump-schema.mjs + apply-schema-qa.mjs). Base tables only (views are
// recomputed from them). Uses session_replication_role = replica on the QA
// side so FK/trigger ordering doesn't matter during load.
import fs from "fs";
import pg from "pg";

const envText = fs.readFileSync("C:\\Users\\asus\\OneDrive\\work\\IRPAPP\\DEv\\.env.local", "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const SCHEMAS = ["prp", "public"];

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

const tables = await prod.query(
  `select n.nspname as schema, c.relname as tbl
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where c.relkind = 'r' and n.nspname = any($1)
   order by n.nspname, c.relname`,
  [SCHEMAS]
);

await qa.query("SET session_replication_role = replica;");

let totalRows = 0;
for (const { schema, tbl } of tables.rows) {
  const fq = `"${schema}"."${tbl}"`;
  const countRes = await prod.query(`select count(*)::int as c from ${fq}`);
  const rowCount = countRes.rows[0].c;
  if (rowCount === 0) {
    console.log(`${fq}: 0 rows, skipped`);
    continue;
  }

  const genColsRes = await prod.query(
    `select attname from pg_attribute
     where attrelid = ('"' || $1 || '"."' || $2 || '"')::regclass
       and attgenerated <> '' and attnum > 0 and not attisdropped`,
    [schema, tbl]
  );
  const generatedCols = new Set(genColsRes.rows.map((r) => r.attname));

  // Stream via cursor-free simple SELECT * (tables here are small enough for this app).
  const data = await prod.query(`select * from ${fq}`);
  if (data.rows.length === 0) continue;

  const cols = Object.keys(data.rows[0]).filter((c) => !generatedCols.has(c));
  const colList = cols.map((c) => `"${c}"`).join(", ");

  const CHUNK = 500;
  for (let i = 0; i < data.rows.length; i += CHUNK) {
    const chunk = data.rows.slice(i, i + CHUNK);
    const values = [];
    const placeholders = chunk.map((row, ri) => {
      const base = ri * cols.length;
      values.push(...cols.map((c) => row[c]));
      return `(${cols.map((_, ci) => `$${base + ci + 1}`).join(", ")})`;
    });
    await qa.query(`INSERT INTO ${fq} (${colList}) VALUES ${placeholders.join(", ")}`, values);
  }

  console.log(`${fq}: ${data.rows.length} rows copied`);
  totalRows += data.rows.length;
}

// Resync sequences to max(id)+1 for tables with integer/bigint identity or serial PKs.
const seqs = await qa.query(
  `select n.nspname as schema, t.relname as tbl, a.attname as col, s.relname as seq
   from pg_class s
   join pg_depend d on d.objid = s.oid and d.deptype = 'a'
   join pg_class t on t.oid = d.refobjid
   join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
   join pg_namespace n on n.oid = s.relnamespace
   where s.relkind = 'S' and n.nspname = any($1)`,
  [SCHEMAS]
);
for (const s of seqs.rows) {
  const fq = `"${s.schema}"."${s.tbl}"`;
  await qa.query(
    `select setval('"${s.schema}"."${s.seq}"', coalesce((select max("${s.col}") from ${fq}), 1), true)`
  );
}

await qa.query("SET session_replication_role = DEFAULT;");

console.log(`\nDone. Total rows copied: ${totalRows}`);
await prod.end();
await qa.end();
