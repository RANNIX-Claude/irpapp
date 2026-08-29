-- ============================================================
-- PRP — Vistas públicas para acceso PostgREST desde frontend
-- ============================================================

GRANT USAGE ON SCHEMA prp TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA prp TO anon, authenticated;

-- ============================================================
-- KPIs DASHBOARD
-- ============================================================
CREATE OR REPLACE VIEW public.prp_kpis AS
SELECT * FROM prp.v_kpis_dashboard;

GRANT SELECT ON public.prp_kpis TO anon, authenticated;

-- ============================================================
-- INMUEBLES
-- ============================================================
CREATE OR REPLACE VIEW public.prp_inmuebles AS
SELECT
  i.id, i.clave, i.nombre, i.tipo_inmueble,
  i.municipio AS ciudad, i.estado, i.cp,
  i.m2_totales,
  COUNT(u.id) AS unidades_total,
  COUNT(u.id) FILTER (WHERE u.estado_id = 'OCUPADO') AS unidades_ocupadas
FROM prp.inmuebles i
LEFT JOIN prp.unidades u ON u.inmueble_id = i.id
GROUP BY i.id, i.clave, i.nombre, i.tipo_inmueble, i.municipio, i.estado, i.cp, i.m2_totales;

GRANT SELECT ON public.prp_inmuebles TO anon, authenticated;

-- ============================================================
-- UNIDADES
-- ============================================================
CREATE OR REPLACE VIEW public.prp_unidades AS
SELECT
  u.id, u.clave, u.numero_local, u.tipo_unidad, u.m2_totales, u.piso, u.estado_id,
  u.renta_base, u.inmueble_id,
  i.nombre AS inmueble_nombre, i.clave AS inmueble_clave
FROM prp.unidades u
LEFT JOIN prp.inmuebles i ON i.id = u.inmueble_id;

GRANT SELECT ON public.prp_unidades TO anon, authenticated;

-- ============================================================
-- ARRENDATARIOS
-- ============================================================
CREATE OR REPLACE VIEW public.prp_arrendatarios AS
SELECT
  a.id,
  a.tipo_persona,
  COALESCE(a.razon_social, a.nombre || ' ' || a.apellido_pat) AS nombre_razon_social,
  a.razon_social, a.nombre, a.apellido_pat, a.apellido_mat,
  a.rfc, a.regimen_fiscal, a.giro_comercial,
  a.rep_legal,
  a.email_principal AS email,
  a.telefono, a.celular,
  a.municipio AS ciudad, a.estado, a.cp,
  a.estado_id, a.calificacion, a.notas,
  eg.nombre AS estado_nombre,
  (
    SELECT COUNT(*) FROM prp.contratos_arrendamiento c
    WHERE c.arrendatario_id = a.id AND c.estado_id = 'VIGENTE'
  ) AS contratos_activos,
  (
    SELECT COALESCE(SUM(cr.saldo_pendiente),0)
    FROM prp.cargos_renta cr
    JOIN prp.contratos_arrendamiento c ON c.id = cr.contrato_id
    WHERE c.arrendatario_id = a.id AND cr.estado_id IN ('PENDIENTE','EN_MORA')
  ) AS saldo_pendiente
FROM prp.arrendatarios a
LEFT JOIN prp.cat_estado_general eg ON eg.clave = a.estado_id;

GRANT SELECT ON public.prp_arrendatarios TO anon, authenticated;

-- ============================================================
-- CONTRATOS
-- ============================================================
CREATE OR REPLACE VIEW public.prp_contratos AS
SELECT
  c.id, c.folio, c.tipo_contrato, c.estado_id,
  c.fecha_inicio, c.fecha_fin,
  c.renta_mensual, c.cuota_mant, c.deposito_garantia,
  c.arrendatario_id, c.unidad_id,
  COALESCE(a.razon_social, a.nombre || ' ' || a.apellido_pat) AS arrendatario_nombre,
  a.rfc AS arrendatario_rfc,
  u.numero_local AS unidad_numero,
  i.nombre AS inmueble_nombre, i.clave AS inmueble_clave,
  eg.nombre AS estado_nombre,
  (c.fecha_fin - CURRENT_DATE)::INTEGER AS dias_restantes,
  CASE
    WHEN c.fecha_fin < CURRENT_DATE THEN 'VENCIDO'
    WHEN (c.fecha_fin - CURRENT_DATE) <= 30 THEN 'CRITICO'
    WHEN (c.fecha_fin - CURRENT_DATE) <= 60 THEN 'ALERTA'
    ELSE 'OK'
  END AS semaforo_vencimiento
FROM prp.contratos_arrendamiento c
LEFT JOIN prp.arrendatarios a ON a.id = c.arrendatario_id
LEFT JOIN prp.unidades u ON u.id = c.unidad_id
LEFT JOIN prp.inmuebles i ON i.id = u.inmueble_id
LEFT JOIN prp.cat_estado_general eg ON eg.clave = c.estado_id;

GRANT SELECT ON public.prp_contratos TO anon, authenticated;

-- ============================================================
-- COBRANZA
-- ============================================================
CREATE OR REPLACE VIEW public.prp_cobranza AS
SELECT
  cr.id, cr.periodo, cr.fecha_cargo, cr.fecha_vencimiento,
  cr.renta, cr.cuota_mant, cr.total, cr.saldo_pendiente, cr.mora_acumulada,
  cr.estado_id, cr.cfdi_uuid,
  cr.contrato_id,
  c.folio AS contrato_folio,
  COALESCE(a.razon_social, a.nombre || ' ' || a.apellido_pat) AS arrendatario_nombre,
  a.rfc AS arrendatario_rfc,
  i.nombre AS inmueble_nombre,
  u.numero_local AS unidad_numero,
  eg.nombre AS estado_nombre
FROM prp.cargos_renta cr
JOIN prp.contratos_arrendamiento c ON c.id = cr.contrato_id
LEFT JOIN prp.arrendatarios a ON a.id = c.arrendatario_id
LEFT JOIN prp.unidades u ON u.id = c.unidad_id
LEFT JOIN prp.inmuebles i ON i.id = u.inmueble_id
LEFT JOIN prp.cat_estado_general eg ON eg.clave = cr.estado_id;

GRANT SELECT ON public.prp_cobranza TO anon, authenticated;

-- ============================================================
-- EMPLEADOS
-- ============================================================
CREATE OR REPLACE VIEW public.prp_empleados AS
SELECT
  e.id, e.numero_empleado, e.nombre, e.apellido_pat, e.apellido_mat,
  e.nombre_completo,
  e.rfc, e.curp, e.nss, e.sexo,
  DATE_PART('year', AGE(e.fecha_nacimiento))::INTEGER AS edad,
  e.fecha_ingreso, e.puesto, e.area, e.departamento,
  e.salario_diario, e.salario_mensual,
  e.estado_id,
  e.email, e.celular,
  eg.nombre AS estado_nombre,
  cl.fecha_fin AS contrato_fin,
  cl.tipo_contrato AS tipo_contrato_nombre,
  CASE
    WHEN cl.fecha_fin IS NULL THEN 'INDETERMINADO'
    WHEN (cl.fecha_fin - CURRENT_DATE) < 0 THEN 'VENCIDO'
    WHEN (cl.fecha_fin - CURRENT_DATE) <= 15 THEN 'CRITICO'
    WHEN (cl.fecha_fin - CURRENT_DATE) <= 30 THEN 'ALERTA'
    ELSE 'OK'
  END AS semaforo_contrato
FROM prp.empleados e
LEFT JOIN prp.cat_estado_general eg ON eg.clave = e.estado_id
LEFT JOIN LATERAL (
  SELECT fecha_fin, tipo_contrato FROM prp.contratos_laborales
  WHERE empleado_id = e.id AND estado_id = 'VIGENTE'
  ORDER BY fecha_inicio DESC LIMIT 1
) cl ON true;

GRANT SELECT ON public.prp_empleados TO anon, authenticated;

-- ============================================================
-- ASISTENCIA
-- ============================================================
CREATE OR REPLACE VIEW public.prp_asistencia AS
SELECT
  a.id, a.empleado_id, a.fecha, a.estado,
  a.hora_entrada, a.hora_salida,
  a.horas_trabajadas, a.horas_extra, a.minutos_retardo,
  e.nombre_completo, e.numero_empleado, e.puesto, e.area
FROM prp.asistencia_diaria a
LEFT JOIN prp.empleados e ON e.id = a.empleado_id;

GRANT SELECT ON public.prp_asistencia TO anon, authenticated;

-- ============================================================
-- VACANTES Y CANDIDATOS
-- ============================================================
CREATE OR REPLACE VIEW public.prp_vacantes AS
SELECT v.*
FROM prp.vacantes v;

GRANT SELECT ON public.prp_vacantes TO anon, authenticated;

CREATE OR REPLACE VIEW public.prp_candidatos AS
SELECT c.*, v.puesto AS vacante_puesto
FROM prp.candidatos c
LEFT JOIN prp.vacantes v ON v.id = c.vacante_id;

GRANT SELECT ON public.prp_candidatos TO anon, authenticated;

-- ============================================================
-- ESTACIONAMIENTO
-- ============================================================
CREATE OR REPLACE VIEW public.prp_cajones AS
SELECT
  ca.id, ca.numero, ca.zona, ca.nivel, ca.tipo, ca.estado_id,
  ca.reservado
FROM prp.cajones_estacionamiento ca;

GRANT SELECT ON public.prp_cajones TO anon, authenticated;

-- ============================================================
-- PROSPECTOS
-- ============================================================
CREATE OR REPLACE VIEW public.prp_prospectos AS
SELECT
  p.id, p.nombre, p.empresa, p.giro,
  p.email, p.telefono, p.celular,
  p.m2_requeridos, p.presupuesto_max,
  p.origen, p.etapa, p.probabilidad, p.temperatura,
  p.notas, p.created_at
FROM prp.prospectos p;

GRANT SELECT ON public.prp_prospectos TO anon, authenticated;

-- ============================================================
-- RPC: CREAR CONTRATO DE ARRENDAMIENTO
-- ============================================================
CREATE OR REPLACE FUNCTION public.crear_contrato(
  p_arrendatario_id UUID,
  p_unidad_id UUID,
  p_tipo_contrato TEXT,
  p_fecha_inicio DATE,
  p_fecha_fin DATE,
  p_renta_mensual NUMERIC,
  p_cuota_mant NUMERIC DEFAULT 0,
  p_deposito_garantia NUMERIC DEFAULT 0
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_folio TEXT;
  v_seq INTEGER;
  v_id UUID;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(folio, '-', 3) AS INTEGER)), 0) + 1
  INTO v_seq
  FROM prp.contratos_arrendamiento
  WHERE folio LIKE 'CA-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-%';

  v_folio := 'CA-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(v_seq::TEXT, 4, '0');

  INSERT INTO prp.contratos_arrendamiento (
    folio, tipo_contrato, estado_id,
    fecha_inicio, fecha_fin,
    renta_mensual, cuota_mant, deposito_garantia,
    arrendatario_id, unidad_id
  ) VALUES (
    v_folio, p_tipo_contrato, 'VIGENTE',
    p_fecha_inicio, p_fecha_fin,
    p_renta_mensual, p_cuota_mant, p_deposito_garantia,
    p_arrendatario_id, p_unidad_id
  ) RETURNING id INTO v_id;

  UPDATE prp.unidades SET estado_id = 'OCUPADO' WHERE id = p_unidad_id;

  RETURN json_build_object('id', v_id, 'folio', v_folio, 'ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_contrato TO authenticated;

-- ============================================================
-- RPC: CREAR EMPLEADO
-- ============================================================
CREATE OR REPLACE FUNCTION public.crear_empleado(
  p_nombre TEXT,
  p_apellido_pat TEXT,
  p_apellido_mat TEXT DEFAULT '',
  p_sexo CHAR(1) DEFAULT 'M',
  p_rfc TEXT DEFAULT NULL,
  p_curp TEXT DEFAULT NULL,
  p_nss TEXT DEFAULT NULL,
  p_fecha_nacimiento DATE DEFAULT NULL,
  p_fecha_ingreso DATE DEFAULT CURRENT_DATE,
  p_puesto TEXT DEFAULT NULL,
  p_area TEXT DEFAULT NULL,
  p_departamento TEXT DEFAULT NULL,
  p_salario_diario NUMERIC DEFAULT 0,
  p_email TEXT DEFAULT NULL,
  p_celular TEXT DEFAULT NULL,
  p_tipo_contrato TEXT DEFAULT 'INDEFINIDO',
  p_fecha_fin_contrato DATE DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_num TEXT;
  v_seq INTEGER;
  v_emp_id UUID;
  v_nombre_completo TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(REPLACE(numero_empleado, 'EMP-', '') AS INTEGER)), 0) + 1
  INTO v_seq FROM prp.empleados WHERE numero_empleado LIKE 'EMP-%';

  v_num := 'EMP-' || LPAD(v_seq::TEXT, 4, '0');
  v_nombre_completo := TRIM(p_nombre || ' ' || p_apellido_pat || ' ' || COALESCE(p_apellido_mat, ''));

  INSERT INTO prp.empleados (
    numero_empleado, nombre, apellido_pat, apellido_mat, nombre_completo,
    sexo, rfc, curp, nss, fecha_nacimiento,
    fecha_ingreso, puesto, area, departamento,
    salario_diario, salario_mensual, estado_id,
    email, celular
  ) VALUES (
    v_num, p_nombre, p_apellido_pat, p_apellido_mat, v_nombre_completo,
    p_sexo, p_rfc, p_curp, p_nss, p_fecha_nacimiento,
    p_fecha_ingreso, p_puesto, p_area, p_departamento,
    p_salario_diario, p_salario_diario * 30, 'ACTIVO',
    p_email, p_celular
  ) RETURNING id INTO v_emp_id;

  IF p_tipo_contrato != 'INDEFINIDO' OR p_fecha_fin_contrato IS NOT NULL THEN
    INSERT INTO prp.contratos_laborales (
      empleado_id, tipo_contrato, estado_id,
      fecha_inicio, fecha_fin
    ) VALUES (
      v_emp_id, p_tipo_contrato, 'VIGENTE',
      p_fecha_ingreso, p_fecha_fin_contrato
    );
  END IF;

  RETURN json_build_object('id', v_emp_id, 'numero_empleado', v_num, 'ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_empleado TO authenticated;
