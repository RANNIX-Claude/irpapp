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

// Catálogos de 10 productos × $10 por categoría — total siempre $100
const CATALOGO = {
  VENDING_REPOSICION: {
    tienda: 0, grupo: 'VENDING_REPOSICION',
    items: [
      { sku:'VND-001', desc:'COCA-COLA 600ML',           qty:1 },
      { sku:'VND-002', desc:'PEPSI 600ML',               qty:1 },
      { sku:'VND-003', desc:'AGUA CIEL 600ML',           qty:1 },
      { sku:'VND-004', desc:'BOING FRESA 500ML',         qty:1 },
      { sku:'VND-005', desc:'SABRITAS ORIGINAL 45G',     qty:1 },
      { sku:'VND-006', desc:'DORITOS NACHO 50G',         qty:1 },
      { sku:'VND-007', desc:'GANSITO MARINELA 46G',      qty:1 },
      { sku:'VND-008', desc:'SNICKERS 50G',              qty:1 },
      { sku:'VND-009', desc:'MARINELA PINGUINO',         qty:1 },
      { sku:'VND-010', desc:'JUMEX MANGO 335ML',         qty:1 },
    ],
  },
  LIMPIEZA: {
    tienda: 0, grupo: 'LIMPIEZA',
    items: [
      { sku:'LIM-001', desc:'JABON LIQUIDO 1L',          qty:1 },
      { sku:'LIM-002', desc:'CLORO CLORALEX 1L',         qty:1 },
      { sku:'LIM-003', desc:'FABULOSO LAVANDA 900ML',    qty:1 },
      { sku:'LIM-004', desc:'PINO SOL 1L',               qty:1 },
      { sku:'LIM-005', desc:'ESCOBA FIBRA DURA',         qty:1 },
      { sku:'LIM-006', desc:'MECHUDO INDUSTRIAL',        qty:1 },
      { sku:'LIM-007', desc:'JERGA INDUSTRIAL 70X90',    qty:1 },
      { sku:'LIM-008', desc:'FIBRA SCOTCH-BRITE',        qty:1 },
      { sku:'LIM-009', desc:'BOLSAS BASURA 20PZ',        qty:1 },
      { sku:'LIM-010', desc:'SANITIZANTE MULTISUP 500ML',qty:1 },
    ],
  },
  FERRETERIA: {
    tienda: 1, grupo: 'FERRETERIA',
    items: [
      { sku:'FER-001', desc:'TORNILLOS AUTOP 1" 50PZ',   qty:1 },
      { sku:'FER-002', desc:'CINTA CANELA 2" ROLLO',     qty:1 },
      { sku:'FER-003', desc:'FOCO LED 10W E27',          qty:1 },
      { sku:'FER-004', desc:'CLAVOS 2.5" 100PZ',         qty:1 },
      { sku:'FER-005', desc:'BISAGRA 3" PAR',            qty:1 },
      { sku:'FER-006', desc:'LLAVE ESPAÑOLA 12"',        qty:1 },
      { sku:'FER-007', desc:'TUERCAS HEX 3/8" 20PZ',    qty:1 },
      { sku:'FER-008', desc:'BROCA HSS 6MM',             qty:1 },
      { sku:'FER-009', desc:'CERROJO SEGURIDAD 3"',      qty:1 },
      { sku:'FER-010', desc:'CABLE THW 14AWG 5M',        qty:1 },
    ],
  },
  MANTENIMIENTO: {
    tienda: 4, grupo: 'MANTENIMIENTO',
    items: [
      { sku:'MAN-001', desc:'SILICONA TRANSPARENTE 280G',qty:1 },
      { sku:'MAN-002', desc:'PINTURA VINILICA BLANCA 1L',qty:1 },
      { sku:'MAN-003', desc:'LIJA AGUA 120 5PZ',         qty:1 },
      { sku:'MAN-004', desc:'TUBO COBRE 1/2" 1MT',       qty:1 },
      { sku:'MAN-005', desc:'CODO CPVC 1/2"',            qty:1 },
      { sku:'MAN-006', desc:'TEFLÓN ROLLO 12MT',         qty:1 },
      { sku:'MAN-007', desc:'SOLDADURA PLATA 1PZ',       qty:1 },
      { sku:'MAN-008', desc:'INTERRUPTOR SENCILLO',      qty:1 },
      { sku:'MAN-009', desc:'CONTACTO DOBLE 15A',        qty:1 },
      { sku:'MAN-010', desc:'PASTA SOLDADURA 50G',       qty:1 },
    ],
  },
  PAPELERIA: {
    tienda: 3, grupo: 'PAPELERIA',
    items: [
      { sku:'PAP-001', desc:'RESMA PAPEL CARTA 75G',     qty:1 },
      { sku:'PAP-002', desc:'BOLIGRAFO BIC AZUL 10PZ',   qty:1 },
      { sku:'PAP-003', desc:'FOLDER MANILA CARTA 25PZ',  qty:1 },
      { sku:'PAP-004', desc:'CARPETA ARGOLLAS 1"',       qty:1 },
      { sku:'PAP-005', desc:'GRAPAS ESTANDAR 5000PZ',    qty:1 },
      { sku:'PAP-006', desc:'CINTA ADHESIVA 12MM 3PZ',   qty:1 },
      { sku:'PAP-007', desc:'POST-IT 3X3 COLORES 4PZ',   qty:1 },
      { sku:'PAP-008', desc:'MARCADOR PERMANENTE 5PZ',   qty:1 },
      { sku:'PAP-009', desc:'SOBRE BLANCO T/CARTA 25PZ', qty:1 },
      { sku:'PAP-010', desc:'CORRECTOR LIQUIDO 20ML',    qty:1 },
    ],
  },
  GASTOS_MEDICOS: {
    tienda: 2, grupo: 'GASTOS_MEDICOS',
    items: [
      { sku:'FAR-001', desc:'PARACETAMOL 500MG 10PZ',    qty:1 },
      { sku:'FAR-002', desc:'IBUPROFENO 400MG 10PZ',     qty:1 },
      { sku:'FAR-003', desc:'ALCOHOL GEL 500ML',         qty:1 },
      { sku:'FAR-004', desc:'VENDAS ELASTICA 3" 2PZ',    qty:1 },
      { sku:'FAR-005', desc:'GASAS ESTERIL 10X10 10PZ',  qty:1 },
      { sku:'FAR-006', desc:'CURITAS VARIADAS 20PZ',     qty:1 },
      { sku:'FAR-007', desc:'AGUA OXIGENADA 250ML',      qty:1 },
      { sku:'FAR-008', desc:'TERMOMETRO DIGITAL',        qty:1 },
      { sku:'FAR-009', desc:'POMADA ANTIINFLAMATORIA',   qty:1 },
      { sku:'FAR-010', desc:'GUANTES LATEX M 10PZ',      qty:1 },
    ],
  },
  UNIFORMES: {
    tienda: 0, grupo: 'UNIFORMES',
    items: [
      { sku:'UNI-001', desc:'PLAYERA POLO AZUL M',       qty:1 },
      { sku:'UNI-002', desc:'PLAYERA POLO AZUL L',       qty:1 },
      { sku:'UNI-003', desc:'PLAYERA POLO AZUL XL',      qty:1 },
      { sku:'UNI-004', desc:'PANTALON CARGO BEIGE 30',   qty:1 },
      { sku:'UNI-005', desc:'PANTALON CARGO BEIGE 32',   qty:1 },
      { sku:'UNI-006', desc:'PANTALON CARGO BEIGE 34',   qty:1 },
      { sku:'UNI-007', desc:'CALCETINES NEGROS 3PZ',     qty:1 },
      { sku:'UNI-008', desc:'GORRA LOGOTIPO PLAZA',      qty:1 },
      { sku:'UNI-009', desc:'CHALECO SEGURIDAD NARANJA', qty:1 },
      { sku:'UNI-010', desc:'CINTURON TRABAJO NEGRO',    qty:1 },
    ],
  },
  OTROS: {
    tienda: 3, grupo: 'OTROS',
    items: [
      { sku:'OTR-001', desc:'CAFE SOLUBLE 200G',         qty:1 },
      { sku:'OTR-002', desc:'AZUCAR ESTANDAR 500G',      qty:1 },
      { sku:'OTR-003', desc:'VASOS DESECHABLES 7OZ 50PZ',qty:1 },
      { sku:'OTR-004', desc:'SERVILLETAS DISPENSADOR 200PZ',qty:1 },
      { sku:'OTR-005', desc:'PILAS AA 4PZ',              qty:1 },
      { sku:'OTR-006', desc:'PILAS AAA 4PZ',             qty:1 },
      { sku:'OTR-007', desc:'EXTENSION 3M TRIPLE',       qty:1 },
      { sku:'OTR-008', desc:'TONER HP 85A NEGRO',        qty:1 },
      { sku:'OTR-009', desc:'USB 16GB 3.0',              qty:1 },
      { sku:'OTR-010', desc:'ETIQUETAS ADHESIVAS 100PZ', qty:1 },
    ],
  },
}

// Tickets — uno por categoría con sus 10 productos
const ARTICULOS_100 = [
  { grupo: 'VENDING_REPOSICION' },
  { grupo: 'LIMPIEZA'           },
  { grupo: 'FERRETERIA'         },
  { grupo: 'MANTENIMIENTO'      },
  { grupo: 'PAPELERIA'          },
  { grupo: 'GASTOS_MEDICOS'     },
  { grupo: 'UNIFORMES'          },
  { grupo: 'LIMPIEZA'           },
  { grupo: 'FERRETERIA'         },
  { grupo: 'MANTENIMIENTO'      },
  { grupo: 'PAPELERIA'          },
  { grupo: 'MANTENIMIENTO'      },
  { grupo: 'LIMPIEZA'           },
  { grupo: 'OTROS'              },
  { grupo: 'OTROS'              },
  { grupo: 'LIMPIEZA'           },
  { grupo: 'MANTENIMIENTO'      },
  { grupo: 'FERRETERIA'         },
  { grupo: 'PAPELERIA'          },
  { grupo: 'OTROS'              },
]

// Fechas distribuidas en los últimos 3 meses
const FECHAS = [
  '2026-07-03','2026-07-08','2026-07-14','2026-07-21','2026-07-28',
  '2026-08-05','2026-08-11','2026-08-18','2026-08-22','2026-08-29',
  '2026-09-02','2026-09-08','2026-09-11','2026-09-15','2026-09-17',
  '2026-07-10','2026-07-25','2026-08-07','2026-08-26','2026-09-04',
]

const fmtMXN = n => `$${Number(n).toFixed(2)}`

// ── Generador de HTML de ticket térmico (10 ítems × $10 = $100) ──────────────
function buildTicket(cat, tienda, fecha, folio) {
  const [anio, mes, dia] = fecha.split('-')
  const fechaDisp = `${dia}/${mes}/${anio}`
  const hora = `${(8 + Math.floor(Math.random() * 10)).toString().padStart(2,'0')}:${(Math.floor(Math.random() * 60)).toString().padStart(2,'0')}:${(Math.floor(Math.random() * 60)).toString().padStart(2,'0')}`
  const lineas = cat.items.map(it =>
    `<div style="margin:3px 0;border-bottom:1px dotted #ddd;padding-bottom:3px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <span style="font-size:9.5px;font-weight:bold;flex:1;padding-right:4px;">${it.desc}</span>
        <span style="font-size:9.5px;font-weight:bold;white-space:nowrap;">$10.00</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:#555;">
        <span>${it.sku} · 1 PZA</span>
        <span>$10.00 E</span>
      </div>
    </div>`
  ).join('')

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
  ${lineas}
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
  <div class="center bold">TOTAL ARTICULOS: 10</div>
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
  // Extrae número de local y zero-padea: "LOCAL 06" → "L06", "LOCAL 6" → "L06"
  const rawNum = ((contrato.locales_display || '').split(',')[0].match(/(\d+)/) || [,''])[1]
  const localSlug = rawNum ? `L${rawNum.padStart(2,'0')}` : `L${String(idx).padStart(2,'0')}`
  const referencia = `${anio}${String(mes).padStart(2,'0')}${localSlug}`
  const concepto = `RENTA ${MESES_ABR[mes]} ${anio} ${localSlug}`
  const claveRastreo = `${banco.key}${anio}${String(mes).padStart(2,'0')}${String(dia).padStart(2,'0')}${String(idx).padStart(9,'0')}`
  const numOp = `${banco.key}-${anio}-${String(idx).padStart(8,'0')}`
  // Formato: L06202608_FICHA_BSR
  const nombrePng = `${localSlug}${anio}${String(mes).padStart(2,'0')}_FICHA_${banco.key}.png`

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
  const fullHtml = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<style>* {margin:0;padding:0;box-sizing:border-box;} body {background:#e8e8e8;display:flex;flex-direction:column;align-items:center;padding:24px;gap:14px;font-family:Arial,sans-serif;} .dl-btn {width:${width}px;padding:11px;background:${banco.color};color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:bold;}</style>
</head><body>
<button class="dl-btn" onclick="descargar()">⬇ Descargar PNG</button>
<div id="doc">${inner}</div>
<script>function descargar(){html2canvas(document.getElementById('doc'),{scale:2,backgroundColor:'#ffffff'}).then(function(c){var a=document.createElement('a');a.download='${nombrePng}';a.href=c.toDataURL('image/png');a.click();});}</script>
</body></html>`
  return { fullHtml, inner }
}

// ── Extrae el innerHTML del ticket (sin la página wrapper) ──────────────────────
function ticketInner(cat, tienda, fecha, folio) {
  const [anio, mes, dia] = fecha.split('-')
  const fechaDisp = `${dia}/${mes}/${anio}`
  const hora = `${(8 + Math.floor(Math.random() * 10)).toString().padStart(2,'0')}:${(Math.floor(Math.random() * 60)).toString().padStart(2,'0')}:${(Math.floor(Math.random() * 60)).toString().padStart(2,'0')}`
  const c = tienda.color
  const lineas = cat.items.map(it =>
    `<div style="margin:3px 0;border-bottom:1px dotted #ddd;padding-bottom:3px;">
      <div style="display:flex;justify-content:space-between;"><span style="font-size:9.5px;font-weight:bold;flex:1;padding-right:4px;">${it.desc}</span><span style="font-size:9.5px;font-weight:bold;">$10.00</span></div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:#555;"><span>${it.sku} · 1 PZA</span><span>$10.00 E</span></div>
    </div>`
  ).join('')
  return `<div style="background:#fff;width:300px;padding:12px 14px;font-size:10.5px;line-height:1.5;color:#111;border:1px solid #ddd;font-family:'Courier New',monospace;">
  <div style="text-align:center;font-size:13px;font-weight:bold;">${tienda.nombre}</div>
  <div style="text-align:center;font-size:9px;color:#555;">RFC: ${tienda.rfc}</div>
  <div style="text-align:center;font-size:9px;color:#555;">${tienda.dir}</div>
  <div style="text-align:center;font-size:9px;color:#555;">TEL: ${tienda.tel}</div>
  <hr style="border:none;border-top:1px dashed #555;margin:6px 0;">
  <div style="display:flex;justify-content:space-between;margin:1px 0;"><span style="color:#444;">FECHA:</span><span>${fechaDisp} ${hora}</span></div>
  <div style="display:flex;justify-content:space-between;margin:1px 0;"><span style="color:#444;">FOLIO:</span><span>${folio}</span></div>
  <div style="display:flex;justify-content:space-between;margin:1px 0;"><span style="color:#444;">CAJERO:</span><span>${tienda.cajero}</span></div>
  <div style="display:flex;justify-content:space-between;margin:1px 0;"><span style="color:#444;">CAJA:</span><span>${tienda.caja}</span></div>
  <hr style="border:none;border-top:1px dashed #555;margin:6px 0;">
  <div style="text-align:center;font-weight:bold;font-size:9px;">DESCRIPCION DE COMPRA</div>
  <hr style="border:none;border-top:1px dashed #555;margin:6px 0;">
  ${lineas}
  <hr style="border-top:1px solid #555;margin:6px 0;">
  <div style="display:flex;justify-content:space-between;margin:1px 0;"><span style="color:#444;">SUBTOTAL (IVA 0%):</span><span>$100.00</span></div>
  <div style="display:flex;justify-content:space-between;margin:1px 0;"><span style="color:#444;">IVA:</span><span>$0.00</span></div>
  <hr style="border:none;border-top:1px dashed #555;margin:6px 0;">
  <div style="background:${c}10;border:1.5px solid ${c};border-radius:4px;padding:6px 10px;margin:6px 0;">
    <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;color:${c};"><span>TOTAL:</span><span>$100.00</span></div>
  </div>
  <hr style="border:none;border-top:1px dashed #555;margin:6px 0;">
  <div style="display:flex;justify-content:space-between;margin:1px 0;"><span style="color:#444;">EFECTIVO:</span><span>$100.00</span></div>
  <div style="display:flex;justify-content:space-between;margin:1px 0;"><span style="color:#444;">CAMBIO:</span><span>$0.00</span></div>
  <hr style="border:none;border-top:1px dashed #555;margin:6px 0;">
  <div style="text-align:center;font-weight:bold;">TOTAL ARTICULOS: 10</div>
  <hr style="border:none;border-top:1px dashed #555;margin:6px 0;">
  <div style="text-align:center;font-size:9px;color:#555;">ESTE COMPROBANTE NO ES CFDI</div>
  <div style="text-align:center;font-size:9px;letter-spacing:3px;color:#333;">||||| ${folio} |||||</div>
  <div style="text-align:center;font-size:9px;color:#555;margin-top:4px;">GRACIAS POR SU COMPRA</div>
</div>`
}

// ── PASO 1: Tickets de compra ─────────────────────────────────────────────────
if (modo === 'tickets' || modo === 'all') {
  const OUT = 'tickets-demo/qa-tickets'
  fs.mkdirSync(OUT, { recursive: true })

  const items = []  // { pngName, inner }
  let folioNum = 20260901

  for (let i = 0; i < ARTICULOS_100.length; i++) {
    const ref    = ARTICULOS_100[i]
    const cat    = CATALOGO[ref.grupo]
    const tienda = TIENDAS[cat.tienda]
    const fecha  = FECHAS[i % FECHAS.length]
    const folio  = `${tienda.rfc.slice(0,3)}${folioNum++}`
    const pngName = `ticket_${String(i+1).padStart(2,'0')}_${cat.grupo.toLowerCase()}.png`
    const inner = ticketInner(cat, tienda, fecha, folio)
    // Archivo individual (para referencia / descarga individual)
    const htmlInd = buildTicket(cat, tienda, fecha, folio)
    fs.writeFileSync(path.join(OUT, pngName.replace('.png', '.html')), htmlInd, 'utf8')
    items.push({ id: `t${i}`, pngName, inner, label: `${cat.grupo} · ${tienda.nombre}` })
    console.log(`  ✓ ${pngName}`)
  }

  // Index con JSZip — un clic descarga todos los PNGs en un ZIP
  const indexHtml = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Tickets $100 — QA</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;background:#e0e0e0;padding:20px;}
h1{font-size:18px;margin-bottom:4px;}
.nota{font-size:11px;color:#777;margin-bottom:16px;}
.toolbar{display:flex;align-items:center;gap:14px;margin-bottom:24px;flex-wrap:wrap;}
#btnZip{padding:12px 28px;background:#1e8449;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:bold;letter-spacing:.3px;}
#btnZip:disabled{background:#888;cursor:default;}
.prog{font-size:12px;color:#444;min-width:200px;}
.bar-wrap{width:260px;height:8px;background:#ccc;border-radius:4px;overflow:hidden;display:none;}
.bar{height:100%;background:#1e8449;width:0;transition:width .2s;}
.grid{display:flex;flex-wrap:wrap;gap:16px;}
.card{background:#f8f8f8;border-radius:8px;padding:10px;box-shadow:0 1px 4px rgba(0,0,0,.12);display:flex;flex-direction:column;gap:6px;align-items:center;}
.lbl{font-size:10px;color:#555;text-align:center;}
</style>
</head><body>
<h1>Tickets de Compra $100 — QA</h1>
<p class="nota">${items.length} tickets · $100.00 c/u · IVA 0% · Un clic = ZIP completo</p>
<div class="toolbar">
  <button id="btnZip" onclick="zipTodo()">⬇ Descargar ZIP (${items.length} PNGs)</button>
  <div style="display:flex;flex-direction:column;gap:4px;">
    <div class="prog" id="prog">Listo para descargar</div>
    <div class="bar-wrap" id="barWrap"><div class="bar" id="bar"></div></div>
  </div>
</div>
<div class="grid" id="grid">
${items.map(it => `<div class="card">
  <div class="lbl">${it.label}</div>
  <div id="${it.id}">${it.inner}</div>
</div>`).join('\n')}
</div>
<script>
const ITEMS = ${JSON.stringify(items.map(it => ({ id: it.id, png: it.pngName })))};
async function zipTodo() {
  const btn = document.getElementById('btnZip');
  const prog = document.getElementById('prog');
  const barWrap = document.getElementById('barWrap');
  const bar = document.getElementById('bar');
  btn.disabled = true;
  barWrap.style.display = 'block';
  const zip = new JSZip();
  for (let i = 0; i < ITEMS.length; i++) {
    prog.textContent = 'Procesando ' + (i+1) + ' de ' + ITEMS.length + '...';
    bar.style.width = ((i+1)/ITEMS.length*100) + '%';
    const el = document.getElementById(ITEMS[i].id).firstElementChild;
    const canvas = await html2canvas(el, { scale:2, backgroundColor:'#ffffff', useCORS:false });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    zip.file(ITEMS[i].png, blob);
  }
  prog.textContent = 'Comprimiendo...';
  const content = await zip.generateAsync({ type:'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = 'tickets-qa.zip';
  a.click();
  prog.textContent = '✓ Descargado tickets-qa.zip (' + ITEMS.length + ' PNGs)';
  bar.style.width = '100%';
  btn.disabled = false;
}
</script>
</body></html>`

  fs.writeFileSync(path.join(OUT, 'index.html'), indexHtml, 'utf8')
  console.log(`\n✓ ${items.length} tickets ($100) en ${OUT}/`)
  console.log(`  → Abre tickets-demo/qa-tickets/index.html en Chrome → botón ZIP`)
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
      const { fullHtml, inner: innerHtml } = buildFicha(contrato, banco, anio, mes, total + 1000)
      // Extrae número de local con zero-padding: "LOCAL 06" → "L06"
      const rawNum = ((contrato.locales_display || '').split(',')[0].match(/(\d+)/) || [,''])[1]
      const localSlug = rawNum ? `L${rawNum.padStart(2,'0')}` : `L${String(ci+1).padStart(2,'0')}`
      // Formato: L06202608_FICHA_BSR
      const nombreHtml = `${localSlug}${anio}${String(mes).padStart(2,'0')}_FICHA_${banco.key}.html`
      const nombrePng  = nombreHtml.replace('.html', '.png')
      fs.writeFileSync(path.join(OUT, nombreHtml), fullHtml, 'utf8')
      archivos.push({ idx: total, nombreHtml, nombrePng, innerHtml, banco: banco.nombre, local: localSlug, mes: `${MESES_ABR[mes]} ${anio}`, importe: `$${Number(contrato.renta_mensual).toLocaleString('es-MX', { minimumFractionDigits:2 })}` })
      console.log(`  ✓ ${nombreHtml}`)
      total++
    }
  }

  const indexHtml = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Fichas $10,000 — QA</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;background:#d4d4d4;padding:20px;}
h1{font-size:18px;margin-bottom:4px;}
.nota{font-size:11px;color:#777;margin-bottom:16px;}
.toolbar{display:flex;align-items:center;gap:14px;margin-bottom:24px;flex-wrap:wrap;}
#btnZip{padding:12px 28px;background:#1a3a6e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:bold;}
#btnZip:disabled{background:#888;cursor:default;}
.prog{font-size:12px;color:#444;min-width:220px;}
.bar-wrap{width:280px;height:8px;background:#bbb;border-radius:4px;overflow:hidden;display:none;}
.bar{height:100%;background:#1a3a6e;width:0;transition:width .15s;}
.grid{display:flex;flex-wrap:wrap;gap:16px;}
.card{background:#f0f0f0;border-radius:8px;padding:10px;box-shadow:0 1px 4px rgba(0,0,0,.12);display:flex;flex-direction:column;gap:6px;align-items:center;}
.lbl{font-size:10px;color:#555;text-align:center;font-weight:bold;}
</style>
</head><body>
<h1>Fichas Bancarias $10,000 — QA</h1>
<p class="nota">${total} fichas · ${contratos.length} contratos × 3 meses (Jul-Sep 2026) · Un clic = ZIP completo</p>
<div class="toolbar">
  <button id="btnZip" onclick="zipTodo()">⬇ Descargar ZIP (${total} PNGs)</button>
  <div style="display:flex;flex-direction:column;gap:4px;">
    <div class="prog" id="prog">Listo para descargar</div>
    <div class="bar-wrap" id="barWrap"><div class="bar" id="bar"></div></div>
  </div>
</div>
<div class="grid" id="grid">
${archivos.map((a, i) => `<div class="card">
  <div class="lbl">${a.banco} · ${a.local} · ${a.mes}</div>
  <div id="f${a.idx}">${a.innerHtml}</div>
</div>`).join('\n')}
</div>
<script>
const ITEMS = ${JSON.stringify(archivos.map(a => ({ id: 'f'+a.idx, png: a.nombrePng })))};
async function zipTodo() {
  const btn = document.getElementById('btnZip');
  const prog = document.getElementById('prog');
  const barWrap = document.getElementById('barWrap');
  const bar = document.getElementById('bar');
  btn.disabled = true;
  barWrap.style.display = 'block';
  const zip = new JSZip();
  for (let i = 0; i < ITEMS.length; i++) {
    prog.textContent = 'Procesando ' + (i+1) + ' de ' + ITEMS.length + '...';
    bar.style.width = ((i+1)/ITEMS.length*100) + '%';
    const el = document.getElementById(ITEMS[i].id).firstElementChild;
    const canvas = await html2canvas(el, { scale:2, backgroundColor:'#ffffff', useCORS:false });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    zip.file(ITEMS[i].png, blob);
  }
  prog.textContent = 'Comprimiendo...';
  const content = await zip.generateAsync({ type:'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = 'fichas-qa.zip';
  a.click();
  prog.textContent = '✓ Descargado fichas-qa.zip (' + ITEMS.length + ' PNGs)';
  bar.style.width = '100%';
  btn.disabled = false;
}
</script>
</body></html>`

  fs.writeFileSync(path.join(OUT, 'index.html'), indexHtml, 'utf8')
  console.log(`\n✓ ${total} fichas ($10,000) en ${OUT}/`)
  console.log(`  → Abre tickets-demo/qa-fichas/index.html en Chrome`)
}
