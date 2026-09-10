-- Clasificación del ingreso (con MIXTO), deducida de la distribución del pago.
--
-- ── Por qué una columna nueva y no `ingresos.tipo` ──────────────────────────
-- `tipo` no es un dato descriptivo suelto: es la llave con la que otros módulos
-- reparten el dinero en sus renglones.
--
--   · EDR.jsx  — `.eq('tipo','RENTA')` para las rentas reales en base caja, y
--                agrupa por 'AGUA' / 'ESTACIONAMIENTO' / 'PENSION' / 'MAQUINITA'.
--   · ResumenSemanal.jsx — parte los ingresos de la semana en rentasEf (RENTA),
--                aguaEf (AGUA) y otrosEf (el resto).
--   · Cobranza.jsx — escribe `tipo` al registrar un pago.
--   · Ingresos.jsx — tarjetas "Rentas cobradas" y "Sanciones", y el filtro.
--
-- Si un pago de renta + sanción pasara a `tipo = 'MIXTO'`, ese depósito se
-- caería del renglón de rentas del EDR y del resumen semanal: el reporte
-- reportaría menos ingreso por renta del que realmente entró. Eso es una
-- regresión contable, no un detalle de presentación.
--
-- Por eso `tipo` se queda exactamente como está (sigue siendo el concepto
-- dominante, el que ya usan los reportes) y la clasificación nueva vive en
-- `clasificacion`, que nadie más lee todavía. Cuando cada reporte migre a leer
-- las aplicaciones reales, podrá usarla; mientras tanto no rompe nada.
--
-- ── MANTENIMIENTO ──────────────────────────────────────────────────────────
-- `cargos_programados.concepto` admite MANTENIMIENTO, pero la clasificación que
-- se pidió es un juego cerrado de cinco: RENTA / SANCION / AGUA / OTRO / MIXTO.
-- Un cargo de MANTENIMIENTO se clasifica entonces como OTRO. No se pierde
-- información: el detalle del ingreso sigue mostrando la distribución concepto
-- por concepto. Hoy además no existe ningún cargo con ese concepto en la base.

alter table public.ingresos
  add column if not exists clasificacion        text,
  add column if not exists clasificacion_manual boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ingresos'::regclass and conname = 'ingresos_clasificacion_chk'
  ) then
    alter table public.ingresos
      add constraint ingresos_clasificacion_chk
      check (clasificacion is null
             or clasificacion in ('RENTA','SANCION','AGUA','OTRO','MIXTO'));
  end if;
end $$;

comment on column public.ingresos.clasificacion is
  'A qué se aplicó el depósito: RENTA/SANCION/AGUA/OTRO si todo fue a un solo concepto, '
  'MIXTO si se repartió entre dos o más. NULL = sin distribución de la cual deducirla. '
  'No sustituye a `tipo`, que es lo que EDR y ResumenSemanal siguen leyendo.';
comment on column public.ingresos.clasificacion_manual is
  'true = un usuario eligió la clasificación a mano; el recálculo automático la respeta.';

-- ── Deducción ──────────────────────────────────────────────────────────────
create or replace function public.fn_clasificacion_desde_aplicaciones(p_ingreso bigint)
returns text
language plpgsql
stable
as $$
declare v_conceptos text[];
begin
  select array_agg(distinct
           case when c.concepto in ('RENTA','SANCION','AGUA') then c.concepto else 'OTRO' end)
    into v_conceptos
    from public.aplicaciones_pago a
    join public.cargos_programados c on c.id = a.cargo_id
   where a.ingreso_id = p_ingreso
     and coalesce(a.importe_aplicado, 0) > 0;

  -- Sin aplicaciones no hay distribución de la cual deducir nada: se devuelve
  -- NULL y quien llama deja la clasificación como estaba, sin inventarla.
  if v_conceptos is null or array_length(v_conceptos, 1) = 0 then
    return null;
  end if;
  if array_length(v_conceptos, 1) = 1 then
    return v_conceptos[1];
  end if;
  return 'MIXTO';
end;
$$;

comment on function public.fn_clasificacion_desde_aplicaciones(bigint) is
  'Un solo concepto aplicado => ese concepto; dos o más => MIXTO; sin aplicaciones => NULL.';

create or replace function public.fn_recalcular_clasificacion_ingreso(p_ingreso bigint)
returns void
language plpgsql
as $$
declare v_nueva text;
begin
  if p_ingreso is null then return; end if;
  v_nueva := public.fn_clasificacion_desde_aplicaciones(p_ingreso);

  -- La elección manual manda: el recálculo no la pisa. Y si la deducción no da
  -- resultado (ingreso sin aplicaciones) se conserva lo que hubiera.
  update public.ingresos
     set clasificacion = coalesce(v_nueva, clasificacion)
   where id = p_ingreso
     and clasificacion_manual = false
     and clasificacion is distinct from coalesce(v_nueva, clasificacion);
end;
$$;

-- ── Recálculo automático cuando cambia la distribución ──────────────────────
-- En la base y no en el frontend: la distribución también se toca desde
-- Cobranza.jsx y desde scripts de corrección. Un cálculo hecho solo en la
-- pantalla de Ingresos dejaría la clasificación mintiendo en cuanto el pago se
-- reparta desde otro lado.
create or replace function public.fn_trg_clasificacion_ingreso()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('INSERT','UPDATE') then
    perform public.fn_recalcular_clasificacion_ingreso(new.ingreso_id);
  end if;
  -- Un UPDATE puede mover la aplicación de un ingreso a otro: los dos cambian.
  if tg_op in ('DELETE','UPDATE') then
    perform public.fn_recalcular_clasificacion_ingreso(old.ingreso_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_clasificacion_ingreso on public.aplicaciones_pago;
create trigger trg_clasificacion_ingreso
  after insert or update or delete on public.aplicaciones_pago
  for each row execute function public.fn_trg_clasificacion_ingreso();

-- ── Poblado inicial ────────────────────────────────────────────────────────
-- Solo los que tienen aplicaciones reales. Los que no tienen ninguna se quedan
-- con clasificacion NULL: no hay de dónde deducirla y no se inventa.
update public.ingresos i
   set clasificacion = d.c
  from (select id, public.fn_clasificacion_desde_aplicaciones(id) as c
          from public.ingresos) d
 where d.id = i.id
   and d.c is not null
   and i.clasificacion_manual = false
   and i.clasificacion is distinct from d.c;

-- La vista se reescribe completa: CREATE OR REPLACE VIEW solo admite columnas
-- nuevas al final, nunca intercaladas.
create or replace view public.prp_ingresos as
 select i.id,
    i.fecha,
    i.tipo,
    i.mes,
    i.anio,
    i.importe,
    i.factura,
    i.nota,
    i.origen,
    i.concepto_origen,
    i.comprobante_url,
    i.contrato_id,
    i.created_at,
    con.folio,
    con.arrendatario_nombre,
    con.locales_display,
    con.renta_mensual,
    con.arrendatario_nombre as propietario,
    con.locales_display as local_id,
    true as es_principal,
    i.estatus_validacion,
    i.validado_por,
    i.validado_en,
    i.clasificacion,
    i.clasificacion_manual
   from ingresos i
     left join prp_contratos con on con.id = i.contrato_id;

create index if not exists idx_ingresos_clasificacion
  on public.ingresos (clasificacion);

notify pgrst, 'reload schema';
