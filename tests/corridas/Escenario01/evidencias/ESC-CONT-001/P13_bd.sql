SELECT cl.contrato_id, cl.local_id, cl.renta_asignada
         FROM contratos_locales cl
         JOIN contratos c ON c.id = cl.contrato_id
         WHERE c.notas LIKE 'QA-Escenario01-CONT001%';