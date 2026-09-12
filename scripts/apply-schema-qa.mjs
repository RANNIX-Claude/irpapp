// Applies supabase/qa-bootstrap/schema.sql to the QA database.
import fs from "fs";
import pg from "pg";

const envText = fs.readFileSync("C:\\Users\\asus\\OneDrive\\work\\IRPAPP\\DEv\\.env.local", "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const client = new pg.Client({
  host: "db.wijcjdbmdbxzmwpdxoal.supabase.co",
  port: 5432,
  user: "postgres",
  password: env.QA_SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

const sql = fs.readFileSync("supabase/qa-bootstrap/schema.sql", "utf8");

await client.connect();
try {
  await client.query(sql);
  console.log("Schema applied successfully to QA.");
} catch (e) {
  console.error("ERROR applying schema:", e.message);
  if (e.position) {
    const pos = Number(e.position);
    console.error("Context:", sql.slice(Math.max(0, pos - 200), pos + 200));
  }
  process.exitCode = 1;
} finally {
  await client.end();
}
