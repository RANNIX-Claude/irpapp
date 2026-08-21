-- ─── Tabla: ordenes_trabajo ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ordenes_trabajo (
  id                  text PRIMARY KEY,               -- OT-2026-0312
  tipo                text NOT NULL,                  -- Correctivo | Preventivo | Mejora
  categoria           text,                           -- Eléctrico, Plomería, etc.
  inmueble            text,
  area                text,
  descripcion         text NOT NULL,
  prioridad           text NOT NULL DEFAULT 'MEDIA',  -- URGENTE | ALTA | MEDIA | BAJA
  asignado            text,
  estado              text NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE | EN_PROCESO | COMPLETADO | CANCELADO
  fecha_apertura      date,
  fecha_cierre_est    date,
  fecha_cierre_real   date,
  costo_est           numeric(12,2),
  costo_real          numeric(12,2),
  notas               text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE public.ordenes_trabajo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_ordenes_trabajo" ON public.ordenes_trabajo
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON public.ordenes_trabajo TO authenticated;

-- ─── Seed: datos del módulo demo ───────────────────────────────────────────────
INSERT INTO public.ordenes_trabajo
  (id, tipo, categoria, inmueble, area, descripcion, prioridad, asignado, estado, fecha_apertura, fecha_cierre_est, costo_est, costo_real, fecha_cierre_real)
VALUES
  ('OT-2026-0312','Correctivo','Eléctrico','Plaza Reforma Norte','Área común P1','Falla en tablero eléctrico sector B — sin luz en pasillos','URGENTE','Ing. López Garza','EN_PROCESO','2026-06-28','2026-07-01',8500,NULL,NULL),
  ('OT-2026-0313','Preventivo','Climatización','Torre Corporativa Insurgentes','Piso 4 completo','Mantenimiento semestral de sistemas HVAC — revisión filtros y carga de gas','MEDIA','Tec. Hernández R.','PENDIENTE','2026-07-01','2026-07-05',12000,NULL,NULL),
  ('OT-2026-0308','Correctivo','Plomería','Clínica Especialidades Satélite','Baño consultorio C12','Fuga en tubería de agua fría — mancha en pared','ALTA','Plo. Martínez J.','COMPLETADO','2026-06-20','2026-06-22',3200,2950,'2026-06-21'),
  ('OT-2026-0310','Preventivo','Seguridad','Plaza del Valle Monterrey','Estacionamiento subterráneo','Revisión y calibración de cámaras CCTV y control de acceso','MEDIA','Tec. Sánchez P.','PENDIENTE','2026-07-03','2026-07-04',5500,NULL,NULL),
  ('OT-2026-0307','Mejora','Pintura','Nave Industrial Vallejo','Nave principal','Repintura de señalización de seguridad industrial en piso y paredes','BAJA','Pint. Reyes A.','COMPLETADO','2026-06-15','2026-06-18',7800,8100,'2026-06-19'),
  ('OT-2026-0315','Correctivo','Jardinería','Plaza Reforma Norte','Jardín entrada principal','Poda de árboles y restitución de plantas dañadas por lluvia','BAJA','Jard. Cruz M.','PENDIENTE','2026-07-01','2026-07-08',4200,NULL,NULL)
ON CONFLICT (id) DO NOTHING;
