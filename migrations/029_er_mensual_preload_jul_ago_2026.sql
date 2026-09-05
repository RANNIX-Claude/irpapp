-- Preload EDR: Julio y Agosto 2026
-- Valores proyectados tomados del Tablero Sep-2026 capturado en pantalla.
-- Se usa UPSERT sobre (mes, anio) para no duplicar si ya existen.

INSERT INTO public.er_mensual (
  mes, anio, status,
  proy_rentas_contratos,
  proy_restaurant,
  proy_estacionamiento,
  proy_pensiones,
  proy_maquinita,
  proy_agua_ingresos,
  proy_sueldos,
  proy_fondo_revolvente,
  proy_luz,
  proy_agua_gastos,
  proy_otros_gastos,
  predial,
  transporte_residuos,
  licencia_estacionamiento,
  anuncio_publicitario
)
VALUES
  -- Julio 2026
  (7, 2026, 'en_elaboracion',
   459775, 233048, 68000, 3500, 4800, 11819,
   98846, 20000, 16000, 45000, 28500,
   11894, 1273, 1595, 852),
  -- Agosto 2026
  (8, 2026, 'en_elaboracion',
   459775, 233048, 68000, 3500, 4800, 11819,
   98846, 20000, 16000, 45000, 28500,
   11894, 1273, 1595, 852)
ON CONFLICT (mes, anio) DO UPDATE SET
  proy_rentas_contratos     = EXCLUDED.proy_rentas_contratos,
  proy_restaurant           = EXCLUDED.proy_restaurant,
  proy_estacionamiento      = EXCLUDED.proy_estacionamiento,
  proy_pensiones            = EXCLUDED.proy_pensiones,
  proy_maquinita            = EXCLUDED.proy_maquinita,
  proy_agua_ingresos        = EXCLUDED.proy_agua_ingresos,
  proy_sueldos              = EXCLUDED.proy_sueldos,
  proy_fondo_revolvente     = EXCLUDED.proy_fondo_revolvente,
  proy_luz                  = EXCLUDED.proy_luz,
  proy_agua_gastos          = EXCLUDED.proy_agua_gastos,
  proy_otros_gastos         = EXCLUDED.proy_otros_gastos,
  predial                   = EXCLUDED.predial,
  transporte_residuos       = EXCLUDED.transporte_residuos,
  licencia_estacionamiento  = EXCLUDED.licencia_estacionamiento,
  anuncio_publicitario      = EXCLUDED.anuncio_publicitario,
  updated_at                = now();
