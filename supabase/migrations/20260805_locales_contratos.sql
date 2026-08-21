-- ============================================================
-- IRP — Modelo de Datos: Locales + Contratos + Relación
-- Plaza IWOL / RANNIX Consulting 2026
-- ============================================================

-- ── 1. CATÁLOGO DE LOCALES ────────────────────────────────
-- Entidad física del local (nunca cambia aunque cambie inquilino)
CREATE TABLE IF NOT EXISTS public.cat_locales (
  id_local        TEXT PRIMARY KEY,            -- L01, L02 … L38
  numero_local    TEXT NOT NULL,               -- 'LOCAL 1', 'LOCAL 2'
  inmueble_id     UUID REFERENCES public.cat_inmuebles(id) ON DELETE RESTRICT,
  nivel           TEXT DEFAULT 'PLANTA BAJA'   -- 'PLANTA BAJA' | 'PLANTA ALTA'
                  CHECK (nivel IN ('PLANTA BAJA','PLANTA ALTA','MEZZANINE')),
  ancho_m         NUMERIC(8,4),
  largo_m         NUMERIC(8,4),
  superficie_m2   NUMERIC(8,4),               -- ancho × largo
  costo_m2        NUMERIC(10,2),              -- precio/m² proyectado
  renta_proyectada NUMERIC(12,2),             -- superficie × costo_m2
  -- Estatus actual del local (se actualiza al asignar/liberar contrato)
  estatus         TEXT NOT NULL DEFAULT 'DISPONIBLE'
                  CHECK (estatus IN ('DISPONIBLE','OCUPADO','EN_OBRA','BLOQUEADO','RESCISION')),
  contrato_activo_id UUID,                    -- FK circular → contratos (se agrega al final)
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. ARRENDATARIOS ─────────────────────────────────────
-- Persona física o moral que firma contratos
CREATE TABLE IF NOT EXISTS public.arrendatarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_negocio  TEXT,                       -- 'PILATES', 'OAKLIFE', etc.
  locatario       TEXT NOT NULL,              -- Nombre del titular del contrato
  rfc             TEXT,
  email           TEXT,
  telefono        TEXT,
  tipo_persona    TEXT DEFAULT 'FISICA'
                  CHECK (tipo_persona IN ('FISICA','MORAL')),
  estatus         TEXT DEFAULT 'ACTIVO'
                  CHECK (estatus IN ('ACTIVO','INACTIVO','LISTA_NEGRA')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. CONTRATOS ─────────────────────────────────────────
-- Un contrato puede cubrir 1 o N locales (OAKLIFE=L31+L32, etc.)
CREATE TABLE IF NOT EXISTS public.contratos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato     TEXT UNIQUE,             -- N05042764880, N5042759461…
  arrendatario_id     UUID NOT NULL REFERENCES public.arrendatarios(id),
  inmueble_id         UUID REFERENCES public.cat_inmuebles(id),
  -- Vigencia
  fecha_inicio        DATE NOT NULL,
  fecha_fin           DATE NOT NULL,
  -- Renta pactada TOTAL del contrato (suma de todos sus locales)
  renta_mensual       NUMERIC(12,2) NOT NULL,  -- renta real acordada
  renta_sin_iva       NUMERIC(12,2),           -- renta / 1.16
  deposito_garantia   NUMERIC(12,2),           -- 2 meses por defecto
  -- Condiciones
  dia_pago            INT DEFAULT 1            -- día del mes para cobro
                      CHECK (dia_pago BETWEEN 1 AND 28),
  penalizacion_pct    NUMERIC(5,2) DEFAULT 5.00, -- % mora mensual
  incremento_anual_pct NUMERIC(5,2),           -- % de incremento al renovar
  -- Estado
  estatus             TEXT NOT NULL DEFAULT 'VIGENTE'
                      CHECK (estatus IN ('VIGENTE','VENCIDO','RESCISION','RENOVADO','CANCELADO','BORRADOR')),
  -- Documentos
  contrato_pdf_url    TEXT,
  notas               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. CONTRATOS_LOCALES (tabla de relación M:N) ─────────
-- Núcleo del modelo: qué locales cubre cada contrato
CREATE TABLE IF NOT EXISTS public.contratos_locales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id     UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  local_id        TEXT NOT NULL REFERENCES public.cat_locales(id_local),
  -- Renta asignada a ESTE local dentro del contrato
  -- (útil cuando un contrato multi-local tiene rentas diferentes por local)
  renta_asignada  NUMERIC(12,2),
  es_principal    BOOLEAN DEFAULT TRUE,        -- local principal del contrato
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  -- Un local solo puede aparecer una vez por contrato activo
  UNIQUE (contrato_id, local_id)
);

-- ── 5. FK circular: local → contrato activo ──────────────
ALTER TABLE public.cat_locales
  ADD CONSTRAINT fk_contrato_activo
  FOREIGN KEY (contrato_activo_id)
  REFERENCES public.contratos(id)
  ON DELETE SET NULL;

-- ── 6. ÍNDICES ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contratos_arrendatario ON public.contratos(arrendatario_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estatus ON public.contratos(estatus);
CREATE INDEX IF NOT EXISTS idx_contratos_fechas ON public.contratos(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_cl_contrato ON public.contratos_locales(contrato_id);
CREATE INDEX IF NOT EXISTS idx_cl_local ON public.contratos_locales(local_id);
CREATE INDEX IF NOT EXISTS idx_locales_estatus ON public.cat_locales(estatus);

-- ── 7. TRIGGERS: updated_at automático ───────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_locales_upd
  BEFORE UPDATE ON public.cat_locales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_contratos_upd
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 8. TRIGGER: sincroniza estatus del local ──────────────
-- Cuando un contrato se activa → marca locales como OCUPADO
-- Cuando rescinde/vence → marca locales como DISPONIBLE
CREATE OR REPLACE FUNCTION public.sync_local_estatus()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estatus = 'VIGENTE' THEN
    UPDATE public.cat_locales l
    SET estatus = 'OCUPADO', contrato_activo_id = NEW.id
    FROM public.contratos_locales cl
    WHERE cl.contrato_id = NEW.id AND cl.local_id = l.id_local;
  ELSIF NEW.estatus IN ('RESCISION','VENCIDO','CANCELADO') THEN
    UPDATE public.cat_locales l
    SET estatus = 'DISPONIBLE', contrato_activo_id = NULL
    FROM public.contratos_locales cl
    WHERE cl.contrato_id = NEW.id AND cl.local_id = l.id_local;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_local_estatus
  AFTER INSERT OR UPDATE OF estatus ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.sync_local_estatus();

-- ── 9. VISTA: locales con contrato activo ─────────────────
CREATE OR REPLACE VIEW public.prp_locales AS
SELECT
  l.id_local,
  l.numero_local,
  l.nivel,
  l.superficie_m2,
  l.costo_m2,
  l.renta_proyectada,
  l.estatus AS estatus_local,
  -- Datos del contrato activo
  c.id            AS contrato_id,
  c.numero_contrato,
  c.fecha_inicio,
  c.fecha_fin,
  c.renta_mensual,
  c.estatus       AS estatus_contrato,
  -- Datos del arrendatario
  a.nombre_negocio,
  a.locatario,
  a.telefono,
  a.email,
  -- Métricas
  ROUND((c.renta_mensual / NULLIF(l.renta_proyectada,0)) * 100, 1) AS pct_vs_proyectado,
  CASE WHEN c.fecha_fin < CURRENT_DATE THEN TRUE ELSE FALSE END    AS vencido,
  (c.fecha_fin - CURRENT_DATE)                                      AS dias_para_vencer
FROM public.cat_locales l
LEFT JOIN public.contratos c ON c.id = l.contrato_activo_id
LEFT JOIN public.arrendatarios a ON a.id = c.arrendatario_id;

-- ── 10. VISTA: contratos con sus locales ──────────────────
CREATE OR REPLACE VIEW public.prp_contratos AS
SELECT
  c.id,
  c.numero_contrato,
  c.fecha_inicio,
  c.fecha_fin,
  c.renta_mensual,
  c.estatus,
  a.nombre_negocio,
  a.locatario,
  a.email,
  a.telefono,
  -- Locales concatenados: 'L31, L32'
  STRING_AGG(cl.local_id, ', ' ORDER BY cl.local_id) AS locales,
  COUNT(cl.local_id)                                  AS num_locales,
  -- Superficie total contratada
  SUM(l.superficie_m2)                                AS superficie_total_m2
FROM public.contratos c
JOIN public.arrendatarios a ON a.id = c.arrendatario_id
LEFT JOIN public.contratos_locales cl ON cl.contrato_id = c.id
LEFT JOIN public.cat_locales l ON l.id_local = cl.local_id
GROUP BY c.id, c.numero_contrato, c.fecha_inicio, c.fecha_fin,
         c.renta_mensual, c.estatus, a.nombre_negocio, a.locatario, a.email, a.telefono;

-- ── 11. RLS ───────────────────────────────────────────────
ALTER TABLE public.cat_locales       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrendatarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_locales ENABLE ROW LEVEL SECURITY;

-- Autenticados: acceso completo
CREATE POLICY "auth_all_locales"    ON public.cat_locales       FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_arrend"     ON public.arrendatarios     FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_contratos"  ON public.contratos         FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_cl"         ON public.contratos_locales FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
