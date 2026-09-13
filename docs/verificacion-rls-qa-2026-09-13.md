# Verificación post-migración RLS — qa (wijcjdbmdbxzmwpdxoal)

Fecha: 2026-09-13T04:26:33.472Z  ·  Migración: 20260913100000_cierre_rls_auditoria_tenant.sql  ·  Resultado: **76/76**

| Bloque | Prueba | Esperado | Obtenido | ✓/✗ |
|---|---|---|---|---|
| 1 | GET /rest/v1/prp_empleados (anon) | 42501 | HTTP 401 42501 | ✓ |
| 1 | GET /rest/v1/prp_cobros (anon) | 42501 | HTTP 401 42501 | ✓ |
| 1 | GET /rest/v1/prp_contratos (anon) | 42501 | HTTP 401 42501 | ✓ |
| 1 | GET /rest/v1/nomina_periodos (anon) | 42501 | HTTP 401 42501 | ✓ |
| 1 | GET /rest/v1/sat_tarifa_isr (anon) | 42501 | HTTP 401 42501 | ✓ |
| 1 | GET /rest/v1/irp_roles (anon) | 42501 | HTTP 401 42501 | ✓ |
| 1 | GET /rest/v1/vending_inventario_semanal (anon) | 42501 | HTTP 401 42501 | ✓ |
| 1 | POST /rest/v1/rpc/crear_empleado (anon) | error de permisos (42501) | HTTP 401 42501 | ✓ |
| 1 | POST /rest/v1/rpc/confirmar_cobro (anon) | error de permisos (42501) | HTTP 401 42501 | ✓ |
| 1 | SQL as anon: prp_empleados | ERR 42501 | ERR 42501 | ✓ |
| 1 | SQL as anon: prp_cobros | ERR 42501 | ERR 42501 | ✓ |
| 1 | SQL as anon: prp_contratos | ERR 42501 | ERR 42501 | ✓ |
| 1 | SQL as anon: nomina_periodos | ERR 42501 | ERR 42501 | ✓ |
| 1 | SQL as anon: sat_tarifa_isr | ERR 42501 | ERR 42501 | ✓ |
| 1 | SQL as anon: irp_roles | ERR 42501 | ERR 42501 | ✓ |
| 1 | SQL as anon: vending_inventario_semanal | ERR 42501 | ERR 42501 | ✓ |
| 2 | pg_policies irp_usuarios: cantidad | 5 | 5 | ✓ |
| 2 |   · admin_administra_usuarios | presente | INSERT {authenticated} USING - CHECK es_admin() | ✓ |
| 2 |   · admin_borra_usuarios | presente | DELETE {authenticated} USING es_admin() CHECK - | ✓ |
| 2 |   · admin_lee_todos | presente | SELECT {authenticated} USING es_admin() CHECK - | ✓ |
| 2 |   · usuarios_actualizan_su_ficha | presente | UPDATE {authenticated} USING ((id = auth.uid()) OR es_admin()) CHECK ((id = auth.uid()) OR es_admin()) | ✓ |
| 2 |   · usuarios_leen_su_ficha | presente | SELECT {authenticated} USING (id = auth.uid()) CHECK - | ✓ |
| 2 | admin (super_admin) INSERT irp_usuarios | RLS permite (FK detiene: 23503) | ERR 23503 — RLS permitió, FK auth.users detuvo | ✓ |
| 2 | admin UPDATE irp_usuarios (otro usuario) | ≥1 filas | 27 filas | ✓ |
| 2 | admin SELECT irp_usuarios (todos) | 20+ | 28 | ✓ |
| 3 | anon EXECUTE log_bitacora | false (el portal no la usa) | false | ✓ |
| 3 | PortalProspecto.jsx invoca log_bitacora | informativo | no | ✓ |
| 3 | authenticated EXECUTE log_bitacora | true | true | ✓ |
| 3 | funciones (no trigger) ejecutables por anon | 0 | 0 | ✓ |
| 3 | SECURITY DEFINER sin guardia ejecutables por anon | 0 | 0 | ✓ |
| 3 | RPCs desde portales (src) | informativo | ninguna | ✓ |
| 4 | authenticated USAGE en esquema prp | true | true | ✓ |
| 4 | vistas public sin security_invoker | 0 | 0 | ✓ |
| 4 | super_admin count(*) prp_empleados | 8 (total real) | 8 | ✓ |
| 4 | super_admin count(*) prp_cobros | 120 (total real) | 120 | ✓ |
| 4 | super_admin count(*) prp_contratos | 24 (total real) | 24 | ✓ |
| 4 | super_admin count(*) prp_cartera | 279 (total real) | 279 | ✓ |
| 4 | super_admin count(*) prp_kpis | 1 (total real) | 1 | ✓ |
| 4 | super_admin count(*) prp_mapa_locales | 39 (total real) | 39 | ✓ |
| 4 | super_admin count(*) prp_conciliacion_cobros | 120 (total real) | 120 | ✓ |
| 4 | super_admin count(*) prp_bitacora | 2913 (total real) | 2913 | ✓ |
| 4 | super_admin count(*) prp_proveedores | 12 (total real) | 12 | ✓ |
| 4 | escrituras directas a prp.* desde src/ | ninguna (authenticated solo tiene SELECT) | ninguna | ✓ |
| 4 | escrituras a través de vistas prp_* | ninguna | ninguna | ✓ |
| 5 | frontend manda estatus_validacion | 'POR_VALIDAR' (lo exige la política) | 'POR_VALIDAR' (ExpedienteContrato.jsx) | ✓ |
| 5 | es_staff() para locatario | false | false | ✓ |
| 5 | prp_contratos count | 1 | 1 | ✓ |
| 5 | prp_contratos.id = su contrato | 010b8fd6-8746-4d85-a0ec-4b39980821b2 | 010b8fd6-8746-4d85-a0ec-4b39980821b2 | ✓ |
| 5 | prp_cartera de otros contratos | 0 | 0 | ✓ |
| 5 | prp_cartera de su contrato | 26 (sus cargos) | 26 | ✓ |
| 5 | arrendatarios count | 1 | 1 | ✓ |
| 5 | rh_empleados count | 0 | 0 | ✓ |
| 5 | nomina_empleado count | 0 | 0 | ✓ |
| 5 | gastos_operativos count | 0 | 0 | ✓ |
| 5 | prp.movimientos_bancarios count | 0 | 0 | ✓ |
| 5 | prp_movimientos_bancarios (vista) count | 0 | 0 | ✓ |
| 5 | INSERT ingresos con su contrato_id | id (éxito) | 413 | ✓ |
| 5 | INSERT ingresos con contrato_id ajeno | ERR 42501 | ERR 42501 | ✓ |
| 5 | documentos de su arrendatario | 0 (ajenos) | 0 | ✓ |
| 6 | restaurante_gastos count | 8 | 8 | ✓ |
| 6 | restaurante_gasto_detalle count | 102 | 102 | ✓ |
| 6 | INSERT restaurante_gastos | id (éxito) | 84bcb0aa-0da0-4d0f-b138-300e66ed3e94 | ✓ |
| 6 | contratos count | 0 | 0 | ✓ |
| 6 | prp_contratos count | 0 | 0 | ✓ |
| 6 | prp_empleados count | 0 | 0 | ✓ |
| 6 | gastos_operativos count | 0 | 0 | ✓ |
| 6 | prp_cobros count | 0 | 0 | ✓ |
| 6 | nomina_periodos count | 0 | 0 | ✓ |
| 6 | rh_empleados count | 0 | 0 | ✓ |
| 6 | ingresos count | 0 | 0 | ✓ |
| 7 | lectura pública/anon sobre expedientes-docs | ninguna política | ninguna | ✓ |
| 7 | bucket contratos-docs public | false (o inexistente en QA) | no existe en este proyecto | ✓ |
| 7 | bucket expedientes-docs public | false | no existe en este proyecto | ✓ |
| 7 | código que consume contratos-docs | ninguno | ninguno | ✓ |
| 7 | URLs públicas hardcodeadas a buckets privados | ninguna | ninguna | ✓ |
| 7 | INSERT anon en storage sin restricción de carpeta | ninguna | ninguna | ✓ |

Sin hallazgos.