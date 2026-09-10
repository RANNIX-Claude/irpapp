-- Integridad de la distribución de un pago.
--
-- Dos defectos reales, encontrados a partir del ingreso de L16 (Denys Retama,
-- 2026-08-26, $18,500) que aparecía con $37,000 aplicados:
--
-- 1. Nada impedía que la suma de `aplicaciones_pago` de un ingreso rebasara el
--    importe del depósito. La pantalla sí avisaba, pero la pantalla se puede
--    saltar (el propio upsert de la UI acumulaba filas viejas sin borrarlas).
--    La única defensa que no se puede esquivar es la de la base.
--
-- 2. `fn_actualizar_estado_cargo` usaba NEW.cargo_id también en el DELETE. En un
--    trigger de DELETE, NEW viene sin asignar: el UPDATE terminaba con
--    `WHERE id = NULL` y no tocaba ninguna fila. Resultado: borrar una
--    aplicación dejaba el cargo marcado como PAGADO aunque ya no tuviera
--    pagos. Verificado contra la base antes de escribir esto.
--    Lo mismo pasaba si un UPDATE movía la aplicación de un cargo a otro: el
--    cargo que se quedaba sin pago nunca se recalculaba.

-- ── 1. Recalcular el estado del cargo, ahora también al borrar ──────────────
create or replace function public.fn_actualizar_estado_cargo()
returns trigger
language plpgsql
as $$
declare
  v_cargos uuid[];
  v_cargo  uuid;
  v_importe  numeric;
  v_aplicado numeric;
  v_estado   text;
begin
  -- Un UPDATE puede mover la aplicación de un cargo a otro: hay que recalcular
  -- los dos, el que la recibe y el que la pierde.
  v_cargos := array_remove(array[
    case when tg_op in ('INSERT','UPDATE') then new.cargo_id end,
    case when tg_op in ('DELETE','UPDATE') then old.cargo_id end
  ], null);

  foreach v_cargo in array v_cargos loop
    select importe into v_importe from public.cargos_programados where id = v_cargo;
    if v_importe is null then continue; end if;

    select coalesce(sum(importe_aplicado), 0) into v_aplicado
      from public.aplicaciones_pago where cargo_id = v_cargo;

    if    v_aplicado >= v_importe - 0.01 then v_estado := 'PAGADO';
    elsif v_aplicado > 0                 then v_estado := 'PARCIAL';
    else                                      v_estado := 'PENDIENTE';
    end if;

    update public.cargos_programados
       set estado = v_estado, updated_at = now()
     where id = v_cargo and estado is distinct from v_estado;
  end loop;

  return coalesce(new, old);
end;
$$;

comment on function public.fn_actualizar_estado_cargo() is
  'Recalcula PAGADO/PARCIAL/PENDIENTE del cargo a partir de la suma de sus aplicaciones. '
  'Cubre INSERT, UPDATE (ambos cargos si cambia cargo_id) y DELETE.';

-- ── 2. La suma de aplicaciones no puede rebasar el importe del ingreso ──────
create or replace function public.fn_validar_aplicaciones_vs_ingreso()
returns trigger
language plpgsql
as $$
declare
  v_ingreso   bigint;
  v_importe   numeric;
  v_aplicado  numeric;
begin
  v_ingreso := new.ingreso_id;

  select importe into v_importe from public.ingresos where id = v_ingreso;
  -- Un ingreso sin importe capturado no da contra qué comparar; no se bloquea.
  if v_importe is null then return null; end if;

  select coalesce(sum(importe_aplicado), 0) into v_aplicado
    from public.aplicaciones_pago where ingreso_id = v_ingreso;

  -- Tolerancia de un centavo: el redondeo de un importe no debe tumbar una captura.
  if v_aplicado > v_importe + 0.01 then
    raise exception
      'La distribución excede el pago: el ingreso #% es de $% y se están aplicando $% (sobran $%). Ajusta los importes o quita el cargo que sobra.',
      v_ingreso,
      to_char(v_importe,  'FM999,999,990.00'),
      to_char(v_aplicado, 'FM999,999,990.00'),
      to_char(v_aplicado - v_importe, 'FM999,999,990.00');
  end if;

  return null;
end;
$$;

comment on function public.fn_validar_aplicaciones_vs_ingreso() is
  'Impide que la suma de aplicaciones_pago de un ingreso rebase ingresos.importe.';

-- AFTER y no BEFORE a propósito: los triggers AFTER de una sentencia se ejecutan
-- cuando todas sus filas ya están escritas, así que la suma que se compara es la
-- final. Un BEFORE vería la tabla a medio insertar y dejaría pasar un upsert de
-- varias filas que en conjunto se pasa del importe.
--
-- Es un constraint trigger DEFERRABLE INITIALLY IMMEDIATE: por defecto revienta
-- en la sentencia que se pasa (que es donde se entiende el error), pero un
-- script de corrección que necesite insertar antes de borrar puede pedir
-- `set constraints trg_aplicacion_no_excede_ingreso deferred` y que se revise
-- al cierre de la transacción.
drop trigger if exists trg_aplicacion_no_excede_ingreso on public.aplicaciones_pago;
create constraint trigger trg_aplicacion_no_excede_ingreso
  after insert or update on public.aplicaciones_pago
  deferrable initially immediate
  for each row execute function public.fn_validar_aplicaciones_vs_ingreso();

-- ── 3. Bajar el importe de un ingreso tampoco puede dejarlo sobre-aplicado ──
create or replace function public.fn_validar_ingreso_vs_aplicaciones()
returns trigger
language plpgsql
as $$
declare v_aplicado numeric;
begin
  if new.importe is null then return null; end if;

  select coalesce(sum(importe_aplicado), 0) into v_aplicado
    from public.aplicaciones_pago where ingreso_id = new.id;

  if v_aplicado > new.importe + 0.01 then
    raise exception
      'No se puede bajar el ingreso #% a $%: ya tiene $% distribuidos entre cargos. Corrige primero la distribución.',
      new.id,
      to_char(new.importe, 'FM999,999,990.00'),
      to_char(v_aplicado,  'FM999,999,990.00');
  end if;

  return null;
end;
$$;

drop trigger if exists trg_ingreso_no_menor_que_aplicaciones on public.ingresos;
create constraint trigger trg_ingreso_no_menor_que_aplicaciones
  after update on public.ingresos
  deferrable initially immediate
  for each row
  when (new.importe is distinct from old.importe)
  execute function public.fn_validar_ingreso_vs_aplicaciones();

-- ── 4. Diagnóstico reutilizable ─────────────────────────────────────────────
-- Los ingresos cuya distribución no cuadra con el depósito. Sirve para revisar
-- a mano (`select * from prp_ingresos_descuadrados`) y para un aviso en la UI.
-- Se listan los dos sentidos porque los dos son un problema: de más significa
-- que un cargo está marcado como pagado con dinero que no entró; de menos, que
-- hay dinero recibido sin asignar a ningún cargo.
create or replace view public.prp_ingresos_descuadrados as
select
  i.id                                as ingreso_id,
  i.fecha,
  i.importe,
  i.contrato_id,
  con.folio                           as contrato_folio,
  con.locales_display,
  con.arrendatario_nombre,
  coalesce(a.total_aplicado, 0)       as total_aplicado,
  coalesce(a.total_aplicado, 0) - i.importe as diferencia,
  a.n_aplicaciones,
  case when coalesce(a.total_aplicado, 0) > i.importe + 0.01
       then 'SOBRE_APLICADO' else 'PARCIALMENTE_APLICADO' end as problema
from public.ingresos i
left join lateral (
  select sum(ap.importe_aplicado) total_aplicado, count(*) n_aplicaciones
    from public.aplicaciones_pago ap where ap.ingreso_id = i.id
) a on true
left join public.prp_contratos con on con.id = i.contrato_id
where i.importe is not null
  and a.n_aplicaciones > 0
  and abs(coalesce(a.total_aplicado, 0) - i.importe) > 0.01;

comment on view public.prp_ingresos_descuadrados is
  'Ingresos cuya suma de aplicaciones_pago no coincide con el importe del depósito.';

grant select on public.prp_ingresos_descuadrados to authenticated;

notify pgrst, 'reload schema';
