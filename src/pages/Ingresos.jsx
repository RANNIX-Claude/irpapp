import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, Search, X, Save, TrendingUp, DollarSign, AlertCircle, Calendar, Pencil, Trash2, Upload, Image, CheckCircle2, Circle, Eye, FileText, Paperclip } from 'lucide-react'
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
  const [cargos, setCargos] = useState([])
  const [dist, setDist] = useState({})
  const [loadingCargos, setLoadingCargos] = useState(false)
  const [contratoSearch, setContratoSearch] = useState('')
  const [contratoOpen, setContratoOpen] = useState(false)
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
      .order('locales_display', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        // Ordenar: primero los que tienen local, luego el resto por nombre
        const sorted = (data || []).sort((a, b) => {
          if (a.locales_display && !b.locales_display) return -1
          if (!a.locales_display && b.locales_display) return 1
          return (a.locales_display || a.arrendatario_nombre || '').localeCompare(b.locales_display || b.arrendatario_nombre || '')
        })
        setContratos(sorted)
      })
  }, [])

  // Al cambiar contrato, cargar cargos pendientes
  useEffect(() => {
    if (!form.contrato_id) { setCargos([]); setDist({}); return }
    setLoadingCargos(true)
    supabase.from('prp_cartera')
      .select('id, concepto, periodo_mes, periodo_anio, importe, saldo, estado')
      .eq('contrato_id', form.contrato_id)
      .in('estado', ['PENDIENTE', 'PARCIAL'])
      .order('periodo_anio').order('periodo_mes').order('concepto')
      .then(({ data }) => {
        setCargos(data || [])
        const d = {}
        ;(data || []).forEach(c => { d[c.id] = '' })
        setDist(d)
        setLoadingCargos(false)
      })
  }, [form.contrato_id])

  const [leyendoOCR, setLeyendoOCR] = useState(false)
  const [ocrData, setOcrData] = useState(null)
  const [ocrMsg, setOcrMsg] = useState(null)

  const adjuntarYOCR = async (file) => {
    if (!file) return
    setCompFile(file)
    setCompPreview(URL.createObjectURL(file))
    setLeyendoOCR(true)
    setOcrData(null)
    setOcrMsg({ ok: null, txt: 'Leyendo comprobante con IA…' })
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file)
      })
      const resp = await fetch('/.netlify/functions/extraer-documento', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image_base64: b64, media_type: file.type, tipo_doc: 'COMPROBANTE_PAGO' }),
      })
      const j = await resp.json()
      if (!resp.ok || !j.datos) throw new Error(j.error || 'Sin datos')
      const d = j.datos
      const formaMap = { transferencia: 'TRANSFERENCIA BBVA', spei: 'TRANSFERENCIA BBVA', deposito: 'DEPOSITO', 'depósito': 'DEPOSITO', efectivo: 'EFECTIVO', cheque: 'CHEQUE' }
      setForm(f => ({
        ...f,
        fecha:           d.fecha_pago || d.fecha || f.fecha,
        importe:         d.monto ? String(d.monto) : f.importe,
        referencia_banco: d.referencia || d.folio || d.numero_operacion || f.referencia_banco,
        origen:          formaMap[(d.forma_pago || '').toLowerCase()] || f.origen,
        concepto_origen: [d.concepto, d.banco ? `Desde: ${d.banco}` : ''].filter(Boolean).join(' · ') || f.concepto_origen,
      }))
      setOcrData(d)
      setOcrMsg({ ok: true, txt: 'Datos extraídos — verifica y corrige si es necesario' })
    } catch {
      setOcrMsg({ ok: false, txt: 'No se pudo leer el comprobante — llena manualmente' })
    } finally { setLeyendoOCR(false) }
  }

  const guardar = async () => {
    if (!form.contrato_id) { setErr('Selecciona el contrato'); return }
    if (!form.importe || parseFloat(form.importe) <= 0) { setErr('El importe debe ser mayor a 0'); return }
    if (saldoLibre < -0.01) { setErr(`El total distribuido ($${totalDist.toLocaleString('es-MX')}) excede el importe recibido`); return }
    setSaving(true); setErr(null)
    const [fAnio, fMes] = form.fecha ? form.fecha.split('-').map(Number) : [form.anio, form.mes]
    // Tipo principal = el concepto con mayor distribución, o el seleccionado
    const tiposPrincipales = cargos.filter(c => parseFloat(dist[c.id]) > 0).map(c => c.concepto)
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

          {/* ── 1. Comprobante con OCR ── */}
          <div style={{ marginBottom:'14px' }}>
            <label style={{ fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textTransform:'uppercase', display:'block', marginBottom:'6px' }}>1. Comprobante de pago (OCR automático)</label>
            <input type="file" ref={fileRef} accept="image/*,application/pdf" capture="environment" style={{ display:'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) adjuntarYOCR(f); e.target.value = '' }} />
            {!compFile ? (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={leyendoOCR}
                style={{ display:'flex', alignItems:'center', gap:'8px', padding:'12px', background:'#EFF6FF', border:'2px dashed #0A66C2', borderRadius:'10px', fontSize:'13px', color:'#0A66C2', cursor:'pointer', fontWeight:700, width:'100%', justifyContent:'center' }}>
                <Image size={16} /> {leyendoOCR ? 'Leyendo con IA…' : 'Adjuntar ficha o transferencia — IA extrae los datos'}
              </button>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px', background:'#F0FDF4', borderRadius:'8px', border:'1.5px solid #BBF7D0' }}>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#15803D', flex:1 }}>✓ {compFile.name}</span>
                <button type="button" onClick={() => { setCompFile(null); setCompPreview(null); setOcrMsg(null); setOcrData(null) }}
                  style={{ fontSize:'11px', color:'var(--color-danger)', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>✕ Quitar</button>
              </div>
            )}
          </div>

          {/* Panel validación OCR */}
          {ocrMsg && (
            <div style={{ marginBottom:'12px', padding:'10px 12px', borderRadius:'8px', fontSize:'12px',
              border:`1px solid ${ocrMsg.ok === true ? '#BBF7D0' : ocrMsg.ok === false ? '#FECACA' : '#FDE68A'}`,
              background: ocrMsg.ok === true ? '#F0FDF4' : ocrMsg.ok === false ? '#FEF2F2' : '#FFFBEB' }}>
              <div style={{ fontWeight:700, color: ocrMsg.ok === true ? '#057642' : ocrMsg.ok === false ? '#B24020' : '#92400E', marginBottom: ocrData ? '8px' : 0 }}>
                {ocrMsg.ok === true ? '✓' : ocrMsg.ok === false ? '✗' : '⟳'} {ocrMsg.txt}
              </div>
              {ocrData && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px' }}>
                  {[
                    ['Banco origen', ocrData.banco],
                    ['No. cuenta / CLABE', ocrData.cuenta || ocrData.clabe],
                    ['Monto en imagen', ocrData.monto ? fmt(ocrData.monto) : null],
                    ['Fecha', ocrData.fecha_pago || ocrData.fecha],
                    ['Referencia', ocrData.referencia || ocrData.folio || ocrData.numero_operacion],
                    ['Concepto', ocrData.concepto],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k}>
                      <span style={{ fontSize:'10px', color:'#6B7280', textTransform:'uppercase', fontWeight:700 }}>{k}</span>
                      <div style={{ fontSize:'12px', fontWeight:600, color:'#111827' }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {compPreview && (
            <div style={{ marginBottom:'12px' }}>
              <img src={compPreview} alt="comprobante" style={{ width:'100%', maxHeight:'140px', objectFit:'contain', borderRadius:'8px', border:'1px solid #E5E7EB', background:'#F9FAFB' }} />
            </div>
          )}

          <div style={{ borderTop:'1px solid #F3F4F6', paddingTop:'12px', marginBottom:'12px' }}>
            <span style={{ fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textTransform:'uppercase' }}>2. Datos del depósito</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 18px' }}>

            {/* Contrato — buscador filtrable */}
            <div style={{ gridColumn:'1/-1', position:'relative' }}>
              <label style={{ fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textTransform:'uppercase' }}>Contrato *</label>
              {(() => {
                const sel = contratos.find(c => c.id === form.contrato_id)
                const q = contratoSearch.toLowerCase()
                const filtrados = contratos.filter(c => {
                  if (!q) return true
                  return (c.locales_display || '').toLowerCase().includes(q)
                    || (c.arrendatario_nombre || '').toLowerCase().includes(q)
                    || (c.folio || '').toLowerCase().includes(q)
                })
                const label = c => {
                  const loc = c.locales_display ? `${c.locales_display} — ` : ''
                  return `${loc}${c.arrendatario_nombre || ''}${c.folio ? ` (${c.folio})` : ''}`
                }
                return (
                  <div style={{ marginTop:'4px' }}>
                    <input
                      value={contratoSearch || (sel ? label(sel) : '')}
                      onFocus={() => { setContratoSearch(''); setContratoOpen(true) }}
                      onBlur={() => setTimeout(() => setContratoOpen(false), 180)}
                      onChange={e => { setContratoSearch(e.target.value); setContratoOpen(true); if (!e.target.value) set('contrato_id', '') }}
                      placeholder="Buscar por local (L14) o nombre..."
                      style={{ width:'100%', padding:'8px 10px', border:'1px solid #D1D5DB', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box' }}
                    />
                    {contratoOpen && (
                      <div style={{ position:'absolute', zIndex:300, top:'100%', left:0, right:0, background:'white', border:'1px solid #D1D5DB', borderRadius:'8px', maxHeight:'220px', overflowY:'auto', boxShadow:'0 4px 16px rgba(0,0,0,0.13)', marginTop:'2px' }}>
                        {filtrados.length === 0
                          ? <div style={{ padding:'10px 14px', fontSize:'12px', color:'#9CA3AF' }}>Sin coincidencias</div>
                          : filtrados.map(c => (
                            <div key={c.id}
                              onMouseDown={() => { set('contrato_id', c.id); setContratoSearch(''); setContratoOpen(false) }}
                              style={{ padding:'9px 14px', fontSize:'13px', cursor:'pointer', borderBottom:'1px solid #F3F4F6',
                                background: c.id === form.contrato_id ? '#EFF6FF' : 'white',
                                color: c.id === form.contrato_id ? '#0A66C2' : '#111827' }}
                              onMouseEnter={e => { if (c.id !== form.contrato_id) e.currentTarget.style.background='#F9FAFB' }}
                              onMouseLeave={e => { if (c.id !== form.contrato_id) e.currentTarget.style.background='white' }}>
                              {c.locales_display && (
                                <span style={{ fontWeight:700, color:'#0A66C2', marginRight:'6px' }}>{c.locales_display}</span>
                              )}
                              {c.arrendatario_nombre}
                              {c.folio && <span style={{ fontSize:'11px', color:'#9CA3AF', marginLeft:'6px' }}>({c.folio})</span>}
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Importe recibido */}
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textTransform:'uppercase' }}>
                Importe recibido *
                {ocrData?.monto && Math.abs(parseFloat(form.importe) - ocrData.monto) > 1 && (
                  <span style={{ marginLeft:6, color:'#D97706', fontSize:'10px' }}>⚠ imagen: {fmt(ocrData.monto)}</span>
                )}
              </label>
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
                            <span onClick={() => setDist(d => ({ ...d, [c.id]: activo ? '' : String(Math.min(c.saldo, Math.max(0, importeTotal - totalDist + aplicando))) }))}
                              style={{ cursor:'pointer', color: activo ? 'var(--color-success)' : '#D1D5DB', flexShrink:0 }}>
                              {activo ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            </span>
                            <div>
                              <div style={{ fontSize:'13px', fontWeight:600, color: TIPO_COLOR[c.concepto] || '#374151' }}>{c.concepto}</div>
                              <div style={{ fontSize:'10px', color:'#9CA3AF' }}>{c.estado}</div>
                            </div>
                          </div>
                          {/* Periodo */}
                          <span style={{ fontSize:'12px', color:'#6B7280' }}>{MESES[c.periodo_mes]}/{c.periodo_anio}</span>
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
  const [verDetalle, setVerDetalle] = useState(null)
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
                      {['Fecha','Contrato','Tipo','Docs','Importe','Nota'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', fontSize:'11px', fontWeight:700, color:'var(--color-text-light)', textAlign: h === 'Importe' ? 'right' : 'left', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                      <th style={{ padding:'10px 14px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(r => (
                      <tr key={r.id} style={{ borderTop:'1px solid #F3F4F6' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding:'10px 14px', fontSize:'12px', whiteSpace:'nowrap' }}>{r.fecha ? r.fecha.slice(0,10) : '—'}</td>
                        <td style={{ padding:'10px 14px', fontSize:'12px', minWidth:'180px' }}>
                          {r.folio || r.arrendatario_nombre ? (
                            <>
                              {r.locales_display && (
                                <span style={{ display:'inline-block', fontSize:'11px', fontWeight:700, color:'#0A66C2', background:'#EFF6FF', padding:'1px 7px', borderRadius:'8px', marginBottom:'3px' }}>{r.locales_display}</span>
                              )}
                              <div style={{ fontWeight:600, color:'#111827', fontSize:'12px', lineHeight:'1.3' }}>{r.arrendatario_nombre || r.propietario || '—'}</div>
                              {r.folio && <div style={{ fontSize:'10px', color:'#9CA3AF', fontFamily:'monospace' }}>{r.folio}</div>}
                            </>
                          ) : (
                            <span style={{ fontSize:'11px', color:'#D97706', background:'#FEF3C7', padding:'2px 8px', borderRadius:'8px', fontWeight:600, cursor:'pointer' }}
                              onClick={e => { e.stopPropagation(); setModalData(r) }}>Sin contrato — Editar</span>
                          )}
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ fontSize:'11px', fontWeight:600, padding:'2px 8px', borderRadius:'10px', background: (TIPO_COLOR[r.tipo] || '#6B7280') + '18', color: TIPO_COLOR[r.tipo] || '#6B7280' }}>{r.tipo}</span>
                        </td>
                        {/* Docs: factura + comprobante */}
                        <td style={{ padding:'10px 14px', whiteSpace:'nowrap' }}>
                          <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                            {r.factura
                              ? <span title={`Factura: ${r.factura}`} style={{ display:'inline-flex', alignItems:'center', gap:'3px', fontSize:'11px', fontWeight:600, color:'#0A66C2', background:'#EFF6FF', padding:'2px 7px', borderRadius:'10px' }}>
                                  <FileText size={11} /> {r.factura}
                                </span>
                              : <span style={{ fontSize:'11px', color:'#D1D5DB' }} title="Sin factura"><FileText size={13} /></span>
                            }
                            {r.comprobante_url
                              ? <a href={r.comprobante_url} target="_blank" rel="noreferrer" title="Ver comprobante"
                                  style={{ display:'inline-flex', alignItems:'center', color:'#057642', background:'#D1FAE5', padding:'3px 6px', borderRadius:'8px' }} onClick={e => e.stopPropagation()}>
                                  <Paperclip size={12} />
                                </a>
                              : <span style={{ fontSize:'11px', color:'#D1D5DB' }} title="Sin comprobante"><Paperclip size={13} /></span>
                            }
                          </div>
                        </td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, fontSize:'13px', color: r.importe ? 'var(--color-success)' : '#9CA3AF' }}>
                          {fmt(r.importe)}
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:'11px', color:'var(--color-text-light)', maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.nota || ''}</td>
                        <td style={{ padding:'8px 10px', whiteSpace:'nowrap' }}>
                          <button onClick={e => { e.stopPropagation(); setVerDetalle(r) }} title="Ver detalle"
                            style={{ marginRight:'4px', padding:'5px 7px', background:'#EFF6FF', color:'#0A66C2', border:'none', borderRadius:'6px', cursor:'pointer', display:'inline-flex', alignItems:'center' }}><Eye size={13} /></button>
                          <button onClick={e => { e.stopPropagation(); setModalData(r) }} title="Editar"
                            style={{ marginRight:'4px', padding:'5px 7px', background:'#F3F4F6', color:'#374151', border:'none', borderRadius:'6px', cursor:'pointer', display:'inline-flex', alignItems:'center' }}><Pencil size={13} /></button>
                          <button onClick={e => { e.stopPropagation(); setConfirmDel(r) }} title="Eliminar"
                            style={{ padding:'5px 7px', background:'#FEF2F2', color:'#B91C1C', border:'none', borderRadius:'6px', cursor:'pointer', display:'inline-flex', alignItems:'center' }}><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop:'2px solid #E5E7EB', background:'#F9FAFB' }}>
                      <td colSpan={4} style={{ padding:'10px 14px', fontSize:'12px', fontWeight:700, textAlign:'right' }}>TOTAL {MESES[filtroMes].toUpperCase()} {filtroAnio}</td>
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

      {/* Modal Ver Detalle */}
      {verDetalle && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
          onClick={() => setVerDetalle(null)}>
          <div style={{ background:'white', borderRadius:'14px', width:'100%', maxWidth:'480px', overflow:'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding:'16px 22px', background:'var(--color-primary)', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700, fontSize:'15px' }}>Detalle del Ingreso</div>
              <button onClick={() => setVerDetalle(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'white' }}><X size={18} /></button>
            </div>
            <div style={{ padding:'20px 22px' }}>
              {[
                ['Contrato', verDetalle.folio || verDetalle.id_contrato],
                ['Arrendatario', verDetalle.arrendatario_nombre || verDetalle.propietario],
                ['Fecha', verDetalle.fecha?.slice(0,10)],
                ['Período', `${MESES[verDetalle.mes]} ${verDetalle.anio}`],
                ['Tipo', verDetalle.tipo],
                ['Importe', fmt(verDetalle.importe)],
                ['Forma de pago', verDetalle.origen || verDetalle.forma_pago],
                ['Factura', verDetalle.factura],
                ['Referencia banco', verDetalle.referencia_banco],
                ['Nota', verDetalle.nota],
              ].filter(([,v]) => v).map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #F3F4F6', fontSize:'13px' }}>
                  <span style={{ color:'#6B7280', fontWeight:600 }}>{k}</span>
                  <span style={{ fontWeight:700, color:'#111827', textAlign:'right', maxWidth:'60%' }}>{v}</span>
                </div>
              ))}
              {verDetalle.comprobante_url && (
                <div style={{ marginTop:'14px' }}>
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase', marginBottom:'8px' }}>Comprobante</div>
                  <img src={verDetalle.comprobante_url} alt="comprobante" style={{ width:'100%', maxHeight:'200px', objectFit:'contain', borderRadius:'8px', border:'1px solid #E5E7EB' }} />
                </div>
              )}
              <div style={{ marginTop:'16px', display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                <button onClick={() => { setVerDetalle(null); setModalData(verDetalle) }}
                  style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'#F3F4F6', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                  <Pencil size={13} /> Editar
                </button>
                <button onClick={() => setVerDetalle(null)}
                  style={{ padding:'8px 16px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
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
