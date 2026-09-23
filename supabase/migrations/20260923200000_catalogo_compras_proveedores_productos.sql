-- ============================================================
-- Catálogo único de proveedores + análisis de compras
--
-- cat_proveedores es el único catálogo. Las compras siguen capturando el
-- nombre como texto (tickets, OCR, fondo revolvente, vending, proyectos), y un
-- trigger lo liga al catálogo buscando por nombre, clave o alias normalizados
-- ("SAM'S", "Sams Club " y "SAMS CLUB" caen en la misma llave).
--
-- Los nombres que no encuentran pareja se ligan desde la pantalla de
-- Proveedores con vincular_nombre_proveedor(): el texto queda como alias y
-- todas las compras históricas con ese nombre se ligan de una vez.
--
-- prp_compras junta en una sola vista el dinero pagado a proveedores:
--   gastos_operativos → ámbito OPERACION o VENDING (reabasto de máquinas)
--   proyecto_pagos    → ámbito PROYECTOS (proveedor del proyecto)
-- vending_movimientos (COMPRA) NO entra al total: registra inventario, y el
-- dinero de ese reabasto ya está en gastos_operativos ("Vending / Reabasto").
-- ============================================================

-- 1. Catálogo ------------------------------------------------------------
ALTER TABLE public.cat_proveedores DROP CONSTRAINT IF EXISTS cat_proveedores_categoria_check;
ALTER TABLE public.cat_proveedores ADD CONSTRAINT cat_proveedores_categoria_check
  CHECK (categoria IN ('VENDING','OPERACION','MANTENIMIENTO','PROYECTOS','MIXTO'));

ALTER TABLE public.cat_proveedores
  ADD COLUMN IF NOT EXISTS razon_social text,
  ADD COLUMN IF NOT EXISTS alias text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.cat_proveedores.alias IS
  'Nombres alternos ya normalizados con proveedor_norm(); los llena vincular_nombre_proveedor()';

-- 2. Normalización y búsqueda --------------------------------------------
CREATE OR REPLACE FUNCTION public.proveedor_norm(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(regexp_replace(
           translate(upper(trim(coalesce(p, ''))), 'ÁÉÍÓÚÜÑ', 'AEIOUUN'),
           '[^A-Z0-9]', '', 'g'), '')
$$;

CREATE OR REPLACE FUNCTION public.proveedor_buscar(p text)
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT c.id
  FROM public.cat_proveedores c
  WHERE public.proveedor_norm(p) IS NOT NULL
    AND (   public.proveedor_norm(c.nombre) = public.proveedor_norm(p)
         OR public.proveedor_norm(c.clave)  = public.proveedor_norm(p)
         OR public.proveedor_norm(c.razon_social) = public.proveedor_norm(p)
         OR public.proveedor_norm(p) = ANY (c.alias))
  ORDER BY c.activo DESC, c.created_at
  LIMIT 1
$$;

-- 3. proveedor_id en las tablas que solo tenían texto --------------------
ALTER TABLE public.vending_movimientos
  ADD COLUMN IF NOT EXISTS proveedor_id uuid REFERENCES public.cat_proveedores(id) ON DELETE SET NULL;
ALTER TABLE public.proyecto_cotizaciones
  ADD COLUMN IF NOT EXISTS proveedor_id uuid REFERENCES public.cat_proveedores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gastos_operativos_proveedor_id   ON public.gastos_operativos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_vending_movimientos_proveedor_id ON public.vending_movimientos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_proyecto_cotizaciones_prov_id    ON public.proyecto_cotizaciones(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_proveedor_id           ON public.proyectos(proveedor_id);

-- 4. Trigger: liga el texto al catálogo cuando no viene proveedor_id -----
CREATE OR REPLACE FUNCTION public.trg_vincular_proveedor()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_txt text := coalesce(nullif(trim(to_jsonb(NEW)->>'proveedor'), ''),
                         to_jsonb(NEW)->>'proveedor_nombre');
BEGIN
  IF NEW.proveedor_id IS NULL AND v_txt IS NOT NULL THEN
    NEW.proveedor_id := public.proveedor_buscar(v_txt);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_gastos_vincular_proveedor ON public.gastos_operativos;
CREATE TRIGGER trg_gastos_vincular_proveedor
  BEFORE INSERT OR UPDATE OF proveedor, proveedor_nombre, proveedor_id ON public.gastos_operativos
  FOR EACH ROW EXECUTE FUNCTION public.trg_vincular_proveedor();

DROP TRIGGER IF EXISTS trg_vending_mov_vincular_proveedor ON public.vending_movimientos;
CREATE TRIGGER trg_vending_mov_vincular_proveedor
  BEFORE INSERT OR UPDATE OF proveedor, proveedor_id ON public.vending_movimientos
  FOR EACH ROW EXECUTE FUNCTION public.trg_vincular_proveedor();

DROP TRIGGER IF EXISTS trg_cotizaciones_vincular_proveedor ON public.proyecto_cotizaciones;
CREATE TRIGGER trg_cotizaciones_vincular_proveedor
  BEFORE INSERT OR UPDATE OF proveedor, proveedor_id ON public.proyecto_cotizaciones
  FOR EACH ROW EXECUTE FUNCTION public.trg_vincular_proveedor();

DROP TRIGGER IF EXISTS trg_proyectos_vincular_proveedor ON public.proyectos;
CREATE TRIGGER trg_proyectos_vincular_proveedor
  BEFORE INSERT OR UPDATE OF proveedor_nombre, proveedor_id ON public.proyectos
  FOR EACH ROW EXECUTE FUNCTION public.trg_vincular_proveedor();

-- 5. Backfill de lo histórico ---------------------------------------------
UPDATE public.gastos_operativos
   SET proveedor_id = public.proveedor_buscar(coalesce(nullif(trim(proveedor), ''), proveedor_nombre))
 WHERE proveedor_id IS NULL
   AND public.proveedor_buscar(coalesce(nullif(trim(proveedor), ''), proveedor_nombre)) IS NOT NULL;

UPDATE public.vending_movimientos
   SET proveedor_id = public.proveedor_buscar(proveedor)
 WHERE proveedor_id IS NULL AND public.proveedor_buscar(proveedor) IS NOT NULL;

UPDATE public.proyecto_cotizaciones
   SET proveedor_id = public.proveedor_buscar(proveedor)
 WHERE proveedor_id IS NULL AND public.proveedor_buscar(proveedor) IS NOT NULL;

UPDATE public.proyectos
   SET proveedor_id = public.proveedor_buscar(proveedor_nombre)
 WHERE proveedor_id IS NULL AND public.proveedor_buscar(proveedor_nombre) IS NOT NULL;

-- 6. Ligar un nombre suelto al catálogo (desde la UI) ---------------------
CREATE OR REPLACE FUNCTION public.vincular_nombre_proveedor(p_texto text, p_proveedor_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_norm text := public.proveedor_norm(p_texto);
  v_n    integer := 0;
  v_k    integer;
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'Sin permiso' USING ERRCODE = '42501';
  END IF;
  IF v_norm IS NULL OR p_proveedor_id IS NULL THEN
    RAISE EXCEPTION 'Nombre y proveedor son obligatorios';
  END IF;

  UPDATE public.cat_proveedores
     SET alias = array_append(alias, v_norm)
   WHERE id = p_proveedor_id
     AND NOT (v_norm = ANY (alias))
     AND v_norm IS DISTINCT FROM public.proveedor_norm(nombre)
     AND v_norm IS DISTINCT FROM public.proveedor_norm(clave);

  UPDATE public.gastos_operativos SET proveedor_id = p_proveedor_id
   WHERE proveedor_id IS NULL
     AND public.proveedor_norm(coalesce(nullif(trim(proveedor), ''), proveedor_nombre)) = v_norm;
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;

  UPDATE public.vending_movimientos SET proveedor_id = p_proveedor_id
   WHERE proveedor_id IS NULL AND public.proveedor_norm(proveedor) = v_norm;
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;

  UPDATE public.proyecto_cotizaciones SET proveedor_id = p_proveedor_id
   WHERE proveedor_id IS NULL AND public.proveedor_norm(proveedor) = v_norm;
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;

  UPDATE public.proyectos SET proveedor_id = p_proveedor_id
   WHERE proveedor_id IS NULL AND public.proveedor_norm(proveedor_nombre) = v_norm;
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;

  RETURN v_n;
END $$;

REVOKE EXECUTE ON FUNCTION public.proveedor_norm(text)                   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.proveedor_buscar(text)                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_vincular_proveedor()               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.vincular_nombre_proveedor(text, uuid)  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.proveedor_norm(text)                   TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.proveedor_buscar(text)                 TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.trg_vincular_proveedor()               TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.vincular_nombre_proveedor(text, uuid)  TO authenticated, service_role;

-- 7. Vista de compras -----------------------------------------------------
DROP VIEW IF EXISTS public.prp_compras_resumen;
DROP VIEW IF EXISTS public.prp_compras;
CREATE VIEW public.prp_compras WITH (security_invoker = true) AS
SELECT
  'GASTO'::text                                   AS origen,
  CASE WHEN g.tipo_compra = 'VENDING' OR g.grupo_gasto ILIKE '%vending%'
       THEN 'VENDING' ELSE 'OPERACION' END        AS ambito,
  g.id                                            AS registro_id,
  g.fecha,
  extract(year  FROM g.fecha)::int                AS anio,
  extract(month FROM g.fecha)::int                AS mes,
  g.proveedor_id,
  coalesce(c.nombre, nullif(trim(g.proveedor), ''), g.proveedor_nombre, 'Sin proveedor') AS proveedor,
  coalesce(nullif(trim(g.proveedor), ''), g.proveedor_nombre) AS proveedor_texto,
  coalesce(public.proveedor_norm(coalesce(nullif(trim(g.proveedor), ''), g.proveedor_nombre)), '') AS texto_norm,
  g.grupo_gasto                                   AS grupo,
  g.descripcion                                   AS concepto,
  g.cantidad                                      AS monto,
  coalesce(g.tiene_factura, false)                AS tiene_factura
FROM public.gastos_operativos g
LEFT JOIN public.cat_proveedores c ON c.id = g.proveedor_id
UNION ALL
SELECT
  'PROYECTO', 'PROYECTOS',
  pp.id,
  pp.fecha,
  extract(year  FROM pp.fecha)::int,
  extract(month FROM pp.fecha)::int,
  p.proveedor_id,
  coalesce(c.nombre, nullif(trim(p.proveedor_nombre), ''), 'Sin proveedor'),
  p.proveedor_nombre,
  coalesce(public.proveedor_norm(p.proveedor_nombre), ''),
  p.nombre,
  pp.descripcion || ' (' || pp.tipo || ')',
  pp.monto,
  (pp.factura_pdf_url IS NOT NULL OR pp.factura_xml_url IS NOT NULL)
FROM public.proyecto_pagos pp
JOIN public.proyectos p ON p.id = pp.proyecto_id
LEFT JOIN public.cat_proveedores c ON c.id = p.proveedor_id;

GRANT SELECT ON public.prp_compras TO authenticated, service_role;

-- Resumen por proveedor/mes/ámbito para el análisis. Los nombres que aún no
-- están en el catálogo se agrupan por su texto normalizado.
CREATE VIEW public.prp_compras_resumen WITH (security_invoker = true) AS
SELECT
  anio, mes, ambito, proveedor_id,
  CASE WHEN proveedor_id IS NULL THEN texto_norm END AS texto_norm,
  min(proveedor)  AS proveedor,
  sum(monto)      AS monto,
  count(*)::int   AS compras,
  max(fecha)      AS ultima_fecha
FROM public.prp_compras
GROUP BY 1, 2, 3, 4, 5;

GRANT SELECT ON public.prp_compras_resumen TO authenticated, service_role;

-- ============================================================
-- PRODUCTOS
--
-- La clasificación deja de ser un CHECK fijo y pasa a un catálogo editable
-- (cat_clasificacion_producto). Los valores de siempre (VENDING, OPERACION,
-- MANTENIMIENTO) siguen siendo válidos.
--
-- Cada línea de ticket (gasto_detalle) se liga a un producto: si no trae
-- producto_id, el trigger lo busca por nombre o alias normalizado y, si no
-- existe, lo da de alta con origen TICKET y sin clasificar. La clasificación
-- se pone a mano desde Productos, y los duplicados se juntan con
-- fusionar_productos() — el nombre absorbido queda como alias.
-- ============================================================

-- 8. Catálogo de clasificaciones -----------------------------------------
CREATE TABLE IF NOT EXISTS public.cat_clasificacion_producto (
  clave      text PRIMARY KEY,
  nombre     text NOT NULL,
  color      text NOT NULL DEFAULT '#6B7280',
  orden      integer NOT NULL DEFAULT 100,
  activo     boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.cat_clasificacion_producto (clave, nombre, color, orden) VALUES
  ('VENDING',       'Vending',              '#EC4899', 10),
  ('CONSUMO',       'Consumo',              '#0A66C2', 20),
  ('OPERACION',     'Operación / limpieza', '#057642', 30),
  ('MANTENIMIENTO', 'Mantenimiento',        '#E8A020', 40),
  ('PAPELERIA',     'Papelería y oficina',  '#7C3AED', 50),
  ('MIXTO',         'Mixto',                '#0891B2', 90)
ON CONFLICT (clave) DO NOTHING;

ALTER TABLE public.cat_clasificacion_producto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_all ON public.cat_clasificacion_producto;
CREATE POLICY staff_all ON public.cat_clasificacion_producto
  FOR ALL TO authenticated USING (public.es_staff()) WITH CHECK (public.es_staff());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cat_clasificacion_producto TO authenticated;

-- categoria: de CHECK fijo a FK al catálogo, y opcional (= sin clasificar)
ALTER TABLE public.cat_productos DROP CONSTRAINT IF EXISTS cat_productos_categoria_check;
ALTER TABLE public.cat_productos ALTER COLUMN categoria DROP NOT NULL;
ALTER TABLE public.cat_productos DROP CONSTRAINT IF EXISTS cat_productos_categoria_fkey;
ALTER TABLE public.cat_productos ADD CONSTRAINT cat_productos_categoria_fkey
  FOREIGN KEY (categoria) REFERENCES public.cat_clasificacion_producto(clave) ON UPDATE CASCADE;

ALTER TABLE public.gasto_detalle DROP CONSTRAINT IF EXISTS gasto_detalle_categoria_check;
ALTER TABLE public.gasto_detalle DROP CONSTRAINT IF EXISTS gasto_detalle_categoria_fkey;
ALTER TABLE public.gasto_detalle ADD CONSTRAINT gasto_detalle_categoria_fkey
  FOREIGN KEY (categoria) REFERENCES public.cat_clasificacion_producto(clave) ON UPDATE CASCADE;

ALTER TABLE public.cat_productos
  ADD COLUMN IF NOT EXISTS alias  text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS origen text   NOT NULL DEFAULT 'MANUAL';

CREATE INDEX IF NOT EXISTS idx_gasto_detalle_producto_id ON public.gasto_detalle(producto_id);

CREATE SEQUENCE IF NOT EXISTS public.cat_productos_clave_seq;
GRANT USAGE, SELECT ON SEQUENCE public.cat_productos_clave_seq TO authenticated, service_role;

-- 9. Alta automática desde tickets ----------------------------------------
CREATE OR REPLACE FUNCTION public.trg_gasto_detalle_producto()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_norm text := public.proveedor_norm(NEW.descripcion);
BEGIN
  IF NEW.producto_id IS NOT NULL OR v_norm IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.id INTO NEW.producto_id
  FROM public.cat_productos p
  WHERE public.proveedor_norm(p.nombre) = v_norm OR v_norm = ANY (p.alias)
  ORDER BY p.activo DESC, p.created_at
  LIMIT 1;

  IF NEW.producto_id IS NULL THEN
    INSERT INTO public.cat_productos (clave, nombre, categoria, unidad, precio_ref, codigo_proveedor, origen, activo)
    VALUES ('TK-' || lpad(nextval('public.cat_productos_clave_seq')::text, 5, '0'),
            trim(NEW.descripcion), NEW.categoria, 'PZA', NEW.precio_unit,
            NEW.codigo_proveedor, 'TICKET', true)
    RETURNING id INTO NEW.producto_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_gasto_detalle_producto ON public.gasto_detalle;
CREATE TRIGGER trg_gasto_detalle_producto
  BEFORE INSERT OR UPDATE OF descripcion, producto_id ON public.gasto_detalle
  FOR EACH ROW EXECUTE FUNCTION public.trg_gasto_detalle_producto();

-- Backfill: las líneas históricas pasan por el mismo trigger
UPDATE public.gasto_detalle SET producto_id = NULL WHERE producto_id IS NULL;

-- 10. Fusionar productos duplicados ---------------------------------------
CREATE OR REPLACE FUNCTION public.fusionar_productos(p_origen uuid, p_destino uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_org public.cat_productos%ROWTYPE;
  v_n   integer;
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'Sin permiso' USING ERRCODE = '42501';
  END IF;
  IF p_origen IS NULL OR p_destino IS NULL OR p_origen = p_destino THEN
    RAISE EXCEPTION 'Elige dos productos distintos';
  END IF;
  SELECT * INTO v_org FROM public.cat_productos WHERE id = p_origen;
  IF NOT FOUND THEN RAISE EXCEPTION 'Producto origen no existe'; END IF;

  UPDATE public.cat_productos d
     SET alias = ARRAY(SELECT DISTINCT a FROM unnest(
                   d.alias || v_org.alias || public.proveedor_norm(v_org.nombre)) a
                 WHERE a IS NOT NULL AND a <> public.proveedor_norm(d.nombre)),
         imagen_url = coalesce(d.imagen_url, v_org.imagen_url),
         categoria  = coalesce(d.categoria, v_org.categoria)
   WHERE d.id = p_destino;

  UPDATE public.gasto_detalle SET producto_id = p_destino WHERE producto_id = p_origen;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  BEGIN
    DELETE FROM public.cat_productos WHERE id = p_origen;
  EXCEPTION WHEN foreign_key_violation THEN
    UPDATE public.cat_productos SET activo = false WHERE id = p_origen;
  END;
  RETURN v_n;
END $$;

REVOKE EXECUTE ON FUNCTION public.trg_gasto_detalle_producto()     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fusionar_productos(uuid, uuid)   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.trg_gasto_detalle_producto()     TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.fusionar_productos(uuid, uuid)   TO authenticated, service_role;

-- 11. Vistas de productos comprados ---------------------------------------
DROP VIEW IF EXISTS public.prp_productos_resumen;
DROP VIEW IF EXISTS public.prp_compras_productos;
CREATE VIEW public.prp_compras_productos WITH (security_invoker = true) AS
SELECT
  d.id                                   AS detalle_id,
  d.gasto_id,
  g.fecha,
  extract(year  FROM g.fecha)::int       AS anio,
  extract(month FROM g.fecha)::int       AS mes,
  d.producto_id,
  p.nombre                               AS producto,
  p.clave                                AS producto_clave,
  p.unidad,
  p.imagen_url,
  coalesce(p.categoria, d.categoria)     AS clasificacion,
  g.proveedor_id,
  coalesce(c.nombre, nullif(trim(g.proveedor), ''), g.proveedor_nombre, 'Sin proveedor') AS proveedor,
  d.descripcion,
  d.cantidad,
  d.precio_unit,
  d.subtotal
FROM public.gasto_detalle d
JOIN public.gastos_operativos g   ON g.id = d.gasto_id
LEFT JOIN public.cat_productos p  ON p.id = d.producto_id
LEFT JOIN public.cat_proveedores c ON c.id = g.proveedor_id;

GRANT SELECT ON public.prp_compras_productos TO authenticated, service_role;

CREATE VIEW public.prp_productos_resumen WITH (security_invoker = true) AS
SELECT
  producto_id,
  count(*)::int                  AS compras,
  sum(cantidad)                  AS cantidad,
  sum(subtotal)                  AS total,
  count(DISTINCT proveedor)::int AS proveedores,
  max(fecha)                     AS ultima_fecha,
  (array_agg(precio_unit ORDER BY fecha DESC NULLS LAST))[1] AS ultimo_precio
FROM public.prp_compras_productos
WHERE producto_id IS NOT NULL
GROUP BY producto_id;

GRANT SELECT ON public.prp_productos_resumen TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
