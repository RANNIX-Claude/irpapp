SELECT id, numero_contrato, arrendatario_id, fecha_inicio, fecha_fin, renta_mensual,
         deposito_garantia, dia_pago, penalizacion_pct, incremento_anual_pct, estatus
         FROM contratos WHERE notas LIKE 'QA-Escenario01-CONT001%' ORDER BY id DESC LIMIT 1;