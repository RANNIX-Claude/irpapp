-- Agrega columna para guardar URL de la imagen del reporte entregado por el encargado
ALTER TABLE vending_semanas ADD COLUMN IF NOT EXISTS reporte_url text;
