// Genera fichas bancarias ficticias (HTML) para demo de comprobantes de pago
// Dos estilos: documento SPEI detallado + confirmación estilo app
// Uso: node scripts/generar-fichas-bancarias.mjs
// Salida: tickets-demo/fichas/*.html

import fs from "fs";
import pg from "pg";
import path from "path";

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

// ─── Bancos ficticios ─────────────────────────────────────────────────────────
const BANCOS = [
  {
    key: "BSR",
    nombre: "Banco del Sureste",
    color: "#1a6e3c",
    colorClaro: "#e8f5ee",
    estilo: "spei",
    clabe: "021680040123456789",
    tel: "800 900 2020",
  },
  {
    key: "BVT",
    nombre: "Banco Vital",
    color: "#1a3a6e",
    colorClaro: "#e8eef5",
    estilo: "app",
    clabe: "030680050987654321",
    tel: "800 845 0000",
  },
  {
    key: "BAT",
    nombre: "Banco del Atlántico",
    color: "#7b1a1a",
    colorClaro: "#f5e8e8",
    estilo: "spei",
    clabe: "012680061122334455",
    tel: "800 710 1010",
  },
];

const BENEFICIARIO = {
  nombre: "PLAZA COMERCIAL DEL NORTE S.A. DE C.V.",
  rfc: "PCN190315R72",
  clabe: "****3812",
  banco: "Banco del Sureste",
};

const MESES_ES = ["","enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MESES_ABR = ["","ENE","FEB","MAR","ABR","MAY","JUN",
  "JUL","AGO","SEP","OCT","NOV","DIC"];

function fmtMXN(n) {
  return `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
}
function fmtFecha(anio, mes, dia) {
  return `${String(dia).padStart(2,"0")}/${String(mes).padStart(2,"0")}/${anio}`;
}
function rastreo(banco, anio, mes, dia, idx) {
  return `${banco.key}${anio}${String(mes).padStart(2,"0")}${String(dia).padStart(2,"0")}${String(idx).padStart(9,"0")}`;
}
function numOp(banco, idx) {
  return `${banco.key}-${new Date().getFullYear()}-${String(idx).padStart(8,"0")}`;
}

// ─── Estilo 1: Documento SPEI — HTML interno ─────────────────────────────────
function innerSpei(data, banco, numOperacion) {
  const { ordenante, rfcOrdenante, importe, referencia, concepto,
          fechaDisp, horaDisp, fechaApl, cuentaOrigen, claveRastreo } = data;
  return `<div class="doc" style="background:#fff;width:480px;border:1px solid #ccc;border-radius:4px;overflow:hidden;font-family:Arial,sans-serif;">
  <div style="background:${banco.color};color:#fff;padding:14px 20px;">
    <div style="font-size:15px;font-weight:700;margin-bottom:2px;">${banco.nombre}</div>
    <div style="font-size:11px;opacity:.85;">Comprobante de Transferencia SPEI</div>
  </div>
  <div style="background:${banco.colorClaro};padding:8px 20px;font-size:11px;color:${banco.color};font-weight:600;border-bottom:1px solid #ddd;">
    Transferencias / Otros Bancos Nacional - SPEI (Mismo día) &nbsp;·&nbsp; No. Operación: ${numOperacion}
  </div>
  ${[
    ["Operación","Transferencia SPEI"],
    ["Fecha y Hora de Operación",`${fechaDisp} ${horaDisp} horas`],
    ["Nombre del Ordenante", ordenante],
    ["RFC del Ordenante", rfcOrdenante],
    ["Cuenta Origen", `****${cuentaOrigen}`],
    ["Nombre del Beneficiario", BENEFICIARIO.nombre],
    ["CLABE Destino", BENEFICIARIO.clabe],
    ["Banco Destino", BENEFICIARIO.banco],
    ["RFC del Beneficiario", BENEFICIARIO.rfc],
  ].map(([l,v]) => `<div style="display:flex;padding:7px 20px;border-bottom:1px solid #f0f0f0;">
    <span style="width:200px;flex-shrink:0;font-size:12px;color:#666;">${l}:</span>
    <span style="flex:1;font-size:12px;color:#111;font-weight:600;">${v}</span>
  </div>`).join("")}
  <div style="display:flex;padding:7px 20px;border-bottom:1px solid #f0f0f0;">
    <span style="width:200px;flex-shrink:0;font-size:12px;color:#333;font-weight:700;">Importe a Transferir:</span>
    <span style="flex:1;font-size:15px;color:${banco.color};font-weight:700;">${importe} MN</span>
  </div>
  ${[
    ["Número de Referencia", referencia],
    ["Concepto del Pago", concepto],
    ["Fecha de Aplicación", fechaApl],
  ].map(([l,v]) => `<div style="display:flex;padding:7px 20px;border-bottom:1px solid #f0f0f0;">
    <span style="width:200px;flex-shrink:0;font-size:12px;color:#666;">${l}:</span>
    <span style="flex:1;font-size:12px;color:#111;font-weight:600;">${v}</span>
  </div>`).join("")}
  <div style="display:flex;padding:7px 20px;">
    <span style="width:200px;flex-shrink:0;font-size:12px;color:#666;">Clave de Rastreo:</span>
    <span style="flex:1;font-size:11px;color:#1a3a6e;font-weight:600;font-family:'Courier New',monospace;word-break:break-all;">${claveRastreo}</span>
  </div>
  <div style="background:#f9f9f9;border-top:1px solid #ddd;padding:10px 20px;font-size:10px;color:#888;text-align:center;">
    <span style="color:${banco.color};font-weight:600;">✓ Transferencia procesada exitosamente</span>
    &nbsp;·&nbsp; ${banco.nombre} &nbsp;·&nbsp; Tel. ${banco.tel} &nbsp;·&nbsp; Regulado por CNBV
  </div>
</div>`;
}

function htmlSpei(data, banco, nombrePng, numOperacion) {
  const inner = innerSpei(data, banco, numOperacion);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<style>* {margin:0;padding:0;box-sizing:border-box;} body {background:#e8e8e8;display:flex;flex-direction:column;align-items:center;padding:24px;gap:14px;font-family:Arial,sans-serif;} .dl-btn {width:480px;padding:11px;background:${banco.color};color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:bold;}</style>
</head><body>
<button class="dl-btn" onclick="descargar()">⬇ Descargar como PNG</button>
<div id="doc">${inner}</div>
<script>function descargar(){html2canvas(document.getElementById('doc'),{scale:2,backgroundColor:'#ffffff'}).then(function(c){var a=document.createElement('a');a.download='${nombrePng}';a.href=c.toDataURL('image/png');a.click();});}</script>
</body></html>`;
}

// ─── Estilo 2: Confirmación app — HTML interno ────────────────────────────────
function innerApp(data, banco) {
  const { ordenante, importe, referencia, concepto, fechaLarga, horaDisp, cuentaOrigen } = data;
  return `<div style="background:#fff;width:380px;border:1px solid #ccc;border-radius:12px;overflow:hidden;font-family:Arial,sans-serif;">
  <div style="background:${banco.color};padding:18px 24px 22px;color:#fff;">
    <div style="font-size:12px;opacity:.8;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">${banco.nombre}</div>
    <div style="font-size:28px;margin-bottom:6px;">✓</div>
    <div style="font-size:13px;opacity:.85;font-weight:400;">Transferencia exitosa</div>
  </div>
  <div style="padding:0 0 18px;background:#fff;">
    <div style="background:#fff;margin:-14px 16px 0;border-radius:10px;padding:16px 20px;box-shadow:0 2px 8px rgba(0,0,0,.12);">
      <div style="font-size:28px;font-weight:700;color:#111;">${importe}</div>
      <div style="font-size:13px;color:#555;margin-top:2px;">a ${BENEFICIARIO.nombre}</div>
    </div>
    <div style="padding:18px 24px 4px;">
      <div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Fecha y hora</div>
      <div style="font-size:13px;color:#111;font-weight:600;margin-bottom:10px;">${fechaLarga}, ${horaDisp} h</div>
      <hr style="border:none;border-top:1px solid #eee;margin:12px 0;">
      <div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Desde</div>
      <div style="font-size:13px;color:#111;font-weight:600;margin-bottom:10px;">CUENTA ${banco.nombre.toUpperCase()} *${cuentaOrigen}</div>
      <hr style="border:none;border-top:1px solid #eee;margin:12px 0;">
      <div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Cuenta destino</div>
      <div style="font-size:13px;color:#111;font-weight:600;margin-bottom:10px;">${BENEFICIARIO.nombre} ${BENEFICIARIO.clabe}</div>
      <hr style="border:none;border-top:1px solid #eee;margin:12px 0;">
      <div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Concepto</div>
      <div style="font-size:13px;color:#111;font-weight:600;margin-bottom:10px;">${concepto}</div>
      <div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Referencia</div>
      <div style="font-size:13px;color:#111;font-weight:600;margin-bottom:10px;">${referencia}</div>
      <span style="display:inline-block;background:${banco.colorClaro};color:${banco.color};font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;margin-top:4px;">✓ Procesada exitosamente</span>
    </div>
  </div>
  <div style="padding:14px 24px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #f0f0f0;">${banco.nombre} · ${banco.tel} · Regulado por CNBV</div>
</div>`;
}

function htmlApp(data, banco, nombrePng) {
  const inner = innerApp(data, banco);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<style>* {margin:0;padding:0;box-sizing:border-box;} body {background:#e8e8e8;display:flex;flex-direction:column;align-items:center;padding:24px;gap:14px;font-family:Arial,sans-serif;} .dl-btn {width:380px;padding:11px;background:${banco.color};color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:bold;}</style>
</head><body>
<button class="dl-btn" onclick="descargar()">⬇ Descargar como PNG</button>
<div id="doc">${inner}</div>
<script>function descargar(){html2canvas(document.getElementById('doc'),{scale:2,backgroundColor:'#ffffff'}).then(function(c){var a=document.createElement('a');a.download='${nombrePng}';a.href=c.toDataURL('image/png');a.click();});}</script>
</body></html>`;
}

// ─── Conectar a QA y leer contratos ──────────────────────────────────────────
await qa.connect();

const { rows: contratos } = await qa.query(`
  SELECT
    c.numero_contrato,
    c.renta_mensual,
    c.locales_display,
    a.locatario          AS nombre_arrendatario,
    a.rfc                AS rfc_arrendatario
  FROM public.contratos c
  JOIN public.arrendatarios a ON a.id = c.arrendatario_id
  WHERE c.estatus = 'VIGENTE'
  ORDER BY c.numero_contrato
  LIMIT 30
`);

await qa.end();

if (!contratos.length) {
  console.log("No hay contratos VIGENTES en QA.");
  process.exit(0);
}

// ─── Generar archivos ─────────────────────────────────────────────────────────
const OUT = "tickets-demo/fichas";
fs.mkdirSync(OUT, { recursive: true });

const MESES_PAGO = [
  { anio: 2026, mes: 7,  diasRango: [2, 15] },
  { anio: 2026, mes: 8,  diasRango: [1, 18] },
  { anio: 2026, mes: 9,  diasRango: [1, 15] },
];

let idx = 0;
let totalGenerados = 0;
const archivosIndex = [];

for (const contrato of contratos) {
  const banco = BANCOS[idx % BANCOS.length];
  idx++;

  const localRaw = (contrato.locales_display || "").split(",")[0].trim();
  const localClave = localRaw.replace(/\s+/g, "").toUpperCase() || `L${String(idx).padStart(2,"0")}`;

  for (const { anio, mes, diasRango } of MESES_PAGO) {
    const dia = diasRango[0] + Math.floor(Math.random() * (diasRango[1] - diasRango[0]));
    const hora = 8 + Math.floor(Math.random() * 11);
    const min  = Math.floor(Math.random() * 60);
    const seg  = Math.floor(Math.random() * 60);
    const cuentaOrigen = String(Math.floor(Math.random() * 9000 + 1000));

    const data = {
      ordenante:     contrato.nombre_arrendatario,
      rfcOrdenante:  contrato.rfc_arrendatario || "XAXX010101000",
      importe:       fmtMXN(contrato.renta_mensual),
      referencia:    `${anio}${String(mes).padStart(2,"0")}${localClave}`,
      concepto:      `RENTA ${MESES_ABR[mes]} ${anio} ${localClave}`,
      fechaDisp:     fmtFecha(anio, mes, dia),
      fechaApl:      fmtFecha(anio, mes, dia),
      fechaLarga:    `${dia} de ${MESES_ES[mes]} de ${anio}`,
      horaDisp:      `${String(hora).padStart(2,"0")}:${String(min).padStart(2,"0")}:${String(seg).padStart(2,"0")}`,
      cuentaOrigen,
      claveRastreo:  rastreo(banco, anio, mes, dia, totalGenerados + 1000),
      numOperacion:  numOp(banco, totalGenerados + 1000),
    };
    data.numOperacion = data.numOperacion || numOp(banco, totalGenerados + 1000);

    const slug = `${banco.key.toLowerCase()}_${anio}${String(mes).padStart(2,"0")}_${localClave.toLowerCase()}`;
    const nombreHtml = `${slug}.html`;
    const nombrePng  = `${slug}.png`;

    const inner = banco.estilo === "app"
      ? innerApp(data, banco)
      : innerSpei(data, banco, data.numOperacion);

    const html = banco.estilo === "app"
      ? htmlApp(data, banco, nombrePng)
      : htmlSpei(data, banco, nombrePng, data.numOperacion);

    fs.writeFileSync(path.join(OUT, nombreHtml), html, "utf8");
    archivosIndex.push({ idx: totalGenerados, slug, nombrePng, banco: banco.nombre, mes: `${MESES_ABR[mes]} ${anio}`, local: localClave, inner });
    console.log(`  ✓ ${nombreHtml}`);
    totalGenerados++;
  }
}

// ─── Index con todas las fichas embebidas inline ──────────────────────────────
const itemsJson = JSON.stringify(archivosIndex.map(a => ({ idx: a.idx, png: a.nombrePng })));

const indexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Fichas Bancarias — IRP QA Demo</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; background:#ddd; padding:20px; }
  h1 { font-size:17px; margin-bottom:4px; }
  .nota { font-size:11px; color:#777; margin-bottom:14px; }
  .toolbar { display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
  #btnAll { padding:10px 22px; background:#1a3a6e; color:#fff; border:none; border-radius:5px; cursor:pointer; font-size:13px; font-weight:bold; }
  #btnAll:disabled { background:#888; cursor:default; }
  #status { font-size:12px; color:#555; }
  .grid { display:flex; flex-wrap:wrap; gap:20px; }
  .card { background:#f0f0f0; border-radius:8px; padding:10px 12px; box-shadow:0 1px 4px rgba(0,0,0,.12); display:flex; flex-direction:column; gap:8px; }
  .meta { font-size:11px; color:#666; }
  .meta strong { color:#333; display:block; margin-bottom:2px; }
  .dl-btn { padding:7px 14px; background:#555; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold; align-self:flex-start; }
  .dl-btn:hover { background:#333; }
</style>
</head>
<body>
<h1>Fichas Bancarias — IRP QA Demo</h1>
<p class="nota">${totalGenerados} fichas listas (Banco del Sureste · Banco Vital · Banco del Atlántico). Descarga individual o todas de un golpe.</p>
<div class="toolbar">
  <button id="btnAll" onclick="descargarTodos()">⬇ Descargar todas (${totalGenerados} PNG)</button>
  <span id="status"></span>
</div>
<div class="grid">
${archivosIndex.map((a) => `  <div class="card">
    <div class="meta"><strong>${a.banco}</strong>${a.local} &middot; ${a.mes}</div>
    <div id="f${a.idx}">${a.inner}</div>
    <button class="dl-btn" onclick="cap(${a.idx},'${a.nombrePng}')">⬇ ${a.nombrePng}</button>
  </div>`).join("\n")}
</div>
<script>
async function cap(idx, fname) {
  const el = document.getElementById('f' + idx).firstElementChild;
  const c = await html2canvas(el, { scale:2, backgroundColor:'#ffffff' });
  const a = document.createElement('a'); a.download = fname; a.href = c.toDataURL('image/png'); a.click();
}
async function descargarTodos() {
  const btn = document.getElementById('btnAll');
  const st  = document.getElementById('status');
  btn.disabled = true;
  const items = ${itemsJson};
  for (let i = 0; i < items.length; i++) {
    st.textContent = 'Descargando ' + (i+1) + ' de ' + items.length + '...';
    await cap(items[i].idx, items[i].png);
    await new Promise(r => setTimeout(r, 900));
  }
  st.textContent = '✓ Listo — ' + items.length + ' archivos descargados';
  btn.disabled = false;
}
</script>
</body>
</html>`;

fs.writeFileSync(path.join(OUT, "index.html"), indexHtml, "utf8");

console.log(`\n✓ ${totalGenerados} fichas generadas en ${OUT}/`);
console.log(`  → Abre tickets-demo/fichas/index.html en Chrome`);
