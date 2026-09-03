-- ================================================================
-- MIGRACION 009: Complementar contratos desde DATOS_Contratos.xlsx
-- Fecha: 2026-09-02 | Total: 22 contratos (8 updates + 14 inserts)
-- ================================================================

-- local L08 -- UPDATE
UPDATE public.contratos SET fecha_inicio='2025-11-21', fecha_fin='2026-11-20', renta_mensual='17500.00', deposito_garantia='17500', dia_pago='21', penalizacion_pct=10, pagares_cantidad='12', periodo_gracia_meses='1', giro_autorizado='Uso comercial', tipo_contrato='ANUAL', fiador_nombre=NULL, fiador_ife=NULL, updated_at=NOW() WHERE locales_display='L8';
UPDATE public.arrendatarios a SET locatario='Alejandro Munoz Fernandez', rfc=COALESCE(NULL,a.rfc), domicilio_fiscal=COALESCE(NULL,a.domicilio_fiscal) FROM public.contratos con WHERE con.locales_display='L8' AND a.id=con.arrendatario_id;

-- local L09 -- INSERT
DO $blk$ DECLARE v_l09 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario,rfc,domicilio_fiscal,estatus,activo)
  VALUES ('Alfredo Bravo Mendiola','BAMA841221C2A','Carr. Calimaya L3 M11, Fracc. Bosque de las Fuentes, San Andres Ocotlan, C.P. 52220','ACTIVO',true)
  RETURNING id INTO v_l09;
  INSERT INTO public.contratos (
    arrendatario_id,numero_contrato,locales_display,locales_referencia,
    fecha_inicio,fecha_fin,renta_mensual,deposito_garantia,dia_pago,penalizacion_pct,
    pagares_cantidad,periodo_gracia_meses,giro_autorizado,tipo_contrato,
    fiador_nombre,fiador_ife,estatus,estatus_proceso
  ) VALUES (
    v_l09,'IWOL-LL09-2025','L9','L9',
    '2025-09-17','2026-09-16','25892.00','48874','17',10,
    '12','0','Spinning','ANUAL',
    'Jose Luis Ayala Ayala','PASAPORTE G41242147','VIGENTE','EN_EJECUCION'
  );
END $blk$;

-- local L10 -- UPDATE
UPDATE public.contratos SET fecha_inicio='2025-06-02', fecha_fin='2026-07-01', renta_mensual='19100.00', deposito_garantia='19100', dia_pago='2', penalizacion_pct=10, pagares_cantidad='12', periodo_gracia_meses='0', giro_autorizado='Cafeteria', tipo_contrato='ANUAL', fiador_nombre='Jorge Eduardo Thebar Ruribe', fiador_ife='IFE 5210068589257', updated_at=NOW() WHERE locales_display='L10';
UPDATE public.arrendatarios a SET locatario='Luis Vicente Dominguez Gamboa', rfc=COALESCE('DOGL810812TU7',a.rfc), domicilio_fiscal=COALESCE('Mariano Matamoros Sur 213, Centro, C.P. 50000, Toluca',a.domicilio_fiscal) FROM public.contratos con WHERE con.locales_display='L10' AND a.id=con.arrendatario_id;

-- local L1112 -- UPDATE
UPDATE public.contratos SET fecha_inicio='2026-04-10', fecha_fin='2027-04-09', renta_mensual='37234.00', deposito_garantia=NULL, dia_pago='10', penalizacion_pct=10, pagares_cantidad='12', periodo_gracia_meses='0', giro_autorizado='Pilates y venta de ropa para pilates', tipo_contrato='ANUAL', fiador_nombre='Ma. Oliver Mendoza Gomez', fiador_ife='IFE 2514024108073', updated_at=NOW() WHERE locales_display='L11, L12';
UPDATE public.arrendatarios a SET locatario='Andrea Castillo Velazquez', rfc=COALESCE('CAVA851220AW3',a.rfc), domicilio_fiscal=COALESCE('Circuito Puerta del Sol 13-14, Col. Puerta Real, C.P. 76910, El Pueblito, Corregidora, Qro.',a.domicilio_fiscal) FROM public.contratos con WHERE con.locales_display='L11, L12' AND a.id=con.arrendatario_id;

-- local L13 -- INSERT
DO $blk$ DECLARE v_l13 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario,rfc,domicilio_fiscal,estatus,activo)
  VALUES ('C&R MOTOR, S.A. DE C.V. rep. Daril Satiel Castro Roman',NULL,'Venustiano Carranza 500, Col. Universidad, C.P. 50130, Toluca','ACTIVO',true)
  RETURNING id INTO v_l13;
  INSERT INTO public.contratos (
    arrendatario_id,numero_contrato,locales_display,locales_referencia,
    fecha_inicio,fecha_fin,renta_mensual,deposito_garantia,dia_pago,penalizacion_pct,
    pagares_cantidad,periodo_gracia_meses,giro_autorizado,tipo_contrato,
    fiador_nombre,fiador_ife,estatus,estatus_proceso
  ) VALUES (
    v_l13,'IWOL-LL13-2025','L13','L13',
    '2025-06-26','2026-06-25','19832.00','16685','10',10,
    '12','0','Uso comercial automotriz','ANUAL',
    'Alicia Garcia Delgado','IFE 1318052907779','VIGENTE','EN_EJECUCION'
  );
END $blk$;

-- local L14 -- UPDATE
UPDATE public.contratos SET fecha_inicio='2024-06-01', fecha_fin='2025-05-31', renta_mensual='17500.00', deposito_garantia='17000', dia_pago='1', penalizacion_pct=10, pagares_cantidad='12', periodo_gracia_meses='0', giro_autorizado='Salones y clinicas de belleza', tipo_contrato='ANUAL', fiador_nombre='Hector Alonso Noriega Rico', fiador_ife='IFE 2731024152155', updated_at=NOW() WHERE locales_display='L14';
UPDATE public.arrendatarios a SET locatario='Luky del Rosario Gonzalez Olivo', rfc=COALESCE('GOOL8710226M2',a.rfc), domicilio_fiscal=COALESCE('Av. Encino, Mz6 Lt3 1, Encinos Roble, San Pedro Cholula, C.P. 52757',a.domicilio_fiscal) FROM public.contratos con WHERE con.locales_display='L14' AND a.id=con.arrendatario_id;

-- local L15 -- UPDATE
UPDATE public.contratos SET fecha_inicio='2025-12-01', fecha_fin='2026-12-31', renta_mensual='19855.00', deposito_garantia='18500', dia_pago='5', penalizacion_pct=10, pagares_cantidad='12', periodo_gracia_meses='0', giro_autorizado='Uso comercial (Isagenix)', tipo_contrato='ANUAL', fiador_nombre='Isagenix Mexico Imports, S. de R.L. de C.V.', fiador_ife=NULL, updated_at=NOW() WHERE locales_display='L15';
UPDATE public.arrendatarios a SET locatario='Isagenix Mexico, S. de R.L. de C.V. rep. Marco A. Casiano Martinez', rfc=COALESCE(NULL,a.rfc), domicilio_fiscal=COALESCE(NULL,a.domicilio_fiscal) FROM public.contratos con WHERE con.locales_display='L15' AND a.id=con.arrendatario_id;

-- local L16 -- INSERT
DO $blk$ DECLARE v_l16 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario,rfc,domicilio_fiscal,estatus,activo)
  VALUES ('Denys Retama Bernal',NULL,'Calle Jose Vicente Villada 450, Col. Francisco Murguia, Toluca, C.P. 50130','ACTIVO',true)
  RETURNING id INTO v_l16;
  INSERT INTO public.contratos (
    arrendatario_id,numero_contrato,locales_display,locales_referencia,
    fecha_inicio,fecha_fin,renta_mensual,deposito_garantia,dia_pago,penalizacion_pct,
    pagares_cantidad,periodo_gracia_meses,giro_autorizado,tipo_contrato,
    fiador_nombre,fiador_ife,estatus,estatus_proceso
  ) VALUES (
    v_l16,'IWOL-LL16-2026','L16','L16',
    '2026-06-26','2027-06-25','18500.00','18500','26',10,
    NULL,'1','Uso comercial','ANUAL',
    'Leonardo Martin Salinas Toledano','IFE SATL940705HMCCLLN03','VIGENTE','EN_EJECUCION'
  );
END $blk$;

-- local L17 -- UPDATE
UPDATE public.contratos SET fecha_inicio='2025-05-01', fecha_fin='2026-04-30', renta_mensual='17700.00', deposito_garantia='16685', dia_pago='1', penalizacion_pct=10, pagares_cantidad='12', periodo_gracia_meses='0', giro_autorizado='Clinica de Atencion a la Diabetes', tipo_contrato='ANUAL', fiador_nombre='Fernando Rafael Franco Robles', fiador_ife='IFE 2261033320309', updated_at=NOW() WHERE locales_display='L17';
UPDATE public.arrendatarios a SET locatario='Luz Adriana Franco Rodriguez', rfc=COALESCE('ROPS590726G47',a.rfc), domicilio_fiscal=COALESCE('Av. Gobernadores 1622, Local 17, Col. La Providencia, C.P. 52177, Metepec',a.domicilio_fiscal) FROM public.contratos con WHERE con.locales_display='L17' AND a.id=con.arrendatario_id;

-- local L18 -- INSERT
DO $blk$ DECLARE v_l18 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario,rfc,domicilio_fiscal,estatus,activo)
  VALUES ('Guillermo Antonio Herice Poleo',NULL,NULL,'ACTIVO',true)
  RETURNING id INTO v_l18;
  INSERT INTO public.contratos (
    arrendatario_id,numero_contrato,locales_display,locales_referencia,
    fecha_inicio,fecha_fin,renta_mensual,deposito_garantia,dia_pago,penalizacion_pct,
    pagares_cantidad,periodo_gracia_meses,giro_autorizado,tipo_contrato,
    fiador_nombre,fiador_ife,estatus,estatus_proceso
  ) VALUES (
    v_l18,'IWOL-LL18-2025','L18','L18',
    '2025-09-15','2026-09-14','17500.00',NULL,'15',10,
    NULL,'1','Uso comercial (salud)','ANUAL',
    'Nerynel Mercedes Hernandez Briceno',NULL,'VIGENTE','EN_EJECUCION'
  );
END $blk$;

-- local L19 -- INSERT
DO $blk$ DECLARE v_l19 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario,rfc,domicilio_fiscal,estatus,activo)
  VALUES ('Lizeth Cristina Campos Garcia',NULL,'Privada Lazaro Cardenas 7, Col. San Mateo Otzacatipan, Toluca, C.P. 50220','ACTIVO',true)
  RETURNING id INTO v_l19;
  INSERT INTO public.contratos (
    arrendatario_id,numero_contrato,locales_display,locales_referencia,
    fecha_inicio,fecha_fin,renta_mensual,deposito_garantia,dia_pago,penalizacion_pct,
    pagares_cantidad,periodo_gracia_meses,giro_autorizado,tipo_contrato,
    fiador_nombre,fiador_ife,estatus,estatus_proceso
  ) VALUES (
    v_l19,'IWOL-LL19-2026','L19','L19',
    '2026-06-19','2027-06-18','17500.00','17500','19',10,
    NULL,'1','Uso comercial','ANUAL',
    NULL,NULL,'VIGENTE','EN_EJECUCION'
  );
END $blk$;

-- local L23 -- INSERT
DO $blk$ DECLARE v_l23 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario,rfc,domicilio_fiscal,estatus,activo)
  VALUES ('Vanessa Acero Jaimes','AEJV920924JJ1','Prolongacion Reforma 1190, Haus Santa Fe 405 C, Cuajimalpa, CDMX','ACTIVO',true)
  RETURNING id INTO v_l23;
  INSERT INTO public.contratos (
    arrendatario_id,numero_contrato,locales_display,locales_referencia,
    fecha_inicio,fecha_fin,renta_mensual,deposito_garantia,dia_pago,penalizacion_pct,
    pagares_cantidad,periodo_gracia_meses,giro_autorizado,tipo_contrato,
    fiador_nombre,fiador_ife,estatus,estatus_proceso
  ) VALUES (
    v_l23,'IWOL-LL23-2026','L23','L23',
    '2026-05-01','2027-05-30','17780.00',NULL,'1',10,
    '12','0','Uso comercial','ANUAL',
    'Ma. Gaysa Jaimes Jaimes',NULL,'VIGENTE','EN_EJECUCION'
  );
END $blk$;

-- local L27 -- INSERT
DO $blk$ DECLARE v_l27 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario,rfc,domicilio_fiscal,estatus,activo)
  VALUES ('Centro de Neurorehabilitacion CINDE, S.A. de C.V. rep. Carlos Michel Guzman Luna','CNC2407298P9','Av. Gobernadores 1622 Interior 27','ACTIVO',true)
  RETURNING id INTO v_l27;
  INSERT INTO public.contratos (
    arrendatario_id,numero_contrato,locales_display,locales_referencia,
    fecha_inicio,fecha_fin,renta_mensual,deposito_garantia,dia_pago,penalizacion_pct,
    pagares_cantidad,periodo_gracia_meses,giro_autorizado,tipo_contrato,
    fiador_nombre,fiador_ife,estatus,estatus_proceso
  ) VALUES (
    v_l27,'IWOL-LL27-2026','L27, L28','L27|L28',
    '2026-01-08','2027-01-07','16751.43',NULL,'8',10,
    '12','1','Clinica de neurorehabilitacion','ANUAL',
    'Karen Mercedes Gaytan Walle',NULL,'VIGENTE','EN_EJECUCION'
  );
END $blk$;

-- local L29 -- INSERT
DO $blk$ DECLARE v_l29 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario,rfc,domicilio_fiscal,estatus,activo)
  VALUES ('Avaxo Tech S.A. de C.V. rep. Ricardo Wong Osuna',NULL,NULL,'ACTIVO',true)
  RETURNING id INTO v_l29;
  INSERT INTO public.contratos (
    arrendatario_id,numero_contrato,locales_display,locales_referencia,
    fecha_inicio,fecha_fin,renta_mensual,deposito_garantia,dia_pago,penalizacion_pct,
    pagares_cantidad,periodo_gracia_meses,giro_autorizado,tipo_contrato,
    fiador_nombre,fiador_ife,estatus,estatus_proceso
  ) VALUES (
    v_l29,'IWOL-LL29-2026','L29','L29',
    '2026-01-01','2026-12-31','16955.00','15747.50','22',10,
    '12','0','Uso comercial (tecnologia)','ANUAL',
    'Rodrigo Wong Osuna',NULL,'VIGENTE','EN_EJECUCION'
  );
END $blk$;

-- local L30 -- INSERT
DO $blk$ DECLARE v_l30 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario,rfc,domicilio_fiscal,estatus,activo)
  VALUES ('Dulce Michelle Andrade Bucio',NULL,'C. Hidalgo 7 Int A, Lerma de Villada Centro, C.P. 52000','ACTIVO',true)
  RETURNING id INTO v_l30;
  INSERT INTO public.contratos (
    arrendatario_id,numero_contrato,locales_display,locales_referencia,
    fecha_inicio,fecha_fin,renta_mensual,deposito_garantia,dia_pago,penalizacion_pct,
    pagares_cantidad,periodo_gracia_meses,giro_autorizado,tipo_contrato,
    fiador_nombre,fiador_ife,estatus,estatus_proceso
  ) VALUES (
    v_l30,'IWOL-LL30-2025','L30','L30',
    '2025-09-22','2026-10-21','17650.00','16500','22',10,
    '12','0','Uso comercial','ANUAL',
    'Joanna Maruri Esquivel',NULL,'VIGENTE','EN_EJECUCION'
  );
END $blk$;

-- local L3132 -- INSERT
DO $blk$ DECLARE v_l3132 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario,rfc,domicilio_fiscal,estatus,activo)
  VALUES ('Grupo Oaklife Mexico rep. Luis C. Vallejo Farfan',NULL,'Ciudad Salamanca 5974, Cumbres de Santa Clara, Monterrey NL, C.P. 64349','ACTIVO',true)
  RETURNING id INTO v_l3132;
  INSERT INTO public.contratos (
    arrendatario_id,numero_contrato,locales_display,locales_referencia,
    fecha_inicio,fecha_fin,renta_mensual,deposito_garantia,dia_pago,penalizacion_pct,
    pagares_cantidad,periodo_gracia_meses,giro_autorizado,tipo_contrato,
    fiador_nombre,fiador_ife,estatus,estatus_proceso
  ) VALUES (
    v_l3132,'IWOL-LL3132-2025','L31, L32','L31|L32',
    '2025-02-14','2027-03-05','31500.00',NULL,'6',10,
    '12','0','Seguros y fianzas','ANUAL',
    'Victor Manuel Monroy Garnica',NULL,'VIGENTE','EN_EJECUCION'
  );
END $blk$;

-- local L33 -- INSERT
DO $blk$ DECLARE v_l33 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario,rfc,domicilio_fiscal,estatus,activo)
  VALUES ('Gerardo Quiroz Acosta / Centro de Artes Escenicas PROART, A.C.',NULL,'Calle Viena 159, Col. Del Carmen, Coyoacan, CDMX, C.P. 04100','ACTIVO',true)
  RETURNING id INTO v_l33;
  INSERT INTO public.contratos (
    arrendatario_id,numero_contrato,locales_display,locales_referencia,
    fecha_inicio,fecha_fin,renta_mensual,deposito_garantia,dia_pago,penalizacion_pct,
    pagares_cantidad,periodo_gracia_meses,giro_autorizado,tipo_contrato,
    fiador_nombre,fiador_ife,estatus,estatus_proceso
  ) VALUES (
    v_l33,'IWOL-LL33-2026','L33','L33',
    '2026-02-13','2027-02-12','16500.00',NULL,NULL,10,
    NULL,'0','Escuela de artes escenicas','ANUAL',
    NULL,NULL,'VIGENTE','EN_EJECUCION'
  );
END $blk$;

-- local L34 -- INSERT
DO $blk$ DECLARE v_l34 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario,rfc,domicilio_fiscal,estatus,activo)
  VALUES ('Enrique Garcia Robles','GARE72101017SB8','2 de Abril 48 A, Santa Ana Tlapaltitlan, C.P. 50160, Toluca','ACTIVO',true)
  RETURNING id INTO v_l34;
  INSERT INTO public.contratos (
    arrendatario_id,numero_contrato,locales_display,locales_referencia,
    fecha_inicio,fecha_fin,renta_mensual,deposito_garantia,dia_pago,penalizacion_pct,
    pagares_cantidad,periodo_gracia_meses,giro_autorizado,tipo_contrato,
    fiador_nombre,fiador_ife,estatus,estatus_proceso
  ) VALUES (
    v_l34,'IWOL-LL34-2025','L34','L34',
    '2025-10-28','2026-10-27','17120.00',NULL,'28',10,
    '12','0','Uso comercial','ANUAL',
    'Erika Uribe Cedillo',NULL,'VIGENTE','EN_EJECUCION'
  );
END $blk$;

-- local L35 -- INSERT
DO $blk$ DECLARE v_l35 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario,rfc,domicilio_fiscal,estatus,activo)
  VALUES ('Andrea Castillo Velazquez','CAVA851220AW3','Circuito Puerta del Sol 13-14, El Pueblito, Corregidora, Qro.','ACTIVO',true)
  RETURNING id INTO v_l35;
  INSERT INTO public.contratos (
    arrendatario_id,numero_contrato,locales_display,locales_referencia,
    fecha_inicio,fecha_fin,renta_mensual,deposito_garantia,dia_pago,penalizacion_pct,
    pagares_cantidad,periodo_gracia_meses,giro_autorizado,tipo_contrato,
    fiador_nombre,fiador_ife,estatus,estatus_proceso
  ) VALUES (
    v_l35,'IWOL-LL35-2024','L35','L35',
    '2024-08-02','2025-08-20','15900.00',NULL,'2',10,
    '12','0','Uso comercial','ANUAL',
    'Olliver Mendoza Gomez','IFE 2514024108073','VIGENTE','EN_EJECUCION'
  );
END $blk$;

-- local L36 -- UPDATE
UPDATE public.contratos SET fecha_inicio='2025-09-15', fecha_fin='2026-09-14', renta_mensual='15000.00', deposito_garantia='15000', dia_pago='15', penalizacion_pct=10, pagares_cantidad=NULL, periodo_gracia_meses='0', giro_autorizado='Uso comercial', tipo_contrato='ANUAL', fiador_nombre=NULL, fiador_ife=NULL, updated_at=NOW() WHERE locales_display='L36';
UPDATE public.arrendatarios a SET locatario='Nancy Gallardo Fuentes', rfc=COALESCE(NULL,a.rfc), domicilio_fiscal=COALESCE('Av. Gobernadores 1622, Interior 36',a.domicilio_fiscal) FROM public.contratos con WHERE con.locales_display='L36' AND a.id=con.arrendatario_id;

-- local L3738 -- INSERT
DO $blk$ DECLARE v_l3738 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario,rfc,domicilio_fiscal,estatus,activo)
  VALUES ('Leonardo Felix Vinas Osorio','VIOL8411202X2','Calle Benito Juarez Garcia 404 005, San Mateo Oxtotitlan, C.P. 50100, Toluca','ACTIVO',true)
  RETURNING id INTO v_l3738;
  INSERT INTO public.contratos (
    arrendatario_id,numero_contrato,locales_display,locales_referencia,
    fecha_inicio,fecha_fin,renta_mensual,deposito_garantia,dia_pago,penalizacion_pct,
    pagares_cantidad,periodo_gracia_meses,giro_autorizado,tipo_contrato,
    fiador_nombre,fiador_ife,estatus,estatus_proceso
  ) VALUES (
    v_l3738,'IWOL-LL3738-2024','L37, L38','L37|L38',
    '2024-09-06','2026-10-05','27500.00','52000','5',10,
    '12','1','Uso comercial','ANUAL',
    'Donato Alberto Montes de Oca Martinez',NULL,'VIGENTE','EN_EJECUCION'
  );
END $blk$;

-- local L0607 -- UPDATE
UPDATE public.contratos SET fecha_inicio='2024-04-09', fecha_fin='2025-05-08', renta_mensual='36500.00', deposito_garantia=NULL, dia_pago='9', penalizacion_pct=10, pagares_cantidad='12', periodo_gracia_meses='1', giro_autorizado='Venta y demostracion de electrodomesticos (Thermomix)', tipo_contrato='ANUAL', fiador_nombre='Horacio Hernandez Huerta', fiador_ife='IFE 0553039941011', updated_at=NOW() WHERE locales_display='L6, L7';
UPDATE public.arrendatarios a SET locatario='Vorwerk Mexico, S. de R.L. de C.V. rep. H. Hernandez Huerta', rfc=COALESCE(NULL,a.rfc), domicilio_fiscal=COALESCE('Vito Alessio Robles 38, Col. Florida, C.P. 01030, Alvaro Obregon, CDMX',a.domicilio_fiscal) FROM public.contratos con WHERE con.locales_display='L6, L7' AND a.id=con.arrendatario_id;

NOTIFY pgrst, 'reload schema';