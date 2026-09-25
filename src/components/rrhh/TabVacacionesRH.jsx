import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Umbrella, Users, AlertTriangle, ChevronRight } from 'lucide-react'

const C = {
  primary: '#7B5EA7', dark: '#5A4080', gold: '#E8A020',
  success: '#057642', warning: '#F59E0B', danger: '#B24020',
  bg: '#F0F4F8', surface: '#FFFFFF', border: '#E2E8F0',
  text: '#1E293B', muted: '#64748B', light: '#F8FAFC',
}

const fmtD = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function TabVacacionesRH() {
  const navigate = useNavigate()
  const [activas, setActivas]       = useState([])
  const [proximas, setProximas]     = useState([])
  const [saldos, setSaldos]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [filtro, setFiltro]         = useState('')

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      const hoy = new Date().toISOString().split('T')[0]
      const enDias = (n) => new Date(Date.now() + n * 86400000).toISOString().split('T')[0]

      const [activasR, proximasR, saldosR] = await Promise.all([
        // Quién está de vacaciones hoy
        supabase.from('prp_vacaciones_activas').select('*'),
        // Próximas 30 días
        supabase.from('prp_vacaciones_detalle')
          .select('*')
          .gt('fecha_inicio', hoy)
          .lte('fecha_inicio', enDias(30))
          .in('estado', ['AUTORIZADA', 'TOMADA'])
          .order('fecha_inicio'),
        // Saldos disponibles (años vigentes no agotados)
        supabase.from('prp_vacaciones_anio')
          .select('*')
          .gt('dias_disponibles', 0)
          .order('nombre_completo'),
      ])
      setActivas(activasR.data ?? [])
      setProximas(proximasR.data ?? [])
      setSaldos(saldosR.data ?? [])
      setLoading(false)
    }
    cargar()
  }, [])

  const saldosFiltrados = filtro
    ? saldos.filter(s => s.nombre_completo?.toLowerCase().includes(filtro.toLowerCase()))
    : saldos

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: C.muted }}>Cargando…</div>
  )

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* Hoy en vacaciones */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Umbrella size={16} color={C.primary} />
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>En vacaciones hoy</span>
          <span style={{ marginLeft: 'auto', background: activas.length > 0 ? C.primary + '15' : C.border, color: activas.length > 0 ? C.primary : C.muted, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
            {activas.length} empleado{activas.length !== 1 ? 's' : ''}
          </span>
        </div>
        {activas.length === 0 ? (
          <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '12px 0' }}>Nadie está de vacaciones hoy</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {activas.map(v => (
              <div key={v.id}
                onClick={() => navigate(`/rh/empleado/${v.empleado_id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: C.primary + '08', borderRadius: 9, cursor: 'pointer', border: `1px solid ${C.primary}20` }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.primary + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: C.primary, flexShrink: 0 }}>
                  {(v.nombre_completo || '?').split(' ').map(w => w[0]).slice(0,2).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{v.nombre_completo}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{v.puesto} · {v.area}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>
                    Regresa en {v.dias_restantes} día{v.dias_restantes !== 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>hasta {fmtD(v.fecha_fin)}</div>
                </div>
                <ChevronRight size={14} color={C.muted} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Próximas 30 días */}
      {proximas.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={15} color={C.warning} />
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Próximos 30 días</span>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {proximas.map(v => (
              <div key={v.id}
                onClick={() => navigate(`/rh/empleado/${v.empleado_id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, cursor: 'pointer', background: C.light }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, flex: 1 }}>{v.nombre_completo}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{fmtD(v.fecha_inicio)} — {fmtD(v.fecha_fin)}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>{v.dias} días</div>
                <ChevronRight size={13} color={C.muted} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saldos disponibles por empleado */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <Users size={15} color={C.primary} />
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Saldos disponibles</span>
          <input
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            placeholder="Buscar empleado…"
            style={{ marginLeft: 'auto', padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, outline: 'none', width: 180 }}
          />
        </div>
        {saldosFiltrados.length === 0 ? (
          <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '12px 0' }}>Sin saldos disponibles</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.light }}>
                  {['Empleado','Puesto','Año laboral','Período','Días derecho','Días tomados','Disponibles','Prima'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {saldosFiltrados.map(s => (
                  <tr key={s.id}
                    onClick={() => navigate(`/rh/empleado/${s.empleado_id}`)}
                    style={{ borderTop: `1px solid ${C.border}`, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.light}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.nombre_completo}</td>
                    <td style={{ padding: '10px 12px', color: C.muted, fontSize: 12 }}>{s.puesto}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: C.primary }}>Año {s.anio_numero}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: C.muted }}>
                      {s.fecha_inicio_anio ? `${fmtD(s.fecha_inicio_anio)} — ${fmtD(s.fecha_fin_anio)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{s.dias_derecho}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{s.dias_tomados}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 800, color: s.anio_vencido ? C.warning : C.success }}>
                        {s.dias_disponibles}
                        {s.anio_vencido && ' ⚠'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {s.prima_cubierta
                        ? <span style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>✓ Pagada</span>
                        : <span style={{ fontSize: 11, color: C.muted }}>Pendiente</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
