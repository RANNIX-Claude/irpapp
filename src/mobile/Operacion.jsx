import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { hoyISO, dinero, fecha, fechaCorta, Avatar, Etiqueta, Filas, Llamar, Correo, Galeria, COLOR, useFirmadas, Cargando } from './kit'
import Lista from './Lista'

// ── Personal: mosaico con fotos y quién está hoy ────────────────────────────
const enriquecerAsistencia = async filas => {
  const nums = filas.map(f => f.numero_empleado).filter(Boolean)
  if (!nums.length) return filas
  const { data } = await supabase.from('prp_asistencia').select('numero_empleado,estado').eq('fecha', hoyISO()).in('numero_empleado', nums)
  const hoy = Object.fromEntries((data || []).map(a => [a.numero_empleado, a.estado]))
  return filas.map(f => ({ ...f, hoy: hoy[f.numero_empleado] || null }))
}
const colorAsist = e => /falta/i.test(e || '') ? COLOR.rojo : /retard/i.test(e || '') ? COLOR.ambar : COLOR.verde

export const Personal = () => (
  <Lista vista="prp_empleados" titulo="Personal" columnas={2}
    buscar={['nombre_completo', 'puesto', 'area', 'numero_empleado']}
    orden={{ col: 'nombre_completo', asc: true }}
    filtros={[
      { id: 'activos', label: 'Activos', aplicar: q => q.eq('estado_id', 'ACTIVO') },
      { id: 'todos', label: 'Todos', aplicar: q => q },
    ]}
    enriquecer={enriquecerAsistencia}
    tarjeta={(e, abrir) => (
      <button onClick={abrir} style={{ width: '100%', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center', background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: '14px 8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <div style={{ position: 'relative' }}>
          <Avatar src={e.foto_url} nombre={e.nombre_completo} size={72} radio={36} />
          {e.hoy && <span title={e.hoy} style={{ position: 'absolute', right: 0, bottom: 2, width: 16, height: 16, borderRadius: 99, background: colorAsist(e.hoy), border: '2px solid white' }} />}
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{e.nombre_completo}</div>
        <div style={{ fontSize: 12, color: COLOR.gris }}>{e.puesto || e.area || '—'}</div>
      </button>
    )}
    detalle={e => ({
      titulo: e.nombre_completo, subtitulo: [e.puesto, e.area].filter(Boolean).join(' · '),
      contenido: <>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 10px' }}><Avatar src={e.foto_url} nombre={e.nombre_completo} size={110} radio={55} /></div>
        {e.hoy && <div style={{ textAlign: 'center', marginBottom: 8 }}><Etiqueta texto={`Hoy: ${e.hoy}`} color={colorAsist(e.hoy)} /></div>}
        <Filas filas={[
          ['No. empleado', e.numero_empleado], ['Departamento', e.departamento], ['Ingreso', e.fecha_ingreso ? fecha(e.fecha_ingreso) : null],
          ['Antigüedad', e.dias_antiguedad != null ? `${Math.floor(e.dias_antiguedad / 365)} años ${Math.floor((e.dias_antiguedad % 365) / 30)} meses` : null],
          ['Horario', e.horario_trabajo], ['Descanso', e.dia_descanso], ['Contratación', e.tipo_contrato_nombre],
          ['Contrato vence', e.contrato_fin ? fecha(e.contrato_fin) : null], ['Celular', <Llamar tel={e.celular} />], ['Correo', <Correo mail={e.email} />],
        ]} />
      </>,
    })} />
)

// ── Mantenimiento: solicitudes con fotos ────────────────────────────────────
const colorEst = { SOLICITADO: COLOR.ambar, AUTORIZADO: COLOR.azul, EN_PROCESO: COLOR.morado, CERRADO: COLOR.verde, RECHAZADO: COLOR.gris }
const nombreEst = { SOLICITADO: 'Por autorizar', AUTORIZADO: 'Autorizado', EN_PROCESO: 'En proceso', CERRADO: 'Cerrado', RECHAZADO: 'Rechazado' }
const rutas = j => (j || []).map(f => (typeof f === 'string' ? f : f?.path)).filter(Boolean)

export const Mantenimiento = () => {
  const [params] = useSearchParams()
  const inicial = params.get('vista') === 'autorizacion' ? 'porautorizar' : undefined
  return (
    <Lista vista="prp_mantenimiento" titulo="Mantenimiento" filtroInicial={inicial}
      buscar={['titulo', 'ubicacion', 'folio', 'descripcion']}
      orden={{ col: 'fecha_solicitud', asc: false }}
      filtros={[
        { id: 'abiertas', label: 'Abiertas', aplicar: q => q.in('estatus', ['SOLICITADO', 'AUTORIZADO', 'EN_PROCESO']) },
        { id: 'porautorizar', label: 'Por autorizar', aplicar: q => q.eq('estatus', 'SOLICITADO') },
        { id: 'cerradas', label: 'Cerradas', aplicar: q => q.eq('estatus', 'CERRADO') },
        { id: 'todas', label: 'Todas', aplicar: q => q },
      ]}
      tarjeta={(s, abrir) => (
        <button onClick={abrir} style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', background: 'white', border: '1px solid #E5E7EB', borderLeft: `5px solid ${s.categoria_color || COLOR.gris}`, borderRadius: 14, padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
            <strong style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.titulo}</strong>
            {s.tipo === 'URGENTE' && <Etiqueta texto="Urgente" color={COLOR.rojo} />}
          </div>
          <div style={{ fontSize: 13, color: COLOR.gris, margin: '2px 0 6px' }}>{[s.categoria_nombre, s.ubicacion].filter(Boolean).join(' · ')}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Etiqueta texto={nombreEst[s.estatus] || s.estatus} color={colorEst[s.estatus]} />
            <span style={{ fontSize: 12, color: COLOR.gris }}>{s.folio} · {s.dias} d{rutas(s.fotos_solicitud).length ? ` · 📷 ${rutas(s.fotos_solicitud).length}` : ''}</span>
          </div>
        </button>
      )}
      detalle={s => ({
        titulo: s.titulo, subtitulo: `${s.folio} · ${nombreEst[s.estatus] || s.estatus}`,
        contenido: <>
          <Filas filas={[
            ['Categoría', s.categoria_nombre], ['Tipo', s.tipo], ['Ubicación', s.ubicacion], ['Descripción', s.descripcion], ['Solicitó', s.solicitante_nombre],
            ['Fecha', fecha(s.fecha_solicitud)], ['Asignado a', s.asignado_nombre || s.asignado_texto], ['Teléfono', <Llamar tel={s.asignado_telefono} />],
            ['Costo estimado', s.costo_estimado ? dinero(s.costo_estimado) : null], ['Gasto real', s.gasto_total > 0 ? dinero(s.gasto_total) : null],
            ['Resultado', s.resultado], ['Motivo rechazo', s.motivo_rechazo],
          ]} />
          {rutas(s.fotos_solicitud).length > 0 && <><Sub>Fotos de la solicitud</Sub><Galeria bucket="ot-evidencias" rutas={rutas(s.fotos_solicitud)} /></>}
          {rutas(s.fotos_resultado).length > 0 && <><Sub>Fotos del resultado</Sub><Galeria bucket="ot-evidencias" rutas={rutas(s.fotos_resultado)} /></>}
        </>,
      })} />
  )
}
const Sub = ({ children }) => <div style={{ margin: '14px 0 6px', fontSize: 12, fontWeight: 800, color: COLOR.gris, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</div>

// ── Proyectos: portada y avance ─────────────────────────────────────────────
const colorProy = { PENDIENTE: COLOR.gris, EN_PROCESO: COLOR.azul, PAUSADO: COLOR.ambar, COMPLETADO: COLOR.verde, CANCELADO: COLOR.rojo }

function Portada({ p }) {
  const [u] = useFirmadas('proyectos-avances', p.foto_portada_url ? [p.foto_portada_url] : [])
  return u ? <img src={u} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
    : <div style={{ height: 120, background: `linear-gradient(135deg, ${COLOR.azulOscuro}, ${COLOR.azul})` }} />
}

function Avances({ proyectoId }) {
  const [items, setItems] = useState(null)
  useEffect(() => {
    supabase.from('proyecto_avances').select('*, fotos:proyecto_avance_fotos(*)').eq('proyecto_id', proyectoId).order('fecha', { ascending: false }).limit(10)
      .then(({ data }) => setItems(data || []))
  }, [proyectoId])
  if (!items) return <Cargando />
  if (!items.length) return <div style={{ fontSize: 13, color: COLOR.gris, padding: '8px 0' }}>Sin avances registrados.</div>
  return items.map(a => (
    <div key={a.id} style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong style={{ fontSize: 14 }}>{a.descripcion_corta}</strong>{a.porcentaje_avance != null && <Etiqueta texto={`${a.porcentaje_avance}%`} color={a.porcentaje_avance >= 100 ? COLOR.verde : COLOR.azul} />}</div>
      <div style={{ fontSize: 12, color: COLOR.gris, margin: '2px 0 6px' }}>{fecha(a.fecha)}</div>
      {a.descripcion_larga && <p style={{ fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 }}>{a.descripcion_larga}</p>}
      <Galeria bucket="proyectos-avances" rutas={(a.fotos || []).map(f => f.foto_url)} alto={96} />
    </div>
  ))
}

export const Proyectos = () => (
  <Lista vista="proyectos" titulo="Proyectos" columnas={2}
    buscar={['nombre', 'descripcion', 'proveedor_nombre']}
    orden={{ col: 'created_at', asc: false }}
    filtros={[
      { id: 'activos', label: 'Activos', aplicar: q => q.in('estado', ['PENDIENTE', 'EN_PROCESO', 'PAUSADO']) },
      { id: 'terminados', label: 'Terminados', aplicar: q => q.eq('estado', 'COMPLETADO') },
      { id: 'todos', label: 'Todos', aplicar: q => q },
    ]}
    tarjeta={(p, abrir) => (
      <button onClick={abrir} style={{ width: '100%', padding: 0, overflow: 'hidden', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', background: 'white', border: '1px solid #E5E7EB', borderRadius: 16 }}>
        <Portada p={p} />
        <div style={{ padding: '8px 10px 10px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.nombre}</div>
          <div style={{ margin: '6px 0 4px' }}><Etiqueta texto={(p.estado || '').replace('_', ' ')} color={colorProy[p.estado]} /></div>
          <div style={{ fontSize: 12, color: COLOR.gris }}>{p.presupuesto_total != null ? dinero(p.presupuesto_total) : ''}</div>
        </div>
      </button>
    )}
    detalle={p => ({
      titulo: p.nombre, subtitulo: (p.estado || '').replace('_', ' '),
      contenido: <>
        <Filas filas={[['Descripción', p.descripcion], ['Proveedor', p.proveedor_nombre], ['Presupuesto', p.presupuesto_total != null ? dinero(p.presupuesto_total) : null], ['Inicio', p.fecha_inicio ? fecha(p.fecha_inicio) : null], ['Fin estimado', p.fecha_fin_estimada ? fecha(p.fecha_fin_estimada) : null], ['Fin real', p.fecha_fin_real ? fecha(p.fecha_fin_real) : null], ['Notas', p.notas]]} />
        <Sub>Avances</Sub>
        <Avances proyectoId={p.id} />
      </>,
    })} />
)

// ── Feed: lo que pasa en la plaza, con fotos ────────────────────────────────
const CATS = { MANTENIMIENTO: ['🔧', COLOR.ambar], MEJORA: ['✨', COLOR.morado], OPERACION: ['⚙️', COLOR.azul], PROYECTO: ['🏗️', COLOR.verde], INCIDENCIA: ['🚨', COLOR.rojo] }

function TarjetaFeed({ p }) {
  const urls = useFirmadas('ot-evidencias', p.fotos || [])
  const [emoji, color] = CATS[p.categoria] || CATS.OPERACION
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>
      {urls.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: urls.length === 1 ? '1fr' : '1fr 1fr', gap: 2 }}>
          {urls.slice(0, 4).map(u => <img key={u} src={u} alt="" style={{ width: '100%', height: urls.length === 1 ? 220 : 120, objectFit: 'cover' }} />)}
        </div>
      )}
      <div style={{ padding: '10px 14px 12px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <Etiqueta texto={`${emoji} ${p.categoria || 'Aviso'}`} color={color} />
          <span style={{ fontSize: 12, color: COLOR.gris }}>{fechaCorta(p.fecha)}{p.autor_nombre ? ` · ${p.autor_nombre}` : ''}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{p.titulo}</div>
        {p.descripcion && <div style={{ fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 1.5 }}>{p.descripcion}</div>}
      </div>
    </div>
  )
}

export const Feed = () => (
  <Lista vista="prp_publicaciones" titulo="Publicaciones"
    buscar={['titulo', 'descripcion', 'autor_nombre']}
    orden={{ col: 'fecha', asc: false }}
    tarjeta={p => <TarjetaFeed p={p} />}
    detalle={() => null} />
)

