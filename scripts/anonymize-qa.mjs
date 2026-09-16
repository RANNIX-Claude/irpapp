// Anonimiza datos sensibles en el ambiente QA
// Cambia nombres de arrendatarios, avales, fiadores y empleados RH
// NO toca PKs, FKs, montos, roles ni fechas de sistema
// Uso: node scripts/anonymize-qa.mjs

import fs from "fs";
import pg from "pg";

const envText = fs.readFileSync(
  "C:\\Users\\asus\\OneDrive\\work\\IRPAPP\\DEv\\.env.local",
  "utf8"
);
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

// ─── Catálogos de nombres ficticios mexicanos ─────────────────────────────────
const NOMBRES_M = ["Juan","Carlos","Miguel","José","Luis","Roberto","Francisco",
  "Antonio","Ricardo","Jorge","Eduardo","Alejandro","Daniel","Fernando","Manuel",
  "Gabriel","Rafael","Pablo","Sergio","Arturo","Raúl","Enrique","Alberto","Óscar","Héctor"];
const NOMBRES_F = ["María","Ana","Laura","Rosa","Claudia","Patricia","Guadalupe",
  "Carmen","Leticia","Sandra","Gabriela","Verónica","Adriana","Silvia","Mónica",
  "Irma","Beatriz","Norma","Diana","Sofía","Alejandra","Cristina","Margarita","Luz","Elena"];
const APELLIDOS_P = ["García","Martínez","López","González","Hernández","Pérez",
  "Rodríguez","Sánchez","Ramírez","Torres","Flores","Rivera","Morales","Jiménez",
  "Reyes","Cruz","Ortega","Castro","Vargas","Mendoza","Gutiérrez","Medina",
  "Aguilar","Ruiz","Vega","Delgado","Núñez","Domínguez","Campos","Castillo"];
const APELLIDOS_M = ["Ávila","Bravo","Cárdenas","Díaz","Espinoza","Fuentes",
  "Guerrero","Herrera","Ibarra","Juárez","León","Luna","Mora","Navarro",
  "Orozco","Ponce","Quiroga","Rojas","Salinas","Téllez","Uribe","Valdez",
  "Ware","Zamora","Acosta","Bernal","Cervantes","Escobedo","Figueroa","Galindo"];
const GIROS = ["DISTRIBUIDORA","COMERCIALIZADORA","SERVICIOS","SOLUCIONES",
  "GRUPO","INVERSIONES","DESARROLLOS","NEGOCIOS","IMPORTADORA","CORPORATIVO"];
const ESTADOS_RFC = ["AB","BC","CA","CH","CI","CL","CO","CS","DF","DG",
  "GJ","GR","HG","JC","MC","MN","MS","NE","NL","NT","OC","PL","QT","QR","SA",
  "SL","SO","SR","TC","TL","TS","VZ","YN","ZS"];

// Genera RFC formato válido (ficticio)
function rfcFisica(ap, am, nom, idx) {
  const base = (ap.slice(0,2) + am.slice(0,1) + nom.slice(0,1)).toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const anio = 60 + (idx % 40);
  const mes  = String((idx % 12) + 1).padStart(2,"0");
  const dia  = String((idx % 28) + 1).padStart(2,"0");
  const homo = ESTADOS_RFC[idx % ESTADOS_RFC.length] + String(idx % 10);
  return `${base}${anio}${mes}${dia}${homo}`;
}
function rfcMoral(giro, ap, idx) {
  const base = (giro.slice(0,2) + ap.slice(0,1)).toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const anio = 90 + (idx % 35);
  const mes  = String((idx % 12) + 1).padStart(2,"0");
  const dia  = String((idx % 28) + 1).padStart(2,"0");
  const homo = String(idx % 10) + ESTADOS_RFC[idx % ESTADOS_RFC.length];
  return `${base}${anio}${mes}${dia}${homo}`;
}
function pick(arr, idx) { return arr[idx % arr.length]; }
function email(nombre, ap, idx) {
  return `${nombre.toLowerCase().replace(/[^a-z]/g,"")}.${ap.toLowerCase().replace(/[^a-z]/g,"")}${idx}@ejemplo.com`;
}
function tel(idx) {
  return `55${String(1000 + idx * 7 % 9000).padStart(4,"0")}${String(idx * 13 % 10000).padStart(4,"0")}`;
}
function clabe(idx) {
  const base = String(21680000000000 + idx * 9973).padStart(14,"0").slice(0,14);
  const dv = String(idx % 10);
  return `${base}${dv}000`;
}
function curp(nombre, ap, am, idx, sexo) {
  const s = sexo === "F" ? "M" : "H";
  const est = ESTADOS_RFC[idx % ESTADOS_RFC.length];
  const base = (ap.slice(0,2) + am.slice(0,1) + nombre.slice(0,1)).toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const anio = String(60 + idx % 40).padStart(2,"0");
  const mes  = String((idx % 12) + 1).padStart(2,"0");
  const dia  = String((idx % 28) + 1).padStart(2,"0");
  return `${base}${anio}${mes}${dia}${s}${est}NN${String(idx % 10)}`;
}
function nss(idx) {
  return String(10000000000 + idx * 99991).slice(0, 11);
}

let total = 0;
function log(msg) { console.log(`  ${msg}`); total++; }

// ─── 1. public.arrendatarios ─────────────────────────────────────────────────
console.log("\n[1/5] public.arrendatarios");
const { rows: arr } = await qa.query(
  `SELECT id, tipo_persona, rfc FROM public.arrendatarios ORDER BY created_at`
);

for (let i = 0; i < arr.length; i++) {
  const r = arr[i];
  const esMoral = (r.tipo_persona === "MORAL");
  const idx = i + 1;
  const ap  = pick(APELLIDOS_P, idx);
  const am  = pick(APELLIDOS_M, idx + 5);
  const nom = esMoral ? null : pick(idx % 2 === 0 ? NOMBRES_M : NOMBRES_F, idx);
  const giro = pick(GIROS, idx);

  const locatario = esMoral
    ? `${giro} ${ap} S.A. DE C.V.`
    : `${nom} ${ap} ${am}`;
  const razonSocial = esMoral ? locatario : null;
  const rfc = esMoral ? rfcMoral(giro, ap, idx) : rfcFisica(ap, am, nom, idx);
  const emailVal = email(esMoral ? giro.toLowerCase() : nom, ap, idx);
  const telVal   = tel(idx);
  const domicilio = `Calle Ficticia ${idx * 7} Col. Centro, Metepec, Méx.`;

  await qa.query(
    `UPDATE public.arrendatarios SET
      locatario = $1, nombre_negocio = $2, nombre_razon_social = $3,
      rfc = $4, email = $5, telefono = $6,
      domicilio = $7, domicilio_fiscal = $7, representante_legal = $8
     WHERE id = $9`,
    [locatario, esMoral ? locatario : `Negocio ${ap}`, razonSocial,
     rfc, emailVal, telVal, domicilio,
     esMoral ? `${pick(NOMBRES_M, idx)} ${ap}` : null,
     r.id]
  );
  log(`arrendatario → ${locatario} / ${rfc}`);
}

// ─── 2. prp.arrendatarios ────────────────────────────────────────────────────
console.log("\n[2/5] prp.arrendatarios");
const { rows: arrPrp } = await qa.query(
  `SELECT id, tipo_persona FROM prp.arrendatarios ORDER BY created_at`
);

for (let i = 0; i < arrPrp.length; i++) {
  const r = arrPrp[i];
  const esMoral = (r.tipo_persona === "MORAL");
  const idx = i + 1;
  const ap  = pick(APELLIDOS_P, idx + 3);
  const am  = pick(APELLIDOS_M, idx + 8);
  const nom = esMoral ? null : pick(idx % 2 === 0 ? NOMBRES_M : NOMBRES_F, idx + 2);
  const giro = pick(GIROS, idx + 2);
  const rfc  = esMoral ? rfcMoral(giro, ap, idx + 100) : rfcFisica(ap, am, nom, idx + 100);
  const nombreVal = esMoral ? `${giro} ${ap} S.A. DE C.V.` : nom;
  const apellidosVal = esMoral ? null : `${ap} ${am}`;

  await qa.query(
    `UPDATE prp.arrendatarios SET
      nombre = $1, apellidos = $2,
      razon_social = $3, rfc = $4,
      curp = $5, email = $6,
      telefono = $7, whatsapp = $7,
      domicilio = $8
     WHERE id = $9`,
    [
      nombreVal, apellidosVal,
      esMoral ? nombreVal : null,
      rfc,
      esMoral ? null : curp(nom, ap, am, idx + 100, idx % 2 === 0 ? "M" : "F"),
      email(esMoral ? giro.toLowerCase() : nom, ap, idx + 100),
      tel(idx + 100),
      `Calle Ficticia ${idx * 11}, Col. Ficticia, Metepec, Méx.`,
      r.id,
    ]
  );
  log(`prp.arrendatario → ${nombreVal}`);
}

// ─── 3. public.contratos — campos fiador ─────────────────────────────────────
console.log("\n[3/5] public.contratos — fiadores");
const { rows: conts } = await qa.query(
  `SELECT id FROM public.contratos WHERE fiador_nombre IS NOT NULL ORDER BY created_at`
);

for (let i = 0; i < conts.length; i++) {
  const idx = i + 1;
  const ap  = pick(APELLIDOS_P, idx + 10);
  const am  = pick(APELLIDOS_M, idx + 15);
  const nom = pick(idx % 2 === 0 ? NOMBRES_M : NOMBRES_F, idx + 10);
  const rfc = rfcFisica(ap, am, nom, idx + 200);

  await qa.query(
    `UPDATE public.contratos SET
      fiador_nombre = $1, fiador_rfc = $2,
      fiador_domicilio = $3, fiador_ife = $4, fiador_telefono = $5
     WHERE id = $6`,
    [
      `${nom} ${ap} ${am}`,
      rfc,
      `Calle Ficticia ${idx * 13} Col. Centro, Toluca, Méx.`,
      `INE${String(100000000 + idx * 9999).slice(0, 9)}`,
      tel(idx + 200),
      conts[i].id,
    ]
  );
  log(`fiador contrato ${i + 1} → ${nom} ${ap} ${am}`);
}

// ─── 4. prp.avales ───────────────────────────────────────────────────────────
console.log("\n[4/5] prp.avales");
const { rows: avales } = await qa.query(
  `SELECT id FROM prp.avales ORDER BY created_at`
).catch(() => ({ rows: [] }));

for (let i = 0; i < avales.length; i++) {
  const idx = i + 1;
  const ap  = pick(APELLIDOS_P, idx + 20);
  const am  = pick(APELLIDOS_M, idx + 25);
  const nom = pick(idx % 2 === 0 ? NOMBRES_M : NOMBRES_F, idx + 20);
  await qa.query(
    `UPDATE prp.avales SET
      nombre = $1, apellido_pat = $2, apellido_mat = $3,
      rfc = $4, email = $5, telefono = $6, domicilio = $7
     WHERE id = $8`,
    [nom, ap, am, rfcFisica(ap, am, nom, idx + 300),
     email(nom, ap, idx + 300), tel(idx + 300),
     `Calle Ficticia ${idx * 17} Col. Centro, Toluca, Méx.`,
     avales[i].id]
  );
  log(`aval ${i + 1} → ${nom} ${ap}`);
}

// ─── 5. public.rh_empleados ──────────────────────────────────────────────────
console.log("\n[5/5] public.rh_empleados");
const { rows: emps } = await qa.query(
  `SELECT id, sexo FROM public.rh_empleados ORDER BY created_at`
);

for (let i = 0; i < emps.length; i++) {
  const r   = emps[i];
  const idx = i + 1;
  const sexo = r.sexo || (idx % 2 === 0 ? "M" : "F");
  const ap   = pick(APELLIDOS_P, idx + 1);
  const am   = pick(APELLIDOS_M, idx + 6);
  const nom  = pick(sexo === "M" ? NOMBRES_M : NOMBRES_F, idx);
  const rfcVal  = rfcFisica(ap, am, nom, idx + 400);
  const curpVal = curp(nom, ap, am, idx + 400, sexo);
  const nssVal  = nss(idx + 400);
  const clabeVal = clabe(idx);

  await qa.query(
    `UPDATE public.rh_empleados SET
      nombre = $1, apellido_pat = $2, apellido_mat = $3,
      rfc = $4, curp = $5, nss = $6,
      email = $7, celular = $8, telefono_fijo = $8,
      cuenta_clabe = $9,
      calle = $10, colonia = 'Col. Ficticia', municipio = 'Metepec',
      estado_domicilio = 'México', codigo_postal = $11,
      contacto_emergencia_nombre = $12, contacto_emergencia_telefono = $13,
      foto_url = NULL
     WHERE id = $14`,
    [
      nom, ap, am,
      rfcVal, curpVal, nssVal,
      email(nom, ap, idx + 400),
      tel(idx + 400),
      clabeVal,
      `Calle Ficticia ${idx * 19}`,
      String(52100 + (idx % 900)),
      `${pick(NOMBRES_F, idx + 5)} ${pick(APELLIDOS_P, idx + 7)}`,
      tel(idx + 500),
      r.id,
    ]
  );
  log(`empleado → ${nom} ${ap} ${am} / RFC: ${rfcVal}`);
}

// ─── 6. Inmueble — quitar referencia a IWOL ──────────────────────────────────
console.log("\n[6/6] prp.inmuebles — nombre ficticio");
await qa.query(
  `UPDATE prp.inmuebles SET
    nombre    = 'Plaza Comercial del Norte',
    direccion = 'Blvd. de las Industrias 1500',
    colonia   = 'Col. Parque Industrial',
    municipio = 'Metepec',
    estado    = 'México',
    cp        = '52140'
  WHERE nombre ILIKE '%IWOL%' OR nombre ILIKE '%Alcedines%' OR TRUE`
);
log("inmueble(s) → Plaza Comercial del Norte");

await qa.end();

console.log(`\n✓ Anonimización completa — ${total} registros actualizados`);
console.log("  Ahora re-ejecuta: node scripts/generar-fichas-bancarias.mjs");
