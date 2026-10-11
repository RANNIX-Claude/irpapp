SELECT cp.id AS cargo_id, cp.concepto, cp.importe, i.id AS ingreso_id, i.tipo, i.importe AS ingreso_importe,
       ap.importe_aplicado
       FROM cargos_programados cp
       JOIN contratos c ON c.id = cp.contrato_id
       LEFT JOIN ingresos i ON i.contrato_id = c.id AND i.tipo = 'DEPOSITO_GARANTIA'
       LEFT JOIN aplicaciones_pago ap ON ap.cargo_id = cp.id AND ap.ingreso_id = i.id
       WHERE c.notas LIKE 'QA-Escenario01-CONT001%' AND cp.concepto = 'DEPOSITO_GARANTIA';