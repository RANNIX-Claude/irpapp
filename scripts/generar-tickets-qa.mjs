/**
 * generar-tickets-qa.mjs
 * Genera tickets de compra y fichas bancarias para QA con montos normalizados:
 *   - Tickets de compra → $100 cada uno (IVA 0%, un solo artículo)
 *   - Fichas bancarias  → $10,000 cada una (una por contrato activo en QA)
 *
 * Los archivos HTML generados incluyen botón "Descargar PNG" (html2canvas).
 *
 * Uso: node scripts/generar-tickets-qa.mjs [tickets|fichas|all]
 * Salida: tickets-demo/qa-tickets/  y  tickets-demo/qa-fichas/
 */

import fs from 'fs'
import path from 'path'
import pg from 'pg'

// ── Credenciales ──────────────────────────────────────────────────────────────
const envText = fs.readFileSync('C:\\Users\\asus\\OneDrive\\work\\IRPAPP\\DEv\\.env.local', 'utf8')
const env = {}
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const modo = process.argv[2] || 'all'

// ── Catálogos de tiendas ficticias ────────────────────────────────────────────
const TIENDAS = [
  { nombre: 'ALMACÉN DEL NORTE',         rfc: 'ANO850614H45', color: '#1a5276', caja: '02', cajero: 'ELENA H.',    tel: '(722) 214-3300', dir: 'Av. Industrial 1234, Metepec, Méx.' },
  { nombre: 'FERRETERÍA EL CONSTRUCTOR', rfc: 'FEC880205C32', color: '#922b21', caja: '01', cajero: 'RODRIGO C.', tel: '(722) 315-8800', dir: 'Calle Herrero 456, Toluca, Méx.' },
  { nombre: 'FARMACIAS SALUD PLUS',       rfc: 'SPF920318J78', color: '#1e8449', caja: '04', cajero: 'SARA L.',    tel: '(722) 456-1122', dir: 'Blvd. de la Salud 789, Metepec, Méx.' },
  { nombre: 'PAPELERÍA METRO',            rfc: 'PSM010912A56', color: '#7d6608', caja: '01', cajero: 'CRISTINA P.',tel: '(722) 213-9900', dir: 'Av. Tecnológico 321, Toluca, Méx.' },
  { nombre: 'SUMINISTROS GENERALES',      rfc: 'SGE030405B12', color: '#4a235a', caja: '03', cajero: 'MARIO T.',   tel: '(722) 550-2200', dir: 'Blvd. Aeropuerto 890, Metepec, Méx.' },
]

// Artículos a $100 IVA incluido (tasa 0%) — un artículo por ticket, total exacto $100
const ARTICULOS_100 = [
  { sku: 'SRV-001', desc: 'SERVICIO DE LIMPIEZA GENERAL',      grupo: 'LIMPIEZA',     tienda: 0 },
  { sku: 'FER-100', desc: 'MATERIAL DE FERRETERÍA VARIOS',     grupo: 'FERRETERIA',   tienda: 1 },
  { sku: 'FAR-100', desc: 'BOTIQUÍN DE PRIMEROS AUXILIOS',     grupo: 'GASTOS_MEDICOS', tienda: 2 },
  { sku: 'PAP-100', desc: 'PAPELERÍA Y ARTÍCULOS DE OFICINA',  grupo: 'PAPELERIA',    tienda: 3 },
  { sku: 'MAN-100', desc: 'MANTENIMIENTO PREVENTIVO MENOR',    grupo: 'MANTENIMIENTO', tienda: 1 },
  { sku: 'VND-100', desc: 'REPOSICIÓN PRODUCTOS VENDING',      grupo: 'VENDING_REPOSICION', tienda: 0 },
  { sku: 'UNI-100', desc: 'UNIFORMES PERSONAL (REPOSICIÓN)',   grupo: 'UNIFORMES',    tienda: 0 },
  { sku: 'LIM-100', desc: 'INSUMOS LIMPIEZA MENSUAL',          grupo: 'LIMPIEZA',     tienda: 4 },
  { sku: 'ELC-100', desc: 'MATERIAL ELÉCTRICO VARIOS',         grupo: 'FERRETERIA',   tienda: 1 },
  { sku: 'PLO-100', desc: 'INSUMOS PLOMERÍA',                  grupo: 'MANTENIMIENTO', tienda: 4 },
  { sku: 'ADM-100', desc: 'GASTOS ADMINISTRATIVOS VARIOS',     grupo: 'PAPELERIA',    tienda: 3 },
  { sku: 'SEG-100', desc: 'MATERIAL DE SEGURIDAD',             grupo: 'MANTENIMIENTO', tienda: 4 },
  { sku: 'JAR-100', desc: 'MANTENIMIENTO ÁREAS VERDES',        grupo: 'LIMPIEZA',     tienda: 0 },
  { sku: 'CAP-100', desc: 'CAPACITACIÓN PERSONAL (CUOTA)',     grupo: 'OTROS',        tienda: 3 },
  { sku: 'COM-100', desc: 'COMISIONES Y SERVICIOS VARIOS',     grupo: 'OTROS',        tienda: 4 },
  { sku: 'LIM-101', desc: 'DESINFECTANTES Y SANITIZANTES',     grupo: 'LIMPIEZA',     tienda: 0 },
  { sku: 'SRV-002', desc: 'SERVICIO CONTROL DE PLAGAS',        grupo: 'MANTENIMIENTO', tienda: 4 },
  { sku: 'FER-101', desc: 'PINTURAS Y RECUBRIMIENTOS',         grupo: 'FERRETERIA',   tienda: 1 },
  { sku: 'PAP-101', desc: 'IMPRESIONES Y COPIAS MASIVAS',      grupo: 'PAPELERIA',    tienda: 3 },
  { sku: 'SRV-003', desc: 'SERVICIO MENSAJERÍA Y ENVÍOS',      grupo: 'OTROS',        tienda: 3 },
]

// Fechas distribuidas en los últimos 3 meses
const FECHAS = [
  '2026-07-03','2026-07-08','2026-07-14','2026-07-21','2026-07-28',
  '2026-08-05','2026-08-11','2026-08-18','2026-08-22','2026-08-29',
  '2026-09-02','2026-09-08','2026-09-11','2026-09-15','2026-09-17',
  '2026-07-10','2026-07-25','2026-08-07','2026-08-26','2026-09-04',
]

const fmtMXN = n => `$${Number(n).toFixed(2)}`

// ── Generador de HTML de ticket térmico ──────────────────────────────────────
function buildTicket(art, tienda, fecha, folio) {
  const [anio, mes, dia] = fecha.split('-')
  const fechaDisp = `${dia}/${mes}/${anio}`
  const hora = `${(8 + Math.floor(Math.random() * 10)).toString().padStart(2,'0')}:${(Math.floor(Math.random() * 60)).toString().padStart(2,'0')}:${(Math.floor(Math.random() * 60)).toString().padStart(2,'0')}`

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#f0f0f0; display:flex; flex-direction:column; align-items:center; padding:20px; gap:12px; font-family:'Courier New',monospace; }
.dl-btn { width:300px; padding:10px; background:${tienda.color}; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:13px; font-weight:bold; }
.ticket { background:#fff; width:300px; padding:12px 14px; font-size:10.5px; line-height:1.5; color:#111; border:1px solid #ddd; }
.center { text-align:center; }
.bold { font-weight:bold; }
.big { font-size:13px; font-weight:bold; }
.sep { border:none; border-top:1px dashed #555; margin:6px 0; }
.sep-solid { border-top:1px solid #555; margin:6px 0; }
.row { display:flex; justify-content:space-between; margin:1px 0; }
.total-row { display:flex; justify-content:space-between; font-size:13px; font-weight:bold; margin:3px 0; }
.label { color:#444; }
.barcode { font-size:9px; letter-spacing:3px; color:#333; }
.small { font-size:9px; color:#555; }
.importe-box { background:${tienda.color}10; border:1.5px solid ${tienda.color}; border-radius:4px; padding:6px 10px; margin:6px 0; }
</style>
</head><body>
<button class="dl-btn" onclick="descargar()">⬇ Descargar PNG</button>
<div class="ticket" id="ticket">
  <div class="center bold big">${tienda.nombre}</div>
  <div class="center small">RFC: ${tienda.rfc}</div>
  <div class="center small">${tienda.dir}</div>
  <div class="center small">TEL: ${tienda.tel}</div>
  <hr class="sep">
  <div class="row"><span class="label">FECHA:</span><span>${fechaDisp} ${hora}</span></div>
  <div class="row"><span class="label">FOLIO:</span><span>${folio}</span></div>
  <div class="row"><span class="label">CAJERO:</span><span>${tienda.cajero}</span></div>
  <div class="row"><span class="label">CAJA:</span><span>${tienda.caja}</span></div>
  <hr class="sep">
  <div class="center bold small">DESCRIPCION DE COMPRA</div>
  <hr class="sep">
  <div style="margin:5px 0;">
    <span style="font-size:9px;color:#555;display:block;">${art.sku}</span>
    <span style="display:block;font-size:10px;font-weight:bold;">${art.desc}</span>
    <div style="display:flex;justify-content:space-between;font-size:10px;margin-top:2px;">
      <span>1 PZA/SRV</span>
      <span style="font-weight:bold;">$100.00 E</span>
    </div>
  </div>
  <hr class="sep-solid">
  <div class="row"><span class="label">SUBTOTAL (IVA 0%):</span><span>$100.00</span></div>
  <div class="row"><span class="label">IVA:</span><span>$0.00</span></div>
  <hr class="sep">
  <div class="importe-box">
    <div class="total-row" style="color:${tienda.color};">
      <span>TOTAL:</span><span>$100.00</span>
    </div>
  </div>
  <hr class="sep">
  <div class="row"><span class="label">FORMA DE PAGO:</span><span>EFECTIVO</span></div>
  <div class="row"><span class="label">EFECTIVO:</span><span>$100.00</span></div>
  <div class="row"><span class="label">CAMBIO:</span><span>$0.00</span></div>
  <hr class="sep">
  <div class="center bold">TOTAL ARTICULOS: 1</div>
  <hr class="sep">
  <div class="center small">ESTE COMPROBANTE NO ES CFDI</div>
  <div class="center barcode">||||| ${folio} |||||</div>
  <div class="center small" style="margin-top:4px">GRACIAS POR SU COMPRA</div>
</div>
<script>
function descargar() {
  html2canvas(document.getElementById('ticket'), { scale:2, backgroundColor:'#ffffff' }).then(function(c) {
    var a = document.createElement('a'); a.download = '${folio.toLowerCase()}.png'; a.href = c.toDataURL('image/png'); a.click();
  });
}
</script>
</body></html>`
}

// ── Generador de HTML de ficha bancaria ───────────────────────────────────────
const BANCOS = [
  { key:'BSR', nombre:'Banco del Sureste',   color:'#1a6e3c', colorClaro:'#e8f5ee', estilo:'spei', tel:'800 900 2020' },
  { key:'BVT', nombre:'Banco Vital',         color:'#1a3a6e', colorClaro:'#e8eef5', estilo:'app',  tel:'800 845 0000' },
  { key:'BAT', nombre:'Banco del Atlántico', color:'#7b1a1a', colorClaro:'#f5e8e8', estilo:'spei', tel:'800 710 1010' },
]
const BENEFICIARIO = { nombre:'PLAZA IWOL S.A. DE C.V.', rfc:'PIW200301R72', clabe:'****3812', banco:'Banco del Sureste' }
const MESES_ES  = ['','enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const MESES_ABR = ['','ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']

function buildFicha(contrato, banco, anio, mes, idx) {
  const dia  = 1 + Math.floor(Math.random() * 14)
  const hora = String(8 + Math.floor(Math.random() * 11)).padStart(2,'0')
  const min  = String(Math.floor(Math.random() * 60)).padStart(2,'0')
  const seg  = String(Math.floor(Math.random() * 60)).padStart(2,'0')
  const cuentaOrig = String(Math.floor(Math.random() * 9000 + 1000))
  const fechaDisp = `${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${anio}`
  const fechaLarga = `${dia} de ${MESES_ES[mes]} de ${anio}`
  const importe = `$${Number(contrato.renta_mensual).toLocaleString('es-MX', { minimumFractionDigits:2 })}`
  const localSlug = (contrato.locales_display || '').split(',')[0].trim().replace(/\s+/g,'') || `L${idx}`
  const referencia = `${anio}${String(mes).padStart(2,'0')}${localSlug}`
  const concepto = `RENTA ${MESES_ABR[mes]} ${anio} ${localSlug}`
  const claveRastreo = `${banco.key}${anio}${String(mes).padStart(2,'0')}${String(dia).padStart(2,'0')}${String(idx).padStart(9,'0')}`
  const numOp = `${banco.key}-${anio}-${String(idx).padStart(8,'0')}`
  const nombrePng = `ficha_${banco.key.toLowerCase()}_${anio}${String(mes).padStart(2,'0')}_${localSlug.toLowerCase()}.png`

  let inner = ''
  if (banco.estilo === 'spei') {
    inner = `<div style="background:#fff;width:480px;border:1px solid #ccc;border-radius:4px;overflow:hidden;font-family:Arial,sans-serif;">
  <div style="background:${banco.color};color:#fff;padding:14px 20px;">
    <div style="font-size:15px;font-weight:700;">${banco.nombre}</div>
    <div style="font-size:11px;opacity:.85;">Comprobante de Transferencia SPEI</div>
  </div>
  <div style="background:${banco.colorClaro};padding:8px 20px;font-size:11px;color:${banco.color};font-weight:600;border-bottom:1px solid #ddd;">
    No. Operación: ${numOp}
  </div>
  ${[['Fecha y Hora',`${fechaDisp} ${hora}:${min}:${seg}`],['Ordenante',contrato.nombre_arrendatario],['RFC Ordenante',contrato.rfc_arrendatario||'XAXX010101000'],['Cuenta Origen',`****${cuentaOrig}`],['Beneficiario',BENEFICIARIO.nombre],['CLABE Destino',BENEFICIARIO.clabe],['Banco Destino',BENEFICIARIO.banco],['RFC Beneficiario',BENEFICIARIO.rfc]]
    .map(([l,v])=>`<div style="display:flex;padding:7px 20px;border-bottom:1px solid #f0f0f0;"><span style="width:180px;flex-shrink:0;font-size:12px;color:#666;">${l}:</span><span style="flex:1;font-size:12px;color:#111;font-weight:600;">${v}</span></div>`).join('')}
  <div style="display:flex;padding:7px 20px;border-bottom:1px solid #f0f0f0;">
    <span style="width:180px;flex-shrink:0;font-size:12px;font-weight:700;color:#333;">IMPORTE:</span>
    <span style="flex:1;font-size:16px;color:${banco.color};font-weight:700;">${importe} MN</span>
  </div>
  ${[['Concepto',concepto],['Referencia',referencia],['Clave de Rastreo',claveRastreo]]
    .map(([l,v])=>`<div style="display:flex;padding:7px 20px;border-bottom:1px solid #f0f0f0;"><span style="width:180px;flex-shrink:0;font-size:12px;color:#666;">${l}:</span><span style="flex:1;font-size:11px;color:#111;font-weight:600;word-break:break-all;">${v}</span></div>`).join('')}
  <div style="background:#f9f9f9;border-top:1px solid #ddd;padding:10px 20px;font-size:10px;color:#888;text-align:center;">
    <span style="color:${banco.color};font-weight:600;">✓ Transferencia procesada exitosamente</span>
    &nbsp;·&nbsp; ${banco.nombre} &nbsp;·&nbsp; Tel. ${banco.tel}
  </div>
</div>`
  } else {
    inner = `<div style="background:#fff;width:360px;border:1px solid #ccc;border-radius:12px;overflow:hidden;font-family:Arial,sans-serif;">
  <div style="background:${banco.color};padding:18px 24px 22px;color:#fff;">
    <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">${banco.nombre}</div>
    <div style="font-size:28px;margin-bottom:4px;">✓</div>
    <div style="font-size:13px;opacity:.85;">Transferencia exitosa</div>
  </div>
  <div style="padding:0 0 18px;">
    <div style="background:#fff;margin:-14px 16px 0;border-radius:10px;padding:16px 20px;box-shadow:0 2px 8px rgba(0,0,0,.12);">
      <div style="font-size:26px;font-weight:700;color:${banco.color};">${importe}</div>
      <div style="font-size:12px;color:#555;margin-top:2px;">a ${BENEFICIARIO.nombre}</div>
    </div>
    <div style="padding:18px 24px 4px;">
      <div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Fecha</div>
      <div style="font-size:13px;color:#111;font-weight:600;margin-bottom:10px;">${fechaLarga}, ${hora}:${min} h</div>
      <hr style="border:none;border-top:1px solid #eee;margin:10px 0;">
      <div style="font-size:10px;color:#aaa;text-transform:uppercase;margin-bottom:4px;">Concepto</div>
      <div style="font-size:13px;color:#111;font-weight:600;margin-bottom:10px;">${concepto}</div>
      <div style="font-size:10px;color:#aaa;text-transform:uppercase;margin-bottom:4px;">Desde</div>
      <div style="font-size:13px;color:#111;font-weight:600;margin-bottom:10px;">${banco.nombre} ****${cuentaOrig}</div>
      <span style="display:inline-block;background:${banco.colorClaro};color:${banco.color};font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">✓ Procesada</span>
    </div>
  </div>
</div>`
  }

  const width = banco.estilo === 'spei' ? 480 : 360
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<style>* {margin:0;padding:0;box-sizing:border-box;} body {background:#e8e8e8;display:flex;flex-direction:column;align-items:center;padding:24px;gap:14px;font-family:Arial,sans-serif;} .dl-btn {width:${width}px;padding:11px;background:${banco.color};color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:bold;}</style>
</head><body>
<button class="dl-btn" onclick="descargar()">⬇ Descargar PNG</button>
<div id="doc">${inner}</div>
<script>function descargar(){html2canvas(document.getElementById('doc'),{scale:2,backgroundColor:'#ffffff'}).then(function(c){var a=document.createElement('a');a.download='${nombrePng}';a.href=c.toDataURL('image/png');a.click();});}</script>
</body></html>`
}

// ── PASO 1: Tickets de compra ─────────────────────────────────────────────────
if (modo === 'tickets' || modo === 'all') {
  const OUT = 'tickets-demo/qa-tickets'
  fs.mkdirSync(OUT, { recursive: true })

  const archivos = []
  let folioNum = 20260901

  for (let i = 0; i < ARTICULOS_100.length; i++) {
    const art    = ARTICULOS_100[i]
    const tienda = TIENDAS[art.tienda]
    const fecha  = FECHAS[i % FECHAS.length]
    const folio  = `${tienda.rfc.slice(0,3)}${folioNum++}`
    const nombre = `ticket_${String(i+1).padStart(2,'0')}_${art.grupo.toLowerCase()}.html`

    const html = buildTicket(art, tienda, fecha, folio)
    fs.writeFileSync(path.join(OUT, nombre), html, 'utf8')
    archivos.push({ i, nombre, nombrePng: nombre.replace('.html', '.png'), tienda: tienda.nombre, sku: art.sku, desc: art.desc.slice(0, 35), grupo: art.grupo })
    console.log(`  ✓ ${nombre}`)
  }

  // Index con gallery + "Descargar todos"
  const itemsJson = JSON.stringify(archivos.map(a => ({ idx: a.i, png: a.nombrePng, nombre: a.nombre })))
  const indexHtml = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Tickets $100 — QA</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<style>
* {margin:0;padding:0;box-sizing:border-box;}
body {font-family:Arial,sans-serif;background:#e0e0e0;padding:20px;}
h1 {font-size:17px;margin-bottom:4px;}
.nota {font-size:11px;color:#777;margin-bottom:14px;}
.toolbar {display:flex;align-items:center;gap:12px;margin-bottom:20px;}
#btnAll {padding:10px 22px;background:#1e8449;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:bold;}
#btnAll:disabled {background:#888;cursor:default;}
#status {font-size:12px;color:#555;}
.grid {display:flex;flex-wrap:wrap;gap:16px;}
.card {background:#f8f8f8;border-radius:8px;padding:10px;box-shadow:0 1px 4px rgba(0,0,0,.1);}
.meta {font-size:10px;color:#666;margin-bottom:6px;}
.meta strong {color:#222;display:block;}
.dl-btn {padding:6px 12px;background:#1a5276;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;margin-top:8px;}
</style>
</head><body>
<h1>Tickets de Compra $100 — QA Demo</h1>
<p class="nota">${archivos.length} tickets · $100.00 cada uno · IVA 0%</p>
<div class="toolbar">
  <button id="btnAll" onclick="descargarTodos()">⬇ Descargar todos (${archivos.length} PNG)</button>
  <span id="status"></span>
</div>
<div class="grid">
${archivos.map(a => `<div class="card">
  <div class="meta"><strong>${a.tienda}</strong>${a.grupo} · ${a.sku}</div>
  <iframe src="${a.nombre}" style="width:320px;height:420px;border:none;border-radius:4px;"></iframe>
  <br><button class="dl-btn" onclick="capIframe(${a.i},'${a.nombrePng}','${a.nombre}')">⬇ ${a.nombrePng}</button>
</div>`).join('\n')}
</div>
<script>
async function capIframe(idx, fname, src) {
  const win = window.open(src, '_blank', 'width=340,height=440');
  if (!win) { alert('Abre la página individual: ' + src); return; }
  await new Promise(r => setTimeout(r, 1200));
  win.descargar && win.descargar();
  setTimeout(() => win.close(), 3000);
}
async function descargarTodos() {
  const btn = document.getElementById('btnAll');
  const st  = document.getElementById('status');
  btn.disabled = true;
  const items = ${itemsJson};
  for (let i = 0; i < items.length; i++) {
    st.textContent = 'Abriendo ' + (i+1) + ' de ' + items.length + '...';
    const w = window.open(items[i].nombre, '_blank', 'width=340,height=440');
    await new Promise(r => setTimeout(r, 1500));
    if (w && w.descargar) w.descargar();
    await new Promise(r => setTimeout(r, 1200));
    if (w) w.close();
  }
  st.textContent = '✓ Listo';
  btn.disabled = false;
}
</script>
</body></html>`

  fs.writeFileSync(path.join(OUT, 'index.html'), indexHtml, 'utf8')
  console.log(`\n✓ ${archivos.length} tickets ($100) en ${OUT}/`)
  console.log(`  → Abre tickets-demo/qa-tickets/index.html en Chrome`)
}

// ── PASO 2: Fichas bancarias desde QA ─────────────────────────────────────────
if (modo === 'fichas' || modo === 'all') {
  const db = new pg.Client({
    host: 'db.wijcjdbmdbxzmwpdxoal.supabase.co',
    port: 5432, database: 'postgres', user: 'postgres',
    password: env.QA_SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  })
  await db.connect()

  const { rows: contratos } = await db.query(`
    SELECT c.numero_contrato, c.renta_mensual, c.locales_display,
           a.locatario AS nombre_arrendatario, a.rfc AS rfc_arrendatario
    FROM public.contratos c
    JOIN public.arrendatarios a ON a.id = c.arrendatario_id
    WHERE c.estatus = 'VIGENTE'
    ORDER BY c.numero_contrato
  `)
  await db.end()

  const OUT = 'tickets-demo/qa-fichas'
  fs.mkdirSync(OUT, { recursive: true })

  // 3 meses: julio, agosto, septiembre 2026
  const PERIODOS = [{ anio:2026, mes:7 }, { anio:2026, mes:8 }, { anio:2026, mes:9 }]
  let total = 0
  const archivos = []

  for (let ci = 0; ci < contratos.length; ci++) {
    const contrato = contratos[ci]
    const banco = BANCOS[ci % BANCOS.length]
    for (const { anio, mes } of PERIODOS) {
      const html = buildFicha(contrato, banco, anio, mes, total + 1000)
      const localSlug = (contrato.locales_display || '').split(',')[0].trim().replace(/\s+/g,'') || `L${ci+1}`
      const nombreHtml = `ficha_${banco.key.toLowerCase()}_${anio}${String(mes).padStart(2,'0')}_${localSlug.toLowerCase()}.html`
      const nombrePng  = nombreHtml.replace('.html', '.png')
      fs.writeFileSync(path.join(OUT, nombreHtml), html, 'utf8')
      archivos.push({ idx: total, nombreHtml, nombrePng, banco: banco.nombre, local: localSlug, mes: `${MESES_ABR[mes]} ${anio}`, importe: `$${Number(contrato.renta_mensual).toLocaleString('es-MX', { minimumFractionDigits:2 })}` })
      console.log(`  ✓ ${nombreHtml}`)
      total++
    }
  }

  const itemsJson = JSON.stringify(archivos.map(a => ({ idx: a.idx, png: a.nombrePng, html: a.nombreHtml })))
  const indexHtml = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Fichas $10,000 — QA</title>
<style>
* {margin:0;padding:0;box-sizing:border-box;}
body {font-family:Arial,sans-serif;background:#ddd;padding:20px;}
h1 {font-size:17px;margin-bottom:4px;}
.nota {font-size:11px;color:#777;margin-bottom:14px;}
.toolbar {display:flex;align-items:center;gap:12px;margin-bottom:20px;}
#btnAll {padding:10px 22px;background:#1a3a6e;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:bold;}
#btnAll:disabled {background:#888;cursor:default;}
#status {font-size:12px;color:#555;}
.grid {display:flex;flex-wrap:wrap;gap:16px;}
.card {background:#f0f0f0;border-radius:8px;padding:10px;box-shadow:0 1px 4px rgba(0,0,0,.1);display:flex;flex-direction:column;gap:6px;}
.meta {font-size:11px;color:#666;}
.meta strong {color:#333;display:block;}
.dl-btn {padding:7px 14px;background:#555;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;align-self:flex-start;}
</style>
</head><body>
<h1>Fichas Bancarias $10,000 — QA Demo</h1>
<p class="nota">${total} fichas · ${contratos.length} contratos × 3 meses (Jul-Sep 2026) · $10,000 c/u</p>
<div class="toolbar">
  <button id="btnAll" onclick="descargarTodos()">⬇ Descargar todas (${total} PNG)</button>
  <span id="status"></span>
</div>
<div class="grid">
${archivos.map(a => `<div class="card">
  <div class="meta"><strong>${a.banco}</strong>${a.local} · ${a.mes} · ${a.importe}</div>
  <iframe src="${a.nombreHtml}" style="width:500px;height:380px;border:none;border-radius:4px;"></iframe>
  <button class="dl-btn" onclick="capHtml('${a.nombreHtml}','${a.nombrePng}')">⬇ ${a.nombrePng}</button>
</div>`).join('\n')}
</div>
<script>
async function capHtml(src, fname) {
  const w = window.open(src, '_blank', 'width=520,height=420');
  await new Promise(r => setTimeout(r, 1200));
  if (w && w.descargar) w.descargar();
  setTimeout(() => w.close(), 3000);
}
async function descargarTodos() {
  const btn = document.getElementById('btnAll');
  const st  = document.getElementById('status');
  btn.disabled = true;
  const items = ${itemsJson};
  for (let i = 0; i < items.length; i++) {
    st.textContent = 'Descargando ' + (i+1) + ' de ' + items.length + '...';
    const w = window.open(items[i].html, '_blank', 'width=520,height=420');
    await new Promise(r => setTimeout(r, 1500));
    if (w && w.descargar) w.descargar();
    await new Promise(r => setTimeout(r, 1200));
    if (w) w.close();
  }
  st.textContent = '✓ Listo — ' + items.length + ' PNGs';
  btn.disabled = false;
}
</script>
</body></html>`

  fs.writeFileSync(path.join(OUT, 'index.html'), indexHtml, 'utf8')
  console.log(`\n✓ ${total} fichas ($10,000) en ${OUT}/`)
  console.log(`  → Abre tickets-demo/qa-fichas/index.html en Chrome`)
}
