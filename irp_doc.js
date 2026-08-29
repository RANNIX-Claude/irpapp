const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, PageBreak, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, VerticalAlign,
  NumberingLevel, LevelFormat, convertInchesToTwip,
  TableLayoutType, Header, Footer, PageNumber, Tab,
  PositionalTab, PositionalTabAlignment, PositionalTabLeader,
  UnderlineType,
} = require('docx')
const fs = require('fs')

// ─── Colores corporativos ──────────────────────────────────────────────────────
const C = {
  azul:    '0A66C2',
  azulOsc: '1A3C5E',
  dorado:  'E8A020',
  verde:   '057642',
  gris:    '6B7280',
  grisCl:  'F3F4F6',
  rojo:    'B24020',
  blanco:  'FFFFFF',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const bold  = (text, size = 22, color = '000000') =>
  new TextRun({ text, bold: true, size, color, font: 'Arial' })

const run = (text, size = 20, color = '374151') =>
  new TextRun({ text, size, color, font: 'Arial' })

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 120 },
  children: [new TextRun({ text, bold: true, size: 32, color: C.azulOsc, font: 'Arial' })],
})

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 280, after: 80 },
  children: [new TextRun({ text, bold: true, size: 26, color: C.azul, font: 'Arial' })],
})

const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 60 },
  children: [new TextRun({ text, bold: true, size: 22, color: C.dorado, font: 'Arial' })],
})

const p = (text, size = 20, before = 80, after = 80) => new Paragraph({
  spacing: { before, after },
  children: [run(text, size)],
})

const bullet = (text, level = 0) => new Paragraph({
  bullet: { level },
  spacing: { before: 40, after: 40 },
  children: [run(text, 20)],
})

const br = () => new Paragraph({ children: [new PageBreak()] })

const divider = () => new Paragraph({
  spacing: { before: 200, after: 200 },
  border: { bottom: { color: C.dorado, size: 6, style: BorderStyle.SINGLE } },
  children: [],
})

const labelVal = (label, value) => new Paragraph({
  spacing: { before: 40, after: 40 },
  children: [
    new TextRun({ text: label + ': ', bold: true, size: 20, color: C.azulOsc, font: 'Arial' }),
    new TextRun({ text: value, size: 20, color: '374151', font: 'Arial' }),
  ],
})

// ─── Tabla de módulos ──────────────────────────────────────────────────────────
function moduloRow(num, ruta, nombre, desc, estado) {
  const estadoColor = estado === '✅ Disponible' ? C.verde : estado === '🚧 En desarrollo' ? C.dorado : C.gris
  return new TableRow({
    children: [
      cell(num,    '6%',  C.azul,  true),
      cell(ruta,   '14%', C.gris,  false, 18),
      cell(nombre, '20%', C.azulOsc, true),
      cell(desc,   '44%', '374151', false, 18),
      cell(estado, '16%', estadoColor, true, 18),
    ],
  })
}

function cell(text, width, color, bold2 = false, size = 20) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: bold2, size, color, font: 'Arial' })],
    })],
  })
}

function headerCell(text) {
  return new TableCell({
    width: { size: 'auto', type: WidthType.AUTO },
    shading: { type: ShadingType.CLEAR, fill: C.azulOsc },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, size: 20, color: C.blanco, font: 'Arial' })],
    })],
  })
}

// ─── Tabla de roles ───────────────────────────────────────────────────────────
function rolRow(rol, perfil, acceso, responsabilidades) {
  return new TableRow({
    children: [
      cell(rol,               '20%', C.azul,    true),
      cell(perfil,            '18%', '374151',  false, 18),
      cell(acceso,            '15%', C.verde,   true,  18),
      cell(responsabilidades, '47%', '4B5563',  false, 18),
    ],
  })
}

// ─── Construir documento ──────────────────────────────────────────────────────
const doc = new Document({
  creator: 'RANNIX Consulting',
  title:   'IRP — Inmueble Resource Planning',
  description: 'Documento descriptivo de la solución tecnológica IRP',
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 20, color: '374151' } },
    },
  },
  sections: [{
    properties: {
      page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } },
    },
    children: [

      // ══════════════════════════════════════════════════════════════════════════
      // PORTADA
      // ══════════════════════════════════════════════════════════════════════════
      new Paragraph({ spacing: { before: 1440, after: 80 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'IRP', bold: true, size: 96, color: C.azul, font: 'Arial' })] }),
      new Paragraph({ spacing: { before: 0, after: 80 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Inmueble Resource Planning', bold: true, size: 40, color: C.azulOsc, font: 'Arial' })] }),
      new Paragraph({ spacing: { before: 0, after: 480 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Plataforma SaaS para Administración Integral de Inmuebles Comerciales', size: 24, color: C.gris, font: 'Arial' })] }),

      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 160 },
        border: { top: { color: C.dorado, size: 8, style: BorderStyle.SINGLE }, bottom: { color: C.dorado, size: 8, style: BorderStyle.SINGLE } },
        children: [new TextRun({ text: 'Documento Descriptivo de la Solución Tecnológica', bold: true, size: 22, color: C.dorado, font: 'Arial' })] }),

      new Paragraph({ spacing: { before: 480, after: 80 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'RANNIX Consulting', bold: true, size: 28, color: C.azulOsc, font: 'Arial' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Roberto Aguilar Cota  ·  roberto.aguilar.cota@gmail.com', size: 20, color: C.gris, font: 'Arial' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 },
        children: [new TextRun({ text: 'Versión 1.0  ·  Agosto 2026', size: 20, color: C.gris, font: 'Arial' })] }),

      br(),

      // ══════════════════════════════════════════════════════════════════════════
      // 1. RESUMEN EJECUTIVO
      // ══════════════════════════════════════════════════════════════════════════
      h1('1. Resumen Ejecutivo'),
      divider(),
      p('IRP (Inmueble Resource Planning) es una plataforma de software como servicio (SaaS) diseñada y desarrollada por RANNIX Consulting para la administración integral de inmuebles comerciales en México. La solución digitaliza y automatiza todos los procesos críticos de una plaza comercial, edificio de oficinas, conjunto médico o bodega industrial: desde la gestión de contratos de arrendamiento y cobranza, hasta el control de recursos humanos, mantenimiento, estacionamiento y cumplimiento fiscal ante el SAT.'),
      new Paragraph({ spacing: { before: 80, after: 80 },
        children: [
          new TextRun({ text: 'Propuesta de valor central: ', bold: true, size: 20, color: C.azulOsc, font: 'Arial' }),
          new TextRun({ text: 'unificar en una sola plataforma todos los procesos que hoy se gestionan en hojas de cálculo dispersas, WhatsApp y correos electrónicos, garantizando trazabilidad, cumplimiento normativo y toma de decisiones basada en datos en tiempo real.', size: 20, color: '374151', font: 'Arial' }),
        ],
      }),
      p('El sistema está siendo implementado como primera instalación de producción en Plaza IWOL, operada por Inmobiliaria Alcedines del Norte, en Culiacán, Sinaloa. Esta implementación piloto define los requerimientos funcionales y de negocio que serán generalizados para otros clientes en el modelo multi-tenant de la plataforma.'),

      h2('Indicadores Clave del Alcance'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [
            headerCell('Dimensión'), headerCell('Dato'),
          ]}),
          new TableRow({ children: [ cell('Módulos funcionales', '50%', C.azulOsc, true), cell('15 módulos integrados', '50%', '374151', false) ] }),
          new TableRow({ children: [ cell('Roles de usuario', '50%', C.azulOsc, true), cell('10 perfiles con permisos diferenciados', '50%', '374151', false) ] }),
          new TableRow({ children: [ cell('Tecnología IA', '50%', C.azulOsc, true), cell('2 agentes de IA (Operativo + Analítico) con Claude API', '50%', '374151', false) ] }),
          new TableRow({ children: [ cell('Cumplimiento fiscal', '50%', C.azulOsc, true), cell('CFDI 4.0 con Complemento de Pago (SAT México)', '50%', '374151', false) ] }),
          new TableRow({ children: [ cell('Cumplimiento laboral', '50%', C.azulOsc, true), cell('LFT Art. 804 + NOM-035-STPS-2018', '50%', '374151', false) ] }),
          new TableRow({ children: [ cell('Modelo de despliegue', '50%', C.azulOsc, true), cell('SaaS cloud, multi-tenant, acceso desde cualquier dispositivo', '50%', '374151', false) ] }),
        ],
      }),

      br(),

      // ══════════════════════════════════════════════════════════════════════════
      // 2. ARQUITECTURA TECNOLÓGICA
      // ══════════════════════════════════════════════════════════════════════════
      h1('2. Arquitectura Tecnológica'),
      divider(),
      p('IRP está construido sobre un stack tecnológico moderno, orientado a la nube, con énfasis en seguridad, escalabilidad y velocidad de desarrollo. La arquitectura sigue el patrón JAMstack (JavaScript, APIs, Markup) con backend serverless.'),

      h2('2.1 Stack Tecnológico'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [ headerCell('Capa'), headerCell('Tecnología'), headerCell('Función') ] }),
          new TableRow({ children: [ cell('Frontend', '20%', C.azul, true), cell('React 18 + Vite + TailwindCSS', '35%', '374151', false, 18), cell('Interfaz de usuario reactiva y responsiva. Componentes reutilizables, gestión de estado con Zustand y React Query.', '45%', '4B5563', false, 18) ] }),
          new TableRow({ children: [ cell('Base de Datos', '20%', C.azul, true), cell('Supabase (PostgreSQL)', '35%', '374151', false, 18), cell('Motor relacional con Row Level Security (RLS), autenticación integrada, API REST automática y Realtime para actualizaciones en vivo.', '45%', '4B5563', false, 18) ] }),
          new TableRow({ children: [ cell('Backend / API', '20%', C.azul, true), cell('Netlify Functions (Serverless)', '35%', '374151', false, 18), cell('Proxy seguro para la API de Claude (IA). Las claves de API nunca se exponen en el frontend. Escalamiento automático.', '45%', '4B5563', false, 18) ] }),
          new TableRow({ children: [ cell('Inteligencia Artificial', '20%', C.azul, true), cell('Anthropic Claude API (claude-sonnet)', '35%', '374151', false, 18), cell('Dos agentes especializados: Agente Operativo (asistente conversacional) y Agente Analítico (BI/análisis de datos).', '45%', '4B5563', false, 18) ] }),
          new TableRow({ children: [ cell('Deploy / CDN', '20%', C.azul, true), cell('Netlify + CDN global', '35%', '374151', false, 18), cell('Despliegue continuo desde Git. Distribución geográfica para baja latencia. URL de producción: irpapp.netlify.app', '45%', '4B5563', false, 18) ] }),
          new TableRow({ children: [ cell('Autenticación', '20%', C.azul, true), cell('Supabase Auth + Google OAuth', '35%', '374151', false, 18), cell('Email/contraseña para usuarios internos, Google OAuth, Magic Link para usuarios externos (arrendatarios, prospectos).', '45%', '4B5563', false, 18) ] }),
          new TableRow({ children: [ cell('Formularios', '20%', C.azul, true), cell('React Hook Form + Zod', '35%', '374151', false, 18), cell('Validación en cliente con esquemas tipados. Previene envío de datos inválidos y mejora la experiencia de usuario.', '45%', '4B5563', false, 18) ] }),
        ],
      }),

      h2('2.2 Seguridad y Privacidad'),
      bullet('Row Level Security (RLS): cada tabla de la base de datos tiene políticas que garantizan que cada usuario solo puede ver y modificar los datos de su inmueble/tenant.'),
      bullet('Segregación de secretos: las claves de API de Anthropic (IA) y la service role key de Supabase NUNCA se exponen en el frontend ni en variables públicas. Solo existen en las variables de entorno de Netlify (servidor).'),
      bullet('HTTPS en toda la comunicación. Certificados SSL automáticos vía Netlify.'),
      bullet('Bitácora de auditoría: cada operación crítica (pagos, contratos, accesos) queda registrada con usuario, fecha, IP y descripción en la tabla prp.bitacora.'),
      bullet('Magic Links con tokens de un solo uso para portales externos de candidatos y prospectos.'),

      h2('2.3 Modelo de Base de Datos'),
      p('La base de datos utiliza dos esquemas principales:'),
      bullet('Esquema prp: contiene todas las tablas de negocio (contratos, cobros, arrendatarios, empleados, gastos, etc.) y las vistas analíticas para el frontend.'),
      bullet('Esquema public: expone vistas y funciones RPC (Remote Procedure Calls) que el frontend consume via la API REST de Supabase. Este nivel de indirección permite aplicar lógica de negocio en el servidor sin exponer las tablas base.'),
      bullet('Esquema dw (Data Warehouse): dimensiones de tiempo (día, mes, año 2020-2030) para análisis histórico y reportes BI.'),

      br(),

      // ══════════════════════════════════════════════════════════════════════════
      // 3. MÓDULOS DE LA PLATAFORMA
      // ══════════════════════════════════════════════════════════════════════════
      h1('3. Módulos de la Plataforma'),
      divider(),
      p('IRP integra 15 módulos funcionales organizados en tres grandes áreas: Operación (gestión del día a día del inmueble), Gestión (procesos administrativos y contractuales) e Inmueble (activos físicos y servicios). Todos los módulos están interconectados y comparten datos en tiempo real.'),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [ headerCell('#'), headerCell('Ruta'), headerCell('Módulo'), headerCell('Descripción funcional'), headerCell('Estado') ] }),
          moduloRow('0',  '/',                  'Dashboard & KPIs',        'Panel de control ejecutivo con P&L del mes, KPIs de cobranza, ocupación, gastos y alertas críticas. Fiel al estado de resultados del cliente.', '✅ Disponible'),
          moduloRow('1',  '/resumen-semanal',   'Resumen Semanal',         'Consolidado semanal de ingresos, gastos por categoría, fondo revolvente y vending machine. Permite toma de decisiones ágil.', '✅ Disponible'),
          moduloRow('2',  '/conciliacion',       'Conciliación Bancaria',   'Importación de estado de cuenta BBVA (CSV), auto-conciliación por referencia o monto, marcaje de cobros, historial de movimientos.', '✅ Disponible'),
          moduloRow('3',  '/gastos-operativos',  'Gastos Operativos',       'Registro de gastos por semana, proveedor y grupo (limpieza, ferretería, mantenimiento, vending, etc.). Comprobante vs pagado. Gráficas por categoría.', '✅ Disponible'),
          moduloRow('4',  '/fondo-revolvente',   'Fondo Revolvente',        'Control de caja chica semanal: cargas, disposiciones, cierres y saldo disponible. Trazabilidad completa de cada movimiento.', '✅ Disponible'),
          moduloRow('5',  '/agua',               'Agua Potable',            'Registro de lecturas del medidor, cálculo de consumo, generación de recibos por local y seguimiento de pagos del servicio de agua.', '✅ Disponible'),
          moduloRow('6',  '/estacionamiento',    'Estacionamiento',         'Control de cajones, accesos vehiculares (entrada/salida), pensiones mensuales, cobros por turno y reportes de ocupación.', '✅ Disponible'),
          moduloRow('7',  '/vending',            'Máquina Vending',         'Catálogo de productos, control de inventario semanal (compras, ventas, utilidad), alertas de bajo stock y cierre semanal.', '✅ Disponible'),
          moduloRow('8',  '/contratos',          'Contratos de Arrendamiento','Gestión del ciclo de vida del contrato: creación, vigencia, renovación, addendums, documentos, notas y generación de pagarés.', '✅ Disponible'),
          moduloRow('9',  '/cobranza',           'Cobranza',                'Generación automática de cobros mensuales, seguimiento de vencimientos, estado por local y registro de pagos individuales.', '✅ Disponible'),
          moduloRow('10', '/arrendatarios',      'Arrendatarios',           'Expediente completo del arrendatario: datos fiscales, contacto, historial de contratos, documentos y estado de cuenta.', '🚧 En desarrollo'),
          moduloRow('11', '/rh',                 'Recursos Humanos',        'Expediente de empleados, reclutamiento (vacante→candidato→contrato), asistencia (importación ZKTeco), contratos temporales con alertas de renovación.', '✅ Disponible'),
          moduloRow('12', '/prospectos',         'Prospectos & CRM',        'Pipeline de prospectos: captación, seguimiento, portal externo con magic link para entrega de documentos, convertir a contrato.', '✅ Disponible'),
          moduloRow('13', '/mantenimiento',      'Mantenimiento & OT',      'Órdenes de trabajo, programación de mantenimientos preventivos, asignación a proveedores y seguimiento de estatus.', '🚧 En desarrollo'),
          moduloRow('14', '/reportes',           'Reportes & BI',           'Estado de resultados histórico, análisis de ocupación, rentabilidad por local, comparativos y exportación a Excel.', '🚧 En desarrollo'),
          moduloRow('15', '/bitacora',           'Bitácora del Sistema',    'Registro automático de todas las operaciones: quién hizo qué, cuándo y desde qué IP. Filtros y exportación CSV.', '✅ Disponible'),
        ],
      }),

      h2('3.1 Módulos de IA Integrados'),
      h3('Agente Operativo'),
      p('Asistente conversacional accesible desde cualquier pantalla del sistema mediante un botón flotante. Resuelve dudas operativas, explica estados de cuenta, orienta sobre procesos (renovación de contratos, registro de pagos, etc.) y puede consultar información del sistema en tiempo real. Implementado con Claude claude-sonnet-4-6, max 1,024 tokens por respuesta.'),

      h3('Agente Analítico'),
      p('Barra de búsqueda de inteligencia de negocio integrada en el módulo de Reportes. El usuario formula preguntas en lenguaje natural ("¿Cuánto cobré en julio?", "¿Qué local tiene más mora?") y el agente genera datos, interpretaciones y recomendaciones de acción. Formato de respuesta estructurado: DATO + INTERPRETACIÓN + RECOMENDACIÓN.'),

      br(),

      // ══════════════════════════════════════════════════════════════════════════
      // 4. USUARIOS Y ROLES
      // ══════════════════════════════════════════════════════════════════════════
      h1('4. Usuarios y Roles'),
      divider(),
      p('IRP implementa un sistema de control de acceso basado en roles (RBAC) con 10 perfiles diferenciados. Los permisos son granulares: cada rol tiene acceso solo a los módulos y acciones que corresponden a su función en la organización. La seguridad se aplica tanto en el frontend (rutas protegidas) como en el backend (Row Level Security en PostgreSQL).'),

      h2('4.1 Jerarquía de Roles'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [ headerCell('Rol'), headerCell('Perfil'), headerCell('Nivel acceso'), headerCell('Responsabilidades principales') ] }),
          rolRow('Super Admin',     'RANNIX Consulting',         'Total',           'Configuración multi-tenant, acceso a todas las plazas, actualizaciones de plataforma, soporte técnico.'),
          rolRow('Administrador',   'Dueño / Director',          'Total por plaza', 'Visibilidad completa del negocio. Aprobación de contratos, autorización de gastos extraordinarios, revisión de P&L y KPIs ejecutivos.'),
          rolRow('Gerente Plaza',   'Gerente Operativo',         'Alto',            'Gestión diaria de todos los módulos. Aprobación de órdenes de trabajo, supervisión de cobranza, reportes operativos.'),
          rolRow('Admin Contratos', 'Administrador / Abogado',   'Medio-Alto',      'Creación y modificación de contratos, addendums, gestión de arrendatarios, generación de pagarés y documentos legales.'),
          rolRow('Cobranza',        'Auxiliar Administrativo',   'Medio',           'Registro de pagos, conciliación bancaria, generación de recibos, seguimiento de morosos, reporte de cobranza.'),
          rolRow('RH',              'Recursos Humanos',          'Medio',           'Alta de empleados, gestión de reclutamiento, control de asistencia, procesamiento de nómina, expedientes digitales.'),
          rolRow('Operaciones',     'Supervisor Operativo',      'Medio',           'Registro de gastos, fondo revolvente, agua potable, vending machine, estacionamiento y órdenes de mantenimiento.'),
          rolRow('Mantenimiento',   'Técnico / Encargado',       'Bajo-Medio',      'Visualización y actualización de órdenes de trabajo asignadas, registro de actividades completadas.'),
          rolRow('Arrendatario',    'Inquilino Externo',         'Restringido',     'Acceso vía Magic Link a su estado de cuenta, historial de pagos, documentos de su contrato y subida de comprobantes.'),
          rolRow('Prospecto',       'Candidato a Inquilino',     'Mínimo',          'Acceso vía portal público (Magic Link) para subir documentación requerida durante el proceso de evaluación.'),
        ],
      }),

      h2('4.2 Usuarios Externos (Sin Cuenta)'),
      p('IRP contempla la participación de usuarios que no tienen credenciales del sistema pero interactúan con él a través de portales públicos protegidos por tokens únicos (Magic Links):'),
      bullet('Candidatos a empleado: reciben un link para subir INE, CURP, comprobante de domicilio, NSS y fotografía. El link expira después de su uso.'),
      bullet('Prospectos (futuros arrendatarios): reciben un link para subir acta constitutiva, RFC, estados financieros, identificación oficial e información del negocio.'),
      bullet('Arrendatarios activos: pueden consultar su estado de cuenta y subir comprobantes de pago sin necesidad de una cuenta completa en el sistema.'),

      br(),

      // ══════════════════════════════════════════════════════════════════════════
      // 5. PROCESOS PRINCIPALES
      // ══════════════════════════════════════════════════════════════════════════
      h1('5. Procesos Principales'),
      divider(),

      h2('5.1 Proceso de Arrendamiento (Ciclo Completo)'),
      p('El proceso de arrendamiento en IRP cubre todo el ciclo de vida del contrato, desde la prospección inicial hasta el cierre o renovación.'),
      bullet('PROSPECCIÓN: Captación del prospecto en el módulo CRM. Generación automática de Magic Link para que el prospecto suba su documentación desde su dispositivo (sin necesidad de cuenta).'),
      bullet('EVALUACIÓN: El equipo revisa documentos, historial crediticio y capacidad de pago. El sistema registra el resultado y el motivo en caso de rechazo.'),
      bullet('CONTRATACIÓN: Creación del contrato con: datos del arrendatario, unidad asignada, monto de renta, periodo, depósito en garantía (2 meses), cláusulas especiales y anexos.'),
      bullet('GENERACIÓN DE COBROS: Al activar el contrato, el sistema genera automáticamente los cobros programados para cada mes de vigencia, con su referencia única (CP-YYYY-MM-LXX).'),
      bullet('COBRANZA MENSUAL: Cada mes se genera un cobro. El arrendatario realiza la transferencia usando la referencia. El sistema concilia automáticamente contra el estado de cuenta bancario.'),
      bullet('RENOVACIÓN: 60 días antes del vencimiento, el sistema genera una alerta. La renovación crea un nuevo contrato vinculado al anterior, preservando el historial completo.'),
      bullet('CIERRE: Al terminar o cancelar un contrato, se registra el motivo, se devuelve el depósito y se libera la unidad para nuevos prospectos.'),

      h2('5.2 Proceso de Cobranza y Conciliación Bancaria'),
      p('IRP implementa un proceso de cobranza automatizado que minimiza el trabajo manual y los errores de registro.'),
      bullet('Generación automática: El día 1 de cada mes, el sistema genera un cobro por cada contrato activo con su monto total (renta + IVA + conceptos adicionales).'),
      bullet('Referencia única: Cada cobro tiene una referencia en formato CP-YYYY-MM-LXX (ej. CP-2026-08-L10) que el arrendatario usa al realizar su transferencia bancaria.'),
      bullet('Importación BBVA: El administrador descarga el estado de cuenta en CSV desde la banca en línea y lo importa al sistema con un solo clic.'),
      bullet('Auto-conciliación: El sistema cruza los movimientos bancarios contra los cobros pendientes usando dos estrategias: (1) referencia exacta en la descripción del movimiento, (2) coincidencia por monto con tolerancia de $1. Ambas estrategias se aplican en una sola transacción de base de datos.'),
      bullet('Conciliación manual: Para casos especiales (pagos en efectivo, depósitos sin referencia), el administrador puede "palomear" manualmente cada cobro registrando fecha, monto, forma de pago y número de operación.'),
      bullet('Facturación: La factura CFDI 4.0 se emite únicamente cuando el pago está conciliado, garantizando que no se facturen pagos no recibidos.'),

      h2('5.3 Proceso de Reclutamiento y Contratación RH'),
      p('IRP digitaliza el proceso completo de recursos humanos, especialmente crítico en establecimientos con alta rotación de personal (restaurante, limpieza).'),
      bullet('VACANTE: El gerente crea la vacante especificando puesto, área, rango salarial, número de plazas y tipo de contrato (temporal 3 semanas, 30 días, indefinido, prueba 90 días).'),
      bullet('CANDIDATO: Se registra el candidato interesado. El sistema genera automáticamente un link único (Magic Link) para que el candidato suba su documentación desde su celular: INE, CURP, NSS, comprobante de domicilio y fotografía.'),
      bullet('PIPELINE: El candidato avanza por etapas: NUEVO → DOCUMENTOS → ENTREVISTA → OFERTA → ACEPTADO / RECHAZADO. Cada movimiento queda registrado con fecha y responsable.'),
      bullet('RECHAZO: Si el candidato no procede, se registra el motivo (no cumple perfil, no se presentó, rechazó la oferta, etc.) para estadísticas de reclutamiento.'),
      bullet('CONTRATACIÓN: Al aceptar, el sistema crea automáticamente el expediente del empleado con número consecutivo (E001, E002...) y genera el contrato con fecha de inicio y vencimiento.'),
      bullet('ALERTAS DE RENOVACIÓN: El sistema clasifica los contratos por semáforo: OK (>21 días), ALERTA (7-21 días), CRÍTICO (<7 días), VENCIDO. El gerente recibe avisos antes del vencimiento.'),
      bullet('ASISTENCIA: El sistema importa los registros del checador ZKTeco (formato CSV con columnas: No., Name, Date, Time, Status) y calcula horas trabajadas, retardos y faltas de forma automática, cumpliendo el Art. 804 de la Ley Federal del Trabajo.'),

      h2('5.4 Proceso de Control de Gastos Operativos'),
      p('Los gastos de la plaza se registran semanalmente, clasificados por grupo para su seguimiento en el estado de resultados.'),
      bullet('Captura semanal: El supervisor registra cada gasto con fecha, proveedor, concepto, importe pagado e importe del comprobante (puede diferir por IVA o precio con y sin factura).'),
      bullet('Clasificación automática: El sistema sugiere el grupo de gasto basado en el concepto ingresado (limpieza e higiene, ferretería, mantenimiento, papelería, etc.).'),
      bullet('Fondo revolvente: Los gastos de caja chica están integrados con el módulo de Fondo Revolvente, que controla el saldo disponible y los cierres semanales.'),
      bullet('Impacto en P&L: Todos los gastos alimentan automáticamente el estado de resultados mensual, visible en el Dashboard con comparativo vs presupuesto.'),

      h2('5.5 Control de Inventario Vending Machine'),
      p('Proceso específico para la gestión de la máquina expendedora de la plaza.'),
      bullet('Catálogo de productos: Se mantiene un catálogo con precio de venta, precio de costo, categoría (snack, bebida, otro) y estado (activo/baja/pausado).'),
      bullet('Cierre semanal: Cada semana se registra por producto: unidades compradas, inventario final, unidades vendidas, ventas en pesos, utilidad y semanas de inventario disponible.'),
      bullet('Alertas automáticas: Productos con menos de 1 semana de inventario aparecen en rojo (CRÍTICO), entre 1 y 2 semanas en amarillo (ALERTA). El KPI de alertas en el panel permite acción inmediata.'),
      bullet('Integración con gastos: Las compras de reabasto se clasifican en el grupo "Vending / Reabasto" del módulo de Gastos Operativos, consolidando la rentabilidad real de la máquina.'),

      br(),

      // ══════════════════════════════════════════════════════════════════════════
      // 6. CUMPLIMIENTO NORMATIVO
      // ══════════════════════════════════════════════════════════════════════════
      h1('6. Cumplimiento Normativo'),
      divider(),

      h2('6.1 Cumplimiento Fiscal (SAT México)'),
      bullet('CFDI 4.0: Generación de facturas electrónicas con todos los campos requeridos por el SAT, incluyendo uso de CFDI, forma de pago y método de pago.'),
      bullet('Complemento de Pago REP: Emisión del Comprobante de Recepción de Pagos cuando el arrendatario paga en parcialidades o fuera de la fecha de vencimiento.'),
      bullet('Validación RFC: Formato validado con expresión regular oficial del SAT para personas físicas y morales.'),
      bullet('Retención automática: ISR 10% e IVA 16% calculados automáticamente según el régimen fiscal del arrendatario.'),
      bullet('Cancelación CFDI: Proceso de cancelación siguiendo el catálogo de motivos del SAT (c_MotivoCancelacion).'),
      bullet('Regímenes fiscales soportados: 612 (Personas físicas con actividades empresariales), 626 (Simplificado de confianza), 601, 603, 605, 621.'),

      h2('6.2 Cumplimiento Laboral'),
      bullet('LFT Art. 804: Registro completo de entradas y salidas de personal conforme al Artículo 804 de la Ley Federal del Trabajo, que obliga a conservar por al menos un año los registros de asistencia.'),
      bullet('NOM-035-STPS-2018: Estructura de datos de empleados compatible con los requisitos de identificación de factores de riesgo psicosocial.'),
      bullet('Contratos temporales: Gestión de contratos por tiempo determinado (3 semanas, 30 días, 90 días de prueba) con alertas automáticas de vencimiento para evitar violaciones a la LFT.'),
      bullet('Expediente digital: Almacenamiento seguro de documentos del empleado (INE, CURP, NSS, comprobante de domicilio) con control de versiones.'),

      br(),

      // ══════════════════════════════════════════════════════════════════════════
      // 7. ROADMAP Y ESTADO DE IMPLEMENTACIÓN
      // ══════════════════════════════════════════════════════════════════════════
      h1('7. Roadmap de Implementación'),
      divider(),
      p('IRP sigue una metodología de desarrollo iterativo por sprints, implementando módulos en orden de prioridad operativa. El cliente Plaza IWOL participa activamente en la validación de cada módulo antes de avanzar al siguiente.'),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [ headerCell('Sprint'), headerCell('Módulos'), headerCell('Estado'), headerCell('Observaciones') ] }),
          new TableRow({ children: [ cell('Sprint 1', '10%', C.azulOsc, true), cell('Dashboard, Login, Arquitectura base', '30%', '374151', false, 18), cell('✅ Completado', '15%', C.verde, true, 18), cell('P&L fiel al Excel del cliente, KPIs ejecutivos, agentes IA operativos.', '45%', '4B5563', false, 18) ] }),
          new TableRow({ children: [ cell('Sprint 2', '10%', C.azulOsc, true), cell('Contratos, Cobranza, Conciliación', '30%', '374151', false, 18), cell('✅ Completado', '15%', C.verde, true, 18), cell('Auto-conciliación BBVA, generación de cobros, bitácora de operaciones.', '45%', '4B5563', false, 18) ] }),
          new TableRow({ children: [ cell('Sprint 3', '10%', C.azulOsc, true), cell('Gastos Operativos, Fondo Revolvente, Agua', '30%', '374151', false, 18), cell('✅ Completado', '15%', C.verde, true, 18), cell('Control semanal, grupos de gasto, resumen ejecutivo semanal.', '45%', '4B5563', false, 18) ] }),
          new TableRow({ children: [ cell('Sprint 4', '10%', C.azulOsc, true), cell('Estacionamiento, Vending Machine', '30%', '374151', false, 18), cell('✅ Completado', '15%', C.verde, true, 18), cell('Control de inventario semanal, alertas de stock, accesos vehiculares.', '45%', '4B5563', false, 18) ] }),
          new TableRow({ children: [ cell('Sprint 5', '10%', C.azulOsc, true), cell('RH y Nómina, Prospectos CRM', '30%', '374151', false, 18), cell('✅ Completado', '15%', C.verde, true, 18), cell('Pipeline de reclutamiento, importación de checador, contratos temporales con alertas.', '45%', '4B5563', false, 18) ] }),
          new TableRow({ children: [ cell('Sprint 6', '10%', C.azulOsc, true), cell('Arrendatarios, Mantenimiento', '30%', '374151', false, 18), cell('🚧 En progreso', '15%', C.dorado, true, 18), cell('Expediente completo arrendatario, órdenes de trabajo, mantenimiento preventivo.', '45%', '4B5563', false, 18) ] }),
          new TableRow({ children: [ cell('Sprint 7', '10%', C.azulOsc, true), cell('Reportes BI, Configuración, CFDI', '30%', '374151', false, 18), cell('📋 Planeado', '15%', C.gris, true, 18), cell('Estado de resultados histórico, generación de facturas CFDI 4.0, configuración multi-tenant.', '45%', '4B5563', false, 18) ] }),
        ],
      }),

      br(),

      // ══════════════════════════════════════════════════════════════════════════
      // 8. REGLAS DE NEGOCIO
      // ══════════════════════════════════════════════════════════════════════════
      h1('8. Reglas de Negocio Absolutas'),
      divider(),
      p('Las siguientes reglas de negocio están codificadas directamente en el sistema y no pueden ser violadas por ningún usuario, independientemente de su rol:'),

      bullet('Un inmueble puede tener múltiples unidades; una unidad pertenece a un solo inmueble.'),
      bullet('Solo puede existir un contrato activo por unidad en cualquier momento. Al renovar, se crea un nuevo contrato con período de gracia.'),
      bullet('Los cobros se generan automáticamente el día 1 de cada mes para todos los contratos activos.'),
      bullet('La factura CFDI se emite únicamente cuando el pago está conciliado en banco. No se factura sin pago confirmado.'),
      bullet('El depósito en garantía es de 2 meses de renta (configurable por contrato).'),
      bullet('La penalización por morosidad es del 5% mensual sobre el saldo insoluto (configurable).'),
      bullet('El período mínimo de contrato es de 1 año, con opción de renovación anticipada a partir de 60 días antes del vencimiento.'),
      bullet('Los registros de asistencia no pueden ser eliminados, solo corregidos con una nueva entrada que referencia la original (trazabilidad LFT).'),
      bullet('Los contratos de empleados temporales deben renovarse o terminarse explícitamente; el sistema alerta pero no renueva automáticamente.'),

      br(),

      // ══════════════════════════════════════════════════════════════════════════
      // 9. CONCLUSIÓN
      // ══════════════════════════════════════════════════════════════════════════
      h1('9. Conclusión'),
      divider(),
      p('IRP representa una solución tecnológica completa, moderna y específicamente diseñada para la realidad operativa de los inmuebles comerciales en México. A diferencia de los ERPs genéricos (SAP, Oracle) que requieren extensas personalizaciones y presupuestos millonarios, IRP ofrece funcionalidad especializada lista para usar con una fracción del costo y tiempo de implementación.'),
      p('La integración de Inteligencia Artificial como capa transversal (no como add-on) convierte a IRP en un sistema que no solo almacena información, sino que la interpreta y la convierte en recomendaciones accionables para el equipo operativo.'),
      p('El modelo SaaS multi-tenant permite que cada nueva plaza comercial que adopte IRP se beneficie de todas las mejoras y nuevos módulos desarrollados para el conjunto de clientes, creando un efecto de red que acelera la evolución del producto.'),

      new Paragraph({ spacing: { before: 400, after: 100 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '─── Fin del documento ───', size: 20, color: C.gris, font: 'Arial' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'RANNIX Consulting  ·  roberto.aguilar.cota@gmail.com  ·  Agosto 2026', size: 18, color: C.gris, font: 'Arial' })] }),
    ],
  }],
})

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('C:/Users/asus/Desktop/IRP_Documento_Descriptivo_v1.docx', buf)
  console.log('OK — IRP_Documento_Descriptivo_v1.docx generado en el Escritorio')
}).catch(e => { console.error(e); process.exit(1) })
