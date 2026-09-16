// Genera prompts para Google Imagen — fichas bancarias ficticias
// Lee contratos de QA y produce un archivo de texto con un prompt por contrato
// Uso: node scripts/generar-prompts-fichas.mjs

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

// Bancos ficticios
const BANCOS = [
  {
    nombre: "Banco del Sureste",
    abrev: "BSR",
    color: "dark green (#1a6e3c)",
    estilo: "regional Mexican bank, clean two-column layout on white background",
  },
  {
    nombre: "Banco Vital",
    abrev: "BVT",
    color: "navy blue (#1a3a6e)",
    estilo: "modern fintech-style bank, minimalist white layout with blue accents",
  },
  {
    nombre: "Banco del Atlántico",
    abrev: "BAT",
    color: "dark red (#8b1a1a) with gold accents",
    estilo: "classic Mexican bank, formal document layout",
  },
];

// Datos del beneficiario ficticio (la plaza — reemplaza IWOL)
const BENEFICIARIO = {
  nombre: "PLAZA COMERCIAL DEL NORTE S.A. DE C.V.",
  rfc: "PCN190315R72",
  clabe: "****3812",
};

const MESES = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

function mesAbrev(n) {
  return MESES[n - 1];
}

function rastreoFicticio(banco, fecha) {
  const d = new Date(fecha);
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.floor(Math.random() * 999999999).toString().padStart(9, "0");
  return `${banco.abrev}${ymd}${rnd}`;
}

function formatMXN(n) {
  return `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MN`;
}

await qa.connect();

const { rows: contratos } = await qa.query(`
  SELECT
    c.numero_contrato,
    c.fecha_inicio,
    c.fecha_fin,
    c.renta_mensual,
    c.locales_display,
    a.locatario          AS nombre_arrendatario,
    a.rfc                AS rfc_arrendatario
  FROM public.contratos c
  JOIN public.arrendatarios a ON a.id = c.arrendatario_id
  WHERE c.estatus = 'VIGENTE'
  ORDER BY c.numero_contrato
  LIMIT 40
`);

await qa.end();

if (!contratos.length) {
  console.log("No hay contratos VIGENTES en QA.");
  process.exit(0);
}

// Carpeta destino
const outDir = "tickets-demo/fichas";
fs.mkdirSync(outDir, { recursive: true });

const lineas = [];
const jsonSalida = [];

lineas.push("=".repeat(80));
lineas.push("PROMPTS PARA GOOGLE IMAGEN — FICHAS BANCARIAS FICTICIAS");
lineas.push("Plaza Comercial del Norte — QA Demo");
lineas.push(`Generado: ${new Date().toLocaleString("es-MX")}`);
lineas.push("=".repeat(80));
lineas.push("");
lineas.push("INSTRUCCIONES:");
lineas.push("1. Abre Google AI Studio (aistudio.google.com) → ImageFX o Imagen 3");
lineas.push("2. Copia cada prompt completo (entre --- delimitadores)");
lineas.push("3. Genera la imagen y descárgala como PNG");
lineas.push('4. Nómbrala como indica "Nombre sugerido de archivo"');
lineas.push("5. Sube el PNG al módulo de Comprobantes en IRP");
lineas.push("");

// Generar meses de pago — últimos 2 meses cerrados más el corriente
const ahora = new Date("2026-09-16");
const mesesPago = [
  { anio: 2026, mes: 7 },
  { anio: 2026, mes: 8 },
  { anio: 2026, mes: 9 },
];

let idx = 0;
for (const contrato of contratos) {
  const banco = BANCOS[idx % BANCOS.length];
  idx++;

  // Tomar solo el primer local del display
  const localRaw = (contrato.locales_display || contrato.numero_contrato || "").split(",")[0].trim();
  const localClave = localRaw.replace(/\s+/g, "").toUpperCase() || "LOCAL";

  for (const { anio, mes } of mesesPago) {
    // Fecha de pago: entre día 1 y 18 del mes
    const dia = Math.floor(Math.random() * 18) + 1;
    const fechaPago = `${dia.toString().padStart(2, "0")}/${mesAbrev(mes)}/${anio}`;
    const hora = `${Math.floor(Math.random() * 12 + 8).toString().padStart(2, "0")}:${Math.floor(Math.random() * 60).toString().padStart(2, "0")}:${Math.floor(Math.random() * 60).toString().padStart(2, "0")}`;
    const referencia = `${anio}${String(mes).padStart(2, "0")}${localClave}`;
    const concepto = `RENTA ${mesAbrev(mes)} ${anio} ${localClave}`;
    const rastreo = rastreoFicticio(banco, `${anio}-${mes}-${dia}`);
    const monto = formatMXN(contrato.renta_mensual);
    const nombreArch = `${banco.abrev}_${anio}${String(mes).padStart(2, "0")}_${localClave}.png`;

    const prompt = `
Realistic screenshot of a Mexican bank digital SPEI transfer confirmation document from "${banco.nombre}", a fictional Mexican bank. ${banco.estilo}. White background. Clean sans-serif typography (similar to Arial or Inter). Two-column layout: labels on the left in medium gray, values on the right in dark black. No logos or emblems needed — just the text document. The document contains exactly these fields and values:

Header: "${banco.nombre}" — "Comprobante de Transferencia SPEI"
Subheader: "Transferencias / Otros Bancos Nacional - SPEI (Mismo día)"

Operación: Transferencia SPEI
Fecha y Hora de Operación: ${fechaPago} ${hora} horas
Nombre del Ordenante: ${contrato.nombre_arrendatario}
RFC del Ordenante: ${contrato.rfc_arrendatario || "XAXX010101000"}
Nombre del Beneficiario: ${BENEFICIARIO.nombre}
CLABE Destino: ${BENEFICIARIO.clabe}
Banco Destino: ${banco.nombre}
RFC del Beneficiario: ${BENEFICIARIO.rfc}
Importe a Transferir: ${monto}
Número de Referencia: ${referencia}
Concepto del Pago: ${concepto}
Fecha de Aplicación: ${fechaPago}
Clave de Rastreo: ${rastreo}

Footer: "Transferencia procesada exitosamente" in small green text.

The text must be perfectly legible and accurate. No distortions, no artistic filters. Photorealistic document screenshot on a neutral light gray desktop background with a subtle drop shadow around the white document area.
`.trim();

    lineas.push("-".repeat(80));
    lineas.push(`CONTRATO: ${contrato.numero_contrato}  |  LOCAL: ${localClave}  |  MES: ${mesAbrev(mes)} ${anio}`);
    lineas.push(`Nombre sugerido de archivo: ${nombreArch}`);
    lineas.push("");
    lineas.push("PROMPT:");
    lineas.push(prompt);
    lineas.push("");

    jsonSalida.push({
      contrato: contrato.numero_contrato,
      local: localClave,
      mes: `${mesAbrev(mes)}-${anio}`,
      banco: banco.nombre,
      monto: contrato.renta_mensual,
      archivo: nombreArch,
      prompt,
    });
  }
}

const txtPath = path.join(outDir, "prompts-fichas-imagen.txt");
const jsonPath = path.join(outDir, "prompts-fichas-imagen.json");

fs.writeFileSync(txtPath, lineas.join("\n"), "utf8");
fs.writeFileSync(jsonPath, JSON.stringify(jsonSalida, null, 2), "utf8");

console.log(`\n✓ ${jsonSalida.length} prompts generados`);
console.log(`  TXT  → ${txtPath}`);
console.log(`  JSON → ${jsonPath}`);
console.log(`\nAbre el TXT y copia cada prompt en Google AI Studio → ImageFX`);
