import { useState, useEffect } from 'react'
import { CheckCircle, Clock, ArrowLeft, FileText, ExternalLink, Calendar } from 'lucide-react'
import { supabase, urlFirmada } from '../../lib/supabase'
import { usePRP } from '../../hooks/usePRP'
import toast from 'react-hot-toast'

// ── Tab Recibos de Nómina ───────────────────────────────────────────────────
export default function TabRecibosNomina() {
  const [periodos, setPeriodos]     = useState([])
  const [periodoSel, setPeriodoSel] = useState(null)
  const [recibos, setRecibos]       = useState({})   // { [empleadoId]: { recibo_url, subido_en } }
  const [empleadoSel, setEmpleadoSel] = useState(null) // drill-down
  const [historial, setHistorial]   = useState([])   // recibos del empleado seleccionado
  const [thumbs, setThumbs]         = useState({})   // { [semana_inicio]: url firmada }
  const [abriendo, setAbriendo]     = useState(null)

  const { data: _empleados } = usePRP('prp_empleados', { order: { col: 'nombre_completo' } })
  const empleados = (_empleados ?? []).filter(e => e.estado_id === 'ACTIVO')

  // Carga períodos recientes
  useEffect(() => {
    supabase
      .from('nomina_periodos')
      .select('id, folio, fecha_inicio, fecha_fin, periodicidad')
      .order('fecha_inicio', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data?.length) { setPeriodos(data); setPeriodoSel(data[0]) }
      })
  }, [])

  // Recibos del período seleccionado (vista general)
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

  // Historial de un empleado (drill-down)
  const abrirEmpleado = async (emp) => {
    setEmpleadoSel(emp)
    setHistorial([])
    setThumbs({})
    const { data } = await supabase
      .from('nomina_recibos_firmados')
      .select(`
        semana_inicio,
        recibo_url,
        subido_en,
        subido_por
      `)
      .eq('empleado_id', emp.id)
      .order('semana_inicio', { ascending: false })
    if (!data) return
    // Para cada recibo busca fecha_fin en nomina_periodos
    const fechas = data.map(r => r.semana_inicio)
    const { data: perData } = await supabase
      .from('nomina_periodos')
      .select('fecha_inicio, fecha_fin, folio')
      .in('fecha_inicio', fechas)
    const perMap = {}
    perData?.forEach(p => { perMap[p.fecha_inicio] = p })
    const hist = data.map(r => ({ ...r, periodo: perMap[r.semana_inicio] || null }))
    setHistorial(hist)
    // Carga thumbnails para imágenes
    hist.forEach(async (r) => {
      const ext = r.recibo_url?.split('.').pop()?.toLowerCase()
      if (['jpg','jpeg','png','webp','gif'].includes(ext)) {
        try {
          const url = await urlFirmada('expedientes-docs', r.recibo_url, 300)
          setThumbs(t => ({ ...t, [r.semana_inicio]: url }))
        } catch { /* sin thumbnail */ }
      }
    })
  }

  const verRecibo = async (path) => {
    setAbriendo(path)
    try {
      const url = await urlFirmada('expedientes-docs', path)
      window.open(url, '_blank')
    } catch { toast.error('No se pudo abrir el recibo') }
    finally { setAbriendo(null) }
  }

  const fmtFecha = (d) => {
    if (!d) return ''
    const [y, m, day] = d.split('-')
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return `${parseInt(day)} ${meses[parseInt(m)-1]} ${y}`
  }

  const lista = empleados
  const conRecibo = lista.filter(e => recibos[e.id])
  const sinRecibo = lista.filter(e => !recibos[e.id])
  const pct = lista.length ? Math.round((conRecibo.length / lista.length) * 100) : 0

  // ── Vista de historial de un empleado ────────────────────────────────────
  if (empleadoSel) {
    return (
      <div>
        {/* Header drill-down */}
        <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20 }}>
          <button onClick={() => setEmpleadoSel(null)}
            style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',border:'1.5px solid #E5E7EB',borderRadius:8,background:'white',cursor:'pointer',fontSize:13,fontWeight:600,color:'#374151' }}>
            <ArrowLeft size={14} /> Regresar
          </button>
          {empleadoSel.foto_url && (
            <img src={empleadoSel.foto_url} alt="" style={{ width:38,height:38,borderRadius:'50%',objectFit:'cover',border:'2px solid #E5E7EB' }} />
          )}
          <div>
            <div style={{ fontSize:16,fontWeight:800,color:'#111827' }}>{empleadoSel.nombre_completo}</div>
            <div style={{ fontSize:12,color:'#6B7280' }}>{historial.length} recibo{historial.length !== 1 ? 's' : ''} firmado{historial.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {historial.length === 0 ? (
          <div style={{ textAlign:'center',padding:60,color:'#9CA3AF' }}>
            <FileText size={36} style={{ display:'block',margin:'0 auto 12px',opacity:.3 }} />
            <p style={{ margin:0,fontWeight:600 }}>Sin recibos firmados</p>
          </div>
        ) : (
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14 }}>
            {historial.map(r => {
              const ext   = r.recibo_url?.split('.').pop()?.toLowerCase()
              const esImg = ['jpg','jpeg','png','webp','gif'].includes(ext)
              const thumb = thumbs[r.semana_inicio]
              const per   = r.periodo
              // ¿la semana cruza de mes?
              const mesIni = r.semana_inicio?.slice(5,7)
              const mesFin = per?.fecha_fin?.slice(5,7)
              const cruzaMes = mesIni && mesFin && mesIni !== mesFin

              return (
                <div key={r.semana_inicio}
                  style={{ border:'1.5px solid #E5E7EB',borderRadius:10,overflow:'hidden',background:'white',cursor:'pointer' }}
                  onClick={() => verRecibo(r.recibo_url)}>
                  {/* Thumbnail */}
                  <div style={{ height:130,background:'#F9FAFB',display:'flex',alignItems:'center',justifyContent:'center',borderBottom:'1px solid #F3F4F6',position:'relative' }}>
                    {esImg && thumb ? (
                      <img src={thumb} alt="recibo" style={{ maxHeight:'100%',maxWidth:'100%',objectFit:'contain' }} />
                    ) : (
                      <FileText size={42} color="#D1D5DB" />
                    )}
                    {cruzaMes && (
                      <span style={{ position:'absolute',top:6,right:6,padding:'2px 6px',background:'#FEF3C7',border:'1px solid #F59E0B',borderRadius:6,fontSize:10,fontWeight:700,color:'#92400E' }}>
                        2 meses
                      </span>
                    )}
                    <div style={{ position:'absolute',bottom:6,right:6,padding:'3px 8px',background:'rgba(0,0,0,.45)',borderRadius:5,fontSize:10,color:'white',display:'inline-flex',alignItems:'center',gap:4 }}>
                      <ExternalLink size={9} /> Ver
                    </div>
                  </div>
                  {/* Info */}
                  <div style={{ padding:'10px 12px' }}>
                    {per ? (
                      <>
                        <div style={{ fontSize:11,fontWeight:700,color:'#374151',marginBottom:2 }}>
                          {per.folio}
                        </div>
                        <div style={{ fontSize:11,color:'#6B7280',display:'flex',alignItems:'center',gap:4 }}>
                          <Calendar size={10} />
                          {fmtFecha(r.semana_inicio)} — {fmtFecha(per.fecha_fin)}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize:11,color:'#6B7280' }}>
                        <Calendar size={10} style={{ verticalAlign:'middle',marginRight:4 }} />
                        Semana {fmtFecha(r.semana_inicio)}
                      </div>
                    )}
                    <div style={{ fontSize:10,color:'#9CA3AF',marginTop:4 }}>
                      Subido: {r.subido_en ? new Date(r.subido_en).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'2-digit'}) : '—'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Vista general (grid por período) ─────────────────────────────────────
  return (
    <div>
      {/* Selector de período */}
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        <label style={{ fontSize:13,fontWeight:600,color:'var(--color-text-light)' }}>Período:</label>
        <select
          value={periodoSel?.id || ''}
          onChange={e => setPeriodoSel(periodos.find(p => p.id === e.target.value))}
          style={{ padding:'8px 14px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:14,fontWeight:600,minWidth:280 }}>
          {periodos.map(p => (
            <option key={p.id} value={p.id}>
              {p.folio} — {fmtFecha(p.fecha_inicio)} al {fmtFecha(p.fecha_fin)}
            </option>
          ))}
        </select>
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

      {/* Grid */}
      {!periodoSel ? (
        <div style={{ textAlign:'center',padding:60,color:'#9CA3AF' }}>Sin períodos de nómina</div>
      ) : (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12 }}>
          {lista.map(emp => {
            const rec   = recibos[emp.id]
            const tiene = !!rec
            return (
              <div key={emp.id}
                onClick={() => abrirEmpleado(emp)}
                style={{ border:`1.5px solid ${tiene ? '#BBF7D0' : '#F3F4F6'}`,borderRadius:10,padding:'14px 14px 12px',background:tiene ? '#F0FDF4' : 'white',display:'flex',flexDirection:'column',alignItems:'center',gap:8,textAlign:'center',cursor:'pointer',transition:'.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                <div style={{ width:52,height:52,borderRadius:'50%',overflow:'hidden',border:`2px solid ${tiene ? '#057642' : '#E5E7EB'}`,flexShrink:0 }}>
                  {emp.foto_url
                    ? <img src={emp.foto_url} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                    : <div style={{ width:'100%',height:'100%',background:'#E5E7EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'#9CA3AF' }}>
                        {emp.nombre_completo?.charAt(0) || '?'}
                      </div>
                  }
                </div>
                <div style={{ fontSize:12,fontWeight:700,color:'#111827',lineHeight:1.3 }}>{emp.nombre_completo}</div>
                {tiene ? (
                  <div style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,color:'#057642' }}>
                    <CheckCircle size={12} /> Firmado
                  </div>
                ) : (
                  <div style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:600,color:'#9CA3AF' }}>
                    <Clock size={11} /> Pendiente
                  </div>
                )}
                <div style={{ fontSize:10,color:'#9CA3AF' }}>Ver recibos →</div>
              </div>
            )
          })}
        </div>
      )}

      {sinRecibo.length > 0 && periodoSel && (
        <div style={{ marginTop:24,padding:'14px 18px',background:'#FEF9EC',border:'1.5px solid #F59E0B',borderRadius:10 }}>
          <div style={{ fontSize:12,fontWeight:700,color:'#92400E',marginBottom:4 }}>
            <Clock size={13} style={{ verticalAlign:'middle',marginRight:4 }} />
            Sin recibo aún ({sinRecibo.length}):
          </div>
          <div style={{ fontSize:12,color:'#92400E',fontWeight:400 }}>
            {sinRecibo.map(e => e.nombre_completo).join(' · ')}
          </div>
        </div>
      )}
    </div>
  )
}
