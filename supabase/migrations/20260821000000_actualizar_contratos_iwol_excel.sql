-- ===========================================================================
-- Migracion: actualizar contratos IWOL desde Tabla_Comparativa_Contratos_Iwol
-- Generado: 2026-08-21 | Fuente: Excel cliente, 22 locales
-- ===========================================================================

-- LOCAL 6 (Vorwerk Mexico / Horacio Hernandez Huerta)
UPDATE public.arrendatarios a
  SET domicilio_fiscal = 'Vito Alessio Robles 38, Col. Florida, C.P. 01030, Alvaro Obregon, CDMX'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 6'
  ) AND (a.domicilio_fiscal IS NULL OR a.domicilio_fiscal = '');

UPDATE public.contratos c
  SET estatus = 'VENCIDO', fecha_inicio = '2024-04-09', fecha_fin = '2025-05-08',
      renta_mensual = 36500, dia_pago = 9, deposito_garantia = 36500, pagares_cantidad = 12,
      fiador_nombre = 'Horacio Hernandez Huerta', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 6'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 7 (Vorwerk Mexico / Horacio Hernandez Huerta)
UPDATE public.contratos c
  SET estatus = 'VENCIDO', fecha_inicio = '2024-04-09', fecha_fin = '2025-05-08',
      renta_mensual = 36500, dia_pago = 9, deposito_garantia = 36500, pagares_cantidad = 12,
      fiador_nombre = 'Horacio Hernandez Huerta', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 7'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 8 (Alejandro Munoz Fernandez)
UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2025-11-21', fecha_fin = '2026-11-20',
      renta_mensual = 17500, dia_pago = 21, deposito_garantia = 17500, pagares_cantidad = 12,
      updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 8'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 9 (Alfredo Bravo Mendiola)
UPDATE public.arrendatarios a
  SET rfc = 'BAMA841221C2A',
      domicilio_fiscal = 'Carr. Calimaya L3 M11, Fracc. Bosque de las Fuentes, San Andres Ocotlan, C.P. 52220'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 9'
  ) AND (a.rfc IS NULL OR a.rfc = '');

UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2025-09-17', fecha_fin = '2026-09-16',
      renta_mensual = 25892, dia_pago = 17, deposito_garantia = 48874, pagares_cantidad = 12,
      fiador_nombre = 'Jose Luis Ayala Ayala', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 9'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 10 (Luis Vicente Dominguez Gamboa)
UPDATE public.arrendatarios a
  SET rfc = 'DOGL810812TU7',
      domicilio_fiscal = 'Mariano Matamoros Sur 213, Centro, C.P. 50000, Toluca'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 10'
  ) AND (a.rfc IS NULL OR a.rfc = '');

UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2025-06-02', fecha_fin = '2026-07-01',
      renta_mensual = 19100, dia_pago = 2, deposito_garantia = 19100, pagares_cantidad = 12,
      fiador_nombre = 'Jorge Eduardo Thebar Ruribe', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 10'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 11 (Andrea Castillo Velazquez)
UPDATE public.arrendatarios a
  SET rfc = 'CAVA851220AW3',
      domicilio_fiscal = 'Circuito Puerta del Sol 13-14, Col. Puerta Real, C.P. 76910, Corregidora, Qro.'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 11'
  ) AND (a.rfc IS NULL OR a.rfc = '');

UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2026-04-10', fecha_fin = '2027-04-09',
      renta_mensual = 37234, dia_pago = 10, deposito_garantia = 37234, pagares_cantidad = 12,
      fiador_nombre = 'Ma. Oliver Mendoza Gomez', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 11'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 12 (Andrea Castillo Velazquez)
UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2026-04-10', fecha_fin = '2027-04-09',
      renta_mensual = 37234, dia_pago = 10, deposito_garantia = 37234, pagares_cantidad = 12,
      fiador_nombre = 'Ma. Oliver Mendoza Gomez', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 12'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 13 (C&R Motor SA / Daril Castro Roman)
UPDATE public.arrendatarios a
  SET domicilio_fiscal = 'Venustiano Carranza 500, Col. Universidad, C.P. 50130, Toluca'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 13'
  ) AND (a.domicilio_fiscal IS NULL OR a.domicilio_fiscal = '');

UPDATE public.contratos c
  SET estatus = 'VENCIDO', fecha_inicio = '2025-06-26', fecha_fin = '2026-06-25',
      renta_mensual = 19832, dia_pago = 10, deposito_garantia = 16685, pagares_cantidad = 12,
      fiador_nombre = 'Alicia Garcia Delgado', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 13'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 14 (Luky del Rosario Gonzalez Olivo)
UPDATE public.arrendatarios a
  SET rfc = 'GOOL8710226M2',
      domicilio_fiscal = 'Av. Encino, Mz6 Lt3 1, Encinos Roble, San Pedro Cholula, C.P. 52757'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 14'
  ) AND (a.rfc IS NULL OR a.rfc = '');

UPDATE public.contratos c
  SET estatus = 'VENCIDO', fecha_inicio = '2024-06-01', fecha_fin = '2025-05-31',
      renta_mensual = 17500, dia_pago = 1, deposito_garantia = 17000, pagares_cantidad = 12,
      fiador_nombre = 'Hector Alonso Noriega Rico', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 14'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 15 (Isagenix Mexico Imports)
UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2026-01-01', fecha_fin = '2026-12-31',
      renta_mensual = 19855, dia_pago = 1, pagares_cantidad = 0, updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 15'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 16 (Denys Retama Bernal)
UPDATE public.arrendatarios a
  SET domicilio_fiscal = 'Calle Jose Vicente Villada 450, Col. Francisco Murguia, Toluca, C.P. 50130'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 16'
  ) AND (a.domicilio_fiscal IS NULL OR a.domicilio_fiscal = '');

UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2026-06-26', fecha_fin = '2027-06-25',
      renta_mensual = 18500, dia_pago = 26, deposito_garantia = 18500, pagares_cantidad = 0,
      fiador_nombre = 'Leonardo Martin Salinas Toledano', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 16'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 17 (Luz Adriana Franco Rodriguez)
UPDATE public.arrendatarios a
  SET rfc = 'ROPS590726G47',
      domicilio_fiscal = 'Av. Gobernadores 1622, Local 17, C.P. 52177, Metepec'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 17'
  ) AND (a.rfc IS NULL OR a.rfc = '');

UPDATE public.contratos c
  SET estatus = 'VENCIDO', fecha_inicio = '2025-05-01', fecha_fin = '2026-04-30',
      renta_mensual = 17700, dia_pago = 1, deposito_garantia = 16685, pagares_cantidad = 12,
      fiador_nombre = 'Fernando Rafael Franco Robles', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 17'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 18 (Guillermo Antonio Herice Poleo)
UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2025-09-15', fecha_fin = '2026-09-14',
      renta_mensual = 17500, dia_pago = 15, deposito_garantia = 17500, pagares_cantidad = 0,
      fiador_nombre = 'Nerynel Mercedes Hernandez Briceno', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 18'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 19 (Lizeth Cristina Campos Garcia)
UPDATE public.arrendatarios a
  SET domicilio_fiscal = 'Privada Lazaro Cardenas 7, Col. San Mateo Otzacatipan, Toluca, C.P. 50220'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 19'
  ) AND (a.domicilio_fiscal IS NULL OR a.domicilio_fiscal = '');

UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2026-06-19', fecha_fin = '2027-06-18',
      renta_mensual = 17500, dia_pago = 19, deposito_garantia = 17500, pagares_cantidad = 0,
      updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 19'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 23 (Vanessa Acero Jaimes)
UPDATE public.arrendatarios a
  SET rfc = 'AEJV920924JJ1',
      domicilio_fiscal = 'Prolongacion Reforma 1190, Haus Santa Fe 405 C, Cuajimalpa, CDMX'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 23'
  ) AND (a.rfc IS NULL OR a.rfc = '');

UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2026-05-01', fecha_fin = '2027-05-30',
      renta_mensual = 17780, dia_pago = 1, pagares_cantidad = 12,
      fiador_nombre = 'Ma. Gaysa Jaimes Jaimes', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 23'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 27 (CINDE SA / Carlos Michel Guzman Luna)
UPDATE public.arrendatarios a
  SET rfc = 'CNC2407298P9',
      domicilio_fiscal = 'Av. Gobernadores 1622 Interior 27, Metepec'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 27'
  ) AND (a.rfc IS NULL OR a.rfc = '');

UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2026-01-08', fecha_fin = '2027-01-07',
      renta_mensual = 16751, dia_pago = 8, pagares_cantidad = 12,
      fiador_nombre = 'Karen Mercedes Gaytan Walle', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 27'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 29 (Avaxo Tech SA / Ricardo Wong Osuna)
UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2026-01-01', fecha_fin = '2026-12-31',
      renta_mensual = 16955, dia_pago = 22, deposito_garantia = 15748, pagares_cantidad = 12,
      fiador_nombre = 'Rodrigo Wong Osuna', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 29'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 30 (Dulce Michelle Andrade Bucio)
UPDATE public.arrendatarios a
  SET domicilio_fiscal = 'C. Hidalgo 7 Int A, Lerma de Villada Centro, C.P. 52000'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 30'
  ) AND (a.domicilio_fiscal IS NULL OR a.domicilio_fiscal = '');

UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2025-09-22', fecha_fin = '2026-10-21',
      renta_mensual = 17650, dia_pago = 22, deposito_garantia = 16500, pagares_cantidad = 12,
      fiador_nombre = 'Joanna Maruri Esquivel', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 30'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 31 (Grupo Oaklife)
UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2026-03-06', fecha_fin = '2027-03-05',
      renta_mensual = 31500, dia_pago = 6, pagares_cantidad = 12,
      fiador_nombre = 'Victor Manuel Monroy Garnica', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 31'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 32 (Grupo Oaklife)
UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2026-03-06', fecha_fin = '2027-03-05',
      renta_mensual = 31500, dia_pago = 6, pagares_cantidad = 12,
      fiador_nombre = 'Victor Manuel Monroy Garnica', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 32'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 33 (Gerardo Quiroz Acosta / PROART AC)
UPDATE public.arrendatarios a
  SET domicilio_fiscal = 'Calle Viena 159, Col. Del Carmen, Coyoacan, CDMX, C.P. 04100'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 33'
  ) AND (a.domicilio_fiscal IS NULL OR a.domicilio_fiscal = '');

UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2026-02-13', fecha_fin = '2027-02-12',
      renta_mensual = 16500, dia_pago = 1, pagares_cantidad = 0, updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 33'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 34 (Enrique Garcia Robles)
UPDATE public.arrendatarios a
  SET rfc = 'GARE721010175B8',
      domicilio_fiscal = '2 de Abril 48 A, Santa Ana Tlapaltitlan, C.P. 50160, Toluca'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 34'
  ) AND (a.rfc IS NULL OR a.rfc = '');

UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2025-10-28', fecha_fin = '2026-10-27',
      renta_mensual = 17120, dia_pago = 28, pagares_cantidad = 12,
      fiador_nombre = 'Erika Uribe Cedillo', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 34'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 35 (Andrea Castillo Velazquez -- contrato vencido)
UPDATE public.arrendatarios a
  SET rfc = 'CAVA851220AW3',
      domicilio_fiscal = 'Circuito Puerta del Sol 13-14, Col. Puerta Real, C.P. 76910, Corregidora, Qro.'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 35'
  ) AND (a.rfc IS NULL OR a.rfc = '');

UPDATE public.contratos c
  SET estatus = 'VENCIDO', fecha_inicio = '2024-08-02', fecha_fin = '2025-08-20',
      renta_mensual = 15900, dia_pago = 2, pagares_cantidad = 12,
      fiador_nombre = 'Olliver Mendoza Gomez', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 35'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 36 (Nancy Gallardo Fuentes)
UPDATE public.arrendatarios a
  SET domicilio_fiscal = 'Av. Gobernadores 1622, Interior 36, Metepec'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 36'
  ) AND (a.domicilio_fiscal IS NULL OR a.domicilio_fiscal = '');

UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2025-09-15', fecha_fin = '2026-09-14',
      renta_mensual = 15000, dia_pago = 15, deposito_garantia = 15000, pagares_cantidad = 0,
      updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 36'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 37 (Leonardo Felix Vinas Osorio)
UPDATE public.arrendatarios a
  SET rfc = 'VIOL8411202X2',
      domicilio_fiscal = 'Calle Benito Juarez Garcia 404 005, San Mateo Oxtotitlan, C.P. 50100, Toluca'
  WHERE a.id IN (
    SELECT DISTINCT c.arrendatario_id FROM public.contratos c
    JOIN public.contratos_locales cl ON cl.contrato_id = c.id
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 37'
  ) AND (a.rfc IS NULL OR a.rfc = '');

UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2024-09-06', fecha_fin = '2026-10-05',
      renta_mensual = 27500, dia_pago = 5, deposito_garantia = 52000, pagares_cantidad = 12,
      fiador_nombre = 'Donato Alberto Montes de Oca Martinez', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 37'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

-- LOCAL 38 (Leonardo Felix Vinas Osorio)
UPDATE public.contratos c
  SET estatus = 'VIGENTE', fecha_inicio = '2024-09-06', fecha_fin = '2026-10-05',
      renta_mensual = 27500, dia_pago = 5, deposito_garantia = 52000, pagares_cantidad = 12,
      fiador_nombre = 'Donato Alberto Montes de Oca Martinez', updated_at = now()
  WHERE c.id IN (
    SELECT DISTINCT cl.contrato_id FROM public.contratos_locales cl
    JOIN public.cat_locales l ON l.id_local = cl.local_id
    WHERE l.numero_local = 'LOCAL 38'
  ) AND c.estatus NOT IN ('CANCELADO', 'RESCISION');

NOTIFY pgrst, 'reload schema';
