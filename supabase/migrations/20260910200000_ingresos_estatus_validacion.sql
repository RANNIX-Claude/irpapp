-- Estatus de validación del ingreso.
--
-- Cada renglón de `ingresos` debe corresponder a un movimiento real de dinero:
-- un depósito, una transferencia o una entrega de efectivo. Hasta hoy no había
-- forma de distinguir el ingreso que ya se cotejó contra el estado de cuenta
-- del que solo se capturó. Sin ese dato no se puede pedir "los validados".
--
-- Juego de valores (tres, no dos): POR_VALIDAR / VALIDADO / OBSERVADO.
-- Dos estados obligarían a dejar en POR_VALIDAR tanto lo que nadie ha revisado
-- como lo que sí se revisó y NO cuadró, que son cosas distintas: lo segundo
-- necesita que alguien lo corrija, lo primero solo que alguien lo mire.
-- OBSERVADO es el que se revisó y tiene un problema (no aparece en el banco,
-- el monto no coincide, falta el comprobante legible).
--
-- Poblado inicial: TODOS los ingresos existentes arrancan en POR_VALIDAR,
-- incluidos los seis que ya traen `comprobante_url`. Tener el comprobante
-- adjunto no es lo mismo que haberlo cotejado contra el banco, que es lo que
-- VALIDADO significa aquí; marcar esos seis como validados sería afirmar una
-- revisión que nadie hizo. Es más barato validar seis a mano que descubrir
-- después que el estatus miente.

alter table public.ingresos
  add column if not exists estatus_validacion text not null default 'POR_VALIDAR',
  add column if not exists validado_por       text,
  add column if not exists validado_en        timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ingresos'::regclass and conname = 'ingresos_estatus_validacion_chk'
  ) then
    alter table public.ingresos
      add constraint ingresos_estatus_validacion_chk
      check (estatus_validacion in ('POR_VALIDAR', 'VALIDADO', 'OBSERVADO'));
  end if;
end $$;

comment on column public.ingresos.estatus_validacion is
  'Cotejo del ingreso contra el banco. POR_VALIDAR: capturado, nadie lo ha revisado. '
  'VALIDADO: corresponde a un depósito, transferencia o entrega de efectivo verificada. '
  'OBSERVADO: se revisó y no cuadra — requiere corrección.';
comment on column public.ingresos.validado_por is
  'Correo del usuario que dejó el ingreso en VALIDADO. Se limpia al salir de ese estatus.';
comment on column public.ingresos.validado_en is
  'Momento en que se marcó VALIDADO. Se limpia al salir de ese estatus.';

-- Índice para el filtro "los que faltan por validar", que es la consulta de uso diario.
create index if not exists idx_ingresos_estatus_validacion
  on public.ingresos (estatus_validacion);

-- La vista se reescribe completa con las columnas que ya tenía más las tres
-- nuevas. No se quita ninguna: hay código que las usa (renta_mensual, local_id,
-- propietario y es_principal son alias que el frontend espera). Las nuevas van
-- al final porque CREATE OR REPLACE VIEW solo admite agregar columnas después
-- de las existentes, nunca intercalarlas.
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
    i.validado_en
   from ingresos i
     left join prp_contratos con on con.id = i.contrato_id;

notify pgrst, 'reload schema';
