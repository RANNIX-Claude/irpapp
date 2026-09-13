// Grants the standard Supabase API roles (anon, authenticated, service_role)
// access to the `public` schema in QA — these grants are provisioned
// automatically by Supabase for new projects and are NOT part of a
// pg_catalog schema/data dump, so a from-scratch schema rebuild misses them.
// Root cause found 2026-09-12: PostgREST returned "permission denied for
// schema public" (42501) in QA because these grants never existed there.
import fs from "fs";
import pg from "pg";

const envText = fs.readFileSync("C:\\Users\\asus\\OneDrive\\work\\IRPAPP\\DEv\\.env.local", "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const qa = new pg.Client({
  host: "db.wijcjdbmdbxzmwpdxoal.supabase.co",
  port: 5432,
  user: "postgres",
  password: env.QA_SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await qa.connect();

const roles = ["anon", "authenticated", "service_role"];
for (const role of roles) {
  await qa.query(`GRANT USAGE ON SCHEMA public TO ${role};`);
  await qa.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public TO ${role};`);
  await qa.query(`GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${role};`);
  await qa.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${role};`);
  await qa.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO ${role};`);
  await qa.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${role};`);
  await qa.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO ${role};`);
  console.log(`Granted public schema access to ${role}`);
}

await qa.query(`NOTIFY pgrst, 'reload schema';`);
console.log("Sent PostgREST schema reload signal.");
await qa.end();
