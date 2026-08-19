-- Tipo de compra en gastos_operativos (clasificación independiente de categoría de líneas)
ALTER TABLE public.gastos_operativos
  ADD COLUMN IF NOT EXISTS tipo_compra TEXT
    CHECK (tipo_compra IN ('VENDING','MANTENIMIENTO','CONSUMO'));
