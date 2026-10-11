SELECT estatus FROM cat_locales WHERE id_local = (
  SELECT local_id FROM contratos_locales cl
  JOIN contratos c ON c.id = cl.contrato_id
  WHERE c.notas LIKE 'QA-Escenario01-CONT001%' LIMIT 1
);