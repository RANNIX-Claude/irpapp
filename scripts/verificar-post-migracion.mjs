// Verificación post-migración 20260913100000 (cierre RLS). Solo reporta, no corrige.
//
//   node scripts/verificar-post-migracion.mjs qa      # wijcjdbmdbxzmwpdxoal
//   node scripts/verificar-post-migracion.mjs prod    # kusuoxwzdxfuybvyiakg
//
// Credenciales: .env.local o variables de entorno (QA_SUPABASE_DB_PASSWORD / SUPABASE_DB_PASSWORD,
// QA_SUPABASE_URL / VITE_SUPABASE_URL, QA_SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY). Si falta la
// clave anon, se extrae del bundle publicado del sitio (es pública por diseño).
//
// Las sesiones por rol se simulan con SET LOCAL ROLE + claims JWT del usuario real de cada rol
// (irp_usuarios), que es exactamente lo que evalúa RLS en una petición REST. Toda escritura
// termina en ROLLBACK. Los totales "previos" se calculan como postgres (BYPASSRLS) en la misma
// corrida: son la verdad de la tabla, independiente de la migración.
//
// Salida: tabla bloque | prueba | esperado | obtenido | ✓/✗ en consola, y copia en
// docs/verificacion-rls-<env>-<fecha>.md con diagnóstico y SQL propuesto para cada ✗.
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
  ? { ref: "wijcjdbmdbxzmwpdxoal", host: "db.wijcjdbmdbxzmwpdxoal.supabase.co", user: "postgres", password: env.QA_SUPABASE_DB_PASSWORD, url: env.QA_SUPABASE_URL || "https://wijcjdbmdbxzmwpdxoal.supabase.co", anon: env.QA_SUPABASE_ANON_KEY, site: "https://irpapp-qa.netlify.app" }
  : { ref: "kusuoxwzdxfuybvyiakg", host: "aws-1-us-west-2.pooler.supabase.com", user: "postgres.kusuoxwzdxfuybvyiakg", password: env.SUPABASE_DB_PASSWORD, url: env.VITE_SUPABASE_URL, anon: env.VITE_SUPABASE_ANON_KEY, site: "https://irpapp.netlify.app" };
if (!cfg.password) { console.error(`Falta la contraseña de BD para ${which}`); process.exit(2); }

// ───────────────────────── infraestructura de reporte ─────────────────────────
const R = [];
const add = (bloque, prueba, esperado, obtenido, ok, diag) => R.push({ bloque, prueba, esperado, obtenido: String(obtenido), ok, diag: ok ? null : diag });
const c = new pg.Client({ host: cfg.host, port: 5432, user: cfg.user, password: cfg.password, database: "postgres", ssl: { rejectUnauthorized: false } });
await c.connect();
const q = async (sql, params) => (await c.query(sql, params)).rows;
const one = async (sql, params) => Object.values((await q(sql, params))[0] ?? {})[0];

// Ejecuta fn dentro de una transacción como rol/usuario; siempre ROLLBACK.
async function as(role, uid, fn) {
  await c.query("BEGIN");
  try {
    await c.query(`SET LOCAL ROLE ${role}`);
    if (uid) await c.query(`SELECT set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claims',$2,true)`, [uid, JSON.stringify({ sub: uid, role })]);
    await fn(async (sql) => {           // devuelve valor escalar, "N filas" o "ERR <code>"
      await c.query("SAVEPOINT s");
      try { const r = await c.query(sql); return r.rows.length === 1 && Object.keys(r.rows[0]).length === 1 ? String(Object.values(r.rows[0])[0]) : `${r.rowCount} filas`; }
      catch (e) { await c.query("ROLLBACK TO SAVEPOINT s"); return `ERR ${e.code}`; }
    });
  } finally { await c.query("ROLLBACK"); }
}
const grep = (rel, re) => { try { return fs.readFileSync(path.join(ROOT, rel), "utf8").match(re); } catch { return null; } };
const grepDir = (dir, re, exts = /\.(jsx?|mjs)$/) => {
  const hits = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (exts.test(f.name)) { const t = fs.readFileSync(p, "utf8"); let m; const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"); while ((m = rx.exec(t))) hits.push(`${path.relative(ROOT, p)}:${t.slice(0, m.index).split("\n").length}`); } } };
  walk(path.join(ROOT, dir)); return hits;
};

// Usuarios reales por rol (solo id y rol; nunca contraseñas)
const users = await q(`select rol_id, id, contrato_id from public.irp_usuarios where rol_id in ('super_admin','admin_inmobiliaria','locatario','restaurante') and activo order by rol_id, contrato_id nulls last`);
const admin = users.find(u => u.rol_id === "super_admin") || users.find(u => u.rol_id === "admin_inmobiliaria");
const loc = users.find(u => u.rol_id === "locatario" && u.contrato_id);
const rest = users.find(u => u.rol_id === "restaurante");
const otro = loc ? await one(`select id from public.contratos where id <> $1 limit 1`, [loc.contrato_id]) : null;
const locArr = loc ? await one(`select arrendatario_id from public.contratos where id = $1`, [loc.contrato_id]) : null;

// ═══════════════════ Bloque 1 — anon por REST ═══════════════════
if (!cfg.anon) {
  try {
    const html = await (await fetch(cfg.site)).text();
    const js = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
    const bundle = js ? await (await fetch(cfg.site + js)).text() : "";
    for (const tok of bundle.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g) || []) {
      try { const p = JSON.parse(Buffer.from(tok.split(".")[1], "base64url").toString()); if (p.ref === cfg.ref && p.role === "anon") { cfg.anon = tok; break; } } catch {}
    }
  } catch {}
}
const DIAG_ANON = "Ejecutar: REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon; ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon; y verificar que la vista tenga security_invoker=true.";
if (cfg.anon) {
  const H = { apikey: cfg.anon, Authorization: `Bearer ${cfg.anon}` };
  for (const v of ["prp_empleados", "prp_cobros", "prp_contratos", "nomina_periodos", "sat_tarifa_isr", "irp_roles", "vending_inventario_semanal"]) {
    const r = await fetch(`${cfg.url}/rest/v1/${v}?select=*&limit=1`, { headers: H });
    const body = await r.text(); const code = body.match(/"code":"(\w+)"/)?.[1];
    add(1, `GET /rest/v1/${v} (anon)`, "42501", `HTTP ${r.status}${code ? " " + code : ""}`, r.status === 401 || code === "42501", DIAG_ANON);
  }
  for (const [fn, body] of [["crear_empleado", { p_nombre: "A", p_apellido_pat: "B", p_horario_trabajo: "x" }], ["confirmar_cobro", { p_cobro_id: "00000000-0000-0000-0000-000000000000", p_fecha_pago_real: "2026-01-01", p_monto_pagado: 1, p_forma_pago: "X" }]]) {
    const r = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const t = await r.text(); const code = t.match(/"code":"(\w+)"/)?.[1];
    add(1, `POST /rest/v1/rpc/${fn} (anon)`, "error de permisos (42501)", `HTTP ${r.status}${code ? " " + code : ""}`, r.status === 401 || r.status === 403 || code === "42501", `REVOKE EXECUTE ON FUNCTION public.${fn} FROM anon; y guardia IF NOT es_staff() THEN RAISE ... '42501' dentro de la función.`);
  }
} else add(1, "REST anon", "clave anon disponible", "sin clave anon (ni env ni bundle)", false, `Definir ${which === "qa" ? "QA_SUPABASE_ANON_KEY" : "VITE_SUPABASE_ANON_KEY"} en .env.local`);

// Mismo bloque desde SQL (independiente de la red)
await as("anon", null, async t => {
  for (const v of ["prp_empleados", "prp_cobros", "prp_contratos", "nomina_periodos", "sat_tarifa_isr", "irp_roles", "vending_inventario_semanal"])
    add(1, `SQL as anon: ${v}`, "ERR 42501", await t(`select count(*) from public.${v}`), (await t(`select count(*) from public.${v}`)) === "ERR 42501", DIAG_ANON);
});

// ═══════════════════ Bloque 2 — irp_usuarios ═══════════════════
const ESPERADAS_IU = ["admin_administra_usuarios", "admin_borra_usuarios", "admin_lee_todos", "usuarios_actualizan_su_ficha", "usuarios_leen_su_ficha"];
const polIU = await q(`select policyname, cmd, roles::text roles, qual, with_check from pg_policies where tablename='irp_usuarios' order by policyname`);
const perdidas = ESPERADAS_IU.filter(n => !polIU.some(p => p.policyname === n));
add(2, "pg_policies irp_usuarios: cantidad", "5", `${polIU.length}${perdidas.length ? " — faltan: " + perdidas.join(", ") : ""}`, polIU.length >= 5 && !perdidas.length,
  `Recrear las perdidas:\n` + perdidas.map(n => ({
    admin_administra_usuarios: "CREATE POLICY admin_administra_usuarios ON public.irp_usuarios FOR INSERT TO authenticated WITH CHECK (es_admin());",
    admin_borra_usuarios: "CREATE POLICY admin_borra_usuarios ON public.irp_usuarios FOR DELETE TO authenticated USING (es_admin());",
    admin_lee_todos: "CREATE POLICY admin_lee_todos ON public.irp_usuarios FOR SELECT TO authenticated USING (es_admin());",
    usuarios_actualizan_su_ficha: "CREATE POLICY usuarios_actualizan_su_ficha ON public.irp_usuarios FOR UPDATE TO authenticated USING (id = auth.uid() OR es_admin()) WITH CHECK (id = auth.uid() OR es_admin());",
    usuarios_leen_su_ficha: "CREATE POLICY usuarios_leen_su_ficha ON public.irp_usuarios FOR SELECT TO authenticated USING (id = auth.uid());",
  }[n])).join("\n"));
for (const p of polIU) add(2, `  · ${p.policyname}`, "presente", `${p.cmd} ${p.roles} USING ${p.qual ?? "-"} CHECK ${p.with_check ?? "-"}`, true);
const libreIU = await one(`select id from auth.users u where not exists (select 1 from public.irp_usuarios i where i.id = u.id) limit 1`).catch(() => null);
if (admin) await as("authenticated", admin.id, async t => {
  // irp_usuarios.id tiene FK a auth.users: sin un auth.users libre, el INSERT pasa RLS y lo detiene la FK (23503).
  // RLS se evalúa antes que la FK, así que 23503 = política permitió; 42501 = política bloqueó.
  const libre = libreIU;
  const insIU = await t(`insert into public.irp_usuarios (id, rol_id, nombre, apellido, activo) values ('${libre || "00000000-0000-4000-8000-000000000000"}', 'read_only', 'Prueba', 'RLS', true)`);
  add(2, `admin (${admin.rol_id}) INSERT irp_usuarios`, libre ? "1 filas" : "RLS permite (FK detiene: 23503)", insIU === "ERR 23503" ? "ERR 23503 — RLS permitió, FK auth.users detuvo" : insIU, insIU === "1 filas" || (!libre && insIU === "ERR 23503"), "Falta admin_administra_usuarios (INSERT WITH CHECK es_admin()) o es_admin() no incluye el rol del admin.");
  add(2, `admin UPDATE irp_usuarios (otro usuario)`, "≥1 filas", await t(`update public.irp_usuarios set updated_at = now() where id <> '${admin.id}'`), /^[1-9]\d* filas$/.test(await t(`update public.irp_usuarios set updated_at = now() where id <> '${admin.id}'`)), "Falta usuarios_actualizan_su_ficha con rama es_admin().");
  add(2, `admin SELECT irp_usuarios (todos)`, `${users.length}+`, await t(`select count(*) from public.irp_usuarios`), Number(await t(`select count(*) from public.irp_usuarios`)) >= users.length, "Falta admin_lee_todos (SELECT USING es_admin()).");
});

// ═══════════════════ Bloque 3 — log_bitacora ═══════════════════
const lbAnon = await one(`select has_function_privilege('anon', 'public.log_bitacora(text,text,text,uuid,text)', 'EXECUTE')`);
const lbAuth = await one(`select has_function_privilege('authenticated', 'public.log_bitacora(text,text,text,uuid,text)', 'EXECUTE')`);
const usaPortal = grep("src/pages/PortalProspecto.jsx", /log_bitacora|logAudit|useAudit/);
add(3, "anon EXECUTE log_bitacora", usaPortal ? "true (el portal la usa)" : "false (el portal no la usa)", String(lbAnon), usaPortal ? lbAnon === true : lbAnon === false,
  usaPortal ? "GRANT EXECUTE ON FUNCTION public.log_bitacora(text,text,text,uuid,text) TO anon;"
            : "anon la conserva por el grant implícito a PUBLIC (ver prueba siguiente). Es SECURITY DEFINER y escribe en prp.bitacora con usuario nulo: vector de basura en la bitácora, sin fuga de datos.\nREVOKE EXECUTE ON FUNCTION public.log_bitacora(text,text,text,uuid,text) FROM PUBLIC, anon;");
add(3, "PortalProspecto.jsx invoca log_bitacora", "informativo", usaPortal ? `sí (${usaPortal[0]})` : "no", true);
add(3, "authenticated EXECUTE log_bitacora", "true", String(lbAuth), lbAuth === true, "GRANT EXECUTE ON FUNCTION public.log_bitacora(text,text,text,uuid,text) TO authenticated;");
// REVOKE ... FROM anon no quita el EXECUTE que toda función otorga a PUBLIC por defecto y que anon hereda.
const fnAnon = await q(`select p.proname, p.prosecdef secdef, pg_get_functiondef(p.oid) ~ 'es_staff\\(\\)' guardada
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
    and has_function_privilege('anon', p.oid, 'EXECUTE') order by 1`);
const SQL_PUBLIC = `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT  EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT  EXECUTE ON FUNCTIONS TO authenticated, service_role;
-- Las funciones de trigger no requieren EXECUTE del usuario que dispara el trigger; no se afectan.`;
add(3, "funciones (no trigger) ejecutables por anon", "0", fnAnon.length ? `${fnAnon.length}: ${fnAnon.map(f => f.proname).join(", ")}` : "0", !fnAnon.length, `anon hereda EXECUTE del grant implícito a PUBLIC; la migración solo revocó al rol anon.\n${SQL_PUBLIC}`);
const secdefSinGuardia = fnAnon.filter(f => f.secdef && !f.guardada && !["es_admin", "mi_rol", "get_mi_rol", "_comp_mi_arr_id"].includes(f.proname));
add(3, "SECURITY DEFINER sin guardia ejecutables por anon", "0", secdefSinGuardia.length ? secdefSinGuardia.map(f => f.proname).join(", ") : "0", !secdefSinGuardia.length, `Cualquiera con la clave anon puede invocarlas y corren como postgres. ${SQL_PUBLIC}`);
const rpcAnonCliente = grepDir("src", /\.rpc\('([a-z_]+)'/).filter(h => /Portal(Prospecto|Arrendatario)/.test(h));
add(3, "RPCs desde portales (src)", "informativo", rpcAnonCliente.length ? rpcAnonCliente.join(", ") : "ninguna", true);

// ═══════════════════ Bloque 4 — staff sin regresión ═══════════════════
const VISTAS = ["prp_empleados", "prp_cobros", "prp_contratos", "prp_cartera", "prp_kpis", "prp_mapa_locales", "prp_conciliacion_cobros", "prp_bitacora", "prp_proveedores"];
const verdad = {}; for (const v of VISTAS) verdad[v] = await one(`select count(*) from public.${v}`);   // como postgres (BYPASSRLS)
const usagePrp = await one(`select has_schema_privilege('authenticated','prp','USAGE')`);
add(4, "authenticated USAGE en esquema prp", "true", String(usagePrp), usagePrp === true, "GRANT USAGE ON SCHEMA prp TO authenticated; GRANT SELECT ON ALL TABLES IN SCHEMA prp TO authenticated;");
const sinInvoker = await q(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v' and coalesce(c.reloptions::text,'') not like '%security_invoker=true%'`);
add(4, "vistas public sin security_invoker", "0", sinInvoker.length ? sinInvoker.map(x => x.relname).join(", ") : "0", !sinInvoker.length, sinInvoker.map(x => `ALTER VIEW public.${x.relname} SET (security_invoker = true);`).join("\n"));
if (admin) await as("authenticated", admin.id, async t => {
  for (const v of VISTAS) { const got = await t(`select count(*) from public.${v}`); add(4, `${admin.rol_id} count(*) ${v}`, `${verdad[v]} (total real)`, got, got === String(verdad[v]), `Un cero o 42501 con filas reales indica falta GRANT SELECT sobre las tablas prp.* detrás de la vista o falta la política staff_all en alguna de ellas. Revisar: select pg_get_viewdef('public.${v}');`); }
});
const escrPrp = grepDir("src", /\.schema\(\s*['"]prp['"]\s*\)|from\(\s*['"]prp\.[a-z_]+['"]\s*\)/);
add(4, "escrituras directas a prp.* desde src/", "ninguna (authenticated solo tiene SELECT)", escrPrp.length ? escrPrp.join(", ") : "ninguna", !escrPrp.length, "GRANT INSERT, UPDATE, DELETE ON <tabla> IN SCHEMA prp TO authenticated; o mover la escritura a una función SECURITY DEFINER.");
const escrVistaPrp = grepDir("src", /\.from\('prp_[a-z_]+'\)[^;\n]*\.(insert|update|delete|upsert)\(/);
add(4, "escrituras a través de vistas prp_*", "ninguna", escrVistaPrp.length ? escrVistaPrp.join(", ") : "ninguna", !escrVistaPrp.length, "Las vistas con security_invoker sobre prp.* no son escribibles por authenticated sin grant en la tabla base.");

// ═══════════════════ Bloque 5 — locatario ═══════════════════
const estatusFront = grep("src/pages/ExpedienteContrato.jsx", /estatus_validacion:\s*'([A-Z_]+)'/);
add(5, "frontend manda estatus_validacion", "'POR_VALIDAR' (lo exige la política)", estatusFront ? `'${estatusFront[1]}' (ExpedienteContrato.jsx)` : "no encontrado", estatusFront?.[1] === "POR_VALIDAR", "Alinear la política locatario_sube_comprobante con el valor del frontend o viceversa.");
if (loc) await as("authenticated", loc.id, async t => {
  const T = async (label, sql, esperado, okFn, diag) => { const got = await t(sql); add(5, label, esperado, got, okFn(got), diag); };
  await T("es_staff() para locatario", "select public.es_staff()", "false", o => o === "false", "es_staff() debe excluir 'locatario'.");
  await T("prp_contratos count", "select count(*) from public.prp_contratos", "1", o => o === "1", "CREATE POLICY locatario_lee ON public.contratos FOR SELECT TO authenticated USING (id = mi_contrato_id());");
  await T("prp_contratos.id = su contrato", "select id from public.prp_contratos", loc.contrato_id, o => o === loc.contrato_id, "La política de contratos no filtra por irp_usuarios.contrato_id.");
  await T("prp_cartera de otros contratos", `select count(*) from public.prp_cartera where contrato_id <> '${loc.contrato_id}'`, "0", o => o === "0", "CREATE POLICY locatario_lee ON public.cargos_programados FOR SELECT TO authenticated USING (contrato_id = mi_contrato_id());");
  await T("prp_cartera de su contrato", "select count(*) from public.prp_cartera", `${await one(`select count(*) from public.cargos_programados where contrato_id=$1`, [loc.contrato_id])} (sus cargos)`, o => /^\d+$/.test(o), "Vista prp_cartera sin acceso: revisar security_invoker y staff/locatario en aplicaciones_pago.");
  await T("arrendatarios count", "select count(*) from public.arrendatarios", "1", o => o === "1", "CREATE POLICY locatario_lee ON public.arrendatarios FOR SELECT TO authenticated USING (id = mi_arrendatario_id());");
  for (const v of ["rh_empleados", "nomina_empleado", "gastos_operativos"]) await T(`${v} count`, `select count(*) from public.${v}`, "0", o => o === "0", `DROP POLICY IF EXISTS <política abierta> ON public.${v}; -- debe quedar solo staff_all`);
  await T("prp.movimientos_bancarios count", "select count(*) from prp.movimientos_bancarios", "0", o => o === "0", "Debe quedar solo staff_all en prp.movimientos_bancarios (no read_authenticated_*).");
  await T("prp_movimientos_bancarios (vista) count", "select count(*) from public.prp_movimientos_bancarios", "0", o => o === "0", "ALTER VIEW public.prp_movimientos_bancarios SET (security_invoker = true);");
  const ING = (cid) => `insert into public.ingresos (contrato_id, fecha, mes, anio, tipo, importe, estatus_validacion) values ('${cid}', current_date, extract(month from current_date)::int, extract(year from current_date)::int, 'RENTA', 1, 'POR_VALIDAR') returning id`;
  await T("INSERT ingresos con su contrato_id", ING(loc.contrato_id), "id (éxito)", o => /^(\d+|[0-9a-f-]{36}|1 filas)$/.test(o), "CREATE POLICY locatario_sube_comprobante ON public.ingresos FOR INSERT TO authenticated WITH CHECK (contrato_id = mi_contrato_id() AND estatus_validacion = 'POR_VALIDAR'); y locatario_lee SELECT para el RETURNING.");
  if (otro) await T("INSERT ingresos con contrato_id ajeno", ING(otro), "ERR 42501", o => o === "ERR 42501", "El WITH CHECK de locatario_sube_comprobante no compara contrato_id con mi_contrato_id().");
  await T("documentos de su arrendatario", `select count(*) from public.documentos where entidad_id <> '${locArr}'`, "0 (ajenos)", o => o === "0", "CREATE POLICY locatario_lee ON public.documentos FOR SELECT ... USING (entidad_tipo='ARRENDATARIO' AND entidad_id = mi_arrendatario_id());");
}); else add(5, "cuenta locatario con contrato_id", "existe", "no hay locatario activo con contrato_id", false, "UPDATE public.irp_usuarios SET contrato_id = <uuid> WHERE id = <locatario>;");

// ═══════════════════ Bloque 6 — restaurante ═══════════════════
if (rest) await as("authenticated", rest.id, async t => {
  const T = async (label, sql, esperado, okFn, diag) => { const got = await t(sql); add(6, label, esperado, got, okFn(got), diag); };
  const rg = await one(`select count(*) from public.restaurante_gastos`), rgd = await one(`select count(*) from public.restaurante_gasto_detalle`);
  await T("restaurante_gastos count", "select count(*) from public.restaurante_gastos", String(rg), o => o === String(rg), "CREATE POLICY restaurante_all ON public.restaurante_gastos FOR ALL TO authenticated USING (mi_rol()='restaurante') WITH CHECK (mi_rol()='restaurante');");
  await T("restaurante_gasto_detalle count", "select count(*) from public.restaurante_gasto_detalle", String(rgd), o => o === String(rgd), "CREATE POLICY restaurante_all ON public.restaurante_gasto_detalle ... (ídem).");
  await T("INSERT restaurante_gastos", "insert into public.restaurante_gastos (fecha, total) values (current_date, 1) returning id", "id (éxito)", o => /^(\d+|[0-9a-f-]{36}|1 filas)$/.test(o), "restaurante_all debe incluir WITH CHECK.");
  for (const v of ["contratos", "prp_contratos", "prp_empleados", "gastos_operativos", "prp_cobros", "nomina_periodos", "rh_empleados", "ingresos"]) await T(`${v} count`, `select count(*) from public.${v}`, "0", o => o === "0", `Debe quedar solo staff_all en ${v}.`);
}); else add(6, "cuenta restaurante", "existe", "no hay usuario activo con rol restaurante", false, "Crear usuario con rol_id='restaurante' para probar.");

// ═══════════════════ Bloque 7 — storage ═══════════════════
const pubExp = await q(`select policyname, roles::text roles from pg_policies where schemaname='storage' and tablename='objects' and cmd='SELECT' and (roles::text like '%public%' or roles::text like '%anon%') and (qual like '%expedientes-docs%')`);
add(7, "lectura pública/anon sobre expedientes-docs", "ninguna política", pubExp.length ? pubExp.map(p => `${p.policyname} ${p.roles}`).join(", ") : "ninguna", !pubExp.length, pubExp.map(p => `DROP POLICY "${p.policyname}" ON storage.objects;`).join("\n"));
const bk = await q(`select id, public from storage.buckets where id in ('contratos-docs','expedientes-docs','avatars','catalogos','logos-arrendatarios')`);
const cd = bk.find(b => b.id === "contratos-docs");
add(7, "bucket contratos-docs public", "false (o inexistente en QA)", cd ? String(cd.public) : "no existe en este proyecto", !cd || cd.public === false, "UPDATE storage.buckets SET public = false WHERE id = 'contratos-docs';");
const ed = bk.find(b => b.id === "expedientes-docs");
add(7, "bucket expedientes-docs public", "false", ed ? String(ed.public) : "no existe en este proyecto", !ed || ed.public === false, "UPDATE storage.buckets SET public = false WHERE id = 'expedientes-docs';");
const usoCD = grepDir("src", /contratos-docs/).concat(grepDir("netlify", /contratos-docs/));
add(7, "código que consume contratos-docs", "ninguno", usoCD.length ? usoCD.join(", ") : "ninguno", !usoCD.length, "Si algo lo pinta por URL pública, pasarlo a <EnlacePrivado>/urlFirmada() o reabrir el bucket.");
const urlPubExp = grepDir("src", /object\/public\/(expedientes-docs|contratos-docs|contratos-firmados|facturas-cfdi)/);
add(7, "URLs públicas hardcodeadas a buckets privados", "ninguna", urlPubExp.length ? urlPubExp.join(", ") : "ninguna", !urlPubExp.length, "Sustituir por urlFirmada(bucket, ruta).");
const anonAmplio = await q(`select policyname from pg_policies where schemaname='storage' and tablename='objects' and roles::text like '%anon%' and cmd='INSERT' and with_check not like '%foldername%'`);
add(7, "INSERT anon en storage sin restricción de carpeta", "ninguna", anonAmplio.length ? anonAmplio.map(p => p.policyname).join(", ") : "ninguna", !anonAmplio.length, anonAmplio.map(p => `DROP POLICY "${p.policyname}" ON storage.objects;`).join("\n"));

await c.end();

// ───────────────────────── salida ─────────────────────────
const w = (s, n) => String(s).padEnd(n).slice(0, n);
const ancho = { p: 46, e: 30, o: 44 };
console.log(`\nVerificación post-migración — ${which} (${cfg.ref}) — ${new Date().toISOString().slice(0, 16)}\n`);
console.log(`${w("Bq", 3)} ${w("Prueba", ancho.p)} ${w("Esperado", ancho.e)} ${w("Obtenido", ancho.o)} ✓/✗`);
console.log("─".repeat(3 + ancho.p + ancho.e + ancho.o + 7));
for (const r of R) console.log(`${w(r.bloque, 3)} ${w(r.prueba, ancho.p)} ${w(r.esperado, ancho.e)} ${w(r.obtenido, ancho.o)} ${r.ok ? "✓" : "✗"}`);
const fallas = R.filter(r => !r.ok);
console.log(`\n${R.length - fallas.length}/${R.length} correctas${fallas.length ? ` — ${fallas.length} con ✗` : ""}`);
if (fallas.length) { console.log("\nDIAGNÓSTICO Y SQL PROPUESTO (no aplicado):"); for (const f of fallas) console.log(`\n[${f.bloque}] ${f.prueba}\n  obtenido: ${f.obtenido}\n  ${f.diag || "-"}`); }

const md = [`# Verificación post-migración RLS — ${which} (${cfg.ref})`, ``, `Fecha: ${new Date().toISOString()}  ·  Migración: 20260913100000_cierre_rls_auditoria_tenant.sql  ·  Resultado: **${R.length - fallas.length}/${R.length}**`, ``,
  `| Bloque | Prueba | Esperado | Obtenido | ✓/✗ |`, `|---|---|---|---|---|`,
  ...R.map(r => `| ${r.bloque} | ${r.prueba.replace(/\|/g, "\\|")} | ${r.esperado.replace(/\|/g, "\\|")} | ${r.obtenido.replace(/\|/g, "\\|")} | ${r.ok ? "✓" : "✗"} |`),
  ...(fallas.length ? [``, `## Diagnóstico y SQL propuesto (no aplicado)`, ...fallas.flatMap(f => [``, `### [${f.bloque}] ${f.prueba}`, `Obtenido: \`${f.obtenido}\``, ``, "```sql", f.diag || "-", "```"])] : [``, `Sin hallazgos.`])].join("\n");
fs.mkdirSync(path.join(ROOT, "docs"), { recursive: true });
const out = path.join(ROOT, "docs", `verificacion-rls-${which}-${new Date().toISOString().slice(0, 10)}.md`);
fs.writeFileSync(out, md); console.log(`\nReporte: ${path.relative(ROOT, out)}`);
process.exit(fallas.length ? 1 : 0);
