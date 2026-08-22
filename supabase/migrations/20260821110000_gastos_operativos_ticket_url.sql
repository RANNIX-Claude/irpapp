-- Agrega columna para guardar URL de la foto del ticket capturada por OCR
ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS ticket_url text;
