-- Agrega empleado_id a prp_prenomina para que el modal de nómina pueda
-- linkear recibos firmados (nomina_recibos_firmados) por empleado.
CREATE OR REPLACE VIEW "public"."prp_prenomina"
WITH (security_invoker = true) AS
SELECT ne.id,
    ne.empleado_id,
    ne.periodo_id,
    np.folio AS periodo_folio,
    np.descripcion AS periodo_desc,
    np.fecha_inicio,
    np.fecha_fin,
    np.fecha_pago,
    np.periodicidad,
    np.estado AS periodo_estado,
    e.numero_empleado,
    (e.nombre || ' '::text) || e.apellido_pat AS nombre_completo,
    e.rfc,
    e.nss,
    e.banco,
    e.cuenta_clabe,
    ne.dias_periodo,
    ne.dias_trabajados,
    ne.dias_falta,
    ne.salario_diario,
    ne.salario_periodo,
    ne.total_percepciones,
    ne.total_deducciones,
    ne.isr_a_retener,
    ne.imss_obrero,
    ne.subsidio_empleo,
    ne.neto_pagar,
    ne.estatus_cfdi,
    ne.uuid_cfdi,
    ne.error_timbrado,
    ne.ajustado_manual,
    ne.notas
   FROM nomina_empleado ne
     JOIN nomina_periodos np ON np.id = ne.periodo_id
     JOIN rh_empleados e ON e.id = ne.empleado_id;

GRANT SELECT ON "public"."prp_prenomina" TO authenticated;
