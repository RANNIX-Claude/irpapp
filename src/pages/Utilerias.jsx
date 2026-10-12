import { useState, useEffect, useMemo } from 'react'
import { MessageSquare, ChevronDown, ChevronRight, Bot, User, Clock, Wrench, AlertCircle, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const C = {
  primary: '#0A66C2', dark: '#1A3C5E', gold: '#E8A020',
  success: '#057642', danger: '#B24020', warning: '#F59E0B',
  bg: '#F0F4F8', surface: '#FFFFFF', border: '#E2E8F0',
  text: '#1E293B', muted: '#64748B', light: '#F8FAFC',
}

const fmtFecha = s => s ? new Date(s).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : ''
const fmtHora  = s => s ? new Date(s).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
const mesLabel = s => s ? new Date(s).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase()) : ''

const CANAL_COLOR = { web: '#3B82F6', movil: '#8B5CF6', voz: '#10B981' }
const ROL_COLOR   = { superadmin: '#E8A020', admin: '#0A66C2', asistente: '#8B5CF6', propietario: '#057642', finanzas: '#10B981' }

export default function Utilerias() {
  const [todasConvs, setTodasConvs]     = useState([])
  const [usuarios, setUsuarios]          = useState({})   // { uuid: { nombre, rol_id } }
  const [loading, setLoading]            = useState(true)
  const [abierta, setAbierta]            = useState(null)
  const [mensajes, setMensajes]          = useState({})
  const [loadingMsg, setLoadingMsg]      = useState(null)

  // Filtros
  const [mesFiltro, setMesFiltro]        = useState('')
  const [canalFiltro, setCanalFiltro]    = useState('')
  const [usuarioFiltro, setUsuarioFiltro] = useState('')
  const [busqueda, setBusqueda]          = useState('')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)

    const [convRes, usrRes] = await Promise.all([
      supabase
        .from('agente_conversaciones')
        .select('id, titulo, rol, canal, turnos, creada_en, actualizada_en, usuario_id')
        .order('creada_en', { ascending: false })
        .limit(500),
      supabase
        .from('irp_usuarios')
        .select('id, nombre, apellido, rol_id')
        .order('nombre'),
    ])

    const mapa = {}
    for (const u of (usrRes.data || [])) {
      mapa[u.id] = { nombre: `${u.nombre || ''} ${u.apellido || ''}`.trim(), rol_id: u.rol_id }
    }

    setTodasConvs(convRes.data || [])
    setUsuarios(mapa)
    setLoading(false)
  }

  const verMensajes = async (conv) => {
    if (abierta === conv.id) { setAbierta(null); return }
    setAbierta(conv.id)
    if (mensajes[conv.id]) return
    setLoadingMsg(conv.id)
    const { data } = await supabase
      .from('agente_mensajes')
      .select('id, turno, pregunta, respuesta, herramientas, propuestas, modelo, duracion_ms, creada_en, error')
      .eq('conversacion_id', conv.id)
      .order('turno')
    setMensajes(m => ({ ...m, [conv.id]: data || [] }))
    setLoadingMsg(null)
  }

  // Meses disponibles (de todas las convs)
  const meses = useMemo(() =>
    [...new Set(todasConvs.map(c => (c.creada_en || '').slice(0, 7)))]
      .filter(Boolean).sort((a, b) => b.localeCompare(a)),
  [todasConvs])

  // Usuarios únicos que tienen conversaciones
  const usuariosConConv = useMemo(() => {
    const ids = [...new Set(todasConvs.map(c => c.usuario_id).filter(Boolean))]
    return ids.map(id => ({ id, ...( usuarios[id] || { nombre: id.slice(0, 8) + '…', rol_id: '' }) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [todasConvs, usuarios])

  // Filtrado
  const conversaciones = useMemo(() => {
    let list = todasConvs
    if (mesFiltro) {
      const [y, m] = mesFiltro.split('-').map(Number)
      const desde = new Date(y, m - 1, 1).getTime()
      const hasta = new Date(y, m, 1).getTime()
      list = list.filter(c => { const t = new Date(c.creada_en).getTime(); return t >= desde && t < hasta })
    }
    if (canalFiltro) list = list.filter(c => c.canal === canalFiltro)
    if (usuarioFiltro) list = list.filter(c => c.usuario_id === usuarioFiltro)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      list = list.filter(c => (c.titulo || '').toLowerCase().includes(q))
    }
    return list
  }, [todasConvs, mesFiltro, canalFiltro, usuarioFiltro, busqueda])

  // Agrupar por día
  const porDia = useMemo(() => {
    const m = {}
    for (const c of conversaciones) {
      const dia = (c.creada_en || '').slice(0, 10)
      if (!m[dia]) m[dia] = []
      m[dia].push(c)
    }
    return m
  }, [conversaciones])
  const dias = Object.keys(porDia).sort((a, b) => b.localeCompare(a))

  const limpiar = () => { setMesFiltro(''); setCanalFiltro(''); setUsuarioFiltro(''); setBusqueda('') }
  const hayFiltros = mesFiltro || canalFiltro || usuarioFiltro || busqueda.trim()

  const nombreUsuario = id => usuarios[id]?.nombre || id?.slice(0, 8) + '…' || '—'

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1040, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MessageSquare size={20} color="white" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>Historial de Conversaciones</h1>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Preguntas y respuestas del Agente Operativo — solo superadmin</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: C.muted }}>{conversaciones.length} conversaciones</span>
          <button onClick={cargar} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, cursor: 'pointer', color: C.primary, fontWeight: 600 }}>
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Buscar por título */}
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 150 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar en títulos…"
              style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.text, boxSizing: 'border-box', outline: 'none' }} />
          </div>

          {/* Filtro usuario */}
          <select value={usuarioFiltro} onChange={e => setUsuarioFiltro(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, color: C.text, cursor: 'pointer', flex: '1 1 160px' }}>
            <option value="">— Todos los usuarios —</option>
            {usuariosConConv.map(u => (
              <option key={u.id} value={u.id}>{u.nombre}{u.rol_id ? ` (${u.rol_id})` : ''}</option>
            ))}
          </select>

          {/* Filtro mes */}
          <select value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, color: C.text, cursor: 'pointer', flex: '1 1 140px' }}>
            <option value="">— Todos los meses —</option>
            {meses.map(m => <option key={m} value={m}>{mesLabel(m + '-01T12:00:00')}</option>)}
          </select>

          {/* Filtro canal */}
          <select value={canalFiltro} onChange={e => setCanalFiltro(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, color: C.text, cursor: 'pointer' }}>
            <option value="">— Canal —</option>
            <option value="web">Web</option>
            <option value="movil">Móvil</option>
            <option value="voz">Voz</option>
          </select>

          {hayFiltros && (
            <button onClick={limpiar}
              style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.light, fontSize: 13, cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={13} /> Limpiar
            </button>
          )}
        </div>

        {/* Chips de usuario cuando hay filtro activo */}
        {usuarioFiltro && (
          <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.muted }}>Viendo:</span>
            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: C.primary + '15', color: C.primary }}>
              {nombreUsuario(usuarioFiltro)}
            </span>
          </div>
        )}
      </div>

      {/* Lista agrupada por día */}
      {loading
        ? <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Cargando historial…</div>
        : dias.length === 0
        ? <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Sin conversaciones{hayFiltros ? ' para los filtros seleccionados' : ''}</div>
        : dias.map(dia => (
          <div key={dia} style={{ marginBottom: 28 }}>
            {/* Separador de día */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ height: 1, flex: 1, background: C.border }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                {fmtFecha(dia + 'T12:00:00')} · {porDia[dia].length} conversación{porDia[dia].length !== 1 ? 'es' : ''}
              </span>
              <div style={{ height: 1, flex: 1, background: C.border }} />
            </div>

            {porDia[dia].map(conv => {
              const usr = usuarios[conv.usuario_id]
              return (
                <div key={conv.id} style={{ marginBottom: 8 }}>
                  {/* Fila resumen */}
                  <div onClick={() => verMensajes(conv)}
                    style={{ background: C.surface, border: `1px solid ${abierta === conv.id ? C.primary : C.border}`,
                      borderRadius: abierta === conv.id ? '10px 10px 0 0' : 10,
                      padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'border-color .15s' }}>
                    <div style={{ color: abierta === conv.id ? C.primary : C.muted }}>
                      {abierta === conv.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    <Bot size={16} color={C.primary} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.titulo || '(sin título)'}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <User size={10} />
                        <span>{usr ? `${usr.nombre}` : (conv.usuario_id?.slice(0, 8) || '—')}</span>
                        {usr?.rol_id && <span style={{ color: ROL_COLOR[usr.rol_id] || C.muted }}>· {usr.rol_id}</span>}
                        <span>· {conv.turnos} {conv.turnos === 1 ? 'mensaje' : 'mensajes'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      {conv.canal && (
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                          background: (CANAL_COLOR[conv.canal] || C.muted) + '18',
                          color: CANAL_COLOR[conv.canal] || C.muted }}>
                          {conv.canal}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={11} /> {fmtHora(conv.creada_en)}
                      </span>
                    </div>
                  </div>

                  {/* Panel de mensajes expandido */}
                  {abierta === conv.id && (
                    <div style={{ border: `1px solid ${C.primary}`, borderTop: 'none', borderRadius: '0 0 10px 10px',
                      background: '#F8FBFF', padding: '0 16px 16px' }}>
                      {loadingMsg === conv.id
                        ? <div style={{ padding: '20px 0', textAlign: 'center', color: C.muted, fontSize: 13 }}>Cargando mensajes…</div>
                        : (mensajes[conv.id] || []).map((msg, idx, arr) => (
                          <div key={msg.id} style={{ marginTop: 16 }}>
                            {/* Pregunta */}
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'flex-end', marginBottom: 8 }}>
                              <div style={{ maxWidth: '75%', background: C.primary, color: 'white',
                                borderRadius: '14px 14px 4px 14px', padding: '10px 14px', fontSize: 13, lineHeight: 1.5 }}>
                                <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                  {msg.pregunta || '—'}
                                </pre>
                              </div>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.primary + '20',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                                <User size={14} color={C.primary} />
                              </div>
                            </div>

                            {/* Respuesta */}
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.dark + '15',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                                <Bot size={14} color={C.dark} />
                              </div>
                              <div style={{ maxWidth: '85%' }}>
                                <div style={{ background: C.surface, border: `1px solid ${C.border}`,
                                  borderRadius: '4px 14px 14px 14px', padding: '10px 14px', fontSize: 13, lineHeight: 1.6, color: C.text }}>
                                  <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {msg.respuesta || (msg.error ? `⚠️ ${msg.error}` : '—')}
                                  </pre>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                  {msg.duracion_ms && (
                                    <span style={{ fontSize: 10, color: C.muted }}>{(msg.duracion_ms / 1000).toFixed(1)}s</span>
                                  )}
                                  {msg.error && (
                                    <span style={{ fontSize: 10, color: C.danger, display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <AlertCircle size={10} /> error
                                    </span>
                                  )}
                                  {Array.isArray(msg.herramientas) && msg.herramientas.length > 0 && (
                                    <span style={{ fontSize: 10, color: C.muted, display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <Wrench size={10} />
                                      {msg.herramientas.map(h => h?.tool || h?.name || JSON.stringify(h)).join(', ')}
                                    </span>
                                  )}
                                  {msg.propuestas && (
                                    <span style={{ fontSize: 10, color: C.success, fontWeight: 600 }}>propuesta de acción</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {idx < arr.length - 1 && (
                              <div style={{ height: 1, background: C.border, margin: '10px 0 0' }} />
                            )}
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))
      }
    </div>
  )
}
