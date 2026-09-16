// Genera tickets de compra ficticios (HTML) para demo del OCR de gastos
// Tiendas y productos ficticios — ninguna marca real
// Uso: node scripts/generar-tickets-compra.mjs
// Salida: tickets-demo/compras/*.html  +  tickets-demo/compras/index.html

import fs from "fs";
import path from "path";

const OUT = "tickets-demo/compras";
fs.mkdirSync(OUT, { recursive: true });

// ─── Tiendas ficticias ────────────────────────────────────────────────────────
const TIENDAS = {
  ALMACEN: {
    nombre: "ALMACÉN DEL NORTE",
    razon: "ALMACEN DEL NORTE S.A. DE C.V.",
    rfc: "ANO850614H45",
    regimen: "601 - General de Ley Personas Morales",
    dir: "Av. Industrial 1234, Col. Parque Industrial",
    ciudad: "Metepec, Méx. C.P. 52140",
    tel: "(722) 214-3300",
    grupos: ["LIMPIEZA", "PAPELERIA", "UNIFORMES", "VENDING_REPOSICION"],
    color: "#1a5276",
  },
  FERRETERIA: {
    nombre: "FERRETERÍA EL CONSTRUCTOR",
    razon: "FERRETERÍA EL CONSTRUCTOR S.A. DE C.V.",
    rfc: "FEC880205C32",
    regimen: "601 - General de Ley Personas Morales",
    dir: "Calle Herrero 456, Col. Industrial",
    ciudad: "Toluca, Méx. C.P. 50010",
    tel: "(722) 315-8800",
    grupos: ["FERRETERIA", "MANTENIMIENTO"],
    color: "#922b21",
  },
  FARMACIA: {
    nombre: "FARMACIAS SALUD PLUS",
    razon: "SALUD PLUS FARMACIAS S.A. DE C.V.",
    rfc: "SPF920318J78",
    regimen: "601 - General de Ley Personas Morales",
    dir: "Blvd. de la Salud 789, Col. Centro",
    ciudad: "Metepec, Méx. C.P. 52149",
    tel: "(722) 456-1122",
    grupos: ["GASTOS_MEDICOS"],
    color: "#1e8449",
  },
  PAPELERIA: {
    nombre: "PAPELERÍA Y SERVICIOS METRO",
    razon: "PAPELERIA Y SERVICIOS METRO S.A. DE C.V.",
    rfc: "PSM010912A56",
    regimen: "601 - General de Ley Personas Morales",
    dir: "Av. Tecnológico 321, Col. Morelos",
    ciudad: "Toluca, Méx. C.P. 50120",
    tel: "(722) 213-9900",
    grupos: ["PAPELERIA", "OTROS"],
    color: "#7d6608",
  },
};

// ─── Catálogo de productos por categoría ─────────────────────────────────────
const PRODUCTOS = {
  LIMPIEZA: [
    { sku: "LIM-001", desc: "DETERGENTE INDUSTRIAL GRANEL 5KG", pu: 189.0, iva: "A" },
    { sku: "LIM-002", desc: "CLORO CONCENTRADO 10L GALÓN", pu: 145.0, iva: "A" },
    { sku: "LIM-003", desc: "JABÓN LÍQUIDO ANTIBACT 1L X6", pu: 312.0, iva: "A" },
    { sku: "LIM-004", desc: "FIBRAS ACERO INOX X10 PZA", pu: 98.0, iva: "A" },
    { sku: "LIM-005", desc: "JALADOR PISO 60CM CON MANGO", pu: 220.0, iva: "A" },
    { sku: "LIM-006", desc: "BOLSAS BASURA NEGRA 200LT X50", pu: 395.0, iva: "A" },
    { sku: "LIM-007", desc: "DESENGRASANTE MULTIUSOS 4L", pu: 267.0, iva: "A" },
    { sku: "LIM-008", desc: "ATOMIZADOR PLÁSTICO 1L X3", pu: 154.0, iva: "A" },
  ],
  PAPELERIA: [
    { sku: "PAP-001", desc: "RESMA PAPEL BOND 90G T/CARTA C/500", pu: 165.0, iva: "A" },
    { sku: "PAP-002", desc: "FOLDERS MANILLA T/CARTA C/50", pu: 89.0, iva: "A" },
    { sku: "PAP-003", desc: "BOLIGRAFO TINTA SECA AZL C/12", pu: 48.0, iva: "A" },
    { sku: "PAP-004", desc: "MARCADOR PERMANENTE NEG C/6", pu: 76.0, iva: "A" },
    { sku: "PAP-005", desc: "CINTA ADHESIVA 18MM X10 C/6", pu: 92.0, iva: "A" },
    { sku: "PAP-006", desc: "ENGRAPADORA METÁLICA 26/6", pu: 185.0, iva: "A" },
    { sku: "PAP-007", desc: "GRAPAS 26/6 CAJA C/5000", pu: 34.0, iva: "A" },
    { sku: "PAP-008", desc: "CLIPS MARIPOSA NÚM 2 C/50", pu: 45.0, iva: "A" },
  ],
  UNIFORMES: [
    { sku: "UNI-001", desc: "CAMISOLA INDUSTRIAL M AZUL NAVY", pu: 385.0, iva: "A" },
    { sku: "UNI-002", desc: "CAMISOLA INDUSTRIAL L AZUL NAVY", pu: 385.0, iva: "A" },
    { sku: "UNI-003", desc: "PANTALÓN CARGO AZUL T-32", pu: 520.0, iva: "A" },
    { sku: "UNI-004", desc: "PANTALÓN CARGO AZUL T-34", pu: 520.0, iva: "A" },
    { sku: "UNI-005", desc: "BOTAS SEG PUNTA ACERO T-26.5", pu: 1250.0, iva: "A" },
    { sku: "UNI-006", desc: "BOTAS SEG PUNTA ACERO T-27", pu: 1250.0, iva: "A" },
  ],
  VENDING_REPOSICION: [
    { sku: "VND-001", desc: "AGUA PURIFICADA 20L BOTELLÓN X4", pu: 220.0, iva: "B" },
    { sku: "VND-002", desc: "CAFÉ SOLUBLE 500G BOLSA", pu: 189.0, iva: "A" },
    { sku: "VND-003", desc: "AZÚCAR ESTÁNDAR 5KG COSTAL", pu: 98.0, iva: "B" },
    { sku: "VND-004", desc: "VASOS DESECHABLES 12OZ C/50", pu: 145.0, iva: "A" },
    { sku: "VND-005", desc: "SERVILLETAS INSTITUCIONAL C/500", pu: 87.0, iva: "A" },
  ],
  FERRETERIA: [
    { sku: "FER-001", desc: "PINTURA BLANCA VINIL INT 19L", pu: 895.0, iva: "A" },
    { sku: "FER-002", desc: "BROCHÓN ANTIGOTA 4\" PROF", pu: 185.0, iva: "A" },
    { sku: "FER-003", desc: "SELLADOR ACRÍLICO INTERIOR 1/4", pu: 125.0, iva: "A" },
    { sku: "FER-004", desc: "TORNILLO 3\" PUNTA BROCA C/100", pu: 98.0, iva: "A" },
    { sku: "FER-005", desc: "BISAGRA INOX 3\" PAR X4", pu: 148.0, iva: "A" },
    { sku: "FER-006", desc: "CINTA TEFLÓN 1/2\" ROLLO C/3", pu: 45.0, iva: "A" },
    { sku: "FER-007", desc: "FOCO LED 18W BLANCO FRÍO X5", pu: 345.0, iva: "A" },
    { sku: "FER-008", desc: "CONTACTO DOBLE CON TIERRA", pu: 89.0, iva: "A" },
    { sku: "FER-009", desc: "LIJA GRANO 120 PLIEGO X10", pu: 67.0, iva: "A" },
  ],
  MANTENIMIENTO: [
    { sku: "MAN-001", desc: "SILICÓN TRANSPARENTE 280ML", pu: 95.0, iva: "A" },
    { sku: "MAN-002", desc: "CINTA AISLANTE 3/4\" NEGRO C/3", pu: 78.0, iva: "A" },
    { sku: "MAN-003", desc: "ENCHUFE MACHO INDUSTRIAL 15A", pu: 145.0, iva: "A" },
    { sku: "MAN-004", desc: "CABLE DUPLEX CAL 12 POR METRO X5", pu: 165.0, iva: "A" },
    { sku: "MAN-005", desc: "CANDADO ARCO 45MM", pu: 265.0, iva: "A" },
    { sku: "MAN-006", desc: "SIKAFLEX 221 BLANCO 310ML", pu: 189.0, iva: "A" },
  ],
  GASTOS_MEDICOS: [
    { sku: "FAR-001", desc: "PARACETAMOL 500MG C/20 TABS", pu: 48.0, iva: "B" },
    { sku: "FAR-002", desc: "AGUA OXIGENADA 10VOL 1L", pu: 35.0, iva: "B" },
    { sku: "FAR-003", desc: "ALCOHOL ISOPROPÍLICO 1L", pu: 58.0, iva: "B" },
    { sku: "FAR-004", desc: "VENDA ELÁSTICA 3\" X 5YDS X2", pu: 89.0, iva: "B" },
    { sku: "FAR-005", desc: "GASAS ESTÉRILES 10X10CM C/10", pu: 45.0, iva: "B" },
    { sku: "FAR-006", desc: "IBUPROFENO 400MG C/20 TABS", pu: 65.0, iva: "B" },
    { sku: "FAR-007", desc: "TERMÓMETRO DIGITAL CLÍNICO", pu: 189.0, iva: "A" },
    { sku: "FAR-008", desc: "MICROPORE 1\" ROLLO X2", pu: 72.0, iva: "B" },
  ],
};

// Tasas IVA
const TASAS = { A: 0.16, B: 0.0, C: 0.08 };

// ─── Plantillas de tickets (combinaciones fijas para demo) ────────────────────
const TICKETS_CONFIG = [
  // ALMACÉN DEL NORTE
  { tiendaKey: "ALMACEN", grupo: "LIMPIEZA",   skus: ["LIM-001","LIM-002","LIM-004","LIM-006","LIM-007"], fecha: "2026-09-05", forma: "Tarjeta", caja: "02", cajero: "ELENA H." },
  { tiendaKey: "ALMACEN", grupo: "LIMPIEZA",   skus: ["LIM-003","LIM-005","LIM-008"], fecha: "2026-08-22", forma: "Efectivo", caja: "01", cajero: "MARCOS V." },
  { tiendaKey: "ALMACEN", grupo: "PAPELERIA",  skus: ["PAP-001","PAP-002","PAP-003","PAP-006","PAP-007"], fecha: "2026-09-10", forma: "Tarjeta", caja: "03", cajero: "ELENA H." },
  { tiendaKey: "ALMACEN", grupo: "UNIFORMES",  skus: ["UNI-001","UNI-002","UNI-003","UNI-005"], fecha: "2026-08-14", forma: "Tarjeta", caja: "02", cajero: "PAULA R." },
  { tiendaKey: "ALMACEN", grupo: "VENDING_REPOSICION", skus: ["VND-001","VND-002","VND-003","VND-004","VND-005"], fecha: "2026-09-01", forma: "Tarjeta", caja: "01", cajero: "MARCOS V." },
  { tiendaKey: "ALMACEN", grupo: "VENDING_REPOSICION", skus: ["VND-001","VND-002","VND-004"], fecha: "2026-08-04", forma: "Efectivo", caja: "03", cajero: "PAULA R." },
  // FERRETERÍA
  { tiendaKey: "FERRETERIA", grupo: "FERRETERIA",   skus: ["FER-001","FER-002","FER-003","FER-009"], fecha: "2026-09-08", forma: "Tarjeta", caja: "01", cajero: "RODRIGO C." },
  { tiendaKey: "FERRETERIA", grupo: "FERRETERIA",   skus: ["FER-004","FER-005","FER-008"], fecha: "2026-08-18", forma: "Efectivo", caja: "01", cajero: "RODRIGO C." },
  { tiendaKey: "FERRETERIA", grupo: "MANTENIMIENTO", skus: ["MAN-001","MAN-002","MAN-003","MAN-004"], fecha: "2026-09-03", forma: "Tarjeta", caja: "02", cajero: "DANIEL F." },
  { tiendaKey: "FERRETERIA", grupo: "MANTENIMIENTO", skus: ["MAN-005","MAN-006","FER-006","FER-007"], fecha: "2026-08-27", forma: "Efectivo", caja: "01", cajero: "RODRIGO C." },
  // FARMACIA
  { tiendaKey: "FARMACIA", grupo: "GASTOS_MEDICOS", skus: ["FAR-001","FAR-002","FAR-003","FAR-004","FAR-005"], fecha: "2026-09-12", forma: "Efectivo", caja: "04", cajero: "SARA L." },
  { tiendaKey: "FARMACIA", grupo: "GASTOS_MEDICOS", skus: ["FAR-006","FAR-007","FAR-008"], fecha: "2026-08-07", forma: "Tarjeta", caja: "02", cajero: "JORGE M." },
  // PAPELERÍA
  { tiendaKey: "PAPELERIA", grupo: "PAPELERIA", skus: ["PAP-001","PAP-004","PAP-005","PAP-008"], fecha: "2026-09-15", forma: "Efectivo", caja: "01", cajero: "CRISTINA P." },
  { tiendaKey: "PAPELERIA", grupo: "PAPELERIA", skus: ["PAP-002","PAP-003","PAP-006","PAP-007"], fecha: "2026-08-11", forma: "Tarjeta", caja: "01", cajero: "LUIS G." },
];

const TICKET_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  .ticket { background: #fff; width: 300px; padding: 12px 14px; font-size: 10.5px; line-height: 1.4; color: #111; border: 1px solid #ddd; font-family: 'Courier New', monospace; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .big { font-size: 13px; font-weight: bold; }
  .sep { border: none; border-top: 1px dashed #555; margin: 6px 0; }
  .sep-solid { border-top: 1px solid #555; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; margin: 1px 0; }
  .item-row { margin: 4px 0; }
  .sku { font-size: 9px; color: #555; display: block; }
  .desc { display: block; font-size: 10px; font-weight: bold; word-break: break-word; }
  .item-bottom { display: flex; justify-content: space-between; font-size: 10px; margin-top: 1px; }
  .precio { font-weight: bold; }
  .total-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin: 2px 0; }
  .label { color: #444; }
  .barcode { font-family: monospace; font-size: 9px; letter-spacing: 3px; color: #333; }
  .small { font-size: 9px; color: #555; }
`;

// ─── HTML de ticket térmico ───────────────────────────────────────────────────
function buildInner(cfg, folio) {
  const tienda = TIENDAS[cfg.tiendaKey];
  const allProds = PRODUCTOS[cfg.grupo] || [];
  const selProds = allProds.filter((p) => cfg.skus.includes(p.sku));

  // Calcular subtotales
  let subA = 0, subB = 0, totalBruto = 0;
  const lineas = selProds.map((p) => {
    const qty = 1;
    const sub = p.pu * qty;
    if (p.iva === "A") subA += sub;
    if (p.iva === "B") subB += sub;
    totalBruto += sub;
    return { ...p, qty, sub };
  });

  const ivaA = subA * TASAS.A;
  const total = subA + ivaA + subB;

  const [anio, mes, dia] = cfg.fecha.split("-");
  const fechaDisp = `${dia}/${mes}/${anio}`;
  const hora = `${(8 + Math.floor(Math.random() * 10)).toString().padStart(2,"0")}:${Math.floor(Math.random()*60).toString().padStart(2,"0")}:${Math.floor(Math.random()*60).toString().padStart(2,"0")}`;
  const terminal = `TRM-${Math.floor(Math.random()*99+1).toString().padStart(2,"0")}`;
  const aprobacion = cfg.forma === "Tarjeta" ? `  APROBACION: ${Math.floor(Math.random()*999999).toString().padStart(6,"0")}` : "";

  const fmtMXN = (n) => `$${n.toFixed(2)}`;
  const pad = (s, w) => String(s).padEnd(w);
  const padL = (s, w) => String(s).padStart(w);

  const lineItems = lineas.map((l) =>
    `<div class="item-row">
      <span class="sku">${l.sku}</span>
      <span class="desc">${l.desc}</span>
      <div class="item-bottom">
        <span>${l.qty} PZA X ${fmtMXN(l.pu)}</span>
        <span class="precio">${fmtMXN(l.sub)} ${l.iva}</span>
      </div>
    </div>`
  ).join("");

  const descuento = cfg.grupo === "LIMPIEZA" && total > 1000 ? 50 : 0;
  const totalFinal = total - descuento;
  const efectivo = cfg.forma === "Efectivo" ? Math.ceil(totalFinal / 50) * 50 : null;
  const cambio = efectivo ? efectivo - totalFinal : null;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #f0f0f0; display: flex; flex-direction: column; align-items: center; padding: 20px; font-family: 'Courier New', monospace; gap: 12px; }
  .ticket {
    background: #fff;
    width: 300px;
    padding: 12px 14px;
    font-size: 10.5px;
    line-height: 1.4;
    color: #111;
    border: 1px solid #ddd;
  }
  .dl-btn {
    width: 300px; padding: 10px;
    background: #1a5276; color: #fff; border: none;
    border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold;
    font-family: Arial, sans-serif;
  }
  .dl-btn:hover { background: #154360; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .big { font-size: 13px; font-weight: bold; }
  .sep { border: none; border-top: 1px dashed #555; margin: 6px 0; }
  .sep-solid { border-top: 1px solid #555; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; margin: 1px 0; }
  .item-row { margin: 4px 0; }
  .sku { font-size: 9px; color: #555; display: block; }
  .desc { display: block; font-size: 10px; font-weight: bold; word-break: break-word; }
  .item-bottom { display: flex; justify-content: space-between; font-size: 10px; margin-top: 1px; }
  .precio { font-weight: bold; }
  .total-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin: 2px 0; }
  .label { color: #444; }
  .barcode { font-family: monospace; font-size: 9px; letter-spacing: 3px; color: #333; }
  .small { font-size: 9px; color: #555; }
</style>
</head>
<body>
<button class="dl-btn" onclick="descargar()">⬇ Descargar como PNG</button>
<div class="ticket" id="ticket">
  <div class="center bold big">${tienda.nombre}</div>
  <div class="center small">${tienda.razon}</div>
  <div class="center small">RFC: ${tienda.rfc}</div>
  <div class="center small">${tienda.regimen}</div>
  <hr class="sep">
  <div class="center small">${tienda.dir}</div>
  <div class="center small">${tienda.ciudad}</div>
  <div class="center small">TEL: ${tienda.tel}</div>
  <hr class="sep">
  <div class="row"><span class="label">FECHA:</span><span>${fechaDisp} ${hora}</span></div>
  <div class="row"><span class="label">FOLIO:</span><span>${folio}</span></div>
  <div class="row"><span class="label">TERMINAL:</span><span>${terminal}</span></div>
  <div class="row"><span class="label">CAJERO:</span><span>${cfg.cajero}</span></div>
  <div class="row"><span class="label">CAJA:</span><span>${cfg.caja}</span></div>
  <hr class="sep">
  <div class="center bold small">DESCRIPCION DE COMPRA</div>
  <hr class="sep">
  ${lineItems}
  <hr class="sep-solid">
  ${subB > 0 ? `<div class="row"><span class="label">SUBTOTAL TASA 0%:</span><span>${fmtMXN(subB)}</span></div>` : ""}
  ${subA > 0 ? `<div class="row"><span class="label">SUBTOTAL TASA 16%:</span><span>${fmtMXN(subA)}</span></div>` : ""}
  ${ivaA > 0 ? `<div class="row"><span class="label">IVA 16%:</span><span>${fmtMXN(ivaA)}</span></div>` : ""}
  ${descuento > 0 ? `<div class="row"><span class="label">DESCUENTO:</span><span>-${fmtMXN(descuento)}</span></div>` : ""}
  <hr class="sep">
  <div class="total-row"><span>TOTAL:</span><span>${fmtMXN(totalFinal)}</span></div>
  <hr class="sep">
  <div class="row"><span class="label">FORMA DE PAGO:</span><span>${cfg.forma.toUpperCase()}</span></div>
  ${efectivo ? `<div class="row"><span class="label">EFECTIVO:</span><span>${fmtMXN(efectivo)}</span></div>` : ""}
  ${cambio ? `<div class="row"><span class="label">CAMBIO:</span><span>${fmtMXN(cambio)}</span></div>` : ""}
  ${aprobacion ? `<div class="small center">${aprobacion}</div>` : ""}
  <hr class="sep">
  <div class="center bold">TOTAL ARTICULOS: ${lineas.length}</div>
  <hr class="sep">
  <div class="center small">ESTE COMPROBANTE NO ES CFDI</div>
  <div class="center small">NO TIENE VALIDEZ FISCAL</div>
  <hr class="sep">
  <div class="center barcode">||||| ${folio} |||||</div>
  <div class="center small" style="margin-top:4px">GRACIAS POR SU COMPRA</div>
  <div class="center small">VUELVA PRONTO</div>
</div>`;
}

function buildTicketHtml(cfg, folio, nombrePng) {
  const inner = buildInner(cfg, folio);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<style>
  body { background: #f0f0f0; display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 12px; }
  .dl-btn { width: 300px; padding: 10px; background: #1a5276; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; font-family: Arial, sans-serif; }
  .dl-btn:hover { background: #154360; }
  ${TICKET_CSS}
</style>
</head>
<body>
<button class="dl-btn" onclick="descargar()">⬇ Descargar como PNG</button>
<div class="ticket" id="ticket">${inner}</div>
<script>
function descargar() {
  html2canvas(document.getElementById('ticket'), { scale: 2, backgroundColor: '#ffffff' }).then(function(c) {
    var a = document.createElement('a'); a.download = '${nombrePng}'; a.href = c.toDataURL('image/png'); a.click();
  });
}
</script>
</body>
</html>`;
}

// ─── Generar archivos ─────────────────────────────────────────────────────────
const archivos = [];
let folioBase = 20260001;

for (const cfg of TICKETS_CONFIG) {
  const tienda = TIENDAS[cfg.tiendaKey];
  const folio = `${tienda.rfc.slice(0, 3)}${folioBase++}`;
  const [, mesN, diaN] = cfg.fecha.split("-");
  const nombre = `${cfg.tiendaKey.toLowerCase()}_${cfg.fecha.replace(/-/g, "")}_${cfg.grupo.toLowerCase()}.html`;
  const nombrePng = nombre.replace(".html", ".png");
  const html = buildTicketHtml(cfg, folio, nombrePng);
  const rutaHtml = path.join(OUT, nombre);
  fs.writeFileSync(rutaHtml, html, "utf8");
  const inner = buildInner(cfg, folio);
  archivos.push({ nombre, nombrePng, cfg, folio, tienda: tienda.nombre, grupo: cfg.grupo, fecha: cfg.fecha, inner });
  console.log(`  ✓ ${nombre}`);
}

// ─── Index con todos los tickets embebidos inline ────────────────────────────
const itemsJson = JSON.stringify(archivos.map((a, i) => ({ idx: i, png: a.nombrePng, tienda: a.tienda, grupo: a.grupo, fecha: a.fecha })));

const indexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Tickets de Compra — IRP QA Demo</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<style>
  body { font-family: Arial, sans-serif; background: #e0e0e0; padding: 20px; }
  h1 { font-size: 17px; margin-bottom: 4px; }
  .nota { font-size: 11px; color: #777; margin-bottom: 14px; }
  .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  #btnAll { padding: 10px 22px; background: #1e8449; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 13px; font-weight: bold; }
  #btnAll:disabled { background: #888; cursor: default; }
  #status { font-size: 12px; color: #555; }
  .grid { display: flex; flex-wrap: wrap; gap: 20px; }
  .card { background: #f8f8f8; border-radius: 8px; padding: 10px 12px; box-shadow: 0 1px 4px rgba(0,0,0,.12); display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
  .meta { font-size: 11px; color: #666; }
  .meta strong { color: #333; display: block; margin-bottom: 2px; }
  .dl-btn { padding: 7px 14px; background: #1a5276; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; }
  .dl-btn:hover { background: #154360; }
  ${TICKET_CSS}
</style>
</head>
<body>
<h1>Tickets de Compra — IRP QA Demo</h1>
<p class="nota">14 tickets listos. Descarga individualmente o todos de un golpe.</p>
<div class="toolbar">
  <button id="btnAll" onclick="descargarTodos()">⬇ Descargar todos (${archivos.length} PNG)</button>
  <span id="status"></span>
</div>
<div class="grid">
${archivos.map((a, i) => `  <div class="card">
    <div class="meta"><strong>${a.tienda}</strong>${a.grupo} &middot; ${a.fecha}</div>
    <div class="ticket" id="t${i}">${a.inner}</div>
    <button class="dl-btn" onclick="cap(${i},'${a.nombrePng}')">⬇ ${a.nombrePng}</button>
  </div>`).join("\n")}
</div>
<script>
async function cap(idx, fname) {
  const el = document.getElementById('t' + idx);
  const c = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
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

console.log(`\n✓ ${archivos.length} tickets generados en ${OUT}/`);
console.log(`  → Abre tickets-demo/compras/index.html en Chrome`);
console.log(`  → Usa "Descargar todos" para obtener los PNG`);
