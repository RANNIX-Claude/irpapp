import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { hoyISO, dinero, fecha, fechaCorta, Avatar, Etiqueta, Filas, Llamar, Correo, Galeria, Barra, COLOR, botonGrande } from './kit'
import Lista, { TarjetaFila } from './Lista'

// Consultas de solo lectura, con fotos y mosaicos. Una pantalla = una vista `prp_*`.

const colorContrato = { VIGENTE: COLOR.verde, VENCIDO: COLOR.rojo, RENOVADO: COLOR.morado, RESCISION: COLOR.ambar, CANCELADO: COLOR.gris, TERMINADO: COLOR.gris }
const colorDias = d => d == null ? COLOR.gris : d < 0 ? COLOR.rojo : d <= 60 ? COLOR.ambar : COLOR.verde

// ── Contratos: mosaico con el logo de cada negocio ──────────────────────────
const logosPorContrato = async filas => {
  if (!filas.length) return filas
  const ids = filas.map(f => f.id), arrs = [...new Set(filas.map(f => f.arrendatario_id).filter(Boolean))]
  const [c, a] = await Promise.all([
    supabase.from('contratos').select('id,logo_url').in('id', ids),
    supabase.from('arrendatarios').select('id,logo_url').in('id', arrs),
  ])
  const lc = Object.fromEntries((c.data || []).map(x => [x.id, x.logo_url])), la = Object.fromEntries((a.data || []).map(x => [x.id, x.logo_url]))
  return filas.map(f => ({ ...f, logo: lc[f.id] || la[f.arrendatario_id] || null }))
}

export const Contratos = () => {
  const navigate = useNavigate()
  return (
    <Lista vista="prp_contratos" titulo="Contratos" columnas={2}
      buscar={['arrendatario_nombre', 'nombre_negocio', 'numero_contrato', 'locales_display', 'giro_autorizado']}
      orden={{ col: 'dias_restantes', asc: true }}
      filtros={[
        { id: 'vigentes', label: 'Vigentes', aplicar: q => q.eq('estatus', 'VIGENTE') },
        { id: 'porvencer', label: 'Por vencer', aplicar: q => q.eq('estatus', 'VIGENTE').gte('dias_restantes', 0).lte('dias_restantes', 90) },
        { id: 'todos', label: 'Todos', aplicar: q => q },
      ]}
      enriquecer={logosPorContrato}
      tarjeta={(c, abrir) => {
        const nombre = c.nombre_negocio || c.arrendatario_nombre
        return (
          <button onClick={abrir} style={{ width: '100%', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center', background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: '14px 8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Avatar src={c.logo} nombre={nombre} size={64} radio={18} color={colorContrato[c.estatus]} />
            <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{nombre}</div>
            <div style={{ fontSize: 12, color: COLOR.gris }}>{c.locales_display || '—'}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: COLOR.azulOscuro }}>{dinero(c.renta_mensual)}</div>
            <Etiqueta texto={c.estatus === 'VIGENTE' && c.dias_restantes != null ? `${c.dias_restantes} d` : c.estatus} color={c.estatus === 'VIGENTE' ? colorDias(c.dias_restantes) : colorContrato[c.estatus]} />
          </button>
        )
      }}
      detalle={(c, cerrar) => ({
        titulo: c.nombre_negocio || c.arrendatario_nombre, subtitulo: `${c.folio} · ${c.locales_display || '—'}`,
        contenido: (
          <>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
              <Avatar src={c.logo} nombre={c.nombre_negocio || c.arrendatario_nombre} size={64} radio={18} />
              <div><div style={{ fontSize: 22, fontWeight: 800 }}>{dinero(c.renta_mensual)}</div><Etiqueta texto={c.estatus} color={colorContrato[c.estatus]} /></div>
            </div>
            <Filas filas={[
              ['Arrendatario', c.arrendatario_nombre], ['Giro', c.giro_autorizado], ['Vigencia', `${fecha(c.fecha_inicio)} → ${fecha(c.fecha_fin)}`],
              ['Días restantes', c.dias_restantes], ['Depósito', c.deposito_garantia ? dinero(c.deposito_garantia) : null], ['Día de pago', c.dia_pago],
              ['Penalización', c.penalizacion_pct != null ? `${c.penalizacion_pct}%` : null], ['Fiador', c.fiador_nombre],
              ['Teléfono', <Llamar tel={c.arrendatario_telefono} />], ['Correo', <Correo mail={c.arrendatario_email} />],
            ]} />
            <button onClick={() => { cerrar(); navigate(`/contratos/${c.id}`) }} style={{ ...botonGrande(), marginTop: 14 }}>Ver expediente y pagos</button>
          </>
        ),
      })} />
  )
}

// ── Locales: mapa en mosaico, verde ocupado / gris disponible ───────────────
export const Locales = () => (
  <Lista vista="prp_mapa_locales" titulo="Locales" columnas={3}
    buscar={['clave', 'inquilino', 'giro']}
    orden={{ col: 'clave', asc: true }}
    filtros={[
      { id: 'todos', label: 'Todos', aplicar: q => q },
      { id: 'ocupados', label: 'Ocupados', aplicar: q => q.eq('estatus', 'OCUPADO') },
      { id: 'disponibles', label: 'Disponibles', aplicar: q => q.eq('estatus', 'DISPONIBLE') },
    ]}
    tarjeta={(l, abrir) => {
      const ocupado = l.estatus === 'OCUPADO'
      const color = ocupado ? (l.dias_para_vencer != null && l.dias_para_vencer <= 60 ? COLOR.ambar : COLOR.verde) : COLOR.gris
      return (
        <button onClick={abrir} style={{ width: '100%', aspectRatio: '1', fontFamily: 'inherit', cursor: 'pointer', border: `2px solid ${color}`, background: color + '1A', borderRadius: 14, padding: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color }}>{l.clave}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.15, maxHeight: 24, overflow: 'hidden' }}>{ocupado ? l.inquilino : 'Disponible'}</div>
        </button>
      )
    }}
    detalle={l => ({
      titulo: `Local ${l.clave}`, subtitulo: l.estatus === 'OCUPADO' ? 'Ocupado' : 'Disponible',
      contenido: <Filas filas={[
        ['Inquilino', l.inquilino], ['Giro', l.giro], ['Renta', l.renta_mensual ? dinero(l.renta_mensual) : (l.renta_base ? `${dinero(l.renta_base)} (base)` : null)],
        ['Superficie', l.metros_cuadrados ? `${l.metros_cuadrados} m²` : null], ['Vigencia', l.fecha_fin ? `${fecha(l.fecha_inicio)} → ${fecha(l.fecha_fin)}` : null],
        ['Vence en', l.dias_para_vencer != null ? `${l.dias_para_vencer} días` : null], ['Teléfono', <Llamar tel={l.telefono} />], ['Correo', <Correo mail={l.email} />],
      ]} />,
    })} />
)

// ── Arrendatarios ───────────────────────────────────────────────────────────
export const Arrendatarios = () => (
  <Lista vista="arrendatarios" titulo="Arrendatarios"
    buscar={['locatario', 'nombre_negocio', 'rfc', 'email']}
    orden={{ col: 'locatario', asc: true }}
    tarjeta={(a, abrir) => <TarjetaFila onClick={abrir} izquierda={<Avatar src={a.logo_url} nombre={a.nombre_negocio || a.locatario} />}
      titulo={a.nombre_negocio || a.locatario} subtitulo={a.nombre_negocio ? a.locatario : a.telefono} />}
    detalle={a => ({
      titulo: a.nombre_negocio || a.locatario, subtitulo: a.tipo_persona,
      contenido: <Filas filas={[['Titular', a.locatario], ['RFC', a.rfc], ['Teléfono', <Llamar tel={a.telefono} />], ['Correo', <Correo mail={a.email} />], ['Representante', a.representante_legal], ['Domicilio fiscal', a.domicilio_fiscal]]} />,
    })} />
)

// ── Ingresos ────────────────────────────────────────────────────────────────
const estatusIng = { VALIDADO: ['Validado', COLOR.verde], POR_VALIDAR: ['Por validar', COLOR.ambar], OBSERVADO: ['Observado', COLOR.rojo] }
export const Ingresos = () => (
  <Lista vista="prp_ingresos" titulo="Ingresos"
    buscar={['arrendatario_nombre', 'folio', 'concepto_origen', 'nota', 'locales_display']}
    orden={{ col: 'fecha', asc: false }}
    filtros={[
      { id: 'todos', label: 'Todos', aplicar: q => q },
      { id: 'porvalidar', label: 'Por validar', aplicar: q => q.eq('estatus_validacion', 'POR_VALIDAR') },
      { id: 'validados', label: 'Validados', aplicar: q => q.eq('estatus_validacion', 'VALIDADO') },
    ]}
    tarjeta={(i, abrir) => {
      const [t, c] = estatusIng[i.estatus_validacion] || [i.estatus_validacion, COLOR.gris]
      return <TarjetaFila onClick={abrir} titulo={i.arrendatario_nombre || i.concepto_origen || i.tipo} subtitulo={`${fechaCorta(i.fecha)} · ${i.locales_display || i.tipo || '—'}`} derecha={dinero(i.importe)} etiqueta={<Etiqueta texto={t} color={c} />} />
    }}
    detalle={i => ({
      titulo: dinero(i.importe), subtitulo: i.arrendatario_nombre || i.concepto_origen,
      contenido: <>
        <Filas filas={[['Fecha', fecha(i.fecha)], ['Local(es)', i.locales_display], ['Contrato', i.folio], ['Tipo', i.tipo], ['Origen', i.origen], ['Concepto', i.concepto_origen], ['Estatus', i.estatus_validacion], ['Validó', i.validado_por], ['Factura', i.factura], ['Nota', i.nota]]} />
        {i.comprobante_url && <div style={{ marginTop: 12 }}><Galeria bucket="facturas-cfdi" rutas={[i.comprobante_url]} /></div>}
      </>,
    })} />
)

// ── Gastos ──────────────────────────────────────────────────────────────────
export const Gastos = () => {
  const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  return (
    <Lista vista="prp_gastos" titulo="Gastos"
      buscar={['descripcion', 'grupo_gasto', 'proveedor_nombre']}
      orden={{ col: 'fecha', asc: false }}
      filtros={[
        { id: '30d', label: '30 días', aplicar: q => q.gte('fecha', hace30) },
        { id: 'todos', label: 'Todos', aplicar: q => q },
      ]}
      tarjeta={(g, abrir) => <TarjetaFila onClick={abrir} titulo={g.proveedor_nombre || g.descripcion} subtitulo={`${fechaCorta(g.fecha)} · ${g.grupo_gasto || '—'}`} derecha={dinero(g.ticket_total ?? g.monto)} />}
      detalle={g => ({
        titulo: dinero(g.ticket_total ?? g.monto), subtitulo: g.proveedor_nombre || g.descripcion,
        contenido: <>
          <Filas filas={[['Fecha', fecha(g.fecha)], ['Proveedor', g.proveedor_nombre], ['Grupo', g.grupo_gasto], ['Descripción', g.descripcion], ['Partidas', g.num_lineas], ['Semana', g.semana]]} />
          {g.ticket_img_url && <div style={{ marginTop: 12 }}><Galeria bucket="tickets-gastos" rutas={[g.ticket_img_url]} /></div>}
        </>,
      })} />
  )
}

// ── Cobranza: lo que falta por cobrar ───────────────────────────────────────
export const Cobranza = () => {
  const hoy = hoyISO()
  return (
    <Lista vista="prp_cartera" titulo="Cobranza"
      buscar={['arrendatario_nombre', 'contrato_folio', 'locales_display', 'concepto']}
      orden={{ col: 'fecha_vencimiento', asc: true }}
      filtros={[
        { id: 'vencidos', label: 'Vencidos', aplicar: q => q.gt('saldo', 0).lt('fecha_vencimiento', hoy) },
        { id: 'pendientes', label: 'Por cobrar', aplicar: q => q.gt('saldo', 0) },
        { id: 'pagados', label: 'Pagados', aplicar: q => q.lte('saldo', 0) },
      ]}
      resumen={(filas, total) => {
        const s = filas.reduce((a, c) => a + (Number(c.saldo) || 0), 0)
        return s > 0 ? <div style={{ background: 'white', border: '1px solid #E5E7EB', borderLeft: `4px solid ${COLOR.rojo}`, borderRadius: 12, padding: '10px 14px', marginBottom: 10, fontSize: 13 }}>Saldo en estos {filas.length}: <strong style={{ fontSize: 17 }}>{dinero(s)}</strong></div> : null
      }}
      tarjeta={(c, abrir) => {
        const venc = c.saldo > 0 && c.fecha_vencimiento < hoy
        const dias = venc ? Math.round((Date.now() - new Date(c.fecha_vencimiento + 'T12:00:00')) / 86400000) : null
        const pct = c.importe ? ((c.total_aplicado || 0) / c.importe) * 100 : 0
        return (
          <button onClick={abrir} style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', background: 'white', border: '1px solid #E5E7EB', borderLeft: `4px solid ${c.saldo <= 0 ? COLOR.verde : venc ? COLOR.rojo : COLOR.ambar}`, borderRadius: 14, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.arrendatario_nombre}</strong>
              <strong style={{ fontSize: 15, color: c.saldo > 0 ? COLOR.rojo : COLOR.verde }}>{dinero(c.saldo > 0 ? c.saldo : c.importe)}</strong>
            </div>
            <div style={{ fontSize: 13, color: COLOR.gris, margin: '2px 0 7px' }}>{c.locales_display} · {c.concepto} {c.periodo_mes ? `${c.periodo_mes}/${c.periodo_anio}` : ''}</div>
            <Barra pct={pct} color={COLOR.verde} alto={6} />
            <div style={{ fontSize: 12, color: venc ? COLOR.rojo : COLOR.gris, marginTop: 5, fontWeight: venc ? 700 : 400 }}>{venc ? `Vencido hace ${dias} días` : `Vence ${fechaCorta(c.fecha_vencimiento)}`}</div>
          </button>
        )
      }}
      detalle={c => ({
        titulo: c.arrendatario_nombre, subtitulo: `${c.locales_display || ''} · ${c.contrato_folio || ''}`,
        contenido: <Filas filas={[['Concepto', c.concepto], ['Periodo', c.periodo_mes ? `${c.periodo_mes}/${c.periodo_anio}` : null], ['Importe', dinero(c.importe)], ['Aplicado', dinero(c.total_aplicado)], ['Saldo', dinero(c.saldo)], ['Vence', fecha(c.fecha_vencimiento)], ['Estado', c.estado], ['Renta mensual', dinero(c.renta_mensual)], ['Descripción', c.descripcion]]} />,
      })} />
  )
}

