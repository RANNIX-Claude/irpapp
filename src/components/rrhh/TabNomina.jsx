import { useState, useEffect } from 'react'
import { Plus, AlertTriangle, CheckCircle, Clock, Download, X, FileText, RefreshCw, ChevronDown, DollarSign, Send, Eye, ChevronUp } from 'lucide-react'
import { usePRP } from '../../hooks/usePRP'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// ── Modal: Crear Período de Nómina ─────────────────────────────────────────
function NuevoPeriodoModal({ onClose, onCreated }) {
  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    periodicidad: 'QUINCENAL',
    fecha_inicio: '',
    fecha_fin: '',
    fecha_pago: '',
    tipo_nomina: 'O',
    descripcion: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-calcular fecha_fin según periodicidad
  useEffect(() => {
    if (!form.fecha_inicio) return
    const d = new Date(form.fecha_inicio + 'T12:00:00')
    if (form.periodicidad === 'SEMANAL')    d.setDate(d.getDate() + 6)
    if (form.periodicidad === 'QUINCENAL')  d.setDate(d.getDate() + 14)
    if (form.periodicidad === 'MENSUAL')    { d.setMonth(d.getMonth() + 1); d.setDate(d.getDate() - 1) }
    set('fecha_fin', d.toISOString().split('T')[0])
    // Fecha pago: 3 días hábiles después del fin
    const p = new Date(d); p.setDate(p.getDate() + 3)
    set('fecha_pago', p.toISOString().split('T')[0])
  }, [form.fecha_inicio, form.periodicidad])

  const guardar = async () => {
    if (!form.fecha_inicio || !form.fecha_fin || !form.fecha_pago) { toast.error('Completa todas las fechas'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase.rpc('crear_periodo_nomina', {
        p_periodicidad: form.periodicidad,
        p_fecha_inicio: form.fecha_inicio,
        p_fecha_fin:    form.fecha_fin,
        p_fecha_pago:   form.fecha_pago,
        p_tipo_nomina:  form.tipo_nomina,
        p_descripcion:  form.descripcion || null,
      })
      if (error) throw error
      logAudit({ modulo: 'Nómina', accion: 'CREAR_PERIODO', descripcion: `Período ${form.periodicidad} ${form.fecha_inicio}` })
      toast.success('Período creado')
      onCreated(data)
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'white',borderRadius:14,padding:28,width:480,boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h3 style={{ margin:0,fontSize:17,fontWeight:700 }}>Nuevo Período de Nómina</h3>
          <button onClick={onClose} style={{ border:'none',background:'none',cursor:'pointer',padding:4 }}><X size={18} /></button>
        </div>
        <div style={{ display:'grid',gap:14 }}>
          <div>
            <label style={{ fontSize:12,fontWeight:600,color:'var(--color-text-light)',display:'block',marginBottom:5 }}>Periodicidad</label>
            <select value={form.periodicidad} onChange={e => set('periodicidad', e.target.value)}
              style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:14 }}>
              <option value="SEMANAL">Semanal (7 días)</option>
              <option value="QUINCENAL">Quincenal (15 días)</option>
              <option value="MENSUAL">Mensual</option>
            </select>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:'var(--color-text-light)',display:'block',marginBottom:5 }}>Fecha inicio</label>
              <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)}
                style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:14,boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:'var(--color-text-light)',display:'block',marginBottom:5 }}>Fecha fin</label>
              <input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)}
                style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:14,boxSizing:'border-box' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:12,fontWeight:600,color:'var(--color-text-light)',display:'block',marginBottom:5 }}>Fecha de pago</label>
            <input type="date" value={form.fecha_pago} onChange={e => set('fecha_pago', e.target.value)}
              style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:14,boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize:12,fontWeight:600,color:'var(--color-text-light)',display:'block',marginBottom:5 }}>Tipo</label>
            <select value={form.tipo_nomina} onChange={e => set('tipo_nomina', e.target.value)}
              style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:14 }}>
              <option value="O">Ordinaria</option>
              <option value="E">Extraordinaria</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:12,fontWeight:600,color:'var(--color-text-light)',display:'block',marginBottom:5 }}>Descripción (opcional)</label>
            <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Ej: Primera quincena agosto 2026"
              style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:14,boxSizing:'border-box' }} />
          </div>
        </div>
        <div style={{ display:'flex',gap:10,marginTop:22,justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer',background:'white' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving}
            style={{ padding:'9px 22px',background:'#7B5EA7',color:'white',border:'none',borderRadius:8,fontSize:14,fontWeight:700,cursor:'pointer',opacity:saving?.6:1 }}>
            {saving ? 'Creando…' : 'Crear período'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Pre-nómina (detalle de empleados) ────────────────────────────────
function PreNominaModal({ periodo, onClose, onRecalcular }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: renglones, loading } = usePRP('prp_prenomina', {
    filters: [['periodo_id', 'eq', periodo.id]],
    order: { col: 'nombre_completo' },
    refreshKey,
  })
  const [calculando, setCalculando] = useState(false)
  const [autorizando, setAutorizando] = useState(false)
  const [expandido, setExpandido] = useState(null)

  const lista = renglones ?? []
  const totalNeto = lista.reduce((s, r) => s + parseFloat(r.neto_pagar || 0), 0)
  const totalPerc = lista.reduce((s, r) => s + parseFloat(r.salario_periodo || 0), 0)
  const totalDed  = lista.reduce((s, r) => s + parseFloat(r.total_deducciones || 0), 0)

  const recalcular = async () => {
    setCalculando(true)
    try {
      const { data, error } = await supabase.rpc('calcular_nomina_periodo', { p_periodo_id: periodo.id })
      if (error) throw error
      const res = typeof data === 'string' ? JSON.parse(data) : data
      toast.success(`✅ ${res.empleados} empleados calculados — Neto: $${parseFloat(res.total_neto).toLocaleString('es-MX')}`)
      setRefreshKey(k => k + 1)
      onRecalcular()
    } catch (e) { toast.error('Error al calcular: ' + e.message) }
    finally { setCalculando(false) }
  }

  const autorizar = async () => {
    setAutorizando(true)
    try {
      const { error } = await supabase.rpc('autorizar_periodo_nomina', { p_periodo_id: periodo.id })
      if (error) throw error
      logAudit({ modulo: 'Nómina', accion: 'AUTORIZAR_PERIODO', descripcion: `Período ${periodo.folio} autorizado` })
      toast.success('Nómina autorizada — lista para timbrar')
      onRecalcular()
      onClose()
    } catch (e) { toast.error(e.message) }
    finally { setAutorizando(false) }
  }

  const exportarCSV = () => {
    const headers = ['Empleado','RFC','NSS','Banco','CLABE','Días trabajados','Salario período','IMSS','ISR','Neto']
    const rows = lista.map(r => [
      r.nombre_completo, r.rfc || '', r.nss || '',
      r.banco || '', r.cuenta_clabe || '',
      r.dias_trabajados, r.salario_periodo,
      r.imss_obrero, r.isr_a_retener, r.neto_pagar,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `prenomina_${periodo.folio}.csv`; a.click()
  }

  const CHIP = { PENDIENTE: ['#F3F4F6','#374151'], TIMBRADO: ['#DCFCE7','#166534'], ERROR: ['#FEE2E2','#991B1B'] }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'24px 16px',overflowY:'auto' }}>
      <div style={{ background:'white',borderRadius:14,width:'100%',maxWidth:900,boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px',borderBottom:'1px solid #E5E7EB',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <h3 style={{ margin:0,fontSize:17,fontWeight:700 }}>{periodo.folio}</h3>
            <p style={{ margin:'3px 0 0',fontSize:12,color:'var(--color-text-light)' }}>
              {periodo.fecha_inicio} → {periodo.fecha_fin} · Pago: {periodo.fecha_pago}
            </p>
          </div>
          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            {periodo.estado === 'BORRADOR' && (
              <button onClick={recalcular} disabled={calculando}
                style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',border:'1.5px solid #7B5EA7',borderRadius:8,fontSize:13,fontWeight:600,color:'#7B5EA7',background:'white',cursor:'pointer' }}>
                <RefreshCw size={13} className={calculando ? 'spin' : ''} /> {calculando ? 'Calculando…' : 'Calcular'}
              </button>
            )}
            {periodo.estado === 'CALCULADA' && (
              <button onClick={recalcular} disabled={calculando}
                style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',border:'1.5px solid #6B7280',borderRadius:8,fontSize:13,fontWeight:600,color:'#6B7280',background:'white',cursor:'pointer' }}>
                <RefreshCw size={13} /> Recalcular
              </button>
            )}
            {lista.length > 0 && (
              <button onClick={exportarCSV}
                style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',border:'1.5px solid #057642',borderRadius:8,fontSize:13,fontWeight:600,color:'#057642',background:'white',cursor:'pointer' }}>
                <Download size={13} /> CSV Finanzas
              </button>
            )}
            {periodo.estado === 'CALCULADA' && lista.length > 0 && (
              <button onClick={autorizar} disabled={autorizando}
                style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 16px',background:'#057642',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer' }}>
                <CheckCircle size={14} /> {autorizando ? 'Autorizando…' : 'Autorizar Nómina'}
              </button>
            )}
            <button onClick={onClose} style={{ border:'none',background:'none',cursor:'pointer',padding:4 }}><X size={18} /></button>
          </div>
        </div>

        {/* Totales */}
        {lista.length > 0 && (
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:0,borderBottom:'1px solid #E5E7EB' }}>
            {[
              ['Empleados',    lista.length,                  '#7B5EA7'],
              ['Percepciones', '$'+totalPerc.toLocaleString('es-MX',{minimumFractionDigits:2}), '#374151'],
              ['Deducciones',  '$'+totalDed.toLocaleString('es-MX',{minimumFractionDigits:2}),  '#B24020'],
              ['Neto a pagar', '$'+totalNeto.toLocaleString('es-MX',{minimumFractionDigits:2}), '#057642'],
            ].map(([t,v,c]) => (
              <div key={t} style={{ padding:'14px 20px',borderRight:'1px solid #E5E7EB' }}>
                <div style={{ fontSize:11,fontWeight:600,color:'var(--color-text-light)',textTransform:'uppercase',marginBottom:3 }}>{t}</div>
                <div style={{ fontSize:18,fontWeight:800,color:c }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabla */}
        <div style={{ padding: '0 0 16px' }}>
          {loading ? (
            <div style={{ textAlign:'center',padding:48,color:'#9CA3AF' }}>Calculando…</div>
          ) : lista.length === 0 ? (
            <div style={{ textAlign:'center',padding:48,color:'#9CA3AF' }}>
              <DollarSign size={36} style={{ display:'block',margin:'0 auto 12px',opacity:.3 }} />
              <p style={{ margin:0,fontWeight:600 }}>Sin cálculo todavía</p>
              <p style={{ margin:'6px 0 0',fontSize:12 }}>Haz clic en "Calcular" para generar la pre-nómina</p>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#F9FAFB',borderBottom:'1px solid #E5E7EB' }}>
                    {['','Empleado','RFC','Días trab.','Percepción','IMSS','ISR','Subsidio','Neto','CFDI'].map(h => (
                      <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'var(--color-text-light)',whiteSpace:'nowrap',textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.map(r => {
                    const [chipBg, chipFg] = CHIP[r.estatus_cfdi] || CHIP.PENDIENTE
                    const isOpen = expandido === r.id
                    return [
                      <tr key={r.id} style={{ borderBottom: isOpen ? 'none' : '1px solid #F3F4F6', cursor:'pointer' }} onClick={() => setExpandido(isOpen ? null : r.id)}>
                        <td style={{ padding:'10px 8px 10px 14px', color:'#6B7280' }}>
                          {isOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                        </td>
                        <td style={{ padding:'10px 14px',fontWeight:600 }}>{r.nombre_completo}</td>
                        <td style={{ padding:'10px 14px',fontFamily:'monospace',fontSize:11,color:'#6B7280' }}>{r.rfc || '—'}</td>
                        <td style={{ padding:'10px 14px',textAlign:'right' }}>{parseFloat(r.dias_trabajados||0).toFixed(1)}</td>
                        <td style={{ padding:'10px 14px',textAlign:'right',color:'#057642',fontWeight:600 }}>${parseFloat(r.salario_periodo||0).toLocaleString('es-MX',{minimumFractionDigits:2})}</td>
                        <td style={{ padding:'10px 14px',textAlign:'right',color:'#B24020' }}>${parseFloat(r.imss_obrero||0).toLocaleString('es-MX',{minimumFractionDigits:2})}</td>
                        <td style={{ padding:'10px 14px',textAlign:'right',color:'#B24020' }}>${parseFloat(r.isr_a_retener||0).toLocaleString('es-MX',{minimumFractionDigits:2})}</td>
                        <td style={{ padding:'10px 14px',textAlign:'right',color:'#7B5EA7' }}>{parseFloat(r.subsidio_empleo||0) > 0 ? '$'+parseFloat(r.subsidio_empleo).toLocaleString('es-MX',{minimumFractionDigits:2}) : '—'}</td>
                        <td style={{ padding:'10px 14px',textAlign:'right',fontWeight:800,fontSize:14 }}>${parseFloat(r.neto_pagar||0).toLocaleString('es-MX',{minimumFractionDigits:2})}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:700,background:chipBg,color:chipFg }}>{r.estatus_cfdi}</span>
                        </td>
                      </tr>,
                      isOpen && (
                        <tr key={r.id+'_exp'} style={{ borderBottom:'1px solid #F3F4F6',background:'#F9FAFB' }}>
                          <td colSpan={10} style={{ padding:'10px 48px 16px' }}>
                            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:12 }}>
                              <div>
                                <span style={{ color:'var(--color-text-light)' }}>Días del período:</span> <strong>{r.dias_periodo}</strong><br/>
                                <span style={{ color:'var(--color-text-light)' }}>Días trabajados:</span> <strong>{r.dias_trabajados}</strong><br/>
                                <span style={{ color:'var(--color-text-light)' }}>Faltas:</span> <strong style={{ color: parseFloat(r.dias_falta)>0?'#B24020':'inherit' }}>{r.dias_falta}</strong><br/>
                                <span style={{ color:'var(--color-text-light)' }}>Salario diario:</span> <strong>${parseFloat(r.salario_diario||0).toLocaleString('es-MX',{minimumFractionDigits:2})}</strong>
                              </div>
                              <div>
                                <span style={{ color:'var(--color-text-light)' }}>Base ISR mensual:</span> <strong>${parseFloat(r.isr_base_mensual||0).toLocaleString('es-MX',{minimumFractionDigits:2})}</strong><br/>
                                <span style={{ color:'var(--color-text-light)' }}>Banco:</span> <strong>{r.banco || '—'}</strong><br/>
                                <span style={{ color:'var(--color-text-light)' }}>CLABE:</span> <strong style={{ fontFamily:'monospace' }}>{r.cuenta_clabe || '—'}</strong>
                              </div>
                            </div>
                            {r.uuid_cfdi && (
                              <div style={{ marginTop:8,padding:'6px 10px',background:'#DCFCE7',borderRadius:6,fontSize:11,fontFamily:'monospace',color:'#166534' }}>
                                UUID: {r.uuid_cfdi}
                              </div>
                            )}
                            {r.error_timbrado && (
                              <div style={{ marginTop:8,padding:'6px 10px',background:'#FEE2E2',borderRadius:6,fontSize:11,color:'#991B1B' }}>
                                Error: {r.error_timbrado}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    ]
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab Nómina ──────────────────────────────────────────────────────────────
function TabNomina() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [showNuevo, setShowNuevo] = useState(false)
  const [periodoDetalle, setPeriodoDetalle] = useState(null)

  const { data: periodos, loading } = usePRP('nomina_periodos', {
    order: { col: 'created_at', asc: false },
    refreshKey,
  })

  const lista = periodos ?? []

  const ESTADO_CHIP = {
    BORRADOR:   ['#F3F4F6','#374151'],
    CALCULADA:  ['#FEF3C7','#92400E'],
    AUTORIZADA: ['#DBEAFE','#1D4ED8'],
    TIMBRADA:   ['#DCFCE7','#166534'],
    CANCELADA:  ['#FEE2E2','#991B1B'],
  }

  const ESTADO_ICON = {
    BORRADOR:   <FileText size={14} color="#6B7280" />,
    CALCULADA:  <Eye size={14} color="#92400E" />,
    AUTORIZADA: <CheckCircle size={14} color="#1D4ED8" />,
    TIMBRADA:   <Send size={14} color="#166534" />,
    CANCELADA:  <X size={14} color="#991B1B" />,
  }

  const totalPendiente = lista
    .filter(p => p.estado === 'AUTORIZADA')
    .reduce((s, p) => s + parseFloat(p.total_neto || 0), 0)

  return (
    <div>
      {/* KPIs superiores */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22 }}>
        {[
          [lista.length, 'Períodos totales', '#7B5EA7', FileText],
          [lista.filter(p=>p.estado==='BORRADOR').length, 'En borrador', '#6B7280', Clock],
          [lista.filter(p=>p.estado==='AUTORIZADA').length, 'Por timbrar', '#E8A020', AlertTriangle],
          ['$'+totalPendiente.toLocaleString('es-MX',{minimumFractionDigits:0}), 'Neto pendiente', '#057642', DollarSign],
        ].map(([v,t,c,Icon]) => (
          <div key={t} style={{ background:'white',borderRadius:10,border:'1px solid #E5E7EB',padding:'14px 16px' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4 }}>
              <span style={{ fontSize:11,fontWeight:600,color:'var(--color-text-light)',textTransform:'uppercase' }}>{t}</span>
              <Icon size={15} color={c} />
            </div>
            <div style={{ fontSize:22,fontWeight:700,color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Barra de acciones */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
        <h3 style={{ margin:0,fontSize:15,fontWeight:700 }}>Períodos de nómina</h3>
        <button onClick={() => setShowNuevo(true)}
          style={{ display:'flex',alignItems:'center',gap:7,padding:'9px 16px',background:'#7B5EA7',color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer' }}>
          <Plus size={14} /> Nuevo Período
        </button>
      </div>

      {/* Lista de períodos */}
      {loading ? (
        <div style={{ textAlign:'center',padding:60,color:'#9CA3AF' }}>Cargando…</div>
      ) : lista.length === 0 ? (
        <div style={{ textAlign:'center',padding:60,background:'white',borderRadius:10,border:'1px solid #E5E7EB' }}>
          <DollarSign size={36} style={{ display:'block',margin:'0 auto 12px',opacity:.3 }} />
          <p style={{ margin:0,fontWeight:600 }}>Sin períodos de nómina</p>
          <p style={{ margin:'6px 0 0',fontSize:12,color:'var(--color-text-light)' }}>Crea el primer período para empezar</p>
        </div>
      ) : (
        <div style={{ background:'white',borderRadius:10,border:'1px solid #E5E7EB',overflow:'hidden' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
            <thead>
              <tr style={{ background:'#F9FAFB',borderBottom:'1px solid #E5E7EB' }}>
                {['Folio','Tipo','Período','Fecha pago','Empleados','Percepciones','Deducciones','Neto','Estado',''].map(h => (
                  <th key={h} style={{ padding:'11px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'var(--color-text-light)',whiteSpace:'nowrap',textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(p => {
                const [chipBg, chipFg] = ESTADO_CHIP[p.estado] || ESTADO_CHIP.BORRADOR
                return (
                  <tr key={p.id} style={{ borderBottom:'1px solid #F3F4F6', cursor:'pointer' }}
                    onClick={() => setPeriodoDetalle(p)}
                    onMouseEnter={e => e.currentTarget.style.background='#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background='white'}>
                    <td style={{ padding:'12px 14px',fontWeight:700,fontFamily:'monospace',color:'#7B5EA7' }}>{p.folio}</td>
                    <td style={{ padding:'12px 14px',fontSize:12 }}>
                      <span style={{ padding:'2px 8px',borderRadius:9,background:'#F5F3FF',color:'#5A4080',fontSize:11,fontWeight:600 }}>
                        {p.periodicidad === 'QUINCENAL' ? 'Quincenal' : p.periodicidad === 'SEMANAL' ? 'Semanal' : 'Mensual'}
                      </span>
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:12,color:'var(--color-text-light)',whiteSpace:'nowrap' }}>
                      {p.fecha_inicio} → {p.fecha_fin}
                    </td>
                    <td style={{ padding:'12px 14px',fontWeight:600,whiteSpace:'nowrap' }}>{p.fecha_pago}</td>
                    <td style={{ padding:'12px 14px',textAlign:'right',fontWeight:p.total_empleados>0?700:400,color:p.total_empleados>0?'#374151':'#9CA3AF' }}>
                      {p.total_empleados || '—'}
                    </td>
                    <td style={{ padding:'12px 14px',textAlign:'right',color:'#057642',fontWeight:600 }}>
                      {p.total_percepciones > 0 ? '$'+parseFloat(p.total_percepciones).toLocaleString('es-MX',{minimumFractionDigits:2}) : '—'}
                    </td>
                    <td style={{ padding:'12px 14px',textAlign:'right',color:'#B24020' }}>
                      {p.total_deducciones > 0 ? '$'+parseFloat(p.total_deducciones).toLocaleString('es-MX',{minimumFractionDigits:2}) : '—'}
                    </td>
                    <td style={{ padding:'12px 14px',textAlign:'right',fontWeight:800 }}>
                      {p.total_neto > 0 ? '$'+parseFloat(p.total_neto).toLocaleString('es-MX',{minimumFractionDigits:2}) : '—'}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                        {ESTADO_ICON[p.estado]}
                        <span style={{ padding:'3px 9px',borderRadius:10,fontSize:11,fontWeight:700,background:chipBg,color:chipFg }}>{p.estado}</span>
                      </div>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <button onClick={e => { e.stopPropagation(); setPeriodoDetalle(p) }}
                        style={{ display:'flex',alignItems:'center',gap:4,padding:'5px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',background:'white',color:'#374151' }}>
                        <Eye size={12} /> Ver
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Aviso timbrado pendiente */}
      {lista.some(p => p.estado === 'AUTORIZADA') && (
        <div style={{ marginTop:16,padding:'14px 18px',background:'#F5F3FF',borderRadius:9,border:'1px solid #DDD6FE',display:'flex',alignItems:'center',gap:10 }}>
          <Send size={16} color="#5A4080" />
          <div>
            <span style={{ fontSize:13,fontWeight:700,color:'#5A4080' }}>Nómina lista para timbrar</span>
            <span style={{ fontSize:12,color:'#3B82F6',marginLeft:8 }}>
              Configura las credenciales FEL® en Netlify (FEL_USUARIO, FEL_PASSWORD, FEL_PFX_B64, FEL_PFX_PASS) para activar el timbrado automático.
            </span>
          </div>
        </div>
      )}

      {showNuevo && (
        <NuevoPeriodoModal
          onClose={() => setShowNuevo(false)}
          onCreated={() => { setShowNuevo(false); setRefreshKey(k => k+1) }}
        />
      )}

      {periodoDetalle && (
        <PreNominaModal
          periodo={periodoDetalle}
          onClose={() => setPeriodoDetalle(null)}
          onRecalcular={() => setRefreshKey(k => k+1)}
        />
      )}
    </div>
  )
}

export { NuevoPeriodoModal, PreNominaModal }
export default TabNomina