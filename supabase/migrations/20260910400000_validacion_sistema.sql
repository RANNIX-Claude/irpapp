-- MIGRACIÓN: módulo de Validación del Sistema
--
-- El administrador de la plaza está operando IRP en paralelo con su proceso
-- de siempre para verificar que el sistema hace lo que debe. Hasta ahora eso
-- vivía fuera del sistema, en listas sueltas. Este módulo lo mete adentro:
--
--   validacion_puntos     el catálogo de lo que hay que probar, por módulo
--   validacion_revisiones en qué quedó cada punto (correcto, con problema…)
--   validacion_reportes   el reporte de un problema concreto
--   validacion_adjuntos   las capturas de pantalla de un reporte
--
-- Un punto puede tener varios reportes y un reporte puede no tener punto: no
-- todo lo que falla estaba en la lista.

-- ═══════════════════════════════════════════════════════════════════════════
-- CATÁLOGO DE PUNTOS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.validacion_puntos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave       text NOT NULL UNIQUE,        -- COB-03, RH-11…
  modulo      text NOT NULL,
  ruta        text,
  orden       integer NOT NULL DEFAULT 0,
  titulo      text NOT NULL,
  descripcion text,
  donde       text,                        -- el camino de clics
  -- Lo que toca dinero se revisa primero: un error ahí no se nota hasta que
  -- alguien cobra de menos o de más.
  critico     boolean NOT NULL DEFAULT false,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS validacion_puntos_modulo ON public.validacion_puntos (modulo, orden);

-- ═══════════════════════════════════════════════════════════════════════════
-- REVISIÓN — una fila por punto, se actualiza
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.validacion_revisiones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  punto_id     uuid NOT NULL UNIQUE REFERENCES public.validacion_puntos(id) ON DELETE CASCADE,
  estado       text NOT NULL DEFAULT 'PENDIENTE'
               CHECK (estado IN ('PENDIENTE','CORRECTO','CON_PROBLEMA','NO_APLICA')),
  notas        text,
  revisado_por text,
  revisado_en  timestamptz,
  updated_at   timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- REPORTES DE PROBLEMA
-- ═══════════════════════════════════════════════════════════════════════════
CREATE SEQUENCE IF NOT EXISTS public.validacion_folio_seq;

CREATE TABLE IF NOT EXISTS public.validacion_reportes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio         text NOT NULL UNIQUE
                DEFAULT 'RV-' || lpad(nextval('public.validacion_folio_seq')::text, 4, '0'),
  -- Opcional: hay fallas que no estaban en la lista de puntos.
  punto_id      uuid REFERENCES public.validacion_puntos(id) ON DELETE SET NULL,
  modulo        text NOT NULL,
  titulo        text NOT NULL,
  -- Las tres preguntas que hacen reproducible un reporte.
  pasos         text,
  esperado      text,
  obtenido      text,
  severidad     text NOT NULL DEFAULT 'MEDIA'
                CHECK (severidad IN ('BLOQUEA','ALTA','MEDIA','BAJA')),
  estado        text NOT NULL DEFAULT 'ABIERTO'
                CHECK (estado IN ('ABIERTO','EN_REVISION','RESUELTO','DESCARTADO')),
  reportado_por text,
  resolucion    text,
  resuelto_en   timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS validacion_reportes_estado ON public.validacion_reportes (estado, created_at DESC);
CREATE INDEX IF NOT EXISTS validacion_reportes_punto  ON public.validacion_reportes (punto_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ADJUNTOS — varias capturas por reporte
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.validacion_adjuntos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporte_id  uuid NOT NULL REFERENCES public.validacion_reportes(id) ON DELETE CASCADE,
  -- Ruta dentro del bucket, no URL: el bucket es privado y se firma al abrir.
  archivo_path text NOT NULL,
  nombre      text,
  mime        text,
  tamano_kb   integer,
  orden       integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS validacion_adjuntos_reporte ON public.validacion_adjuntos (reporte_id, orden);

-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE — bucket privado para las capturas
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('validacion-capturas', 'validacion-capturas', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DO $do$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS val_capturas_auth ON storage.objects';
  EXECUTE $p$CREATE POLICY val_capturas_auth ON storage.objects FOR ALL TO authenticated
             USING (bucket_id = 'validacion-capturas')
             WITH CHECK (bucket_id = 'validacion-capturas')$p$;
END $do$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════════════
DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['validacion_puntos','validacion_revisiones','validacion_reportes','validacion_adjuntos'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_%s ON public.%I', t, t);
    EXECUTE format('CREATE POLICY auth_%s ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $do$;

-- ═══════════════════════════════════════════════════════════════════════════
-- VISTAS prp_*
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.prp_validacion_puntos AS
SELECT p.id, p.clave, p.modulo, p.ruta, p.orden, p.titulo, p.descripcion, p.donde, p.critico,
       COALESCE(r.estado, 'PENDIENTE') AS estado,
       r.notas, r.revisado_por, r.revisado_en,
       (SELECT count(*) FROM public.validacion_reportes x
         WHERE x.punto_id = p.id AND x.estado IN ('ABIERTO','EN_REVISION')) AS reportes_abiertos
  FROM public.validacion_puntos p
  LEFT JOIN public.validacion_revisiones r ON r.punto_id = p.id
 WHERE p.activo;

CREATE OR REPLACE VIEW public.prp_validacion_reportes AS
SELECT r.*, p.clave AS punto_clave, p.titulo AS punto_titulo,
       (SELECT count(*) FROM public.validacion_adjuntos a WHERE a.reporte_id = r.id) AS n_adjuntos
  FROM public.validacion_reportes r
  LEFT JOIN public.validacion_puntos p ON p.id = r.punto_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- CATÁLOGO INICIAL — toda la funcionalidad del sistema, por módulo
-- ═══════════════════════════════════════════════════════════════════════════
-- Se siembra por clave: volver a correr la migración actualiza el texto sin
-- perder las revisiones ya hechas, porque las revisiones cuelgan del id.
INSERT INTO public.validacion_puntos (clave, modulo, ruta, orden, titulo, descripcion, donde, critico) VALUES

-- ── Acceso ─────────────────────────────────────────────────────────────────
('ACC-01','Acceso y Roles','/login',1,'Entrar con correo y contraseña','La sesión inicia y lleva al tablero que corresponde al rol.','Pantalla de acceso',false),
('ACC-02','Acceso y Roles','/login',2,'Entrar con Google','El acceso con cuenta de Google reconoce al usuario y respeta su rol.','Pantalla de acceso → Continuar con Google',false),
('ACC-03','Acceso y Roles','/config',3,'Cada rol ve lo que le toca','Un usuario de restaurante solo debe ver Gastos de Restaurante; un arrendatario solo su portal; el personal ve el sistema completo.','Configuración → Usuarios',true),
('ACC-04','Acceso y Roles','/config',4,'Alta y baja de usuarios','Crear un usuario, asignarle rol y desactivarlo.','Configuración → Usuarios',false),

-- ── Dashboard ──────────────────────────────────────────────────────────────
('DAS-01','Dashboard','/',1,'Indicadores del tablero','Las cifras de arriba coinciden con lo que dicen los módulos de donde salen.','Dashboard',true),
('DAS-02','Dashboard','/',2,'Estado de resultados resumido','El comparativo de proyectado contra real del mes.','Dashboard',true),
('DAS-03','Dashboard','/',3,'Detalle al hacer clic','Cada renglón abre el desglose de lo que lo compone.','Dashboard → clic en un renglón',false),

-- ── Inmuebles ──────────────────────────────────────────────────────────────
('INM-01','Inmuebles y Locales','/inmuebles',1,'Alta de inmueble','Registrar un inmueble con sus datos.','Inmuebles → Nuevo Inmueble',false),
('INM-02','Inmuebles y Locales','/inmuebles',2,'Ocupación por inmueble','El porcentaje de ocupación corresponde a los locales realmente ocupados.','Inmuebles',true),
('INM-03','Inmuebles y Locales','/mapa-locales',3,'Mapa visual de locales','El plano muestra cada local con su estado y color.','Mapa de Locales',false),
('INM-04','Inmuebles y Locales','/mapa-locales',4,'Ficha del local desde el mapa','Al elegir un local se ven sus datos de contrato, sus pagos y su expediente.','Mapa de Locales → clic en un local',false),
('INM-05','Inmuebles y Locales','/mapa-locales',5,'Local disponible','Un local sin contrato se marca como disponible para arrendar.','Mapa de Locales',false),

-- ── Contratos ──────────────────────────────────────────────────────────────
('CON-01','Contratos','/contratos',1,'Alta de contrato','Crear un contrato con local, arrendatario, renta, vigencia y día de pago.','Contratos → Nuevo',true),
('CON-02','Contratos','/contratos',2,'Un contrato con varios locales','Un contrato puede cubrir más de un local y la renta se reparte bien.','Contratos → Nuevo',true),
('CON-03','Contratos','/contratos',3,'Vista de lista y de mosaico','Alternar entre la tabla y las tarjetas con logo del negocio.','Contratos',false),
('CON-04','Contratos','/contratos',4,'Logo del negocio','Subir o cambiar el logo desde la tarjeta y desde el expediente.','Contratos → tarjeta',false),
('CON-05','Contratos','/contratos',5,'Expediente del contrato','Una ficha con los pagos del arrendatario, sus documentos y su logo.','Contratos → clic en un contrato',false),
('CON-06','Contratos','/contratos',6,'Estatus del contrato','Vigente, Vencido, Renovado o Rescisión, capturable desde el formulario.','Contratos → Modificar',true),
('CON-07','Contratos','/contratos',7,'Estatus de operación','Ocupado o Desocupado: la condición real del local, aparte de la vigencia del papel. Hay locales que operan y pagan con el contrato vencido.','Contratos → Modificar',true),
('CON-08','Contratos','/contratos',8,'Elaborar el contrato','Generar el documento del contrato con los datos capturados.','Contratos → Elaborar',false),
('CON-09','Contratos','/contratos',9,'Adjuntar el contrato firmado','Subir el PDF firmado y volver a abrirlo después.','Contratos → expediente',false),
('CON-10','Contratos','/contratos',10,'Depósito en garantía','El depósito se registra y se puede consultar.','Contratos',false),
('CON-11','Contratos','/renovaciones',11,'Renovaciones','Los contratos por vencer aparecen a tiempo y la renovación genera el nuevo contrato.','Renovaciones',true),
('CON-12','Contratos','/renovaciones',12,'Aviso de vencimiento','El semáforo avisa de los contratos próximos a vencer.','Renovaciones · Contratos',false),

-- ── Arrendatarios ──────────────────────────────────────────────────────────
('ARR-01','Arrendatarios','/arrendatarios',1,'Alta de arrendatario','Registrar persona física o moral con RFC, régimen fiscal y domicilio.','Arrendatarios → Nuevo',true),
('ARR-02','Arrendatarios','/arrendatarios',2,'Validación del RFC','El sistema rechaza un RFC mal formado.','Arrendatarios → Nuevo',false),
('ARR-03','Arrendatarios','/arrendatarios',3,'Estado de cuenta del arrendatario','Al corriente o en mora, con lo que debe.','Arrendatarios',true),
('ARR-04','Arrendatarios','/arrendatarios',4,'Fiador y pagarés','Los datos del fiador y los pagarés del contrato.','Arrendatarios → ficha',false),
('ARR-05','Arrendatarios','/arrendatarios',5,'Documentos del arrendatario','Subir y volver a abrir los documentos del expediente.','Arrendatarios → ficha',false),

-- ── Cobranza ───────────────────────────────────────────────────────────────
('COB-01','Cobranza','/cobranza',1,'La cartera cuadra','Cada cargo muestra su importe, lo aplicado y el saldo, y las tres cifras cuadran entre sí.','Cobranza → Cartera',true),
('COB-02','Cobranza','/cobranza',2,'Generación mensual de cargos','La cobranza del mes se genera con la renta y el día de pago de cada contrato.','Cobranza',true),
('COB-03','Cobranza','/cobranza',3,'Agregar cobro a mano','Registrar un cargo por cobrar de renta, sanción, agua, mantenimiento u otro, eligiendo el período.','Cobranza → Agregar cobro',true),
('COB-04','Cobranza','/cobranza',4,'Filtro por tipo de cargo','Ver solo sanciones, solo agua, etcétera, combinado con el período; con el total y el saldo de lo filtrado.','Cobranza → Cartera',false),
('COB-05','Cobranza','/cobranza',5,'Filtros de estado','Pendientes, vencidas, parciales y pagados muestran lo que corresponde.','Cobranza → Cartera',false),
('COB-06','Cobranza','/cobranza',6,'Aplicar un pago a la cartera','Distribuir un ingreso entre uno o varios cargos pendientes.','Cobranza → Aplicar pago',true),
('COB-07','Cobranza','/cobranza',7,'El saldo del cargo se actualiza','Al aplicar o quitar un pago, el cargo cambia de estado y su saldo refleja lo que realmente se debe.','Cobranza → Cartera',true),
('COB-08','Cobranza','/cobranza',8,'Cartera vencida','La cifra de cartera vencida corresponde a los cargos no pagados con fecha cumplida.','Cobranza',true),
('COB-09','Cobranza','/cobranza',9,'Sanción por mora','La penalización por atraso se calcula y se registra como cargo.','Cobranza',true),

-- ── Conciliación ───────────────────────────────────────────────────────────
('CNC-01','Conciliación','/conciliacion',1,'Movimientos del banco','Cargar el estado de cuenta y ver los movimientos.','Conciliación',true),
('CNC-02','Conciliación','/conciliacion',2,'Casar el cobro con el banco','Vincular un movimiento bancario con el cobro del sistema.','Conciliación',true),
('CNC-03','Conciliación','/conciliacion',3,'Registrar el pago desde conciliación','Dar de alta el pago a partir del movimiento del banco.','Conciliación → Registrar Pago',true),
('CNC-04','Conciliación','/conciliacion',4,'Lo que quedó sin conciliar','Los movimientos y los cobros que no se casaron quedan a la vista.','Conciliación',true),

-- ── Ingresos ───────────────────────────────────────────────────────────────
('ING-01','Ingresos','/ingresos',1,'Registrar un ingreso','Alta de un pago recibido con contrato, importe, fecha, forma de pago y referencia.','Ingresos → Registrar Ingreso',true),
('ING-02','Ingresos','/ingresos',2,'Indicadores del módulo','Por cobrar de locales ocupados, rentas cobradas, sanciones, del mes en turno y de meses anteriores.','Ingresos',true),
('ING-03','Ingresos','/ingresos',3,'Distribución del pago','Un depósito se reparte entre varios cargos y la suma nunca puede pasarse del importe recibido.','Ingresos → Editar',true),
('ING-04','Ingresos','/ingresos',4,'Estatus de validación','Por validar, Validado u Observado, con quién validó y cuándo. Validado significa cotejado contra el banco.','Ingresos → Editar',true),
('ING-05','Ingresos','/ingresos',5,'Ver el comprobante','La imagen o el PDF del comprobante se ve junto a los datos, y se puede ampliar.','Ingresos → ícono de ver',false),
('ING-06','Ingresos','/ingresos',6,'Adjuntar el comprobante','Subir la captura del depósito o la transferencia.','Ingresos → Editar',true),
('ING-07','Ingresos','/ingresos',7,'Clasificación del ingreso','Renta, sanción, agua, otro o mixto. Se deduce de cómo se repartió el pago y se puede cambiar a mano.','Ingresos → Editar',false),
('ING-08','Ingresos','/ingresos',8,'Filtros por período y concepto','Filtrar por mes de renta, por fecha de pago y por clasificación.','Ingresos',false),
('ING-09','Ingresos','/ingresos',9,'Factura del ingreso','Número de factura y archivos PDF y XML del CFDI.','Ingresos → Editar',false),

-- ── Gastos ─────────────────────────────────────────────────────────────────
('GAS-01','Gastos','/gastos-operativos',1,'Registrar un gasto','Alta con proveedor, categoría, importe, forma de pago y fecha.','Gastos Operativos → Nuevo',true),
('GAS-02','Gastos','/gastos-operativos',2,'Adjuntar el ticket','Subir la foto del ticket y volver a abrirla desde la tabla.','Gastos Operativos',false),
('GAS-03','Gastos','/gastos-operativos',3,'Leer el ticket automáticamente','El sistema propone los datos que trae la foto del ticket.','Gastos Operativos → Nuevo',false),
('GAS-04','Gastos','/gastos-operativos',4,'Gasto por rubro','El acumulado por categoría corresponde a los gastos capturados.','Gastos Operativos',true),
('GAS-05','Gastos','/restaurante/gastos',5,'Gastos de restaurante','Captura de gastos del restaurante con su ticket.','Gastos de Restaurante',true),

-- ── Estado de Resultados ───────────────────────────────────────────────────
('EDR-01','Estado de Resultados','/edr',1,'Tablero proyectado contra real','Las columnas del mes y de otros períodos muestran las cifras correctas.','Est. Resultados → Tablero',true),
('EDR-02','Estado de Resultados','/edr',2,'Captura en elaboración','Todos los renglones se capturan, incluidas rentas sin factura, penalizaciones e IVA.','Est. Resultados → En Elaboración',true),
('EDR-03','Estado de Resultados','/edr',3,'Cargar datos automáticos','Trae rentas de contratos, pensiones y estacionamiento del sistema de tickets, vending y nóminas autorizadas.','Est. Resultados → Cargar Datos',true),
('EDR-04','Estado de Resultados','/edr',4,'Detalle por renglón','Clic en una cifra abre las partidas que la componen y avisa si el detalle no cuadra con el total.','Est. Resultados → clic en un monto',true),
('EDR-05','Estado de Resultados','/edr',5,'Utilidad del mes','El resultado final corresponde a los ingresos y gastos capturados.','Est. Resultados',true),
('EDR-06','Estado de Resultados','/edr',6,'Imprimir el estado de resultados','El PDF sale completo y legible.','Est. Resultados → Imprimir',false),

-- ── Resumen Semanal ────────────────────────────────────────────────────────
('SEM-01','Resumen Semanal','/resumen-semanal',1,'Corte de la semana','El corte muestra los ingresos en efectivo de la semana elegida.','Resumen Semanal',true),
('SEM-02','Resumen Semanal','/resumen-semanal',2,'Tickets y pensiones del estacionamiento','Los tickets del día y las pensiones cobradas se traen del sistema de estacionamiento.','Resumen Semanal',true),
('SEM-03','Resumen Semanal','/resumen-semanal',3,'Rentas y agua cobradas en efectivo','Se capturan y suman al corte.','Resumen Semanal',true),
('SEM-04','Resumen Semanal','/resumen-semanal',4,'Gastos a comprobar del fondo','Los gastos de la semana contra el fondo revolvente, con su balance.','Resumen Semanal',true),
('SEM-05','Resumen Semanal','/resumen-semanal',5,'Efectivo a entregar','El total a entregar cuadra con el desglose por concepto que está arriba.','Resumen Semanal',true),
('SEM-06','Resumen Semanal','/resumen-semanal',6,'Imprimir el corte','El reporte impreso trae el desglose y el resumen de pensiones.','Resumen Semanal → Imprimir',false),

-- ── Agua ───────────────────────────────────────────────────────────────────
('AGU-01','Agua','/agua',1,'Captura de lectura','Registrar la lectura del medidor de un local.','Agua → Nueva lectura',true),
('AGU-02','Agua','/agua',2,'Cálculo del consumo','El consumo sale de la diferencia entre la lectura actual y la anterior.','Agua',true),
('AGU-03','Agua','/agua',3,'Cobro del agua','El consumo se convierte en cargo por cobrar al arrendatario.','Agua · Cobranza',true),
('AGU-04','Agua','/agua',4,'Historial de lecturas','Las lecturas anteriores de cada local quedan consultables.','Agua',false),

-- ── Estacionamiento ────────────────────────────────────────────────────────
('EST-01','Estacionamiento','/estacionamiento',1,'Ingreso diario del estacionamiento','Los tickets y el monto del día corresponden al sistema de tickets.','Estacionamiento',true),
('EST-02','Estacionamiento','/estacionamiento',2,'Pensiones','Alta de una pensión con local, pensionado, monto y estado de pago.','Estacionamiento',true),
('EST-03','Estacionamiento','/estacionamiento',3,'Pensiones cobradas y pendientes','El corte distingue lo cobrado de lo que falta por cobrar.','Estacionamiento · Resumen Semanal',true),

-- ── Vending ────────────────────────────────────────────────────────────────
('VEN-01','Vending','/vending',1,'Catálogo de productos de vending','Alta y modificación de productos con precio y costo.','Vending → Catálogo',false),
('VEN-02','Vending','/vending',2,'Reporte semanal de vending','La captura de la semana con ventas por producto.','Vending',true),
('VEN-03','Vending','/vending',3,'Leer el reporte de la máquina','El sistema propone los datos del reporte fotografiado.','Vending',false),
('VEN-04','Vending','/vending',4,'Inventario','Las existencias se ajustan con lo vendido y lo surtido.','Vending → Inventario',false),
('VEN-05','Vending','/vending',5,'Ingreso de vending al resultado','Lo vendido llega al estado de resultados y al corte semanal.','Est. Resultados · Resumen Semanal',true),

-- ── RH ─────────────────────────────────────────────────────────────────────
('RHU-01','RH y Nómina','/rh',1,'Alta de empleado','Registrar un trabajador con sus datos completos.','RH → Nuevo Empleado',false),
('RHU-02','RH y Nómina','/rh',2,'Captura completa del expediente','Domicilio con todos sus detalles, contacto de emergencia, escolaridad, estado civil, NSS, CURP, RFC, banco y CLABE.','RH → Empleado → Modificar',false),
('RHU-03','RH y Nómina','/rh',3,'Los datos no se borran al modificar','Entrar a Modificar y guardar no debe perder ningún dato ya capturado. Pruébalo en un empleado con expediente completo.','RH → Empleado → Modificar → Guardar',true),
('RHU-04','RH y Nómina','/rh',4,'Foto del trabajador','Subir o cambiar la foto desde la tarjeta y desde el expediente.','RH → Empleados',false),
('RHU-05','RH y Nómina','/rh',5,'Expediente digital','Perfil, historial de sueldo, historial de nombre, documentos, asistencia, incidencias, beneficios, capacitación, evaluaciones y bitácora.','RH → clic en un empleado',false),
('RHU-06','RH y Nómina','/rh',6,'Medidor de expediente','El porcentaje de completitud corresponde a lo que falta por capturar.','RH → Empleados',false),
('RHU-07','RH y Nómina','/rh',7,'Documentos del empleado','Subir un documento con su fecha y vencimiento, y volver a abrirlo.','RH → Empleado → Documentos',false),
('RHU-08','RH y Nómina','/rh',8,'Leer la INE y el comprobante de domicilio','El sistema propone los datos del documento sin pisar lo ya capturado.','RH → Empleado → Modificar',false),
('RHU-09','RH y Nómina','/rh',9,'Cambio de sueldo','Registrar un aumento y que quede en el historial con su fecha.','RH → Empleado → Sueldo',true),
('RHU-10','RH y Nómina','/rh',10,'Importar la asistencia del checador','Cargar el archivo del biométrico y que guarde cada marcaje.','RH → Asistencia → Importar',true),
('RHU-11','RH y Nómina','/rh',11,'Corregir antes de importar','Quitar un día que no se quiere cargar y asignar el trabajador cuando el número no está en el catálogo.','RH → Asistencia → Importar',false),
('RHU-12','RH y Nómina','/rh',12,'Consultar marcajes','Buscar por semana o rango, por trabajador, y ver solo entradas, solo salidas o todo.','RH → Asistencia → Consultar marcajes',false),
('RHU-13','RH y Nómina','/rh',13,'Corregir o borrar un marcaje','Cambiar la hora, convertir entrada en salida, borrar uno, borrar en bloque, y registrar a mano al que olvidó checar.','RH → Asistencia → Consultar marcajes',true),
('RHU-14','RH y Nómina','/rh',14,'Retardos y faltas','El estado del día corresponde al horario del trabajador.','RH → Asistencia',true),
('RHU-15','RH y Nómina','/rh',15,'Incidencias de la semana','Registrar inasistencias, permisos, incapacidades y vacaciones, y que afecten la nómina cuando corresponde.','RH → Incidencias',true),
('RHU-16','RH y Nómina','/rh',16,'Asistencia en la nómina semanal','La columna de lunes a domingo muestra entrada y salida; el día de descanso no aparece.','RH → Nómina IWOL',true),
('RHU-17','RH y Nómina','/rh',17,'Cálculo de la nómina semanal','Percepción, descuento por faltas, complemento, vacaciones, prima vacacional y día festivo dan el total correcto.','RH → Nómina IWOL',true),
('RHU-18','RH y Nómina','/rh',18,'Transferencia y efectivo','El reparto entre transferencia y efectivo corresponde a la forma de pago de cada trabajador.','RH → Nómina IWOL',true),
('RHU-19','RH y Nómina','/rh',19,'Recibo de nómina','El recibo sale con el formato de Alcedines, en Word y en impresión, con la cantidad con letra correcta.','RH → Nómina IWOL → Recibo',true),
('RHU-20','RH y Nómina','/rh',20,'Exportar la nómina a Excel','El archivo trae las mismas cifras que la pantalla.','RH → Nómina IWOL → Exportar',false),
('RHU-21','RH y Nómina','/rh',21,'Imprimir la nómina','La impresión en oficio sale completa y legible.','RH → Nómina IWOL → Imprimir',false),
('RHU-22','RH y Nómina','/rh',22,'Período de nómina','Crear el período, calcular y autorizar.','RH → Nómina',true),
('RHU-23','RH y Nómina','/rh',23,'Vacantes y candidatos','Alta de vacante, candidatos y sus etapas.','RH → Reclutamiento',false),

-- ── Mantenimiento y Proyectos ──────────────────────────────────────────────
('MAN-01','Mantenimiento y Obras','/mantenimiento',1,'Orden de trabajo','Crear una OT con su descripción, quien la elabora y quien autoriza.','Mantenimiento → Nueva OT',false),
('MAN-02','Mantenimiento y Obras','/mantenimiento',2,'Evidencias fotográficas','Adjuntar fotos a la orden de trabajo y volver a verlas.','Mantenimiento → OT',false),
('MAN-03','Mantenimiento y Obras','/mantenimiento',3,'Seguimiento de la OT','El estado de la orden avanza y queda registrado.','Mantenimiento',false),
('MAN-04','Mantenimiento y Obras','/proyectos',4,'Proyectos y obras','Etapas, avance físico y ejercido contra presupuesto.','Proyectos',true),

-- ── Catálogos ──────────────────────────────────────────────────────────────
('CAT-01','Proveedores y Productos','/proveedores',1,'Alta de proveedor','Registrar proveedor con contacto, RFC y datos de pago.','Proveedores → Nuevo',false),
('CAT-02','Proveedores y Productos','/proveedores',2,'Logo y ficha del proveedor','Subir el logo y ver la ficha completa.','Proveedores',false),
('CAT-03','Proveedores y Productos','/productos',3,'Alta de producto','Registrar un producto con clave, categoría, precio e imagen.','Productos → Nuevo',false),
('CAT-04','Proveedores y Productos','/productos',4,'Catálogo en mosaico','Los productos se ven como tarjetas con su imagen.','Productos',false),
('CAT-05','Proveedores y Productos','/despachos',5,'Despachos jurídicos','Alta y consulta de despachos.','Despachos',false),

-- ── Prospectos ─────────────────────────────────────────────────────────────
('PRO-01','Prospectos y CRM','/prospectos',1,'Alta de prospecto','Registrar un interesado en un local.','Prospectos → Nuevo',false),
('PRO-02','Prospectos y CRM','/prospectos',2,'Liga para que suba documentos','Enviar la liga y que el prospecto pueda subir sus papeles sin tener cuenta.','Prospectos → Enviar liga',false),
('PRO-03','Prospectos y CRM','/prospectos',3,'Revisar los documentos del prospecto','Los documentos que subió se ven y se validan.','Prospectos → Documentos',false),
('PRO-04','Prospectos y CRM','/prospectos',4,'Convertir prospecto en contrato','El prospecto aprobado pasa a arrendatario y contrato sin recapturar.','Prospectos',true),
('PRO-05','Prospectos y CRM','/prospectos',5,'Notas y seguimiento','Las notas del prospecto quedan registradas con su fecha.','Prospectos → Notas',false),

-- ── Portales ───────────────────────────────────────────────────────────────
('POR-01','Portales','/portal/arrendatario',1,'Portal del arrendatario','El inquilino entra y ve solo lo suyo.','Portal de arrendatario',true),
('POR-02','Portales','/portal/arrendatario',2,'Mi perfil en el portal','Datos de contacto y de su contrato.','Portal → Mi Perfil',false),
('POR-03','Portales','/portal/arrendatario',3,'Subir el comprobante desde el portal','El arrendatario adjunta su comprobante y llega al sistema.','Portal de arrendatario',true),
('POR-04','Portales','/portal/arrendatario',4,'Alta de acceso al portal','Crear la cuenta del inquilino desde la administración.','Arrendatarios',false),
('POR-05','Portales','/portal/prospecto',5,'Portal del prospecto','La liga funciona sin cuenta y permite subir documentos.','Liga enviada al prospecto',false),

-- ── Reportes y Bitácora ────────────────────────────────────────────────────
('REP-01','Reportes y Bitácora','/reportes',1,'Reportes de cartera','Los reportes de cobranza y arrendatarios cuadran con los módulos.','Reportes',true),
('REP-02','Reportes y Bitácora','/reportes',2,'Top de arrendatarios por ingreso','El ordenamiento corresponde a lo cobrado.','Reportes',false),
('REP-03','Reportes y Bitácora','/bitacora',3,'Bitácora de operaciones','Queda registro de quién hizo qué y cuándo, filtrable por módulo, usuario y fecha.','Bitácora',false),
('REP-04','Reportes y Bitácora','/utilidades',4,'Consulta de tablas','El explorador de la base permite consultar y filtrar.','Utilerías',false),

-- ── Agentes ────────────────────────────────────────────────────────────────
('AGE-01','Asistentes','/',1,'Asistente operativo','El chat responde preguntas sobre la operación con datos reales.','Botón flotante abajo a la derecha',false),
('AGE-02','Asistentes','/',2,'Asistente analítico','La barra de búsqueda responde con dato, interpretación y recomendación.','Barra de búsqueda',false),

-- ── Sistema ────────────────────────────────────────────────────────────────
('SIS-01','Sistema','/',1,'Los documentos se abren','Todos los archivos —contratos, comprobantes, tickets, expedientes, fotos— se abren con enlace firmado. Si alguno dejó de verse, repórtalo.','Todo el sistema',true),
('SIS-02','Sistema','/',2,'Subir archivos','Adjuntar archivos funciona en todos los módulos donde se puede.','Todo el sistema',true),
('SIS-03','Sistema','/',3,'El menú lleva a donde dice','Cada opción del menú abre el módulo correcto.','Menú lateral',false),
('SIS-04','Sistema','/',4,'Rendimiento','Las pantallas cargan en tiempo razonable y no se quedan pensando.','Todo el sistema',false),
('SIS-05','Sistema','/',5,'La pantalla no se queda en blanco','Ninguna opción deja la pantalla vacía. Si pasa, repórtalo con el módulo y lo que hiciste.','Todo el sistema',true)

ON CONFLICT (clave) DO UPDATE SET
  modulo = EXCLUDED.modulo, ruta = EXCLUDED.ruta, orden = EXCLUDED.orden,
  titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion,
  donde = EXCLUDED.donde, critico = EXCLUDED.critico, activo = true;

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
-- select modulo, count(*) from validacion_puntos group by 1 order by 1;
-- select estado, count(*) from prp_validacion_puntos group by 1;
