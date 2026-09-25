// Pruebas automáticas de aislamiento RLS por rol.
//
//   node scripts/test-rls.mjs qa       # contra QA  (QA_SUPABASE_DB_PASSWORD, QA_SUPABASE_URL)
//   node scripts/test-rls.mjs prod     # contra producción (SUPABASE_DB_PASSWORD, VITE_SUPABASE_URL)
//
// Lee credenciales de .env.local o de variables de entorno (CI). Cada prueba corre en su
// propia transacción con SET LOCAL ROLE + claims JWT simulados y termina en ROLLBACK, así que
// no deja rastro. Además hace una prueba REST real con la clave anon, que es lo que ve un
// atacante con el bundle del frontend. Sale con código 1 si alguna prueba falla.
import fs from "fs";
import pg from "pg";

const which = process.argv[2] || "qa";
const env = { ...process.env };
try {
  for (const line of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* en CI no hay .env.local */ }

const cfg = which === "qa"
  ? { host: "db.wijcjdbmdbxzmwpdxoal.supabase.co", user: "postgres", password: env.QA_SUPABASE_DB_PASSWORD, url: env.QA_SUPABASE_URL, anon: env.QA_SUPABASE_ANON_KEY }
  : { host: "aws-1-us-west-2.pooler.supabase.com", user: "postgres.kusuoxwzdxfuybvyiakg", password: env.SUPABASE_DB_PASSWORD, url: env.VITE_SUPABASE_URL, anon: env.VITE_SUPABASE_ANON_KEY };
if (!cfg.password) { console.error(`Falta la contraseña de BD para ${which}`); process.exit(2); }

const c = new pg.Client({ host: cfg.host, port: 5432, user: cfg.user, password: cfg.password, database: "postgres", ssl: { rejectUnauthorized: false } });
await c.connect();

let fallas = 0, total = 0;
const check = (label, out, ok) => { total++; if (!ok) fallas++; console.log(`  ${ok ? "✓" : "✗"} ${label.padEnd(48)} → ${out}`); };

const users = (await c.query(`select rol_id, id, contrato_id from public.irp_usuarios where rol_id in ('admin_inmobiliaria','super_admin','locatario','restaurante') order by rol_id, contrato_id nulls last`)).rows;
const staff = users.find(u => ["admin_inmobiliaria", "super_admin"].includes(u.rol_id));
const loc = users.find(u => u.rol_id === "locatario" && u.contrato_id);
const rest = users.find(u => u.rol_id === "restaurante");
const otro = loc ? (await c.query(`select id from public.contratos where id <> $1 limit 1`, [loc.contrato_id])).rows[0]?.id : null;
const T = (await c.query(`select (select count(*) from public.contratos) c, (select count(*) from public.rh_empleados) e, (select count(*) from public.restaurante_gastos) rg`)).rows[0];

async function as(role, uid, fn, setup) {
  await c.query("BEGIN");
  try {
    if (setup) await setup();   // p. ej. crear un usuario de prueba (todo se deshace con el ROLLBACK)
    await c.query(`SET LOCAL ROLE ${role}`);
    if (uid) await c.query(`SELECT set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)`, [uid, JSON.stringify({ sub: uid, role })]);
    await fn(async (label, sql, expect) => {
      await c.query("SAVEPOINT s");
      let out;
      try { const r = await c.query(sql); out = r.rows.length === 1 && Object.keys(r.rows[0]).length === 1 ? String(Object.values(r.rows[0])[0]) : `${r.rowCount} filas`; }
      catch (e) { out = `ERR ${e.code}`; await c.query("ROLLBACK TO SAVEPOINT s"); }
      check(label, out, expect(out));
    });
  } finally { await c.query("ROLLBACK"); }
}
// crear_empleado tiene dos sobrecargas; p_horario_trabajo solo existe en la de 20 argumentos
const CREAR_EMP = "select public.crear_empleado(p_nombre := 'PRUEBA', p_apellido_pat := 'RLS', p_horario_trabajo := 'x')";
const denied = o => o === "ERR 42501", zero = o => o === "0", one = o => o === "1", pos = o => /^\d+$/.test(o) && Number(o) > 0, inserted = o => /^(1 filas|[0-9a-f-]{36}|\d+)$/.test(o);

console.log(`\n[${which}] anon (sin sesión) — todo debe ser 42501`);
await as("anon", null, async t => {
  for (const v of ["prp_empleados", "prp_cobros", "prp_contratos", "prp_cartera", "prp_kpis", "prp_prenomina", "nomina_periodos", "rh_empleados", "contratos", "irp_roles", "irp_usuarios"])
    await t(v, `select count(*) from public.${v}`, denied);
  await t("rpc crear_periodo_nomina", "select public.crear_periodo_nomina('SEMANAL', current_date, current_date, current_date)", denied);
  await t("rpc crear_empleado", CREAR_EMP, denied);
  await t("prp.prospectos_tokens (sin USAGE)", "select count(*) from prp.prospectos_tokens", denied);
});

console.log(`\n[${which}] staff ${staff?.rol_id} — debe ver todo como antes`);
if (staff) await as("authenticated", staff.id, async t => {
  await t("es_staff()", "select public.es_staff()", o => o === "true");
  await t("prp_contratos = total", "select count(*) from public.prp_contratos", o => o === T.c);
  await t("prp_empleados = total", "select count(*) from public.prp_empleados", o => o === T.e);
  for (const v of ["prp_cobros", "prp_kpis", "prp_bitacora", "prp_cartera", "prp_vending_semana", "prp_gastos", "prp_asistencia_semana", "prp_validacion_puntos"])
    await t(`${v} > 0`, `select count(*) from public.${v}`, pos);
  for (const v of ["prp_fondos_revolventes", "prp_mapa_locales", "prp_movimientos_bancarios", "prp_proveedores", "prp_notas_contrato", "prp_estacionamiento", "prp_prenomina", "nomina_periodos", "sat_tarifa_isr", "cat_parametros"])
    await t(`${v} legible`, `select count(*) from public.${v}`, o => !o.startsWith("ERR"));
  await t("insert gastos_operativos", "insert into public.gastos_operativos (fecha, cantidad) values (current_date, 1) returning id", inserted);
  await t("rpc desmarcar_cobros([])", "select public.desmarcar_cobros(ARRAY[]::uuid[])", zero);
  await t("rpc log_bitacora", "select public.log_bitacora('PRUEBA','RLS')", o => !o.startsWith("ERR"));
});

console.log(`\n[${which}] locatario — solo su contrato ${loc?.contrato_id}`);
if (loc) await as("authenticated", loc.id, async t => {
  await t("es_staff()", "select public.es_staff()", o => o === "false");
  await t("irp_usuarios (su ficha)", "select count(*) from public.irp_usuarios", one);
  await t("prp_contratos → 1", "select count(*) from public.prp_contratos", one);
  await t("prp_contratos es el suyo", "select id from public.prp_contratos", o => o === loc.contrato_id);
  await t("prp_cartera legible", "select count(*) from public.prp_cartera", o => !o.startsWith("ERR"));
  await t("prp_cartera de otros = 0", `select count(*) from public.prp_cartera where contrato_id <> '${loc.contrato_id}'`, zero);
  await t("arrendatarios → 1", "select count(*) from public.arrendatarios", one);
  await t("documentos legible", "select count(*) from public.documentos", o => !o.startsWith("ERR"));
  for (const v of ["rh_empleados", "prp_empleados", "prp_cobros", "gastos_operativos", "nomina_periodos", "restaurante_gastos", "prp_movimientos_bancarios", "comprobantes_pago"])
    await t(`${v} = 0`, `select count(*) from public.${v}`, zero);
  await t("prp_kpis sin datos (agregado)", "select coalesce(contratos_vigentes,0) + coalesce(total_empleados_activos,0) + coalesce(total_arrendatarios,0) from public.prp_kpis", zero);
  const ING = (cid) => `insert into public.ingresos (contrato_id, fecha, mes, anio, tipo, importe, estatus_validacion) values ('${cid}', current_date, extract(month from current_date)::int, extract(year from current_date)::int, 'RENTA', 1, 'POR_VALIDAR') returning id`;
  await t("insert ingresos su contrato", ING(loc.contrato_id), inserted);
  if (otro) await t("insert ingresos otro contrato", ING(otro), denied);
  await t("update contratos → 0 filas", `update public.contratos set notas = notas where id = '${loc.contrato_id}'`, o => o === "0 filas");
  await t("rpc renovar_contrato", `select public.renovar_contrato('${loc.contrato_id}', 'X', gen_random_uuid(), gen_random_uuid(), 'T', current_date)`, denied);
  await t("rpc crear_empleado", CREAR_EMP, denied);
  // Auto-ascenso: nadie cambia su propio rol, contrato ni estado (hallazgo 2026-09-25)
  await t("NO puede cambiarse el rol", `update public.irp_usuarios set rol_id = 'super_admin' where id = '${loc.id}'`, denied);
  if (otro) await t("NO puede cambiarse de contrato", `update public.irp_usuarios set contrato_id = '${otro}' where id = '${loc.id}'`, denied);
  await t("sí puede editar su teléfono", `update public.irp_usuarios set telefono = telefono where id = '${loc.id}'`, o => o === "1 filas");
});

console.log(`\n[${which}] restaurante — solo sus dos tablas`);
if (rest) await as("authenticated", rest.id, async t => {
  await t("restaurante_gastos = total", "select count(*) from public.restaurante_gastos", o => o === T.rg);
  await t("insert restaurante_gastos", "insert into public.restaurante_gastos (fecha, total) values (current_date, 1) returning id", inserted);
  for (const v of ["contratos", "prp_empleados", "gastos_operativos", "prp_cobros"]) await t(`${v} = 0`, `select count(*) from public.${v}`, zero);
  await t("NO puede cambiarse el rol", `update public.irp_usuarios set rol_id = 'super_admin' where id = '${rest.id}'`, denied);
});

// El asistente no existe como usuario real: se crea uno dentro de la transacción de prueba.
const ASIST = "00000000-0000-4000-8000-00000000a515";
const tieneAsistente = (await c.query(`select 1 from public.irp_roles where id = 'asistente'`)).rowCount > 0;
console.log(`\n[${which}] asistente — solo consulta por vistas asistente_*, sin datos fiscales y sin escribir`);
if (!tieneAsistente) console.log("  (rol 'asistente' aún no existe en esta base: se omite)");
else await as("authenticated", ASIST, async t => {
  await t("es_staff() = false", "select public.es_staff()", o => o === "false");
  await t("mi_rol() = asistente", "select public.mi_rol()", o => o === "asistente");
  await t("asistente_contratos = total", "select count(*) from public.asistente_contratos", o => o === T.c);
  await t("asistente_personal = total", "select count(*) from public.asistente_personal", o => o === T.e);
  for (const v of ["asistente_gastos", "asistente_ingresos", "asistente_cartera"]) await t(`${v} > 0`, `select count(*) from public.${v}`, pos);
  await t("asistente_proyectos legible", "select count(*) from public.asistente_proyectos", o => !o.startsWith("ERR"));
  await t("personal SIN RFC/CURP/NSS/datos bancarios", "select count(*) from information_schema.columns where table_schema='public' and table_name='asistente_personal' and (column_name ~ 'rfc|curp|nss|clabe|banco|forma_pago')", zero);
  await t("personal CON salario (decisión 2026-09-25)", "select count(*) from public.asistente_personal where salario_diario is not null", pos);
  for (const v of ["rh_empleados", "prp_empleados", "prp_contratos", "contratos", "gastos_operativos", "ingresos", "prp_cobros", "nomina_periodos", "arrendatarios"])
    await t(`${v} directo = 0`, `select count(*) from public.${v}`, zero);
  await t("insert gastos_operativos", "insert into public.gastos_operativos (fecha, cantidad) values (current_date, 1) returning id", denied);
  await t("insert ingresos", "insert into public.ingresos (fecha, mes, anio, tipo, importe) values (current_date, 1, 2026, 'RENTA', 1) returning id", denied);
  await t("rpc crear_empleado", CREAR_EMP, denied);
  await t("rpc renovar_contrato", "select public.renovar_contrato(gen_random_uuid(), 'X', gen_random_uuid(), gen_random_uuid(), 'T', current_date)", denied);
  await t("NO puede cambiarse el rol", `update public.irp_usuarios set rol_id = 'super_admin' where id = '${ASIST}'`, denied);
}, async () => {
  await c.query(`insert into auth.users (id) values ('${ASIST}')`);
  await c.query(`insert into public.irp_usuarios (id, rol_id, nombre) values ('${ASIST}', 'asistente', 'Prueba Asistente')`);
});

const admin = users.find(u => u.rol_id === "admin_inmobiliaria");
console.log(`\n[${which}] admin — sí administra roles (Configuración)`);
if (admin && rest) await as("authenticated", admin.id, async t => {
  await t("admin edita la ficha de otro", `update public.irp_usuarios set rol_id = rol_id where id = '${rest.id}'`, o => o === "1 filas");
  await t("admin reasigna el rol de otro", `update public.irp_usuarios set rol_id = 'restaurante' where id = '${rest.id}'`, o => o === "1 filas");
});
await c.end();

// ── Prueba REST real con la clave anon (lo que ve un atacante con el bundle) ──
if (cfg.url && cfg.anon) {
  console.log(`\n[${which}] REST con clave anon → ${cfg.url}`);
  for (const v of ["prp_empleados", "prp_cobros", "nomina_periodos", "irp_roles", "rh_empleados"]) {
    const r = await fetch(`${cfg.url}/rest/v1/${v}?select=*&limit=1`, { headers: { apikey: cfg.anon, Authorization: `Bearer ${cfg.anon}` } });
    check(`GET /rest/v1/${v}`, `HTTP ${r.status}`, r.status === 401 || r.status === 403 || r.status === 404);
  }
  const r = await fetch(`${cfg.url}/rest/v1/rpc/crear_empleado`, { method: "POST", headers: { apikey: cfg.anon, Authorization: `Bearer ${cfg.anon}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_nombre: "A", p_apellido_pat: "B" }) });
  check("POST /rest/v1/rpc/crear_empleado", `HTTP ${r.status}`, r.status >= 400);
} else console.log("\n(sin URL/anon key: se omite la prueba REST)");

console.log(`\n${total - fallas}/${total} pruebas correctas${fallas ? ` — ${fallas} FALLARON` : ""}`);
process.exit(fallas ? 1 : 0);
