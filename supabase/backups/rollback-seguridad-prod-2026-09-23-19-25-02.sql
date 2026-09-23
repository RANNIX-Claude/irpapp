-- Reversión de seguridad — prod — foto tomada 2026-09-23T19:25:02.411Z
-- Recrea políticas RLS y grants de tablas tal como estaban antes de las migraciones 20260913*.
-- Las funciones y opciones de vista están en el JSON (campo functions[].def y views[].opts).
BEGIN;

-- prp.accesos_estacionamiento
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='accesos_estacionamiento' LOOP EXECUTE format('DROP POLICY %I ON prp.accesos_estacionamiento', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.accesos_estacionamiento AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.adendums
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='adendums' LOOP EXECUTE format('DROP POLICY %I ON prp.adendums', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.adendums AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.agua_lecturas
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='agua_lecturas' LOOP EXECUTE format('DROP POLICY %I ON prp.agua_lecturas', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.agua_lecturas AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.agua_recibos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='agua_recibos' LOOP EXECUTE format('DROP POLICY %I ON prp.agua_recibos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.agua_recibos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.arrendatarios
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='arrendatarios' LOOP EXECUTE format('DROP POLICY %I ON prp.arrendatarios', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.arrendatarios AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.bitacora
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='bitacora' LOOP EXECUTE format('DROP POLICY %I ON prp.bitacora', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.bitacora AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.cajones_estacionamiento
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='cajones_estacionamiento' LOOP EXECUTE format('DROP POLICY %I ON prp.cajones_estacionamiento', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.cajones_estacionamiento AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.cat_estado_general
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='cat_estado_general' LOOP EXECUTE format('DROP POLICY %I ON prp.cat_estado_general', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.cat_estado_general AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.cat_grupo_gasto
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='cat_grupo_gasto' LOOP EXECUTE format('DROP POLICY %I ON prp.cat_grupo_gasto', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.cat_grupo_gasto AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.cobros_programados
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='cobros_programados' LOOP EXECUTE format('DROP POLICY %I ON prp.cobros_programados', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.cobros_programados AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.cobros_turno
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='cobros_turno' LOOP EXECUTE format('DROP POLICY %I ON prp.cobros_turno', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.cobros_turno AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.conciliaciones_sesiones
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='conciliaciones_sesiones' LOOP EXECUTE format('DROP POLICY %I ON prp.conciliaciones_sesiones', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.conciliaciones_sesiones AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.contrato_unidades
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='contrato_unidades' LOOP EXECUTE format('DROP POLICY %I ON prp.contrato_unidades', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.contrato_unidades AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.contratos_arrendamiento
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='contratos_arrendamiento' LOOP EXECUTE format('DROP POLICY %I ON prp.contratos_arrendamiento', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.contratos_arrendamiento AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.contratos_documentos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='contratos_documentos' LOOP EXECUTE format('DROP POLICY %I ON prp.contratos_documentos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.contratos_documentos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.documentos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='documentos' LOOP EXECUTE format('DROP POLICY %I ON prp.documentos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.documentos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.edr_conceptos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='edr_conceptos' LOOP EXECUTE format('DROP POLICY %I ON prp.edr_conceptos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.edr_conceptos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.empleados
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='empleados' LOOP EXECUTE format('DROP POLICY %I ON prp.empleados', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.empleados AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.estado_resultados_mensual
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='estado_resultados_mensual' LOOP EXECUTE format('DROP POLICY %I ON prp.estado_resultados_mensual', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.estado_resultados_mensual AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.fondo_revolvente_cierres
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='fondo_revolvente_cierres' LOOP EXECUTE format('DROP POLICY %I ON prp.fondo_revolvente_cierres', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.fondo_revolvente_cierres AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.fondos_revolventes
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='fondos_revolventes' LOOP EXECUTE format('DROP POLICY %I ON prp.fondos_revolventes', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.fondos_revolventes AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.gastos_fijos_anuales
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='gastos_fijos_anuales' LOOP EXECUTE format('DROP POLICY %I ON prp.gastos_fijos_anuales', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.gastos_fijos_anuales AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.gastos_operativos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='gastos_operativos' LOOP EXECUTE format('DROP POLICY %I ON prp.gastos_operativos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.gastos_operativos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.inmuebles
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='inmuebles' LOOP EXECUTE format('DROP POLICY %I ON prp.inmuebles', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.inmuebles AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.movimientos_bancarios
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='movimientos_bancarios' LOOP EXECUTE format('DROP POLICY %I ON prp.movimientos_bancarios', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.movimientos_bancarios AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.notas_contrato
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='notas_contrato' LOOP EXECUTE format('DROP POLICY %I ON prp.notas_contrato', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.notas_contrato AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.pensiones_estacionamiento
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='pensiones_estacionamiento' LOOP EXECUTE format('DROP POLICY %I ON prp.pensiones_estacionamiento', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.pensiones_estacionamiento AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.precios_unidad
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='precios_unidad' LOOP EXECUTE format('DROP POLICY %I ON prp.precios_unidad', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.precios_unidad AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.presupuesto_mensual
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='presupuesto_mensual' LOOP EXECUTE format('DROP POLICY %I ON prp.presupuesto_mensual', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.presupuesto_mensual AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.prospectos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='prospectos' LOOP EXECUTE format('DROP POLICY %I ON prp.prospectos', p.policyname); END LOOP; END $$;
CREATE POLICY "anon_prospecto_read" ON prp.prospectos AS PERMISSIVE FOR SELECT TO anon USING ((id IN ( SELECT prospectos_tokens.prospecto_id
   FROM prp.prospectos_tokens
  WHERE ((prospectos_tokens.fecha_expiracion > now()) AND (NOT prospectos_tokens.usado)))));
CREATE POLICY "staff_all" ON prp.prospectos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.prospectos_documentos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='prospectos_documentos' LOOP EXECUTE format('DROP POLICY %I ON prp.prospectos_documentos', p.policyname); END LOOP; END $$;
CREATE POLICY "anon_doc_insert" ON prp.prospectos_documentos AS PERMISSIVE FOR INSERT TO anon WITH CHECK ((prospecto_id IN ( SELECT prospectos_tokens.prospecto_id
   FROM prp.prospectos_tokens
  WHERE ((prospectos_tokens.fecha_expiracion > now()) AND (NOT prospectos_tokens.usado)))));
CREATE POLICY "staff_all" ON prp.prospectos_documentos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.prospectos_tokens
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='prospectos_tokens' LOOP EXECUTE format('DROP POLICY %I ON prp.prospectos_tokens', p.policyname); END LOOP; END $$;
CREATE POLICY "anon_token_read" ON prp.prospectos_tokens AS PERMISSIVE FOR SELECT TO anon USING (((fecha_expiracion > now()) AND (NOT usado)));
CREATE POLICY "staff_all" ON prp.prospectos_tokens AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.proveedores
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='proveedores' LOOP EXECUTE format('DROP POLICY %I ON prp.proveedores', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.proveedores AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.recibos_efectivo
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='recibos_efectivo' LOOP EXECUTE format('DROP POLICY %I ON prp.recibos_efectivo', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.recibos_efectivo AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.roles
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='roles' LOOP EXECUTE format('DROP POLICY %I ON prp.roles', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.roles AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.unidades
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='unidades' LOOP EXECUTE format('DROP POLICY %I ON prp.unidades', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.unidades AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.vending_cierres_semanales
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='vending_cierres_semanales' LOOP EXECUTE format('DROP POLICY %I ON prp.vending_cierres_semanales', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.vending_cierres_semanales AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- prp.vending_productos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='prp' AND tablename='vending_productos' LOOP EXECUTE format('DROP POLICY %I ON prp.vending_productos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON prp.vending_productos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.aplicaciones_pago
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='aplicaciones_pago' LOOP EXECUTE format('DROP POLICY %I ON public.aplicaciones_pago', p.policyname); END LOOP; END $$;
CREATE POLICY "locatario_lee" ON public.aplicaciones_pago AS PERMISSIVE FOR SELECT TO authenticated USING ((cargo_id IN ( SELECT cargos_programados.id
   FROM cargos_programados
  WHERE (cargos_programados.contrato_id = mi_contrato_id()))));
CREATE POLICY "staff_all" ON public.aplicaciones_pago AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.arrendatarios
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='arrendatarios' LOOP EXECUTE format('DROP POLICY %I ON public.arrendatarios', p.policyname); END LOOP; END $$;
CREATE POLICY "locatario_lee" ON public.arrendatarios AS PERMISSIVE FOR SELECT TO authenticated USING ((id = mi_arrendatario_id()));
CREATE POLICY "staff_all" ON public.arrendatarios AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.cargos_programados
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='cargos_programados' LOOP EXECUTE format('DROP POLICY %I ON public.cargos_programados', p.policyname); END LOOP; END $$;
CREATE POLICY "locatario_lee" ON public.cargos_programados AS PERMISSIVE FOR SELECT TO authenticated USING ((contrato_id = mi_contrato_id()));
CREATE POLICY "staff_all" ON public.cargos_programados AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.cat_despachos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='cat_despachos' LOOP EXECUTE format('DROP POLICY %I ON public.cat_despachos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.cat_despachos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.cat_locales
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='cat_locales' LOOP EXECUTE format('DROP POLICY %I ON public.cat_locales', p.policyname); END LOOP; END $$;
CREATE POLICY "auth_lee" ON public.cat_locales AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_all" ON public.cat_locales AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.cat_parametros
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='cat_parametros' LOOP EXECUTE format('DROP POLICY %I ON public.cat_parametros', p.policyname); END LOOP; END $$;
CREATE POLICY "auth_lee" ON public.cat_parametros AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_all" ON public.cat_parametros AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.cat_productos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='cat_productos' LOOP EXECUTE format('DROP POLICY %I ON public.cat_productos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.cat_productos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.cat_productos_vending
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='cat_productos_vending' LOOP EXECUTE format('DROP POLICY %I ON public.cat_productos_vending', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.cat_productos_vending AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.cat_proveedores
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='cat_proveedores' LOOP EXECUTE format('DROP POLICY %I ON public.cat_proveedores', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.cat_proveedores AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.cat_tipo_deduccion
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='cat_tipo_deduccion' LOOP EXECUTE format('DROP POLICY %I ON public.cat_tipo_deduccion', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.cat_tipo_deduccion AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.cat_tipo_otro_pago
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='cat_tipo_otro_pago' LOOP EXECUTE format('DROP POLICY %I ON public.cat_tipo_otro_pago', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.cat_tipo_otro_pago AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.cat_tipo_percepcion
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='cat_tipo_percepcion' LOOP EXECUTE format('DROP POLICY %I ON public.cat_tipo_percepcion', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.cat_tipo_percepcion AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.comprobantes_pago
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='comprobantes_pago' LOOP EXECUTE format('DROP POLICY %I ON public.comprobantes_pago', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.comprobantes_pago AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.contratos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='contratos' LOOP EXECUTE format('DROP POLICY %I ON public.contratos', p.policyname); END LOOP; END $$;
CREATE POLICY "locatario_lee" ON public.contratos AS PERMISSIVE FOR SELECT TO authenticated USING ((id = mi_contrato_id()));
CREATE POLICY "staff_all" ON public.contratos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.contratos_locales
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='contratos_locales' LOOP EXECUTE format('DROP POLICY %I ON public.contratos_locales', p.policyname); END LOOP; END $$;
CREATE POLICY "locatario_lee" ON public.contratos_locales AS PERMISSIVE FOR SELECT TO authenticated USING ((contrato_id = mi_contrato_id()));
CREATE POLICY "staff_all" ON public.contratos_locales AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.documentos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='documentos' LOOP EXECUTE format('DROP POLICY %I ON public.documentos', p.policyname); END LOOP; END $$;
CREATE POLICY "locatario_lee" ON public.documentos AS PERMISSIVE FOR SELECT TO authenticated USING (((entidad_tipo = 'ARRENDATARIO'::text) AND (entidad_id = mi_arrendatario_id())));
CREATE POLICY "staff_all" ON public.documentos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.er_mensual
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='er_mensual' LOOP EXECUTE format('DROP POLICY %I ON public.er_mensual', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.er_mensual AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.estacionamiento_diario
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='estacionamiento_diario' LOOP EXECUTE format('DROP POLICY %I ON public.estacionamiento_diario', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.estacionamiento_diario AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.estacionamiento_pensiones
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='estacionamiento_pensiones' LOOP EXECUTE format('DROP POLICY %I ON public.estacionamiento_pensiones', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.estacionamiento_pensiones AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.evento_fotos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='evento_fotos' LOOP EXECUTE format('DROP POLICY %I ON public.evento_fotos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.evento_fotos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.eventos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='eventos' LOOP EXECUTE format('DROP POLICY %I ON public.eventos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.eventos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.feed_actividades
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='feed_actividades' LOOP EXECUTE format('DROP POLICY %I ON public.feed_actividades', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.feed_actividades AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.gasto_detalle
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='gasto_detalle' LOOP EXECUTE format('DROP POLICY %I ON public.gasto_detalle', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.gasto_detalle AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.gastos_operativos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='gastos_operativos' LOOP EXECUTE format('DROP POLICY %I ON public.gastos_operativos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.gastos_operativos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.ingresos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ingresos' LOOP EXECUTE format('DROP POLICY %I ON public.ingresos', p.policyname); END LOOP; END $$;
CREATE POLICY "locatario_lee" ON public.ingresos AS PERMISSIVE FOR SELECT TO authenticated USING ((contrato_id = mi_contrato_id()));
CREATE POLICY "locatario_sube_comprobante" ON public.ingresos AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((contrato_id = mi_contrato_id()) AND (estatus_validacion = 'POR_VALIDAR'::text)));
CREATE POLICY "staff_all" ON public.ingresos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.irp_roles
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='irp_roles' LOOP EXECUTE format('DROP POLICY %I ON public.irp_roles', p.policyname); END LOOP; END $$;
CREATE POLICY "auth_lee" ON public.irp_roles AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_all" ON public.irp_roles AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.irp_usuarios
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='irp_usuarios' LOOP EXECUTE format('DROP POLICY %I ON public.irp_usuarios', p.policyname); END LOOP; END $$;
CREATE POLICY "admin_administra_usuarios" ON public.irp_usuarios AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "admin_borra_usuarios" ON public.irp_usuarios AS PERMISSIVE FOR DELETE TO authenticated USING (es_admin());
CREATE POLICY "admin_lee_todos" ON public.irp_usuarios AS PERMISSIVE FOR SELECT TO authenticated USING (es_admin());
CREATE POLICY "usuarios_actualizan_su_ficha" ON public.irp_usuarios AS PERMISSIVE FOR UPDATE TO authenticated USING (((id = auth.uid()) OR es_admin())) WITH CHECK (((id = auth.uid()) OR es_admin()));
CREATE POLICY "usuarios_leen_su_ficha" ON public.irp_usuarios AS PERMISSIVE FOR SELECT TO authenticated USING ((id = auth.uid()));
-- public.nomina_deducciones
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='nomina_deducciones' LOOP EXECUTE format('DROP POLICY %I ON public.nomina_deducciones', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.nomina_deducciones AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.nomina_empleado
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='nomina_empleado' LOOP EXECUTE format('DROP POLICY %I ON public.nomina_empleado', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.nomina_empleado AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.nomina_otros_pagos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='nomina_otros_pagos' LOOP EXECUTE format('DROP POLICY %I ON public.nomina_otros_pagos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.nomina_otros_pagos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.nomina_percepciones
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='nomina_percepciones' LOOP EXECUTE format('DROP POLICY %I ON public.nomina_percepciones', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.nomina_percepciones AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.nomina_periodos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='nomina_periodos' LOOP EXECUTE format('DROP POLICY %I ON public.nomina_periodos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.nomina_periodos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.notas_contrato
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='notas_contrato' LOOP EXECUTE format('DROP POLICY %I ON public.notas_contrato', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.notas_contrato AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.ordenes_trabajo
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ordenes_trabajo' LOOP EXECUTE format('DROP POLICY %I ON public.ordenes_trabajo', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.ordenes_trabajo AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.pagos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='pagos' LOOP EXECUTE format('DROP POLICY %I ON public.pagos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.pagos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.prospecto_documentos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='prospecto_documentos' LOOP EXECUTE format('DROP POLICY %I ON public.prospecto_documentos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.prospecto_documentos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.prospecto_historial
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='prospecto_historial' LOOP EXECUTE format('DROP POLICY %I ON public.prospecto_historial', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.prospecto_historial AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.prospecto_magic_links
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='prospecto_magic_links' LOOP EXECUTE format('DROP POLICY %I ON public.prospecto_magic_links', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.prospecto_magic_links AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.prospecto_personas
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='prospecto_personas' LOOP EXECUTE format('DROP POLICY %I ON public.prospecto_personas', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.prospecto_personas AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.prospectos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='prospectos' LOOP EXECUTE format('DROP POLICY %I ON public.prospectos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.prospectos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.proyecto_avance_fotos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='proyecto_avance_fotos' LOOP EXECUTE format('DROP POLICY %I ON public.proyecto_avance_fotos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.proyecto_avance_fotos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.proyecto_avances
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='proyecto_avances' LOOP EXECUTE format('DROP POLICY %I ON public.proyecto_avances', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.proyecto_avances AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.proyecto_contratos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='proyecto_contratos' LOOP EXECUTE format('DROP POLICY %I ON public.proyecto_contratos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.proyecto_contratos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.proyecto_cotizaciones
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='proyecto_cotizaciones' LOOP EXECUTE format('DROP POLICY %I ON public.proyecto_cotizaciones', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.proyecto_cotizaciones AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.proyecto_pagos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='proyecto_pagos' LOOP EXECUTE format('DROP POLICY %I ON public.proyecto_pagos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.proyecto_pagos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.proyectos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='proyectos' LOOP EXECUTE format('DROP POLICY %I ON public.proyectos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.proyectos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.publicaciones
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='publicaciones' LOOP EXECUTE format('DROP POLICY %I ON public.publicaciones', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.publicaciones AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.restaurante_gasto_detalle
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='restaurante_gasto_detalle' LOOP EXECUTE format('DROP POLICY %I ON public.restaurante_gasto_detalle', p.policyname); END LOOP; END $$;
CREATE POLICY "restaurante_all" ON public.restaurante_gasto_detalle AS PERMISSIVE FOR ALL TO authenticated USING ((mi_rol() = 'restaurante'::text)) WITH CHECK ((mi_rol() = 'restaurante'::text));
CREATE POLICY "staff_all" ON public.restaurante_gasto_detalle AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.restaurante_gastos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='restaurante_gastos' LOOP EXECUTE format('DROP POLICY %I ON public.restaurante_gastos', p.policyname); END LOOP; END $$;
CREATE POLICY "restaurante_all" ON public.restaurante_gastos AS PERMISSIVE FOR ALL TO authenticated USING ((mi_rol() = 'restaurante'::text)) WITH CHECK ((mi_rol() = 'restaurante'::text));
CREATE POLICY "staff_all" ON public.restaurante_gastos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_asistencia
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_asistencia' LOOP EXECUTE format('DROP POLICY %I ON public.rh_asistencia', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_asistencia AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_beneficios
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_beneficios' LOOP EXECUTE format('DROP POLICY %I ON public.rh_beneficios', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_beneficios AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_candidatos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_candidatos' LOOP EXECUTE format('DROP POLICY %I ON public.rh_candidatos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_candidatos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_capacitacion
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_capacitacion' LOOP EXECUTE format('DROP POLICY %I ON public.rh_capacitacion', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_capacitacion AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_checadas
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_checadas' LOOP EXECUTE format('DROP POLICY %I ON public.rh_checadas', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_checadas AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_contratos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_contratos' LOOP EXECUTE format('DROP POLICY %I ON public.rh_contratos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_contratos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_documentos_empleado
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_documentos_empleado' LOOP EXECUTE format('DROP POLICY %I ON public.rh_documentos_empleado', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_documentos_empleado AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_empleados
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_empleados' LOOP EXECUTE format('DROP POLICY %I ON public.rh_empleados', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_empleados AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_evaluaciones
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_evaluaciones' LOOP EXECUTE format('DROP POLICY %I ON public.rh_evaluaciones', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_evaluaciones AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_expediente_documentos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_expediente_documentos' LOOP EXECUTE format('DROP POLICY %I ON public.rh_expediente_documentos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_expediente_documentos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_historial_cambios
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_historial_cambios' LOOP EXECUTE format('DROP POLICY %I ON public.rh_historial_cambios', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_historial_cambios AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_historial_nombre
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_historial_nombre' LOOP EXECUTE format('DROP POLICY %I ON public.rh_historial_nombre', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_historial_nombre AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_historial_sueldo
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_historial_sueldo' LOOP EXECUTE format('DROP POLICY %I ON public.rh_historial_sueldo', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_historial_sueldo AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_incidencias
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_incidencias' LOOP EXECUTE format('DROP POLICY %I ON public.rh_incidencias', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_incidencias AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_tipos_incidencia
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_tipos_incidencia' LOOP EXECUTE format('DROP POLICY %I ON public.rh_tipos_incidencia', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_tipos_incidencia AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_turnos_guardia
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_turnos_guardia' LOOP EXECUTE format('DROP POLICY %I ON public.rh_turnos_guardia', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_turnos_guardia AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_vacaciones_anio
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_vacaciones_anio' LOOP EXECUTE format('DROP POLICY %I ON public.rh_vacaciones_anio', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_vacaciones_anio AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_vacaciones_detalle
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_vacaciones_detalle' LOOP EXECUTE format('DROP POLICY %I ON public.rh_vacaciones_detalle', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_vacaciones_detalle AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.rh_vacantes
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rh_vacantes' LOOP EXECUTE format('DROP POLICY %I ON public.rh_vacantes', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.rh_vacantes AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.sat_subsidio_empleo
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='sat_subsidio_empleo' LOOP EXECUTE format('DROP POLICY %I ON public.sat_subsidio_empleo', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.sat_subsidio_empleo AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.sat_tarifa_isr
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='sat_tarifa_isr' LOOP EXECUTE format('DROP POLICY %I ON public.sat_tarifa_isr', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.sat_tarifa_isr AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.validacion_adjuntos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='validacion_adjuntos' LOOP EXECUTE format('DROP POLICY %I ON public.validacion_adjuntos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.validacion_adjuntos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.validacion_puntos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='validacion_puntos' LOOP EXECUTE format('DROP POLICY %I ON public.validacion_puntos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.validacion_puntos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.validacion_reportes
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='validacion_reportes' LOOP EXECUTE format('DROP POLICY %I ON public.validacion_reportes', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.validacion_reportes AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.validacion_revisiones
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='validacion_revisiones' LOOP EXECUTE format('DROP POLICY %I ON public.validacion_revisiones', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.validacion_revisiones AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.vending_inventario_semanal
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='vending_inventario_semanal' LOOP EXECUTE format('DROP POLICY %I ON public.vending_inventario_semanal', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.vending_inventario_semanal AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.vending_movimientos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='vending_movimientos' LOOP EXECUTE format('DROP POLICY %I ON public.vending_movimientos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.vending_movimientos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.vending_productos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='vending_productos' LOOP EXECUTE format('DROP POLICY %I ON public.vending_productos', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.vending_productos AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.vending_semana_producto
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='vending_semana_producto' LOOP EXECUTE format('DROP POLICY %I ON public.vending_semana_producto', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.vending_semana_producto AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- public.vending_semanas
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='vending_semanas' LOOP EXECUTE format('DROP POLICY %I ON public.vending_semanas', p.policyname); END LOOP; END $$;
CREATE POLICY "staff_all" ON public.vending_semanas AS PERMISSIVE FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
-- storage.objects
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' LOOP EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname); END LOOP; END $$;
CREATE POLICY "Autenticados actualizan prospecto-docs" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'prospecto-docs'::text));
CREATE POLICY "Autenticados leen prospecto-docs" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'prospecto-docs'::text));
CREATE POLICY "Autenticados suben prospecto-docs" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'prospecto-docs'::text));
CREATE POLICY "anon_insert_prospecto_docs" ON storage.objects AS PERMISSIVE FOR INSERT TO anon WITH CHECK (((bucket_id = 'prospecto-docs'::text) AND ((storage.foldername(name))[1] = 'prospectos'::text)));
CREATE POLICY "auth-insert-facturas-cfdi" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'facturas-cfdi'::text));
CREATE POLICY "auth-insert-tickets-gastos" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'tickets-gastos'::text));
CREATE POLICY "auth-insert-vending-reportes" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'vending-reportes'::text));
CREATE POLICY "auth-select-facturas-cfdi" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'facturas-cfdi'::text));
CREATE POLICY "auth-select-tickets-gastos" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'tickets-gastos'::text));
CREATE POLICY "auth-select-vending-reportes" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'vending-reportes'::text));
CREATE POLICY "auth-update-facturas-cfdi" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'facturas-cfdi'::text));
CREATE POLICY "auth-update-tickets-gastos" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'tickets-gastos'::text));
CREATE POLICY "auth-update-vending-reportes" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'vending-reportes'::text));
CREATE POLICY "auth_delete_contratos" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = 'contratos-firmados'::text));
CREATE POLICY "auth_delete_eventos_fotos" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = 'eventos-fotos'::text));
CREATE POLICY "auth_delete_expedientes_docs" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = 'expedientes-docs'::text));
CREATE POLICY "auth_delete_ot_evidencias" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = 'ot-evidencias'::text));
CREATE POLICY "auth_delete_prospecto_docs" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = 'prospecto-docs'::text));
CREATE POLICY "auth_delete_proyectos_avances" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = 'proyectos-avances'::text));
CREATE POLICY "auth_delete_proyectos_docs" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = 'proyectos-docs'::text));
CREATE POLICY "auth_insert_contratos" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'contratos-firmados'::text));
CREATE POLICY "auth_insert_expedientes_docs" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'expedientes-docs'::text));
CREATE POLICY "auth_insert_facturas_cfdi" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'facturas-cfdi'::text));
CREATE POLICY "auth_insert_ot_evidencias" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'ot-evidencias'::text));
CREATE POLICY "auth_insert_prospecto_docs" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'prospecto-docs'::text));
CREATE POLICY "auth_insert_tickets_gastos" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'tickets-gastos'::text));
CREATE POLICY "auth_insert_vending_reportes" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'vending-reportes'::text));
CREATE POLICY "auth_read_eventos_fotos" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'eventos-fotos'::text));
CREATE POLICY "auth_read_proyectos_avances" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'proyectos-avances'::text));
CREATE POLICY "auth_read_proyectos_docs" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'proyectos-docs'::text));
CREATE POLICY "auth_select_contratos" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'contratos-firmados'::text));
CREATE POLICY "auth_select_expedientes_docs" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'expedientes-docs'::text));
CREATE POLICY "auth_select_facturas_cfdi" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'facturas-cfdi'::text));
CREATE POLICY "auth_select_ot_evidencias" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'ot-evidencias'::text));
CREATE POLICY "auth_select_prospecto_docs" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'prospecto-docs'::text));
CREATE POLICY "auth_select_tickets_gastos" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'tickets-gastos'::text));
CREATE POLICY "auth_select_vending_reportes" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'vending-reportes'::text));
CREATE POLICY "auth_update_contratos" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'contratos-firmados'::text));
CREATE POLICY "auth_update_expedientes_docs" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'expedientes-docs'::text)) WITH CHECK ((bucket_id = 'expedientes-docs'::text));
CREATE POLICY "auth_update_facturas_cfdi" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'facturas-cfdi'::text));
CREATE POLICY "auth_update_ot_evidencias" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'ot-evidencias'::text)) WITH CHECK ((bucket_id = 'ot-evidencias'::text));
CREATE POLICY "auth_update_prospecto_docs" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'prospecto-docs'::text));
CREATE POLICY "auth_update_tickets_gastos" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'tickets-gastos'::text));
CREATE POLICY "auth_update_vending_reportes" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'vending-reportes'::text));
CREATE POLICY "auth_upload_expedientes" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'expedientes-docs'::text));
CREATE POLICY "auth_write_eventos_fotos" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'eventos-fotos'::text));
CREATE POLICY "auth_write_proyectos_avances" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'proyectos-avances'::text));
CREATE POLICY "auth_write_proyectos_docs" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'proyectos-docs'::text));
CREATE POLICY "authenticated_upload_contratos" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'contratos-docs'::text));
CREATE POLICY "avatars_delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = 'avatars'::text));
CREATE POLICY "avatars_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'avatars'::text));
CREATE POLICY "avatars_public_read" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'avatars'::text));
CREATE POLICY "avatars_update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'avatars'::text)) WITH CHECK ((bucket_id = 'avatars'::text));
CREATE POLICY "catalogos_auth_delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = 'catalogos'::text));
CREATE POLICY "catalogos_auth_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'catalogos'::text));
CREATE POLICY "catalogos_auth_update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'catalogos'::text)) WITH CHECK ((bucket_id = 'catalogos'::text));
CREATE POLICY "catalogos_public_read" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'catalogos'::text));
CREATE POLICY "logos_auth_delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = 'logos-arrendatarios'::text));
CREATE POLICY "logos_auth_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'logos-arrendatarios'::text));
CREATE POLICY "logos_auth_update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'logos-arrendatarios'::text)) WITH CHECK ((bucket_id = 'logos-arrendatarios'::text));
CREATE POLICY "logos_public_read" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'logos-arrendatarios'::text));
CREATE POLICY "val_capturas_auth" ON storage.objects AS PERMISSIVE FOR ALL TO authenticated USING ((bucket_id = 'validacion-capturas'::text)) WITH CHECK ((bucket_id = 'validacion-capturas'::text));

-- RLS por tabla
ALTER TABLE prp.accesos_estacionamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.adendums ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.agua_lecturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.agua_recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.arrendatarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.bitacora ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.cajones_estacionamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.cat_estado_general ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.cat_grupo_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.cobros_programados ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.cobros_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.conciliaciones_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.contrato_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.contratos_arrendamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.contratos_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.edr_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.estado_resultados_mensual ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.fondo_revolvente_cierres ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.fondos_revolventes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.gastos_fijos_anuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.gastos_operativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.inmuebles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.movimientos_bancarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.notas_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.pensiones_estacionamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.precios_unidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.presupuesto_mensual ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.prospectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.prospectos_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.prospectos_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.recibos_efectivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.vending_cierres_semanales ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.vending_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplicaciones_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrendatarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_programados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_despachos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_parametros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_productos_vending ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_tipo_deduccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_tipo_otro_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_tipo_percepcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.er_mensual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estacionamiento_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estacionamiento_pensiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gasto_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos_operativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irp_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irp_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_deducciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_empleado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_otros_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_percepciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecto_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecto_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecto_magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecto_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_avance_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_avances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurante_gasto_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurante_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_beneficios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_capacitacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_checadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_documentos_empleado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_expediente_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_historial_cambios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_historial_nombre ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_historial_sueldo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_tipos_incidencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_turnos_guardia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_vacaciones_anio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_vacaciones_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_vacantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sat_subsidio_empleo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sat_tarifa_isr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validacion_adjuntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validacion_puntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validacion_reportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validacion_revisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_inventario_semanal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_semana_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_semanas ENABLE ROW LEVEL SECURITY;

-- Grants de tabla (se revocan y reponen)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA prp FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA prp FROM authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA prp FROM service_role;
GRANT SELECT ON prp.accesos_estacionamiento TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.accesos_estacionamiento TO service_role;
GRANT SELECT ON prp.adendums TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.adendums TO service_role;
GRANT SELECT ON prp.agua_lecturas TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.agua_lecturas TO service_role;
GRANT SELECT ON prp.agua_recibos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.agua_recibos TO service_role;
GRANT SELECT ON prp.arrendatarios TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.arrendatarios TO service_role;
GRANT INSERT ON prp.bitacora TO anon;
GRANT INSERT,SELECT ON prp.bitacora TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.bitacora TO service_role;
GRANT SELECT ON prp.cajones_estacionamiento TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.cajones_estacionamiento TO service_role;
GRANT SELECT ON prp.cat_estado_general TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.cat_estado_general TO service_role;
GRANT SELECT ON prp.cat_grupo_gasto TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.cat_grupo_gasto TO service_role;
GRANT SELECT ON prp.cobros_programados TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.cobros_programados TO service_role;
GRANT SELECT ON prp.cobros_turno TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.cobros_turno TO service_role;
GRANT SELECT ON prp.conciliaciones_sesiones TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.conciliaciones_sesiones TO service_role;
GRANT SELECT ON prp.contrato_unidades TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.contrato_unidades TO service_role;
GRANT SELECT ON prp.contratos_arrendamiento TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.contratos_arrendamiento TO service_role;
GRANT SELECT ON prp.contratos_documentos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.contratos_documentos TO service_role;
GRANT DELETE,INSERT,SELECT,UPDATE ON prp.documentos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.documentos TO service_role;
GRANT SELECT ON prp.edr_conceptos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.edr_conceptos TO service_role;
GRANT SELECT ON prp.empleados TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.empleados TO service_role;
GRANT SELECT ON prp.estado_resultados_mensual TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.estado_resultados_mensual TO service_role;
GRANT SELECT ON prp.fondo_revolvente_cierres TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.fondo_revolvente_cierres TO service_role;
GRANT SELECT ON prp.fondos_revolventes TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.fondos_revolventes TO service_role;
GRANT SELECT ON prp.gastos_fijos_anuales TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.gastos_fijos_anuales TO service_role;
GRANT SELECT ON prp.gastos_operativos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.gastos_operativos TO service_role;
GRANT SELECT ON prp.inmuebles TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.inmuebles TO service_role;
GRANT SELECT ON prp.movimientos_bancarios TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.movimientos_bancarios TO service_role;
GRANT DELETE,INSERT,SELECT,UPDATE ON prp.notas_contrato TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.notas_contrato TO service_role;
GRANT SELECT ON prp.pensiones_estacionamiento TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.pensiones_estacionamiento TO service_role;
GRANT SELECT ON prp.precios_unidad TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.precios_unidad TO service_role;
GRANT SELECT ON prp.presupuesto_mensual TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.presupuesto_mensual TO service_role;
GRANT SELECT ON prp.prospectos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.prospectos TO service_role;
GRANT SELECT ON prp.prospectos_documentos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.prospectos_documentos TO service_role;
GRANT SELECT ON prp.prospectos_tokens TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.prospectos_tokens TO service_role;
GRANT SELECT ON prp.proveedores TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.proveedores TO service_role;
GRANT SELECT ON prp.recibos_efectivo TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.recibos_efectivo TO service_role;
GRANT SELECT ON prp.roles TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.roles TO service_role;
GRANT SELECT ON prp.unidades TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.unidades TO service_role;
GRANT SELECT ON prp.vending_cierres_semanales TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.vending_cierres_semanales TO service_role;
GRANT SELECT ON prp.vending_productos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON prp.vending_productos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.aplicaciones_pago TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.aplicaciones_pago TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.arrendatarios TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.arrendatarios TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cargos_programados TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cargos_programados TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_despachos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_despachos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_locales TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_locales TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_parametros TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_parametros TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_productos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_productos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_productos_vending TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_productos_vending TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_proveedores TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_proveedores TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_tipo_deduccion TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_tipo_deduccion TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_tipo_otro_pago TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_tipo_otro_pago TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_tipo_percepcion TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.cat_tipo_percepcion TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.comprobantes_pago TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.comprobantes_pago TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.contratos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.contratos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.contratos_locales TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.contratos_locales TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.documentos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.documentos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.er_mensual TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.er_mensual TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.estacionamiento_diario TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.estacionamiento_diario TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.estacionamiento_pensiones TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.estacionamiento_pensiones TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.evento_fotos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.evento_fotos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.eventos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.eventos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.feed_actividades TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.feed_actividades TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.gasto_detalle TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.gasto_detalle TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.gastos_operativos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.gastos_operativos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.ingresos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.ingresos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.irp_roles TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.irp_roles TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.irp_usuarios TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.irp_usuarios TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.nomina_deducciones TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.nomina_deducciones TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.nomina_empleado TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.nomina_empleado TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.nomina_otros_pagos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.nomina_otros_pagos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.nomina_percepciones TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.nomina_percepciones TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.nomina_periodos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.nomina_periodos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.notas_contrato TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.notas_contrato TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.ordenes_trabajo TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.ordenes_trabajo TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.pagos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.pagos TO service_role;
GRANT SELECT,UPDATE ON public.prospecto_documentos TO anon;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prospecto_documentos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prospecto_documentos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prospecto_historial TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prospecto_historial TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prospecto_magic_links TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prospecto_magic_links TO service_role;
GRANT SELECT,UPDATE ON public.prospecto_personas TO anon;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prospecto_personas TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prospecto_personas TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prospectos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prospectos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.proyecto_avance_fotos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.proyecto_avance_fotos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.proyecto_avances TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.proyecto_avances TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.proyecto_contratos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.proyecto_contratos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.proyecto_cotizaciones TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.proyecto_cotizaciones TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.proyecto_pagos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.proyecto_pagos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.proyectos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.proyectos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_adendums TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_adendums TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_arrendatarios TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_arrendatarios TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_asistencia TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_asistencia TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_asistencia_semana TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_asistencia_semana TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_bitacora TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_bitacora TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_cajones_estacionamiento TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_cajones_estacionamiento TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_candidatos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_candidatos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_cartera TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_cartera TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_cat_estado_general TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_cat_estado_general TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_cat_grupo_gasto TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_cat_grupo_gasto TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_checadas TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_checadas TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_cobros TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_cobros TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_conciliacion_cobros TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_conciliacion_cobros TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_contratos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_contratos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_documentos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_documentos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_empleados TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_empleados TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_estacionamiento TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_estacionamiento TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_estacionamiento_mensual TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_estacionamiento_mensual TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_expediente_arrendatario TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_expediente_arrendatario TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_feed_actividades TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_feed_actividades TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_fondo_revolvente_cierres TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_fondo_revolvente_cierres TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_fondos_revolventes TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_fondos_revolventes TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_gastos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_gastos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_gastos_mensual TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_gastos_mensual TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_historico_sueldos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_historico_sueldos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_incidencias TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_incidencias TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_ingresos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_ingresos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_ingresos_descuadrados TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_ingresos_descuadrados TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_inmuebles TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_inmuebles TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_kpis TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_kpis TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_locales TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_locales TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_mapa_locales TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_mapa_locales TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_movimientos_bancarios TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_movimientos_bancarios TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_nomina_transferencias TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_nomina_transferencias TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_notas_contrato TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_notas_contrato TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_pensiones_estacionamiento TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_pensiones_estacionamiento TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_prenomina TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_prenomina TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_prospectos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_prospectos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_proveedores TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_proveedores TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_publicaciones TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_publicaciones TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_tipos_incidencia TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_tipos_incidencia TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_turnos_guardia TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_turnos_guardia TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_unidades TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_unidades TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_vacaciones_anio TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_vacaciones_anio TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_vacaciones_detalle TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_vacaciones_detalle TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_vacantes TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_vacantes TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_validacion_puntos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_validacion_puntos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_validacion_reportes TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_validacion_reportes TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_vending_semana TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_vending_semana TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_vending_semanas TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.prp_vending_semanas TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.publicaciones TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.publicaciones TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.restaurante_gasto_detalle TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.restaurante_gasto_detalle TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.restaurante_gastos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.restaurante_gastos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_asistencia TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_asistencia TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_beneficios TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_beneficios TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_candidatos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_candidatos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_capacitacion TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_capacitacion TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_checadas TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_checadas TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_contratos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_contratos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_documentos_empleado TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_documentos_empleado TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_empleados TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_empleados TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_evaluaciones TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_evaluaciones TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_expediente_documentos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_expediente_documentos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_historial_cambios TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_historial_cambios TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_historial_nombre TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_historial_nombre TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_historial_sueldo TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_historial_sueldo TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_incidencias TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_incidencias TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_tipos_incidencia TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_tipos_incidencia TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_turnos_guardia TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_turnos_guardia TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_vacaciones_anio TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_vacaciones_anio TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_vacaciones_detalle TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_vacaciones_detalle TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_vacantes TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.rh_vacantes TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.sat_subsidio_empleo TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.sat_subsidio_empleo TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.sat_tarifa_isr TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.sat_tarifa_isr TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.v_prospecto_docs_status TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.v_prospecto_docs_status TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.validacion_adjuntos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.validacion_adjuntos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.validacion_puntos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.validacion_puntos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.validacion_reportes TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.validacion_reportes TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.validacion_revisiones TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.validacion_revisiones TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.vending_inventario_semanal TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.vending_inventario_semanal TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.vending_movimientos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.vending_movimientos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.vending_productos TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.vending_productos TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.vending_semana_producto TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.vending_semana_producto TO service_role;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.vending_semanas TO authenticated;
GRANT DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON public.vending_semanas TO service_role;

-- Opciones de vista
ALTER VIEW public.prp_adendums SET (security_invoker = true);
ALTER VIEW public.prp_arrendatarios SET (security_invoker = true);
ALTER VIEW public.prp_asistencia SET (security_invoker = true);
ALTER VIEW public.prp_asistencia_semana SET (security_invoker = true);
ALTER VIEW public.prp_bitacora SET (security_invoker = true);
ALTER VIEW public.prp_cajones_estacionamiento SET (security_invoker = true);
ALTER VIEW public.prp_candidatos SET (security_invoker = true);
ALTER VIEW public.prp_cartera SET (security_invoker = true);
ALTER VIEW public.prp_cat_estado_general SET (security_invoker = true);
ALTER VIEW public.prp_cat_grupo_gasto SET (security_invoker = true);
ALTER VIEW public.prp_checadas SET (security_invoker = true);
ALTER VIEW public.prp_cobros SET (security_invoker = true);
ALTER VIEW public.prp_conciliacion_cobros SET (security_invoker = true);
ALTER VIEW public.prp_contratos SET (security_invoker = true);
ALTER VIEW public.prp_documentos SET (security_invoker = true);
ALTER VIEW public.prp_empleados SET (security_invoker = true);
ALTER VIEW public.prp_estacionamiento SET (security_invoker = true);
ALTER VIEW public.prp_estacionamiento_mensual SET (security_invoker = true);
ALTER VIEW public.prp_expediente_arrendatario SET (security_invoker = true);
ALTER VIEW public.prp_feed_actividades SET (security_invoker = true);
ALTER VIEW public.prp_fondo_revolvente_cierres SET (security_invoker = true);
ALTER VIEW public.prp_fondos_revolventes SET (security_invoker = true);
ALTER VIEW public.prp_gastos SET (security_invoker = true);
ALTER VIEW public.prp_gastos_mensual SET (security_invoker = true);
ALTER VIEW public.prp_historico_sueldos SET (security_invoker = true);
ALTER VIEW public.prp_incidencias SET (security_invoker = true);
ALTER VIEW public.prp_ingresos SET (security_invoker = true);
ALTER VIEW public.prp_ingresos_descuadrados SET (security_invoker = true);
ALTER VIEW public.prp_inmuebles SET (security_invoker = true);
ALTER VIEW public.prp_kpis SET (security_invoker = true);
ALTER VIEW public.prp_locales SET (security_invoker = true);
ALTER VIEW public.prp_mapa_locales SET (security_invoker = true);
ALTER VIEW public.prp_movimientos_bancarios SET (security_invoker = true);
ALTER VIEW public.prp_nomina_transferencias SET (security_invoker = true);
ALTER VIEW public.prp_notas_contrato SET (security_invoker = true);
ALTER VIEW public.prp_pensiones_estacionamiento SET (security_invoker = true);
ALTER VIEW public.prp_prenomina SET (security_invoker = true);
ALTER VIEW public.prp_prospectos SET (security_invoker = true);
ALTER VIEW public.prp_proveedores SET (security_invoker = true);
ALTER VIEW public.prp_publicaciones SET (security_invoker = true);
ALTER VIEW public.prp_tipos_incidencia SET (security_invoker = true);
ALTER VIEW public.prp_turnos_guardia SET (security_invoker = true);
ALTER VIEW public.prp_unidades SET (security_invoker = true);
ALTER VIEW public.prp_vacaciones_anio SET (security_invoker = true);
ALTER VIEW public.prp_vacaciones_detalle SET (security_invoker = true);
ALTER VIEW public.prp_vacantes SET (security_invoker = true);
ALTER VIEW public.prp_validacion_puntos SET (security_invoker = true);
ALTER VIEW public.prp_validacion_reportes SET (security_invoker = true);
ALTER VIEW public.prp_vending_semana SET (security_invoker = true);
ALTER VIEW public.prp_vending_semanas SET (security_invoker = true);
ALTER VIEW public.v_prospecto_docs_status SET (security_invoker = true);

-- Buckets
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
UPDATE storage.buckets SET public = true WHERE id = 'catalogos';
UPDATE storage.buckets SET public = false WHERE id = 'comprobantes-pago';
UPDATE storage.buckets SET public = false WHERE id = 'contratos-docs';
UPDATE storage.buckets SET public = false WHERE id = 'contratos-firmados';
UPDATE storage.buckets SET public = false WHERE id = 'eventos-fotos';
UPDATE storage.buckets SET public = false WHERE id = 'expedientes-docs';
UPDATE storage.buckets SET public = false WHERE id = 'facturas-cfdi';
UPDATE storage.buckets SET public = true WHERE id = 'logos-arrendatarios';
UPDATE storage.buckets SET public = false WHERE id = 'ot-evidencias';
UPDATE storage.buckets SET public = false WHERE id = 'prospecto-docs';
UPDATE storage.buckets SET public = false WHERE id = 'proyectos-avances';
UPDATE storage.buckets SET public = false WHERE id = 'proyectos-docs';
UPDATE storage.buckets SET public = false WHERE id = 'tickets-gastos';
UPDATE storage.buckets SET public = false WHERE id = 'validacion-capturas';
UPDATE storage.buckets SET public = false WHERE id = 'vending-reportes';

NOTIFY pgrst, 'reload schema';
COMMIT;