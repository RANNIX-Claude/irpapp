import { useState, useEffect } from 'react'
import { CheckCircle, Clock, ExternalLink, FileText } from 'lucide-react'
import { supabase, urlFirmada } from '../../lib/supabase'
import { usePRP } from '../../hooks/usePRP'
import toast from 'react-hot-toast'

// ── Tab Recibos de Nómina ───────────────────────────────────────────────────
export default function TabRecibosNomina() {
  const [periodos, setPeriodos] = useState([])
  const [periodoSel, setPeriodoSel] = useState(null)
  const [recibos, setRecibos] = useState({})   // { [empleadoId]: recibo_url }
  const [abriendo, setAbriendo] = useState(null)

  const { data: _empleados } = usePRP('prp_empleados', {
    order: { col: 'nombre_completo' },
  })
  const empleados = (_empleados ?? []).filter(e => e.estado_id === 'ACTIVO')

  // Carga períodos recientes (últimos 20)
  useEffect(() => {
    supabase
      .from('nomina_periodos')
      .select('id, folio, fecha_inicio, fecha_fin, periodicidad')
      .order('fecha_inicio', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data?.length) {
          setPeriodos(data)
          setPeriodoSel(data[0])
        }
      })
  }, [])

  // Cuando cambia el período, carga recibos de ese período
  useEffect(() => {
    if (!periodoSel) return
    supabase
      .from('nomina_recibos_firmados')
      .select('empleado_id, recibo_url, subido_en')
      .eq('semana_inicio', periodoSel.fecha_inicio)
      .then(({ data }) => {
        const m = {}
        data?.forEach(r => { m[r.empleado_id] = r })
        setRecibos(m)
      })
  }, [periodoSel?.id])

  const verRecibo = async (empleadoId) => {
    const rec = recibos[empleadoId]
    if (!rec) return
    setAbriendo(empleadoId)
    try {
      const url = await urlFirmada('expedientes-docs', rec.recibo_url)
      window.open(url, '_blank')
    } catch {
      toast.error('No se pudo abrir el recibo')
    } finally {
      setAbriendo(null)
    }
  }

  const lista = empleados
  const conRecibo = lista.filter(e => recibos[e.id])
  const sinRecibo = lista.filter(e => !recibos[e.id])
  const pct = lista.length ? Math.round((conRecibo.length / lista.length) * 100) : 0

  const fmtFecha = (d) => {
    if (!d) return ''
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <div>
      {/* Selector de período */}
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        <label style={{ fontSize:13,fontWeight:600,color:'var(--color-text-light)' }}>Período:</label>
        <select
          value={periodoSel?.id || ''}
          onChange={e => setPeriodoSel(periodos.find(p => p.id === e.target.value))}
          style={{ padding:'8px 14px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:14,fontWeight:600,minWidth:260 }}>
          {periodos.map(p => (
            <option key={p.id} value={p.id}>
              {p.folio} — {fmtFecha(p.fecha_inicio)} al {fmtFecha(p.fecha_fin)}
            </option>
          ))}
        </select>

        {/* Resumen */}
        {lista.length > 0 && (
          <div style={{ display:'flex',alignItems:'center',gap:8,marginLeft:'auto' }}>
            <div style={{ height:8,width:160,background:'#E5E7EB',borderRadius:4,overflow:'hidden' }}>
              <div style={{ height:'100%',width:`${pct}%`,background:'#057642',borderRadius:4,transition:'.4s' }} />
            </div>
            <span style={{ fontSize:13,fontWeight:700,color:'#057642' }}>{conRecibo.length}/{lista.length}</span>
            <span style={{ fontSize:12,color:'var(--color-text-light)' }}>recibos firmados</span>
          </div>
        )}
      </div>

      {/* Grid de empleados */}
      {!periodoSel ? (
        <div style={{ textAlign:'center',padding:60,color:'#9CA3AF' }}>Sin períodos de nómina registrados</div>
      ) : (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12 }}>
          {lista.map(emp => {
            const rec = recibos[emp.id]
            const tiene = !!rec
            return (
              <div key={emp.id}
                style={{ border:`1.5px solid ${tiene ? '#BBF7D0' : '#F3F4F6'}`,borderRadius:10,padding:'14px 14px 12px',background:tiene ? '#F0FDF4' : 'white',display:'flex',flexDirection:'column',alignItems:'center',gap:8,textAlign:'center' }}>
                {/* Avatar */}
                <div style={{ width:52,height:52,borderRadius:'50%',overflow:'hidden',border:`2px solid ${tiene ? '#057642' : '#E5E7EB'}`,flexShrink:0 }}>
                  {emp.foto_url
                    ? <img src={emp.foto_url} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                    : <div style={{ width:'100%',height:'100%',background:'#E5E7EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'#9CA3AF' }}>
                        {emp.nombre_completo?.charAt(0) || '?'}
                      </div>
                  }
                </div>

                {/* Nombre */}
                <div style={{ fontSize:12,fontWeight:700,color:'#111827',lineHeight:1.3 }}>
                  {emp.nombre_completo}
                </div>

                {/* Estado */}
                {tiene ? (
                  <div style={{ display:'flex',flexDirection:'column',gap:5,width:'100%' }}>
                    <div style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,color:'#057642' }}>
                      <CheckCircle size={12} /> Firmado
                    </div>
                    <div style={{ fontSize:10,color:'#6B7280' }}>
                      {rec.subido_en ? new Date(rec.subido_en).toLocaleDateString('es-MX',{day:'2-digit',month:'short'}) : ''}
                    </div>
                    <button
                      onClick={() => verRecibo(emp.id)}
                      disabled={abriendo === emp.id}
                      style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',gap:4,padding:'5px 10px',border:'1.5px solid #057642',borderRadius:6,background:'white',color:'#057642',fontSize:11,fontWeight:700,cursor:'pointer',width:'100%' }}>
                      <ExternalLink size={11} /> {abriendo === emp.id ? 'Abriendo…' : 'Ver recibo'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:600,color:'#9CA3AF' }}>
                    <Clock size={11} /> Pendiente
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Listado de pendientes */}
      {sinRecibo.length > 0 && periodoSel && (
        <div style={{ marginTop:24,padding:'14px 18px',background:'#FEF9EC',border:'1.5px solid #F59E0B',borderRadius:10 }}>
          <div style={{ fontSize:12,fontWeight:700,color:'#92400E',marginBottom:8 }}>
            <Clock size={13} style={{ verticalAlign:'middle',marginRight:4 }} />
            Sin recibo aún ({sinRecibo.length}):&nbsp;
            <span style={{ fontWeight:400 }}>{sinRecibo.map(e => e.nombre_completo).join(' · ')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
