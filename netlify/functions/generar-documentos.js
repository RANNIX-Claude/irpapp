// Genera contrato de subarrendamiento + 12 pagarés en DOCX
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType,
  PageBreak, PageOrientation, HeadingLevel, Footer, Header,
} = require('docx');

// ─── Número a letras (español MX) ────────────────────────────────────────────
const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const DECENAS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function numLetras(n) {
  if (n === 0) return 'CERO';
  if (n < 0) return 'MENOS ' + numLetras(-n);
  let s = '';
  if (n >= 1000000) {
    const m = Math.floor(n / 1000000);
    s += (m === 1 ? 'UN MILLÓN' : numLetras(m) + ' MILLONES');
    n %= 1000000; if (n > 0) s += ' ';
  }
  if (n >= 1000) {
    const k = Math.floor(n / 1000);
    s += (k === 1 ? 'MIL' : numLetras(k) + ' MIL');
    n %= 1000; if (n > 0) s += ' ';
  }
  if (n >= 100) {
    const c = Math.floor(n / 100);
    if (n === 100) s += 'CIEN';
    else s += CENTENAS[c];
    n %= 100; if (n > 0) s += ' ';
  }
  if (n >= 20) {
    const d = Math.floor(n / 10);
    s += DECENAS[d];
    n %= 10; if (n > 0) s += ' Y ';
  }
  if (n > 0) s += UNIDADES[n];
  return s.trim();
}

function montoLetra(monto) {
  const entero = Math.floor(monto);
  const cents = Math.round((monto - entero) * 100);
  const letra = numLetras(entero);
  // Título-case primeras letras
  const titulo = letra.charAt(0) + letra.slice(1).toLowerCase().replace(/ ([a-záéíóúñ])/gi, (m, l) => ' ' + l);
  return `${titulo} ${String(cents).padStart(2,'0')}/100 M.N.`;
}

// ─── MESES en español ──────────────────────────────────────────────────────
const MESES = ['enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MESES_MAY = MESES.map(m => m.toUpperCase());

function fechaLetras(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

// ─── Estilos base ─────────────────────────────────────────────────────────
const F = {
  titulo:   (t) => new TextRun({ text: t, bold: true, size: 28, font: 'Times New Roman' }),
  bold:     (t, sz=22) => new TextRun({ text: t, bold: true, size: sz, font: 'Times New Roman' }),
  normal:   (t, sz=22) => new TextRun({ text: t, size: sz, font: 'Times New Roman' }),
  espacio:  () => new Paragraph({ spacing: { after: 120 } }),
};

function p(runs, align = AlignmentType.JUSTIFIED, spacing = { after: 120 }) {
  return new Paragraph({ children: Array.isArray(runs) ? runs : [runs], alignment: align, spacing });
}

function hr() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
    spacing: { after: 60 },
  });
}

// ─── Genera CONTRATO de subarrendamiento ─────────────────────────────────────
function generarContrato(d) {
  const {
    // Subarrendador (fijo para Plaza IWOL)
    subarrendador_rep = 'Daniela Esquivel Arias',
    subarrendador_empresa = 'Inmobiliaria Alcedines del Norte, S.A. de C.V.',
    subarrendador_instrumento = 'número 10,018, Volumen 148, de fecha 02 de julio de 2025',
    banco_nombre = 'BBVA',
    banco_clabe = '012420001163161152',
    banco_titular = 'Inmobiliaria Alcedines del Norte, S.A de C.V.',
    // Arrendatario
    tipo_persona, // 'FISICA' | 'MORAL'
    arrendatario_nombre, // nombre completo o razón social
    arrendatario_rep = '', // representante legal si es moral
    arrendatario_domicilio,
    arrendatario_instrumento = '',
    arrendatario_rfc = '',
    // Local
    numero_local,
    domicilio_local = 'Avenida Gobernadores número 1622, Colonia La Providencia, Código Postal 52177, en Metepec, México',
    // Plazo
    fecha_inicio, // 'YYYY-MM-DD'
    fecha_fin,    // 'YYYY-MM-DD'
    duracion_meses = 12,
    // Renta
    renta_mensual, // number
    dia_pago = '10',
    interes_moratorio = 'diez',
    // Depósito
    meses_deposito = 1,
    // Giro
    giro_actividad,
    // Fiador
    fiador_nombre,
    fiador_ine = '',
    fiador_domicilio = '',
    fiador_telefono = '',
  } = d;

  const rentaFmt = `$ ${Number(renta_mensual).toLocaleString('es-MX')} (${montoLetra(renta_mensual)})`;
  const depositoFmt = `$ ${(Number(renta_mensual) * meses_deposito).toLocaleString('es-MX')}`;
  const depositoMesesTexto = meses_deposito === 1 ? 'un mes' : `${meses_deposito} meses`;
  const finicio = fechaLetras(fecha_inicio);
  const ffin = fechaLetras(fecha_fin);

  const arrendatarioDesc = tipo_persona === 'MORAL'
    ? `${arrendatario_rep}, representante legal de ${arrendatario_nombre}`
    : arrendatario_nombre;

  const seccDecl2Empresa = tipo_persona === 'MORAL'
    ? [F.bold(arrendatario_rep), F.normal(' en representación de '), F.bold(arrendatario_nombre)]
    : [F.bold(arrendatario_nombre)];

  const children = [
    // Encabezado
    p(F.titulo('CONTRATO DE SUBARRENDAMIENTO'), AlignmentType.CENTER, { after: 240 }),
    p([
      F.normal('Contrato de subarrendamiento que celebran por una parte el C. '),
      F.bold(subarrendador_rep),
      F.normal(` en representación de la empresa `),
      F.bold(subarrendador_empresa),
      F.normal(`, a quien para efectos del presente contrato se le denominará como `),
      F.bold('"El Subarrendador"'),
      F.normal(' y por otra parte '),
      ...seccDecl2Empresa,
      F.normal(', a quien en lo sucesivo se le denominará como '),
      F.bold('"El Subarrendatario"'),
      F.normal(', al presente documento como "El Contrato", y a ambos como "Las Partes", mismos que se someten a las declaraciones y cláusulas siguientes:'),
    ]),
    F.espacio(),

    p(F.bold('D e c l a r a c i o n e s', 24), AlignmentType.CENTER),
    F.espacio(),

    p([F.bold('I.'), F.normal(' Declara "El Subarrendador", que:')]),
    p([
      F.normal('1. Es representante legal de la empresa '),
      F.bold(subarrendador_empresa),
      F.normal(`, quien es la titular del presente contrato, misma que fue constituida de conformidad con la legislación mexicana, personalidad que acredita en términos del instrumento notarial ${subarrendador_instrumento}.`),
    ]),
    p(F.normal('2. Su poderdante es una persona moral con pleno ejercicio de los derechos de arrendamiento, subarrendamiento del bien inmueble objeto del presente contrato, en virtud que su representante cuenta con los poderes necesarios para celebrar todo tipo de contratos relacionados con el subarrendamiento del bien inmueble referido.')),
    p(F.normal('3. El inmueble subarrendado se encuentra al corriente con los pagos de mantenimiento y predial y demás servicios públicos.')),
    p(F.normal('4. El inmueble objeto del presente contrato se encuentra libre de cualquier gravamen, limitación de dominio, derecho de terceros y en buen estado de funcionamiento de manera que se pueda utilizar conforme se pacta en este contrato.')),
    p(F.normal('5. Es su voluntad otorgar el inmueble referido, en subarrendamiento a "El subarrendatario", y obligarse en los términos del presente contrato.')),
    F.espacio(),

    p([F.bold('II.'), F.normal(' Declara "El Subarrendatario", que:')]),
    ...(tipo_persona === 'MORAL' ? [
      p([F.normal('1. '), F.bold(arrendatario_rep), F.normal(` es representante legal de `), F.bold(arrendatario_nombre), F.normal(`, ubicada en ${arrendatario_domicilio}, misma que fue constituida de conformidad con la legislación mexicana, personalidad que acredita en términos del ${arrendatario_instrumento}.`)]),
    ] : [
      p([F.normal('1. '), F.bold(arrendatario_nombre), F.normal(` con domicilio en ${arrendatario_domicilio}, RFC: ${arrendatario_rfc}, mayor de edad con plena capacidad legal para contratar.`)]),
    ]),
    p(F.normal('2. Su poderdante es una persona ' + (tipo_persona === 'MORAL' ? 'moral' : 'física') + ' al corriente de sus obligaciones fiscales y de cualquier índole y que cuenta con la capacidad y poderes necesarios para celebrar el presente contrato de subarrendamiento.')),
    p(F.normal('3. Es su voluntad subarrendar el inmueble objeto del presente contrato, cuyo estado se encuentra en buenas condiciones para cumplir con los requisitos del objeto del presente documento, sin fallas y con todos los servicios públicos y privados necesarios para su buen funcionamiento.')),
    p(F.normal('4. Es su voluntad celebrar el presente contrato en los términos y condiciones establecidos en el mismo.')),
    F.espacio(),

    p(F.normal('En vista de lo anterior, "Las Partes" acuerdan que las anteriores declaraciones forman parte del clausulado que más adelante se describe, reconociéndose la personalidad con la que comparecen a la celebración y firma del presente contrato y lo sujetan al tenor de las siguientes:')),
    F.espacio(),

    p(F.bold('C l á u s u l a s', 24), AlignmentType.CENTER),
    F.espacio(),

    // PRIMERA
    p([F.bold('Primera. Objeto. '), F.normal('De conformidad con los términos y condiciones establecidos "El subarrendador" concede el uso y goce temporal del inmueble identificado como '), F.bold(`el local comercial número ${numero_local}`), F.normal(`, con domicilio en ${domicilio_local}, a "El Subarrendatario", en términos de los artículos 7.670 y 7.675 del Código Civil del Estado de México.`)]),
    F.espacio(),

    // SEGUNDA
    p([F.bold('Segunda. Derechos de subarriendo. '), F.normal('"El Subarrendador" manifiesta tener todos y cada uno de los derechos para poder subarrendar el bien inmueble objeto del presente contrato, esto en atención a lo previsto por el numeral 7.715 del Código Civil del Estado de México.')]),
    F.espacio(),

    // TERCERA
    p([F.bold('Tercera. Plazo. '), F.normal(`De acuerdo a los artículos 7.671, 7.672 y 7.673 del Código Civil del Estado de México, "Las Partes" acuerdan que el plazo de subarrendamiento es de ${duracion_meses} meses para ambas partes, plazo que inicia a partir del `), F.bold(finicio), F.normal(', y terminará el día '), F.bold(ffin), F.normal('. Consecuentemente al momento de terminar el plazo de este contrato "El Subarrendatario", deberá entregar sin demora alguna a "El Subarrendador" el inmueble objeto del presente contrato en las condiciones que lo recibe a excepción del desgaste por uso y funcionamiento normal para el que fue subarrendado, sin necesidad de previo requerimiento o aviso, renunciando desde ahora al derecho de prórroga.')]),
    F.espacio(),

    // CUARTA
    p([F.bold('Cuarta. Nuevo Contrato. '), F.normal('Si "El Subarrendatario" quisiera celebrar un nuevo contrato de subarrendamiento por el inmueble subarrendado, éste le solicitará por escrito a "El Subarrendador" la celebración del contrato con treinta días de anticipación al vencimiento del presente contrato. "Las Partes" acuerdan que "El Subarrendatario" gozará del derecho de preferencia para la celebración de un nuevo contrato de subarrendamiento del bien inmueble, siempre y cuando éste hubiese cumplido en tiempo y forma sus obligaciones derivadas del presente contrato.')]),
    F.espacio(),

    // QUINTA
    p([F.bold('Quinta. Importe del subarriendo (Renta). '), F.normal('En atención al numeral 7.688 del Código Civil para el Estado de México, "Las Partes" convienen fijar como importe por concepto del subarriendo mensual la cantidad de '), F.bold(rentaFmt), F.normal(`, este importe deberá ser entregado a "El Subarrendador" por medio de depósito o transferencia electrónica a la cuenta número:`), ]),
    p([F.normal(`Banco: `), F.bold(banco_nombre), F.normal(`   Cuenta CLABE: `), F.bold(banco_clabe), F.normal(`   A nombre de: `), F.bold(banco_titular)]),
    F.espacio(),

    // SEXTA
    p([F.bold('Sexta. Fecha de pago. '), F.normal(`El pago del subarriendo (rentas) será dentro de los primeros cinco días posteriores al día `), F.bold(dia_pago), F.normal(` de cada mes, en caso de no pagar en el término establecido, "El Subarrendatario" pagará un `), F.bold(`${interes_moratorio} por ciento de interés`), F.normal(` por cada mes o fracción que pase de la fecha de pago, sobre el precio de cada mensualidad vencida.`)]),
    F.espacio(),

    // SÉPTIMA
    p([F.bold('Séptima. Aumento de importe del subarriendo (renta). '), F.normal('"Las Partes" acuerdan que al vencimiento del presente contrato y en caso de darse las condiciones para la celebración de un nuevo contrato de forma continua, el aumento del subarriendo (renta) será el equivalente al factor de inflación anual publicado por el Banco de México.')]),
    F.espacio(),

    // OCTAVA
    p([F.bold('Octava. Confirmación de pago. '), F.normal('Para la confirmación del pago del subarriendo (renta), "El Subarrendatario" deberá entregar mensualmente a "El Subarrendador" vía electrónica, la ficha de depósito del banco sellada y firmada o el comprobante de transferencia electrónica. "El Subarrendador" una vez confirmado el pago, entregará el pagaré correspondiente al mes de subarriendo firmado por el "El Subarrendatario".')]),
    F.espacio(),

    // NOVENA
    p([F.bold('Novena. Pagarés y carta finiquito. '), F.normal('"Las Partes" acuerdan que a la firma del presente contrato "El Subarrendatario" firmará un pagaré por cada mes de subarriendo del plazo de la celebración del presente contrato, mismos que quedarán en poder de "El Subarrendador" y que éste devolverá al momento de confirmar que "El Subarrendatario" ha cumplido con el pago del importe del subarriendo mensual. Al término del presente contrato, si "El Subarrendatario" no tiene adeudo, "El Subarrendador" en un plazo de 60 días naturales extenderá una carta de finiquito.')]),
    F.espacio(),

    // DÉCIMA
    p([F.bold('Décima. Depósito. '), F.normal(`A efecto de garantizar todas y cada una de las obligaciones que se derivan del presente contrato, "El Subarrendatario" entregó a "El Subarrendador" el equivalente a ${depositoMesesTexto} de subarriendo por concepto de depósito (${depositoFmt}), el cual será reembolsado a más tardar en sesenta días naturales siguientes a la fecha en que "El Subarrendatario" desocupe el inmueble subarrendado, siempre y cuando éste haya cubierto el importe de todas las rentas y el inmueble sea devuelto en las condiciones en que se recibió.`)]),
    F.espacio(),

    // DÉCIMA PRIMERA
    p([
      F.bold('Décima Primera. Garantía y Fiador. '),
      F.normal('"El Subarrendatario" firma de común acuerdo '), F.bold(`${duracion_meses} pagarés`),
      F.normal(` por el importe del subarriendo mensual, cada uno por la cantidad de `), F.bold(rentaFmt),
      F.normal(`, que serán devueltos a "El Subarrendatario" contra la entrega del importe del subarriendo mensual. Para efectos del presente contrato queda como fiador de "El Subarrendatario", para cualquier caso de incumplimiento, el C. `),
      F.bold(fiador_nombre),
      ...(fiador_ine ? [F.normal(`, quien se identifica con credencial para votar con número `), F.bold(fiador_ine)] : []),
      ...(fiador_domicilio ? [F.normal(`, con domicilio en ${fiador_domicilio}`)] : []),
      F.normal(', quien se responsabiliza a pagar en los mismos términos que "El Subarrendatario".'),
    ]),
    F.espacio(),

    // DÉCIMA SEGUNDA
    p([F.bold('Décima Segunda. Pago de servicios. '), F.normal('A partir de la fecha en que "El Subarrendatario" reciba el inmueble y hasta la fecha en que éste lo ocupe, deberá pagar por su cuenta todos los servicios públicos y privados que requiera (energía eléctrica, agua, gas, sistema de cable, teléfono y cualquier otro servicio que contrate), debiendo dejar todo pagado y entregar el comprobante de pagado a "El Subarrendador" según el periodo de pago.')]),
    F.espacio(),

    // DÉCIMA TERCERA
    p([F.bold('Décima Tercera. Destino del inmueble. '), F.normal('Las partes convienen que el inmueble objeto del presente contrato se destinará única y exclusivamente para '), F.bold(giro_actividad), F.normal('. "El Subarrendatario" se obliga a no destinarlo para un fin diferente, en caso contrario "El Subarrendador" podrá rescindir el presente contrato sin necesidad de declaración judicial.')]),
    F.espacio(),

    // DÉCIMA CUARTA
    p([F.bold('Décima Cuarta. Seguridad y horarios. '), F.normal('"Las Partes" acuerdan que "El Subarrendatario" será el responsable de su seguridad patrimonial a través de la contratación de un seguro suficiente para cubrir los posibles daños que causaren al inmueble subarrendado o a terceros en sus bienes o personas, deslindando de responsabilidad a "El Subarrendador".')]),
    F.espacio(),

    // DÉCIMA QUINTA
    p([F.bold('Décima Quinta. Rescisión de contrato. '), F.normal('"El Subarrendador" podrá rescindir el presente contrato sin necesidad de declaración judicial, cuando: a) "El Subarrendatario" no pague la renta en los términos convenidos; b) use el inmueble en forma distinta a la pactada; c) ceda los derechos del contrato o subarriende sin consentimiento de "El Subarrendador"; d) cause daños deliberados al inmueble; e) contravenga cualquiera de las disposiciones del presente contrato.')]),
    F.espacio(),

    // DÉCIMA SEXTA - Jurisdicción
    p([F.bold('Décima Sexta. Jurisdicción. '), F.normal('Para la interpretación, cumplimiento y ejecución del presente contrato, "Las Partes" se someten a las leyes y tribunales competentes del Estado de México, con residencia en Metepec, renunciando a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.')]),
    F.espacio(),

    // Firmas
    new Paragraph({ children: [new PageBreak()] }),
    p(F.normal('Leído que fue el presente contrato y enteradas las partes de su contenido, alcance y consecuencias legales, lo firman de conformidad en la ciudad de Metepec, Estado de México, el día '), AlignmentType.JUSTIFIED),
    p(F.bold(fechaLetras(fecha_inicio) + '.'), AlignmentType.CENTER),
    F.espacio(),
    F.espacio(),

    // Tabla de firmas
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideH: { style: BorderStyle.NONE }, insideV: { style: BorderStyle.NONE } },
      rows: [
        new TableRow({ children: [
          new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, children: [
            p(F.normal('______________________________'), AlignmentType.CENTER),
            p(F.bold('"EL SUBARRENDADOR"'), AlignmentType.CENTER),
            p(F.normal(subarrendador_rep), AlignmentType.CENTER),
            p(F.normal(subarrendador_empresa), AlignmentType.CENTER),
          ]}),
          new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [p(F.normal(''))] }),
          new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, children: [
            p(F.normal('______________________________'), AlignmentType.CENTER),
            p(F.bold('"EL SUBARRENDATARIO"'), AlignmentType.CENTER),
            p(F.normal(tipo_persona === 'MORAL' ? arrendatario_rep : arrendatario_nombre), AlignmentType.CENTER),
            p(F.normal(arrendatario_nombre), AlignmentType.CENTER),
          ]}),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [F.espacio(), F.espacio()] }),
          new TableCell({ children: [F.espacio()] }),
          new TableCell({ children: [F.espacio(), F.espacio()] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [p(F.normal(''))] }),
          new TableCell({ children: [p(F.normal(''))] }),
          new TableCell({ children: [
            p(F.normal('______________________________'), AlignmentType.CENTER),
            p(F.bold('FIADOR'), AlignmentType.CENTER),
            p(F.normal(fiador_nombre), AlignmentType.CENTER),
          ]}),
        ]}),
      ],
    }),
  ];

  return new Document({
    sections: [{ properties: { page: { margin: { top: 720, right: 900, bottom: 720, left: 900 } } }, children }],
  });
}

// ─── Genera 12 PAGARÉS (2 por página) ───────────────────────────────────────
function pagareBloque(num, total, d) {
  const {
    fecha_firma,     // 'YYYY-MM-DD'
    renta_mensual,
    dia_vencimiento, // número del día, ej: 6
    arrendatario_nombre,
    arrendatario_rep = '',
    arrendatario_domicilio,
    arrendatario_telefono = '',
    tipo_persona,
    beneficiario = 'INMOBILIARIA ALCEDINES DEL NORTE SA.DE.CV',
  } = d;

  // Calcular fecha de vencimiento de este pagaré
  const base = new Date(fecha_firma + 'T12:00:00');
  const venc = new Date(base.getFullYear(), base.getMonth() + num, dia_vencimiento);
  const diaVenc = String(venc.getDate()).padStart(2, '0');
  const mesVenc = MESES[venc.getMonth()];
  const anioVenc = venc.getFullYear();

  const diaFirma = new Date(fecha_firma + 'T12:00:00').getDate();
  const mesFirma = MESES[new Date(fecha_firma + 'T12:00:00').getMonth()];
  const anioFirma = new Date(fecha_firma + 'T12:00:00').getFullYear();

  const monto = Number(renta_mensual);
  const montoFmt = `$ ${monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  const montoLetraStr = montoLetra(monto);
  const numStr = String(num).padStart(2, '0');
  const totalStr = String(total).padStart(2, '0');
  const deudorNombre = tipo_persona === 'MORAL' && arrendatario_rep ? arrendatario_rep : arrendatario_nombre;

  const borde = (color = '000000', size = 6) => ({ style: BorderStyle.SINGLE, size, color });
  const noBorde = () => ({ style: BorderStyle.NONE, size: 0 });

  const celdaInner = (children, width = 100, align = AlignmentType.LEFT) =>
    new TableCell({
      width: { size: width, type: WidthType.PERCENTAGE },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: children.map(c => typeof c === 'string' ? p(F.normal(c), align) : c),
    });

  const seccion = [
    // Fila header: número y monto
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: borde(), bottom: borde(), left: borde(), right: borde(), insideH: borde(), insideV: borde() },
      rows: [
        new TableRow({ children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: '1A3C5E', type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            children: [p([
              F.bold(`PAGARÉ    No. ${numStr}/${totalStr}`, 28),
            ], AlignmentType.LEFT)],
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            shading: { fill: 'E8A020', type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            children: [p([
              F.bold('BUENO POR:  ', 24),
              F.bold(montoFmt, 28),
            ], AlignmentType.RIGHT)],
          }),
        ]}),
        // Fecha de firma y beneficiario
        new TableRow({ children: [
          new TableCell({ columnSpan: 2, width: { size: 100, type: WidthType.PERCENTAGE }, margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [
            p([F.normal('En Metepec, Estado de México, a '), F.bold(`${diaFirma} de ${mesFirma} de ${anioFirma}`)]),
            p([F.normal('Debo y pagaré incondicionalmente por este pagaré a la orden de:  '), F.bold(beneficiario)]),
          ]}),
        ]}),
        // Vencimiento
        new TableRow({ children: [
          new TableCell({ columnSpan: 2, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [
            p([F.bold('VENCIMIENTO:  '), F.normal('En Metepec, Estado de México el día '), F.bold(`${diaVenc} de ${mesVenc} de ${anioVenc}`)]),
          ]}),
        ]}),
        // Cantidad en letra
        new TableRow({ children: [
          new TableCell({ columnSpan: 2, margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [
            p([F.normal('La cantidad de:  '), F.bold(montoLetraStr)]),
          ]}),
        ]}),
        // Texto legal
        new TableRow({ children: [
          new TableCell({ columnSpan: 2, margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [
            p(F.normal('Valor recibido a mi entera satisfacción. Este pagaré forma parte de una serie numerada del 01 al ' + totalStr + ' y todos están sujetos a la condición de que, al no pagarse cualquiera de ellos a su vencimiento, serán exigibles todos los que le sigan en número, además de los ya vencidos; desde la fecha de vencimiento de este documento hasta el día de su liquidación, causará intereses moratorios al tipo de 10% mensual, pagadero en esta ciudad juntamente con el principal.'), AlignmentType.JUSTIFIED),
            p([F.bold('ESTE PAGARÉ ESTÁ VINCULADO CON EL CONTRATO FIRMADO EL DÍA '), F.bold(fechaLetras(fecha_firma).toUpperCase())]),
          ]}),
        ]}),
        // Datos del deudor
        new TableRow({ children: [
          new TableCell({ columnSpan: 2, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [
            p([F.bold('Datos del Deudor — '), F.normal('Nombre: '), F.bold(deudorNombre)]),
            p([F.normal('Dirección: '), F.normal(arrendatario_domicilio)]),
            p([F.normal('Tel: '), F.normal(arrendatario_telefono), F.normal('                MEX __________________ FIRMA ACEPTO(AMOS)')]),
          ]}),
        ]}),
      ],
    }),
    new Paragraph({ spacing: { after: 200 } }),
  ];

  return seccion;
}

function generarPagares(d) {
  const total = d.duracion_meses || 12;
  const children = [];

  for (let i = 1; i <= total; i++) {
    // Cada pagaré aparece 2 veces (copia arrendador + copia arrendatario)
    children.push(...pagareBloque(i, total, d));
    children.push(hr());
    children.push(...pagareBloque(i, total, d));
    if (i < total) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  return new Document({
    sections: [{ properties: { page: { margin: { top: 540, right: 720, bottom: 540, left: 720 } } }, children }],
  });
}

// ─── Handler Netlify ──────────────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const data = JSON.parse(event.body);
    const tipo = data.tipo || 'contrato'; // 'contrato' | 'pagares' | 'ambos'

    if (tipo === 'contrato') {
      const doc = generarContrato(data);
      const buf = await Packer.toBuffer(doc);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': 'attachment; filename="contrato_subarrendamiento.docx"', 'X-Doc-Type': 'contrato' },
        body: buf.toString('base64'),
        isBase64Encoded: true,
      };
    }

    if (tipo === 'pagares') {
      const doc = generarPagares(data);
      const buf = await Packer.toBuffer(doc);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': 'attachment; filename="pagares.docx"', 'X-Doc-Type': 'pagares' },
        body: buf.toString('base64'),
        isBase64Encoded: true,
      };
    }

    // 'ambos': devuelve JSON con ambos en base64
    const docContrato = generarContrato(data);
    const docPagares  = generarPagares(data);
    const [bufContrato, bufPagares] = await Promise.all([
      Packer.toBuffer(docContrato),
      Packer.toBuffer(docPagares),
    ]);
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contrato: bufContrato.toString('base64'),
        pagares:  bufPagares.toString('base64'),
      }),
    };

  } catch (err) {
    console.error('generar-documentos error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
