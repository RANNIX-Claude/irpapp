// Aplica supabase/qa-bootstrap/storage-buckets-qa.sql (crea buckets + políticas
// RLS de storage.objects) contra el ambiente indicado. Idempotente: se puede
// correr las veces que haga falta sin duplicar nada.
//
//   node scripts/aplicar-storage-buckets.mjs qa      # wijcjdbmdbxzmwpdxoal
//   node scripts/aplicar-storage-buckets.mjs prod    # kusuoxwzdxfuybvyiakg
//
// Nació del hallazgo del 2026-09-18: el proceso de clonar QA desde producción
// (dump-schema.mjs + apply-schema-qa.mjs) reconstruye tablas, vistas y
// funciones, pero NO los buckets de Storage ni sus políticas — storage.buckets
// no es esquema (DDL), es datos, y pg_catalog no lo captura. QA se quedó con
// solo 2 de los 13 buckets de producción y sin darse cuenta hasta que un
// upload real falló con "Bucket not found".
//
// Para un proyecto nuevo (Petra u otro fork): copiar
// supabase/qa-bootstrap/storage-buckets-qa.sql, ajustar el connection string
// de este runner (o pasar host/password por variables de entorno) y correrlo
// contra esa base — la lista de buckets y políticas es la misma
// independientemente de qué datos tenga cada tabla.
import fs from "fs";
import path from "path";
import pg from "pg";

const which = process.argv[2] || "qa";
const ROOT = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const env = { ...process.env };
try {
  for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* CI */ }

const cfg = which === "qa"
  ? { host: "db.wijcjdbmdbxzmwpdxoal.supabase.co", user: "postgres", password: env.QA_SUPABASE_DB_PASSWORD }
  : { host: "aws-1-us-west-2.pooler.supabase.com", user: "postgres.kusuoxwzdxfuybvyiakg", password: env.SUPABASE_DB_PASSWORD };
if (!cfg.password) { console.error(`Falta la contraseña de BD para ${which}`); process.exit(2); }

const sql = fs.readFileSync(path.join(ROOT, "supabase/qa-bootstrap/storage-buckets-qa.sql"), "utf8");

const c = new pg.Client({ host: cfg.host, port: 5432, user: cfg.user, password: cfg.password, database: "postgres", ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  await c.query("begin");
  await c.query(sql);
  await c.query("commit");
  const { rows } = await c.query("select id, public from storage.buckets order by id");
  console.log(`Buckets en ${which} tras aplicar:`);
  console.table(rows);
} catch (e) {
  await c.query("rollback").catch(() => {});
  console.error("ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
