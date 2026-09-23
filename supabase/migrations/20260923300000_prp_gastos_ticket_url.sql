-- prp_gastos expone la foto del ticket (ticket_url) y si trae factura, para
-- el expediente de proveedor/producto. Solo se agregan columnas al final;
-- el resto de la vista queda igual.
CREATE OR REPLACE VIEW public.prp_gastos WITH (security_invoker = true) AS
SELECT g.id,
    g.fecha,
    g.semana,
    g.anio,
    g.mes,
    g.dia_semana,
    g.grupo_gasto,
    g.descripcion,
    g.cantidad AS monto,
    COALESCE(g.ticket_total, g.cantidad) AS ticket_total,
    g.ticket_img_url,
    g.proveedor AS proveedor_txt,
    g.proveedor_id,
    p.nombre AS proveedor_nombre,
    p.categoria AS proveedor_cat,
    ( SELECT COALESCE(sum(d.subtotal), (0)::numeric) AS "coalesce"
           FROM gasto_detalle d
          WHERE (d.gasto_id = g.id)) AS suma_detalle,
    ( SELECT count(*) AS count
           FROM gasto_detalle d
          WHERE (d.gasto_id = g.id)) AS num_lineas,
    g.created_at,
    g.ticket_url,
    g.tiene_factura
   FROM (gastos_operativos g
     LEFT JOIN cat_proveedores p ON ((p.id = g.proveedor_id)))
  ORDER BY g.fecha DESC, g.created_at DESC;

NOTIFY pgrst, 'reload schema';
