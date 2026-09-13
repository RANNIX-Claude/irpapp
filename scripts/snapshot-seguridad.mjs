// Respaldo de los objetos de seguridad que tocan las migraciones RLS, con SQL de reversión.
//
//   node scripts/snapshot-seguridad.mjs prod     # antes de migrar producción
//   node scripts/snapshot-seguridad.mjs qa
//
// Solo lectura (default_transaction_read_only = on). Escribe en supabase/backups/:
//   seguridad-<env>-<fecha>.json      políticas, grants, funciones, vistas, storage, buckets
//   rollback-seguridad-<env>-<fecha>.sql   recrea políticas y grants tal como estaban
// e imprime la lista de verificación manual de storage con el estado actual.
import fs from "fs";
import path from "path";
import pg from "pg";

const which = process.argv[2] || "prod";
const ROOT = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const env = { ...process.env };
try { for (const l of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n")) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); } } catch {}
const cfg = which === "qa"
  ? { host: "db.wijcjdbmdbxzmwpdxoal.supabase.co", user: "postgres", password: env.QA_SUPABASE_DB_PASSWORD }
  : { host: "aws-1-us-west-2.pooler.supabase.com", user: "postgres.kusuoxwzdxfuybvyiakg", password: env.SUPABASE_DB_PASSWORD };
if (!cfg.password) { console.error(`Falta la contraseña de BD para ${which}`); process.exit(2); }

const c = new pg.Client({ ...cfg, port: 5432, database: "postgres", ssl: { rejectUnauthorized: false } });
await c.connect(); await c.query("set default_transaction_read_only = on");
const q = async (s) => (await c.query(s)).rows;

const snap = {
  fecha: new Date().toISOString(), ambiente: which,
  policies: await q(`select schemaname, tablename, policyname, permissive, roles::text as roles, cmd, qual, with_check from pg_policies where schemaname in ('public','prp','storage') order by 1,2,3`),
  rls: await q(`select n.nspname schema, c.relname tabla, c.relrowsecurity rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in ('public','prp') order by 1,2`),
  table_grants: await q(`select table_schema, table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) privs from information_schema.role_table_grants where table_schema in ('public','prp') and grantee in ('anon','authenticated','service_role') group by 1,2,3 order by 1,2,3`),
  schema_acl: await q(`select nspname, nspacl::text from pg_namespace where nspname in ('public','prp')`),
  functions: await q(`select n.nspname schema, p.proname, pg_get_function_identity_arguments(p.oid) args, p.prosecdef secdef, p.proacl::text acl, pg_get_functiondef(p.oid) def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','prp') and p.prokind='f' order by 1,2`),
  views: await q(`select c.relname vista, c.reloptions::text opts from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v' order by 1`),
  default_acl: await q(`select pg_get_userbyid(defaclrole) rol, n.nspname schema, defaclobjtype tipo, defaclacl::text acl from pg_default_acl d join pg_namespace n on n.oid=d.defaclnamespace`),
  buckets: await q(`select id, public, file_size_limit, allowed_mime_types from storage.buckets order by 1`),
  objetos_por_bucket: await q(`select bucket_id, count(*)::int n from storage.objects group by 1 order by 1`),
};
await c.end();

// ── SQL de reversión: políticas y grants exactamente como están ahora ──
const esc = (s) => s.replace(/"/g, '""');
const rb = [`-- Reversión de seguridad — ${which} — foto tomada ${snap.fecha}`, `-- Recrea políticas RLS y grants de tablas tal como estaban antes de las migraciones 20260913*.`, `-- Las funciones y opciones de vista están en el JSON (campo functions[].def y views[].opts).`, `BEGIN;`, ``];
const byTable = {};
for (const p of snap.policies) (byTable[`${p.schemaname}.${p.tablename}`] ??= []).push(p);
for (const [tbl, pols] of Object.entries(byTable)) {
  const [sch, tab] = tbl.split(".");
  rb.push(`-- ${tbl}`);
  rb.push(`DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='${sch}' AND tablename='${tab}' LOOP EXECUTE format('DROP POLICY %I ON ${sch}.${tab}', p.policyname); END LOOP; END $$;`);
  for (const p of pols) {
    const roles = p.roles.replace(/[{}]/g, "").split(",").map(r => r.trim()).join(", ");
    rb.push(`CREATE POLICY "${esc(p.policyname)}" ON ${sch}.${tab} AS ${p.permissive} FOR ${p.cmd} TO ${roles}${p.qual ? ` USING (${p.qual})` : ""}${p.with_check ? ` WITH CHECK (${p.with_check})` : ""};`);
  }
}
rb.push(``, `-- RLS por tabla`);
for (const t of snap.rls) rb.push(`ALTER TABLE ${t.schema}.${t.tabla} ${t.rls ? "ENABLE" : "DISABLE"} ROW LEVEL SECURITY;`);
rb.push(``, `-- Grants de tabla (se revocan y reponen)`);
for (const s of ["public", "prp"]) for (const r of ["anon", "authenticated", "service_role"]) rb.push(`REVOKE ALL ON ALL TABLES IN SCHEMA ${s} FROM ${r};`);
for (const g of snap.table_grants) rb.push(`GRANT ${g.privs} ON ${g.table_schema}.${g.table_name} TO ${g.grantee};`);
rb.push(``, `-- Opciones de vista`);
for (const v of snap.views) rb.push(v.opts?.includes("security_invoker=true") ? `ALTER VIEW public.${v.vista} SET (security_invoker = true);` : `ALTER VIEW public.${v.vista} RESET (security_invoker);`);
rb.push(``, `-- Buckets`);
for (const b of snap.buckets) rb.push(`UPDATE storage.buckets SET public = ${b.public} WHERE id = '${b.id}';`);
rb.push(``, `NOTIFY pgrst, 'reload schema';`, `COMMIT;`);

const dir = path.join(ROOT, "supabase", "backups"); fs.mkdirSync(dir, { recursive: true });
const stamp = snap.fecha.slice(0, 19).replace(/[:T]/g, "-");
const j = path.join(dir, `seguridad-${which}-${stamp}.json`), s = path.join(dir, `rollback-seguridad-${which}-${stamp}.sql`);
fs.writeFileSync(j, JSON.stringify(snap, null, 1)); fs.writeFileSync(s, rb.join("\n"));

console.log(`[${which}] respaldo: ${path.relative(ROOT, j)} (${snap.policies.length} políticas, ${snap.table_grants.length} grants, ${snap.functions.length} funciones, ${snap.views.length} vistas)`);
console.log(`[${which}] reversión: ${path.relative(ROOT, s)}`);

// ── Lista de verificación manual de storage ──
const pubRead = snap.policies.filter(p => p.schemaname === "storage" && p.cmd === "SELECT" && /public|anon/.test(p.roles));
const anonIns = snap.policies.filter(p => p.schemaname === "storage" && p.cmd === "INSERT" && /anon/.test(p.roles));
const nObj = Object.fromEntries(snap.objetos_por_bucket.map(o => [o.bucket_id, o.n]));
console.log(`\n[${which}] STORAGE — estado actual para verificación manual (Supabase → Storage)`);
console.log(`  ${"bucket".padEnd(24)} ${"public".padEnd(7)} ${"objetos".padEnd(8)} lectura pública/anon por política`);
for (const b of snap.buckets) {
  const pr = pubRead.filter(p => (p.qual || "").includes(`'${b.id}'`)).map(p => p.policyname);
  console.log(`  ${b.id.padEnd(24)} ${String(b.public).padEnd(7)} ${String(nObj[b.id] ?? 0).padEnd(8)} ${pr.length ? pr.join(", ") : "-"}`);
}
console.log(`\n  Políticas INSERT para anon: ${anonIns.map(p => `${p.policyname} [${(p.with_check || "").replace(/\s+/g, " ").slice(0, 90)}]`).join(" | ") || "ninguna"}`);
console.log(`\n  Qué revisar a mano después de migrar producción:`);
console.log(`   1. Que solo avatars, catalogos y logos-arrendatarios sigan con public = true.`);
console.log(`   2. Abrir un expediente de empleado (RH → empleado → documentos) y un contrato firmado: deben abrir por URL firmada.`);
console.log(`   3. Portal de prospecto con un token vigente: subir un documento a prospectos/<persona>/ debe funcionar.`);
console.log(`   4. Logo de arrendatario en Contratos y foto de empleado en RH: deben pintarse (buckets públicos a propósito).`);
console.log(`   5. Si contratos-docs tiene objetos (${nObj["contratos-docs"] ?? 0} hoy), confirmar que nada los pinta por URL pública antes de dejarlo privado.`);
