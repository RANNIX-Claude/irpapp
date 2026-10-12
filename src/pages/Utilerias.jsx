import { useState, useEffect } from 'react'
import { MessageSquare, ChevronDown, ChevronRight, Bot, User, Clock, Wrench, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'

const C = {
  primary: '#0A66C2', dark: '#1A3C5E', gold: '#E8A020',
  success: '#057642', danger: '#B24020', warning: '#F59E0B',
  bg: '#F0F4F8', surface: '#FFFFFF', border: '#E2E8F0',
  text: '#1E293B', muted: '#64748B', light: '#F8FAFC',
}

const fmtFecha = s => s ? new Date(s).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : ''
const fmtHora  = s => s ? new Date(s).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
const mesLabel = s => s ? new Date(s).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase()) : ''

export default function Utilerias() {
  const { perfil } = useApp()
  const navigate = useNavigate()
  const [conversaciones, setConversaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [abierta, setAbierta] = useState(null)      // id de conversación expandida
  const [mensajes, setMensajes] = useState({})       // { convId: [...] }
  const [loadingMsg, setLoadingMsg] = useState(null)
  const [mesFiltro, setMesFiltro] = useState('')     // 'YYYY-MM' o ''
  const [canalFiltro, setCanalFiltro] = useState('')

  // Solo superadmin
  useEffect(() => {
    if (perfil && perfil.rol_id !== 'superadmin') navigate('/', { replace: true })
  }, [perfil, navigate])

  useEffect(() => {
    cargar()
  }, [mesFiltro, canalFiltro])

  const cargar = async () => {
    setLoading(true)
    let q = supabase
      .from('agente_conversaciones')
      .select('id, titulo, rol, canal, turnos, created_at, actualizada_en, usuario_id')
      .order('created_at', { ascending: false })
      .limit(300)

    if (mesFiltro) {
      const [y, m] = mesFiltro.split('-').map(Number)
      const desde = new Date(y, m - 1, 1).toISOString()
      const hasta = new Date(y, m, 1).toISOString()
      q = q.gte('created_at', desde).lt('created_at', hasta)
    }
    if (canalFiltro) q = q.eq('canal', canalFiltro)

    const { data } = await q
    setConversaciones(data || [])
    setLoading(false)
  }

  const verMensajes = async (conv) => {
    if (abierta === conv.id) { setAbierta(null); return }
    setAbierta(conv.id)
    if (mensajes[conv.id]) return
    setLoadingMsg(conv.id)
    const { data } = await supabase
      .from('agente_mensajes')
      .select('id, turno, pregunta, respuesta, herramientas, propuestas, modelo, duracion_ms, created_at, error')
      .eq('conversacion_id', conv.id)
      .order('turno')
    setMensajes(m => ({ ...m, [conv.id]: data || [] }))
    setLoadingMsg(null)
  }

  // Agrupar por día
  const porDia = {}
  for (const c of conversaciones) {
    const dia = (c.created_at || '').slice(0, 10)
    if (!porDia[dia]) porDia[dia] = []
    porDia[dia].push(c)
  }
  const dias = Object.keys(porDia).sort((a, b) => b.localeCompare(a))

  // Meses únicos para filtro
  const meses = [...new Set(conversaciones.map(c => (c.created_at || '').slice(0, 7)))].sort((a, b) => b.localeCompare(a))

  const CANAL_COLOR = { web: '#3B82F6', movil: '#8B5CF6', voz: '#10B981' }
  const ROL_COLOR   = { superadmin: '#E8A020', admin: '#0A66C2', asistente: '#8B5CF6' }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MessageSquare size={20} color="white" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>Conversaciones del Agente</h1>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Historial de preguntas y respuestas — solo superadmin</p>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: C.muted }}>
          {conversaciones.length} conversaciones
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, color: C.text, cursor: 'pointer' }}>
          <option value="">— Todos los meses —</option>
          {meses.map(m => <option key={m} value={m}>{mesLabel(m + '-01T12:00:00')}</option>)}
        </select>
        <select value={canalFiltro} onChange={e => setCanalFiltro(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, color: C.text, cursor: 'pointer' }}>
          <option value="">— Todos los canales —</option>
          <option value="web">Web</option>
          <option value="movil">Móvil</option>
          <option value="voz">Voz</option>
        </select>
        {(mesFiltro || canalFiltro) && (
          <button onClick={() => { setMesFiltro(''); setCanalFiltro('') }}
            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.light, fontSize: 13, cursor: 'pointer', color: C.muted }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {loading
        ? <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Cargando conversaciones…</div>
        : dias.length === 0
        ? <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Sin conversaciones en este período</div>
        : dias.map(dia => (
          <div key={dia} style={{ marginBottom: 28 }}>
            {/* Encabezado de día */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ height: 1, flex: 1, background: C.border }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                {fmtFecha(dia + 'T12:00:00')}
              </span>
              <div style={{ height: 1, flex: 1, background: C.border }} />
            </div>

            {porDia[dia].map(conv => (
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
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {conv.turnos} {conv.turnos === 1 ? 'mensaje' : 'mensajes'}
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
                    {conv.rol && (
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                        background: (ROL_COLOR[conv.rol] || C.muted) + '18',
                        color: ROL_COLOR[conv.rol] || C.muted }}>
                        {conv.rol}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={11} /> {fmtHora(conv.created_at)}
                    </span>
                  </div>
                </div>

                {/* Panel de mensajes expandido */}
                {abierta === conv.id && (
                  <div style={{ border: `1px solid ${C.primary}`, borderTop: 'none', borderRadius: '0 0 10px 10px',
                    background: '#F8FBFF', padding: '0 16px 16px' }}>
                    {loadingMsg === conv.id
                      ? <div style={{ padding: '20px 0', textAlign: 'center', color: C.muted, fontSize: 13 }}>Cargando mensajes…</div>
                      : (mensajes[conv.id] || []).map(msg => (
                        <div key={msg.id} style={{ marginTop: 16 }}>
                          {/* Pregunta del usuario */}
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'flex-end', marginBottom: 8 }}>
                            <div style={{ maxWidth: '75%', background: C.primary, color: 'white',
                              borderRadius: '14px 14px 4px 14px', padding: '10px 14px', fontSize: 13, lineHeight: 1.5 }}>
                              <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {msg.pregunta || '—'}
                              </pre>
                            </div>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.primary + '20',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <User size={14} color={C.primary} />
                            </div>
                          </div>

                          {/* Respuesta del agente */}
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.dark + '15',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Bot size={14} color={C.dark} />
                            </div>
                            <div style={{ maxWidth: '85%' }}>
                              <div style={{ background: C.surface, border: `1px solid ${C.border}`,
                                borderRadius: '4px 14px 14px 14px', padding: '10px 14px', fontSize: 13, lineHeight: 1.6, color: C.text }}>
                                <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                  {msg.respuesta || '—'}
                                </pre>
                              </div>
                              {/* Meta: herramientas + tiempo */}
                              <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                {msg.duracion_ms && (
                                  <span style={{ fontSize: 10, color: C.muted }}>
                                    {(msg.duracion_ms / 1000).toFixed(1)}s
                                  </span>
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
                                  <span style={{ fontSize: 10, color: C.success, fontWeight: 600 }}>
                                    propuesta de acción
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Separador entre turnos */}
                          {msg !== (mensajes[conv.id] || []).at(-1) && (
                            <div style={{ height: 1, background: C.border, margin: '10px 0 0' }} />
                          )}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      }
    </div>
  )
}
