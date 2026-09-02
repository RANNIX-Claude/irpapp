-- TABLA: cargos_programados
CREATE TABLE IF NOT EXISTS public.cargos_programados (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id       UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  unidad_id         UUID,                          -- referencia a locales/unidades
  concepto          TEXT NOT NULL CHECK (concepto IN ('RENTA','SANCION','MANTENIMIENTO','AGUA','OTRO')),
  descripcion       TEXT,                          -- "Renta MAY 2026", "Sanción por mora FEB 2026"
  periodo_mes       INT CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_anio      INT,
  importe           NUMERIC(14,2) NOT NULL,        -- monto original, NUNCA cambia
  fecha_vencimiento DATE NOT NULL,
  estado            TEXT DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PARCIAL','PAGADO','CANCELADO')),
  origen_cargo_id   UUID REFERENCES public.cargos_programados(id), -- para sanciones: apunta a la renta origen
  generado_auto     BOOLEAN DEFAULT FALSE,          -- TRUE si lo generó el job nocturno
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- TABLA: ingresos (reemplaza/extiende la actual)
-- La tabla ingresos ya existe, necesitamos agregarle contrato_id y limpiar cobro_id
ALTER TABLE public.ingresos
  ADD COLUMN IF NOT EXISTS contrato_id UUID REFERENCES public.contratos(id),
  ADD COLUMN IF NOT EXISTS importe_total NUMERIC(14,2);

-- Actualizar importe_total desde importe existente
UPDATE public.ingresos SET importe_total = importe WHERE importe_total IS NULL;

-- TABLA: aplicaciones_pago (pivot N:N)
CREATE TABLE IF NOT EXISTS public.aplicaciones_pago (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingreso_id         BIGINT NOT NULL REFERENCES public.ingresos(id) ON DELETE CASCADE,
  cargo_id           UUID NOT NULL REFERENCES public.cargos_programados(id) ON DELETE CASCADE,
  importe_aplicado   NUMERIC(14,2) NOT NULL CHECK (importe_aplicado > 0),
  fecha_aplicacion   DATE DEFAULT CURRENT_DATE,
  nota               TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ingreso_id, cargo_id)  -- solo una aplicación por par ingreso/cargo
);

-- FUNCIÓN: actualizar estado del cargo automáticamente
CREATE OR REPLACE FUNCTION fn_actualizar_estado_cargo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_importe     NUMERIC;
  v_aplicado    NUMERIC;
  v_nuevo_estado TEXT;
BEGIN
  SELECT importe INTO v_importe FROM public.cargos_programados WHERE id = NEW.cargo_id;
  SELECT COALESCE(SUM(importe_aplicado), 0) INTO v_aplicado
    FROM public.aplicaciones_pago WHERE cargo_id = NEW.cargo_id;

  IF v_aplicado >= v_importe - 0.01 THEN
    v_nuevo_estado := 'PAGADO';
  ELSIF v_aplicado > 0 THEN
    v_nuevo_estado := 'PARCIAL';
  ELSE
    v_nuevo_estado := 'PENDIENTE';
  END IF;

  UPDATE public.cargos_programados
    SET estado = v_nuevo_estado, updated_at = now()
    WHERE id = NEW.cargo_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_actualizar_cargo_estado
  AFTER INSERT OR UPDATE OR DELETE ON public.aplicaciones_pago
  FOR EACH ROW EXECUTE FUNCTION fn_actualizar_estado_cargo();

-- FUNCIÓN: job nocturno — generar sanciones
CREATE OR REPLACE FUNCTION fn_generar_sanciones(p_pct_default NUMERIC DEFAULT 0.10)
RETURNS TABLE(contratos_afectados INT, sanciones_creadas INT)
LANGUAGE plpgsql AS $$
DECLARE
  v_cargo RECORD;
  v_pct   NUMERIC;
  v_monto NUMERIC;
  v_cnt   INT := 0;
BEGIN
  FOR v_cargo IN
    SELECT cp.id, cp.contrato_id, cp.importe, cp.periodo_mes, cp.periodo_anio, cp.descripcion
    FROM public.cargos_programados cp
    WHERE cp.concepto = 'RENTA'
      AND cp.estado IN ('PENDIENTE','PARCIAL')
      AND cp.fecha_vencimiento < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.cargos_programados s
        WHERE s.origen_cargo_id = cp.id AND s.concepto = 'SANCION'
          AND DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', CURRENT_DATE)
      )
  LOOP
    -- Calcular saldo pendiente
    SELECT cp2.importe - COALESCE(SUM(ap.importe_aplicado), 0)
    INTO v_monto
    FROM public.cargos_programados cp2
    LEFT JOIN public.aplicaciones_pago ap ON ap.cargo_id = cp2.id
    WHERE cp2.id = v_cargo.id
    GROUP BY cp2.importe;

    v_pct := p_pct_default;

    IF v_monto > 0 THEN
      INSERT INTO public.cargos_programados (
        contrato_id, concepto, descripcion,
        periodo_mes, periodo_anio,
        importe, fecha_vencimiento,
        origen_cargo_id, generado_auto
      ) VALUES (
        v_cargo.contrato_id,
        'SANCION',
        'Sanción por mora — ' || COALESCE(v_cargo.descripcion, ''),
        EXTRACT(MONTH FROM CURRENT_DATE)::INT,
        EXTRACT(YEAR FROM CURRENT_DATE)::INT,
        ROUND(v_monto * v_pct, 2),
        CURRENT_DATE + 5,
        v_cargo.id,
        TRUE
      );
      v_cnt := v_cnt + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_cnt, v_cnt;
END;
$$;

-- VISTA: cartera activa (equivalente a prp_cobros pero con nuevo modelo)
CREATE OR REPLACE VIEW public.prp_cartera AS
SELECT
  cp.id,
  cp.contrato_id,
  cp.concepto,
  cp.descripcion,
  cp.periodo_mes,
  cp.periodo_anio,
  cp.importe,
  cp.fecha_vencimiento,
  cp.estado,
  cp.generado_auto,
  cp.origen_cargo_id,
  COALESCE(SUM(ap.importe_aplicado), 0) AS total_aplicado,
  cp.importe - COALESCE(SUM(ap.importe_aplicado), 0) AS saldo,
  -- Datos del contrato/arrendatario
  con.folio AS contrato_folio,
  con.arrendatario_nombre,
  con.renta_mensual,
  con.inmueble_nombre,
  con.locales_display,
  con.locales_referencia
FROM public.cargos_programados cp
LEFT JOIN public.aplicaciones_pago ap ON ap.cargo_id = cp.id
LEFT JOIN public.prp_contratos con ON con.id = cp.contrato_id
GROUP BY cp.id, con.id, con.folio, con.arrendatario_nombre,
         con.renta_mensual, con.inmueble_nombre, con.locales_display, con.locales_referencia;

-- RLS
ALTER TABLE public.cargos_programados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplicaciones_pago ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados todo" ON public.cargos_programados FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "autenticados todo" ON public.aplicaciones_pago FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
