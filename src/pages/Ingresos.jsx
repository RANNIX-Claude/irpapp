import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, Search, X, Save, TrendingUp, DollarSign, AlertCircle, Calendar, Pencil, Trash2, Upload, Image, CheckCircle2, Circle } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'
import KPICard from '../components/ui/KPICard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const TIPOS = ['RENTA','SANCION','AGUA','OTRO']
const TIPO_COLOR = { RENTA: 'var(--color-success)', SANCION: 'var(--color-danger)', AGUA: '#0284C7', OTRO: '#6B7280' }

function fmt(n) { return n != null ? '$' + parseFloat(n).toLocaleString('es-MX', { minimumFractionDigits: 0 }) : '—' }

const BLANK = {
  fecha: new Date().toISOString().slice(0,10),
  contrato_id: '',
  tipo: 'RENTA',
  mes: new Date().getMonth() + 1,
  anio: new Date().getFullYear(),
  factura: '',
  importe: '',
  origen: 'TRANSFERENCIA BBVA',
  concepto_origen: '',
  nota: '',
}

function IngresoModal({ ingreso = null, onClose, onSaved }) {
  const [form, setForm] = useState(ingreso ? {
    fecha:           ingreso.fecha ? ingreso.fecha.slice(0,10) : new Date().toISOString().slice(0,10),
    contrato_id:     ingreso.contrato_id || '',
    tipo:            ingreso.tipo || 'RENTA',
    mes:             ingreso.mes || new Date().getMonth() + 1,
    anio:            ingreso.anio || new Date().getFullYear(),
    factura:         ingreso.factura || '',
    importe:         ingreso.importe != null ? String(ingreso.importe) : '',
    origen:          ingreso.origen || 'TRANSFERENCIA BBVA',
    concepto_origen: ingreso.concepto_origen || '',
    nota:            ingreso.nota || '',
  } : BLANK)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [contratos, setContratos] = useState([])
  const [cargos, setCargos] = useState([])          // cargos pendientes del contrato seleccionado
  const [dist, setDist] = useState({})              // { cargo_id: importe_a_aplicar }
  const [loadingCargos, setLoadingCargos] = useState(false)
  const [compFile, setCompFile] = useState(null)
  const [compPreview, setCompPreview] = useState(ingreso?.comprobante_url || null)
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Totales de distribución
  const totalDist = Object.values(dist).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const importeTotal = parseFloat(form.importe) || 0
  const saldoLibre = importeTotal - totalDist

  useEffect(() => {
    supabase.from('prp_contratos')
      .select('id, folio, arrendatario_nombre, locales_display')
      .order('arrendatario_nombre')
      .then(({ data }) => setContratos(data || []))
  }, [])

  // Al cambiar contrato, cargar cargos pendientes
  useEffect(() => {
    if (!form.contrato_id) { setCargos([]); setDist({}); return }
    setLoadingCargos(true)
    supabase.from('cargos_programados')
      .select('id, tipo, mes, anio, importe_cargo, saldo, estado')
      .eq('contrato_id', form.contrato_id)
      .in('estado', ['PENDIENTE', 'PARCIAL'])
      .order('anio').order('mes').order('tipo')
      .then(({ data }) => {
        setCargos(data || [])
        // Pre-distribuir: poner saldo de cada cargo como sugerencia
        const d = {}
        ;(data || []).forEach(c => { d[c.id] = '' })
        setDist(d)
        setLoadingCargos(false)
      })
  }, [form.contrato_id])

  const onFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setCompFile(f)
    setCompPreview(URL.createObjectURL(f))
  }

  const guardar = async () => {
    if (!form.contrato_id) { setErr('Selecciona el contrato'); return }
    if (!form.importe || parseFloat(form.importe) <= 0) { setErr('El importe debe ser mayor a 0'); return }
    if (saldoLibre < -0.01) { setErr(`El total distribuido ($${totalDist.toLocaleString('es-MX')}) excede el importe recibido`); return }
    setSaving(true); setErr(null)
    const [fAnio, fMes] = form.fecha ? form.fecha.split('-').map(Number) : [form.anio, form.mes]
    // Tipo principal = el concepto con mayor distribución, o el seleccionado
    const tiposPrincipales = cargos.filter(c => parseFloat(dist[c.id]) > 0).map(c => c.tipo)
    const tipoPrincipal = tiposPrincipales[0] || form.tipo
    const payload = {
      fecha:           form.fecha || null,
      contrato_id:     form.contrato_id || null,
      tipo:            tipoPrincipal,
      mes:             fMes || parseInt(form.mes),
      anio:            fAnio || parseInt(form.anio),
      factura:         form.factura || null,
      importe:         parseFloat(form.importe),
      origen:          form.origen || null,
      concepto_origen: form.concepto_origen || null,
      nota:            form.nota || null,
    }
    let error, data
    if (ingreso) {
      ;({ error } = await supabase.from('ingresos').update(payload).eq('id', ingreso.id))
      data = ingreso
    } else {
      ;({ error, data } = await supabase.from('ingresos').insert(payload).select('id').single())
    }
    if (error) { setSaving(false); setErr(error.message); return }

    // Insertar aplicaciones_pago para cada cargo con importe > 0
    const ingresoId = ingreso?.id || data?.id
    const aplicaciones = Object.entries(dist)
      .filter(([, v]) => parseFloat(v) > 0)
      .map(([cargo_id, v]) => ({ cargo_id, ingreso_id: ingresoId, importe_aplicado: parseFloat(v) }))
    if (aplicaciones.length > 0) {
      const { error: apErr } = await supabase.from('aplicaciones_pago').upsert(aplicaciones, { onConflict: 'cargo_id,ingreso_id' })
      if (apErr) { setSaving(false); setErr('Ingreso guardado pero error al aplicar cargos: ' + apErr.message); return }
    }

    // Upload comprobante si se seleccionó
    const ingresoId = ingreso?.id || data?.id
    if (compFile && ingresoId) {
      const ext = compFile.name.split('.').pop() || 'jpg'
      const path = `comprobantes/${ingresoId}/comp.${ext}`
      const { error: upErr } = await supabase.storage.from('facturas-cfdi').upload(path, compFile, { upsert: true })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('facturas-cfdi').getPublicUrl(path)
        await supabase.from('ingresos').update({ comprobante_url: urlData.publicUrl }).eq('id', ingresoId)
      }
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  const inp = (k, type='text', placeholder='') => (
    <input type={type} value={form[k]} placeholder={placeholder}
      onChange={e => set(k, e.target.value)}
      style={{ width:'100%', padding:'8px 10px', border:'1px solid #D1D5DB', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box' }} />
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
      onClick={onClose}>
      <div style={{ background:'white', borderRadius:'14px', width:'100%', maxWidth:'560px', maxHeight:'92vh', display:'flex', flexDirection:'column', overflow:'hidden' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding:'18px 22px', background:'var(--color-primary)', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontWeight:700, fontSize:'15px' }}>{ingreso ? 'Editar Ingreso' : 'Registrar Ingreso'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'white' }}><X size={18} /></button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'18px 22px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 18px' }}>

            {/* Contrato */}
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textTransform:'uppercase' }}>Contrato *</label>
              <select value={form.contrato_id} onChange={e => set('contrato_id', e.target.value)}
                style={{ width:'100%', padding:'8px 10px', border:'1px solid #D1D5DB', borderRadius:'6px', fontSize:'13px', marginTop:'4px' }}>
                <option value="">Seleccionar contrato...</option>
                {contratos.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.folio} — {c.arrendatario_nombre}{c.locales_display ? ` (${c.locales_display})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Importe recibido */}
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textTransform:'uppercase' }}>Importe recibido *</label>
              <div style={{ marginTop:'4px' }}>{inp('importe','number','0.00')}</div>
            </div>

            {/* Fecha */}
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textTransform:'uppercase' }}>Fecha pago</label>
              <div style={{ marginTop:'4px' }}>{inp('fecha','date')}</div>
            </div>

            {/* Factura */}
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textTransform:'uppercase' }}>No. Factura</label>
              <div style={{ marginTop:'4px' }}>{inp('factura','text','2195')}</div>
            </div>

            {/* Origen */}
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textTransform:'uppercase' }}>Origen</label>
              <select value={form.origen} onChange={e => set('origen', e.target.value)}
                style={{ width:'100%', padding:'8px 10px', border:'1px solid #D1D5DB', borderRadius:'6px', fontSize:'13px', marginTop:'4px' }}>
                <option>TRANSFERENCIA BBVA</option>
                <option>EFECTIVO</option>
                <option>CHEQUE</option>
                <option>OTRO</option>
              </select>
            </div>

            {/* Concepto */}
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textTransform:'uppercase' }}>Concepto origen</label>
              <div style={{ marginTop:'4px' }}>{inp('concepto_origen','text','RENTA JUL26')}</div>
            </div>

            {/* ─── Distribución del pago ─── */}
            {form.contrato_id && (
              <div style={{ gridColumn:'1/-1', marginTop:'4px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                  <label style={{ fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textTransform:'uppercase' }}>
                    Distribución del pago (cargos pendientes)
                  </label>
                  {importeTotal > 0 && (
                    <span style={{ fontSize:'12px', fontWeight:600, color: saldoLibre < -0.01 ? 'var(--color-danger)' : saldoLibre > 0.01 ? '#D97706' : 'var(--color-success)' }}>
                      {saldoLibre < -0.01 ? `Excede ${fmt(Math.abs(saldoLibre))}` : saldoLibre > 0.01 ? `Libre: ${fmt(saldoLibre)}` : '✓ Cuadrado'}
                    </span>
                  )}
                </div>

                {loadingCargos ? (
                  <div style={{ fontSize:'13px', color:'#6B7280', padding:'10px 0' }}>Cargando cargos...</div>
                ) : cargos.length === 0 ? (
                  <div style={{ fontSize:'13px', color:'#6B7280', padding:'10px 12px', background:'#F9FAFB', borderRadius:'8px', border:'1px solid #E5E7EB' }}>
                    Sin cargos pendientes para este contrato
                  </div>
                ) : (
                  <div style={{ border:'1px solid #E5E7EB', borderRadius:'8px', overflow:'hidden' }}>
                    {/* Header */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 110px 110px', gap:'8px', padding:'7px 12px', background:'#F3F4F6', fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase' }}>
                      <span>Concepto</span><span>Período</span><span style={{ textAlign:'right' }}>Saldo</span><span style={{ textAlign:'right' }}>Aplicar</span>
                    </div>
                    {cargos.map((c, i) => {
                      const aplicando = parseFloat(dist[c.id]) || 0
                      const activo = aplicando > 0
                      return (
                        <div key={c.id} style={{ display:'grid', gridTemplateColumns:'1fr 80px 110px 110px', gap:'8px', padding:'8px 12px', alignItems:'center', borderTop: i > 0 ? '1px solid #F3F4F6' : 'none', background: activo ? '#F0FDF4' : 'white', transition:'background 0.15s' }}>
                          {/* Concepto con palomita */}
                          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                            <span onClick={() => setDist(d => ({ ...d, [c.id]: activo ? '' : String(Math.min(c.saldo, Math.max(0, importeTotal - totalDist + aplicando))) }))
                              style={{ cursor:'pointer', color: activo ? 'var(--color-success)' : '#D1D5DB', flexShrink:0 }}>
                              {activo ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            </span>
                            <div>
                              <div style={{ fontSize:'13px', fontWeight:600, color: TIPO_COLOR[c.tipo] || '#374151' }}>{c.tipo}</div>
                              <div style={{ fontSize:'10px', color:'#9CA3AF' }}>{c.estado}</div>
                            </div>
                          </div>
                          {/* Periodo */}
                          <span style={{ fontSize:'12px', color:'#6B7280' }}>{MESES[c.mes]}/{c.anio}</span>
                          {/* Saldo */}
                          <span style={{ fontSize:'13px', fontWeight:600, color:'#374151', textAlign:'right' }}>{fmt(c.saldo)}</span>
                          {/* Input importe a aplicar */}
                          <input
                            type="number" min="0" max={c.saldo} step="0.01"
                            value={dist[c.id] ?? ''}
                            placeholder="0.00"
                            onChange={e => setDist(d => ({ ...d, [c.id]: e.target.value }))}
                            style={{ width:'100%', padding:'5px 8px', border:`1px solid ${activo ? 'var(--color-success)' : '#D1D5DB'}`, borderRadius:'6px', fontSize:'13px', textAlign:'right', boxSizing:'border-box', background: activo ? '#F0FDF4' : 'white' }}
                          />
                        </div>
                      )
                    })}
                    {/* Totales */}
                    {importeTotal > 0 && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 110px 110px', gap:'8px', padding:'8px 12px', borderTop:'2px solid #E5E7EB', background:'#F9FAFB' }}>
                        <span style={{ fontSize:'12px', fontWeight:700, color:'#374151', gridColumn:'1/3' }}>Total recibido</span>
                        <span style={{ fontSize:'13px', fontWeight:700, color:'#374151', textAlign:'right' }}>{fmt(importeTotal)}</span>
                        <span style={{ fontSize:'13px', fontWeight:700, color: saldoLibre < -0.01 ? 'var(--color-danger)' : 'var(--color-success)', textAlign:'right' }}>{fmt(totalDist)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Comprobante */}
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textTransform:'uppercase' }}>Comprobante de depósito</label>
              <input type="file" ref={fileRef} accept="image/*,application/pdf" style={{ display:'none' }} onChange={onFileChange} />
              <div style={{ marginTop:'6px', display:'flex', alignItems:'center', gap:'10px' }}>
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px', border:'1px dashed #9CA3AF', borderRadius:'8px', background:'#F9FAFB', fontSize:'13px', cursor:'pointer', color:'#374151' }}>
                  <Upload size={14} /> Subir imagen
                </button>
                {compFile && <span style={{ fontSize:'12px', color:'#6B7280' }}>{compFile.name}</span>}
              </div>
              {compPreview && compPreview.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                <img src={compPreview} alt="comprobante" style={{ marginTop:'8px', maxHeight:'120px', borderRadius:'6px', border:'1px solid #E5E7EB', objectFit:'cover' }} />
              )}
              {compPreview && !compFile && (
                <div style={{ marginTop:'6px', fontSize:'12px', color:'#6B7280', display:'flex', alignItems:'center', gap:'4px' }}>
                  <Image size={12} /> Comprobante existente guardado
                </div>
              )}
            </div>

            {/* Nota */}
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textTransform:'uppercase' }}>Nota</label>
              <textarea value={form.nota} onChange={e => set('nota', e.target.value)} rows={2}
                style={{ width:'100%', padding:'8px 10px', border:'1px solid #D1D5DB', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box', resize:'vertical', marginTop:'4px' }} />
            </div>
          </div>

          {err && <div style={{ marginTop:'12px', padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'8px', fontSize:'13px', color:'var(--color-danger)', display:'flex', gap:'8px', alignItems:'center' }}><AlertCircle size={14} />{err}</div>}
        </div>

        <div style={{ padding:'14px 22px', borderTop:'1px solid #E5E7EB', display:'flex', gap:'8px', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', background:'#F3F4F6', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 20px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:700, cursor:'pointer', opacity:saving ? 0.6 : 1 }}>
            <Save size={14} /> {saving ? 'Guardando...' : ingreso ? 'Guardar cambios' : 'Registrar ingreso'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Ingresos() {
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1)
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear())
  const [modalData, setModalData] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const { data, loading } = usePRP('prp_ingresos', { refreshKey })
  const lista = data ?? []

  const filtrados = useMemo(() => lista.filter(r => {
    const q = search.toLowerCase()
    const matchQ = !q
      || (r.id_contrato || '').toLowerCase().includes(q)
      || (r.propietario || '').toLowerCase().includes(q)
      || (r.local_id || '').toLowerCase().includes(q)
      || (r.factura || '').toLowerCase().includes(q)
    const matchT = filtroTipo === 'Todos' || r.tipo === filtroTipo
    const matchM = r.mes === filtroMes && r.anio === filtroAnio
    return matchQ && matchT && matchM
  }), [lista, search, filtroTipo, filtroMes, filtroAnio])

  const soloImportes = filtrados.filter(r => r.es_principal && r.importe != null)
  const totalMes = soloImportes.reduce((a, b) => a + (parseFloat(b.importe) || 0), 0)
  const totalRenta = soloImportes.filter(r => r.tipo === 'RENTA').reduce((a, b) => a + (parseFloat(b.importe) || 0), 0)
  const totalSanciones = soloImportes.filter(r => r.tipo === 'SANCION').reduce((a, b) => a + (parseFloat(b.importe) || 0), 0)

  const eliminar = async (r) => {
    const { error } = await supabase.from('ingresos').delete().eq('id', r.id)
    if (error) { toast.error(error.message); return }
    toast.success('Ingreso eliminado')
    setConfirmDel(null)
    setRefreshKey(k => k+1)
  }

  const ANIOS = [2025, 2026, 2027]

  return (
    <div style={{ padding:'24px', maxWidth:'1300px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:700, margin:'0 0 4px' }}>Ingresos</h1>
          <p style={{ fontSize:'13px', color:'var(--color-text-light)', margin:0 }}>
            {MESES[filtroMes]} {filtroAnio} · {filtrados.filter(r => r.es_principal).length} contratos con pago
          </p>
        </div>
        <button onClick={() => setModalData('nuevo')} style={{
          display:'flex', alignItems:'center', gap:'8px',
          background:'var(--color-primary)', color:'white', border:'none',
          borderRadius:'8px', padding:'10px 20px', fontSize:'14px', fontWeight:600, cursor:'pointer',
        }}>
          <Plus size={16} /> Registrar Ingreso
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'14px', marginBottom:'24px' }}>
        <KPICard title={`Total ${MESES[filtroMes]} ${filtroAnio}`} value={`$${(totalMes/1000).toFixed(1)}K`} icon={TrendingUp} color="var(--color-primary)" />
        <KPICard title="Rentas"      value={`$${(totalRenta/1000).toFixed(1)}K`}      icon={DollarSign}   color="var(--color-success)" />
        <KPICard title="Sanciones"   value={`$${(totalSanciones/1000).toFixed(1)}K`}  icon={AlertCircle}  color="var(--color-danger)" />
        <KPICard title="Registros"   value={filtrados.filter(r => r.es_principal).length} icon={Calendar} color="var(--color-secondary)" />
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
        {/* Mes/Año */}
        <select value={filtroMes} onChange={e => setFiltroMes(parseInt(e.target.value))}
          style={{ padding:'8px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'13px' }}>
          {MESES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={filtroAnio} onChange={e => setFiltroAnio(parseInt(e.target.value))}
          style={{ padding:'8px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'13px' }}>
          {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Tipo */}
        {['Todos', ...TIPOS].map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)} style={{
            padding:'7px 12px', borderRadius:'6px', fontSize:'12px', fontWeight:600, cursor:'pointer', border:'1.5px solid',
            borderColor: filtroTipo === t ? (TIPO_COLOR[t] || 'var(--color-primary)') : '#E5E7EB',
            background: filtroTipo === t ? (TIPO_COLOR[t] || 'var(--color-primary)') + '18' : 'white',
            color: filtroTipo === t ? (TIPO_COLOR[t] || 'var(--color-primary)') : 'var(--color-text-light)',
          }}>{t}</button>
        ))}

        {/* Búsqueda */}
        <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
          <Search size={14} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por local, propietario, factura..."
            style={{ width:'100%', padding:'8px 10px 8px 32px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'13px', boxSizing:'border-box' }} />
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background:'white', borderRadius:'10px', border:'1px solid #E5E7EB', overflow:'hidden' }}>
        {loading
          ? <div style={{ display:'flex', justifyContent:'center', padding:'60px' }}><LoadingSpinner /></div>
          : filtrados.length === 0
            ? <EmptyState title="Sin ingresos" subtitle="Registra el primer ingreso del período" />
            : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#F9FAFB' }}>
                      {['Fecha','Contrato','Local','Tipo','Propietario','Factura','Importe','Nota'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textAlign: h === 'Importe' ? 'right' : 'left', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                      <th style={{ padding:'10px 14px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(r => (
                      <tr key={r.id} style={{ borderTop:'1px solid #F3F4F6', opacity: r.es_principal ? 1 : 0.55 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding:'10px 14px', fontSize:'12px', whiteSpace:'nowrap' }}>{r.fecha ? r.fecha.slice(0,10) : '—'}</td>
                        <td style={{ padding:'10px 14px', fontSize:'12px', fontWeight:700, fontFamily:'monospace', color:'var(--color-primary)' }}>{r.id_contrato}</td>
                        <td style={{ padding:'10px 14px', fontSize:'12px' }}>
                          <span style={{ fontWeight:700 }}>{r.local_id}</span>
                          {!r.es_principal && <span style={{ fontSize:'10px', color:'#9CA3AF', marginLeft:'4px' }}>secundario</span>}
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ fontSize:'11px', fontWeight:600, padding:'2px 8px', borderRadius:'10px', background: (TIPO_COLOR[r.tipo] || '#6B7280') + '18', color: TIPO_COLOR[r.tipo] || '#6B7280' }}>{r.tipo}</span>
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:'12px', maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.propietario || '—'}</td>
                        <td style={{ padding:'10px 14px', fontSize:'12px', fontFamily:'monospace' }}>{r.factura || '—'}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontWeight: r.es_principal ? 700 : 400, fontSize:'13px', color: r.es_principal && r.importe ? 'var(--color-success)' : '#9CA3AF' }}>
                          {r.es_principal ? fmt(r.importe) : '—'}
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:'11px', color:'var(--color-text-light)', maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.nota || ''}</td>
                        <td style={{ padding:'8px 10px', whiteSpace:'nowrap' }}>
                          <button onClick={e => { e.stopPropagation(); setModalData(r) }} style={{ marginRight:'4px', padding:'5px 7px', background:'#F3F4F6', color:'#374151', border:'none', borderRadius:'6px', cursor:'pointer', display:'inline-flex', alignItems:'center' }}><Pencil size={13} /></button>
                          <button onClick={e => { e.stopPropagation(); setConfirmDel(r) }} style={{ padding:'5px 7px', background:'#FEF2F2', color:'#B91C1C', border:'none', borderRadius:'6px', cursor:'pointer', display:'inline-flex', alignItems:'center' }}><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop:'2px solid #E5E7EB', background:'#F9FAFB' }}>
                      <td colSpan={6} style={{ padding:'10px 14px', fontSize:'12px', fontWeight:700, textAlign:'right' }}>TOTAL {MESES[filtroMes].toUpperCase()} {filtroAnio}</td>
                      <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:800, fontSize:'14px', color:'var(--color-primary)' }}>{fmt(totalMes)}</td>
                      <td /><td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
      </div>

      {modalData && (
        <IngresoModal
          ingreso={modalData === 'nuevo' ? null : modalData}
          onClose={() => setModalData(null)}
          onSaved={() => { setRefreshKey(k => k+1); setModalData(null) }}
        />
      )}
      {confirmDel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setConfirmDel(null)}>
          <div style={{ background:'white', borderRadius:'14px', padding:'28px', maxWidth:'400px', width:'100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:'16px', marginBottom:'8px' }}>¿Eliminar ingreso?</div>
            <div style={{ fontSize:'13px', color:'var(--color-text-light)', marginBottom:'20px' }}>
              {confirmDel.local_id} · {MESES[confirmDel.mes]} {confirmDel.anio} · {fmt(confirmDel.importe)}
            </div>
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button onClick={() => setConfirmDel(null)} style={{ padding:'9px 18px', background:'#F3F4F6', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>Cancelar</button>
              <button onClick={() => eliminar(confirmDel)} style={{ padding:'9px 18px', background:'#B91C1C', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
