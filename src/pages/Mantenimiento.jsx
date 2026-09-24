import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wrench, Plus, Camera, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useModuleAudit, logAudit } from '../hooks/useAudit'
import { supabase } from '../lib/supabase'
import { traerVista, fecha, pesos } from '../lib/compras'
import { ESTATUS, TIPOS } from '../lib/mantenimiento'
import { C, Card, GridExpediente, Etiqueta } from '../components/expediente/ExpedienteUI'
import { BadgeEstatus, BadgeTipo, ModalSolicitud } from '../components/mantenimiento/MantenimientoUI'

const ABIERTAS = ['SOLICITADO', 'AUTORIZADO', 'EN_PROCESO']

export default function Mantenimiento() {
  useModuleAudit('MANTENIMIENTO')
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('ABIERTAS')
  const [modal, setModal] = useState(null)   // 'nueva' | solicitud

  const cargar = useCallback(async () => {
    setLoading(true)
    try { setRows(await traerVista('prp_mantenimiento', q => q.order('fecha_solicitud', { ascending: false }))) }
    catch (e) { toast.error('No se pudieron cargar las solicitudes: ' + e.message) }
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const cuenta = (e) => rows.filter(r => r.estatus === e).length
  const urgentes = rows.filter(r => r.tipo === 'URGENTE' && ABIERTAS.includes(r.estatus)).length
  const visibles = rows.filter(r =>
    filtro === 'TODAS' ? true
    : filtro === 'ABIERTAS' ? ABIERTAS.includes(r.estatus)
    : filtro === 'URGENTES' ? r.tipo === 'URGENTE' && ABIERTAS.includes(r.estatus)
    : r.estatus === filtro)

  const eliminar = async (s) => {
    if (!['SOLICITADO', 'RECHAZADO'].includes(s.estatus)) return toast.error('Solo se eliminan solicitudes que no se han autorizado')
    if (!window.confirm(`¿Eliminar la solicitud ${s.folio} — ${s.titulo}?`)) return
    const rutas = [...(s.fotos_solicitud || []), ...(s.fotos_resultado || [])].map(f => f.path)
    const { error } = await supabase.from('mantenimiento_solicitudes').delete().eq('id', s.id)
    if (error) return toast.error(error.message)
    if (rutas.length) await supabase.storage.from('ot-evidencias').remove(rutas)
    logAudit({ modulo: 'MANTENIMIENTO', accion: 'ELIMINAR', entidad: 'mantenimiento', entidad_id: s.id, descripcion: `${s.folio} — ${s.titulo}` })
    toast.success('Solicitud eliminada')
    cargar()
  }

  const tiles = [
    ['ABIERTAS', 'Abiertas', rows.filter(r => ABIERTAS.includes(r.estatus)).length, C.primary],
    ['URGENTES', 'Urgentes abiertas', urgentes, C.danger],
    ...Object.entries(ESTATUS).map(([k, v]) => [k, v.label, cuenta(k), v.color]),
    ['TODAS', 'Todas', rows.length, C.muted],
  ]

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1250, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Wrench size={22} color={C.primary} />
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.dark }}>Mantenimiento</h1>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Solicitudes de reparación · Solicitado → Autorizado → En proceso → Cerrado</p>
          </div>
        </div>
        <button onClick={() => setModal('nueva')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: C.primary, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={15} /> Nueva solicitud
        </button>
      </div>

      {/* Contadores = filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 18 }}>
        {tiles.map(([id, label, n, color]) => {
          const on = filtro === id
          return (
            <button key={id} onClick={() => setFiltro(id)} style={{ textAlign: 'left', background: on ? color + '12' : C.surface, border: `1.5px solid ${on ? color : C.border}`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                {id === 'URGENTES' && <AlertTriangle size={11} color={color} />}{label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{n}</div>
            </button>
          )
        })}
      </div>

      <Card>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Cargando…</div> : (
          <GridExpediente
            filas={visibles} ordenInicial={{ key: 'folio', dir: 'desc' }}
            vacio={rows.length ? 'Sin solicitudes con este filtro' : 'Todavía no hay solicitudes. Registra la primera con "Nueva solicitud".'}
            columnas={[
              { key: 'folio', label: 'Folio', nowrap: true, orden: r => r.folio, filtro: r => r.folio, placeholder: 'Folio',
                render: r => <span style={{ fontWeight: 800, fontFamily: 'monospace' }}>{r.folio}</span> },
              { key: 'fecha', label: 'Fecha', nowrap: true, orden: r => r.fecha_solicitud, filtro: r => fecha(r.fecha_solicitud), render: r => fecha(r.fecha_solicitud) },
              { key: 'cat', label: 'Categoría', orden: r => r.categoria_nombre, filtro: r => r.categoria_nombre,
                render: r => <Etiqueta color={r.categoria_color || C.muted}>{r.categoria_nombre}</Etiqueta> },
              { key: 'tipo', label: 'Tipo', orden: r => ['URGENTE', 'NO_PLANEADO', 'PROGRAMADO'].indexOf(r.tipo), filtro: r => TIPOS[r.tipo]?.label,
                render: r => <BadgeTipo t={r.tipo} /> },
              { key: 'titulo', label: 'Qué reparar', orden: r => r.titulo, filtro: r => `${r.titulo} ${r.ubicacion || ''}`,
                render: r => (
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.titulo}</div>
                    {r.ubicacion && <div style={{ fontSize: 11, color: C.muted }}>{r.ubicacion}</div>}
                  </div>) },
              { key: 'asig', label: 'Asignado a', orden: r => r.asignado_nombre, filtro: r => r.asignado_nombre,
                render: r => r.asignado_nombre ? <span style={{ fontWeight: 600 }}>{r.asignado_nombre}</span> : <span style={{ color: C.border }}>—</span> },
              { key: 'prog', label: 'Programada', nowrap: true, orden: r => r.fecha_programada, render: r => r.fecha_programada ? fecha(r.fecha_programada) : <span style={{ color: C.border }}>—</span> },
              { key: 'fotos', icono: Camera, align: 'center',
                render: r => { const n = (r.n_fotos_solicitud || 0) + (r.n_fotos_resultado || 0); return <span style={{ color: n ? C.success : C.border, fontWeight: 700 }}>{n || '—'}</span> } },
              { key: 'costo', label: 'Costo', align: 'right', mono: true, orden: r => Number(r.gasto_total) || Number(r.costo_real ?? r.costo_estimado) || null,
                render: r => r.con_costo === false ? <span style={{ color: C.muted, fontFamily: 'inherit' }}>Sin costo</span>
                  : Number(r.gasto_total) > 0 ? pesos(r.gasto_total)
                  : r.costo_real != null ? pesos(r.costo_real)
                  : r.costo_estimado != null ? <span style={{ color: C.muted }}>~{pesos(r.costo_estimado)}</span> : <span style={{ color: C.border }}>—</span> },
              { key: 'est', label: 'Estatus', orden: r => ['SOLICITADO', 'AUTORIZADO', 'EN_PROCESO', 'CERRADO', 'RECHAZADO'].indexOf(r.estatus), filtro: r => ESTATUS[r.estatus]?.label,
                render: r => <BadgeEstatus e={r.estatus} /> },
            ]}
            acciones={{
              onVer: r => navigate(`/mantenimiento/${r.id}`),
              onEditar: r => ['SOLICITADO', 'RECHAZADO'].includes(r.estatus) ? setModal(r) : navigate(`/mantenimiento/${r.id}`),
              onEliminar: eliminar,
              titulos: { ver: 'Ver solicitud', editar: 'Editar solicitud', eliminar: 'Eliminar solicitud' },
            }}
          />
        )}
      </Card>

      {modal && (
        <ModalSolicitud
          solicitud={modal === 'nueva' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={id => { setModal(null); modal === 'nueva' ? navigate(`/mantenimiento/${id}`) : cargar() }}
        />
      )}
    </div>
  )
}
