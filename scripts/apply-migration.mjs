// Aplica un archivo de supabase/migrations a QA o producción y corre las pruebas RLS después.
//
//   node scripts/apply-migration.mjs qa   supabase/migrations/20260913100000_cierre_rls_auditoria_tenant.sql
//   node scripts/apply-migration.mjs prod supabase/migrations/20260913100000_cierre_rls_auditoria_tenant.sql
//   node scripts/apply-migration.mjs qa   <archivo> --sin-pruebas
//
// El archivo debe traer su propio BEGIN/COMMIT; si falla, Postgres deshace todo.
// Credenciales: .env.local (SUPABASE_DB_PASSWORD / QA_SUPABASE_DB_PASSWORD) o variables de entorno.
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import pg from "pg";

const [which, file] = process.argv.slice(2);
if (!["qa", "prod"].includes(which) || !file) { console.error("uso: node scripts/apply-migration.mjs qa|prod <archivo.sql> [--sin-pruebas]"); process.exit(2); }

const env = { ...process.env };
try {
  for (const line of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* CI */ }

const cfg = which === "qa"
  ? { host: "db.wijcjdbmdbxzmwpdxoal.supabase.co", user: "postgres", password: env.QA_SUPABASE_DB_PASSWORD }
  : { host: "aws-1-us-west-2.pooler.supabase.com", user: "postgres.kusuoxwzdxfuybvyiakg", password: env.SUPABASE_DB_PASSWORD };
if (!cfg.password) { console.error(`Falta la contraseña de BD para ${which}`); process.exit(2); }

const sql = fs.readFileSync(file, "utf8");
const c = new pg.Client({ ...cfg, port: 5432, database: "postgres", ssl: { rejectUnauthorized: false } });
await c.connect();
console.log(`[${which}] aplicando ${path.basename(file)} …`);
try {
  await c.query(sql);
  console.log(`[${which}] OK`);
} catch (e) {
  await c.query("ROLLBACK").catch(() => {});
  console.error(`[${which}] ERROR: ${e.message}${e.position ? ` (posición ${e.position})` : ""}`);
  if (e.position) { const p = Number(e.position); console.error("…" + sql.slice(Math.max(0, p - 200), p + 100) + "…"); }
  await c.end();
  process.exit(1);
}
await c.end();

if (!process.argv.includes("--sin-pruebas")) {
  console.log(`\n[${which}] corriendo pruebas RLS…`);
  const r = spawnSync(process.execPath, [new URL("./test-rls.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), which], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}
