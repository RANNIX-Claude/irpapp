import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { FileText, Upload, Search, RefreshCw, Download } from 'lucide-react'
import { supabase, llamarFuncion } from '../lib/supabase'
import { EnlacePrivado } from '../components/ui/ArchivoPrivado'
import toast from 'react-hot-toast'

const fmt = n => n == null ? '—' : Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

const fmtDT = iso => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

const MESES_LARGOS = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function exportarCSV(lista) {
  const cols = ['Arrendatario','Local','Contrato','Concepto','Período','Importe','Fecha Pago','Monto Pagado','Referencia','Validado Por','Validado En','Folio Factura','Con CFDI']
  const rows = lista.map(c => [
    c.arrendatario_nombre || '',
    c.locales_display || '',
    c.contrato_folio || '',
    c.concepto || '',
    `${MESES[c.periodo_mes] || ''} ${c.periodo_anio || ''}`.trim(),
    c.importe,
    c.pago?.fecha || '',
    c.pago?.importe_total || c.pago?.importe_aplicado || '',
    c.pago?.referencia_banco || '',
    c.pago?.validado_por || '',
    c.pago?.validado_en ? fmtDT(c.pago.validado_en) : '',
    c.numero_factura || '',
    c.tiene_factura ? 'Sí' : 'No',
  ])
  const csv = [cols, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `facturacion-${Date.now()}.csv`
  a.click(); URL.revokeObjectURL(url)
}

export default function Facturacion() {
  const [cargos, setCargos]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [tab, setTab]           = useState('TODOS')
  const [mes, setMes]           = useState(0)        // 0 = todos los meses
  const [anio, setAnio]         = useState(0)        // 0 = todos los años
  const [concepto, setConcepto] = useState('TODOS')

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data: dataCargos, error } = await supabase
      .from('prp_cartera')
      .select('id, concepto, descripcion, periodo_mes, periodo_anio, importe, fecha_vencimiento, estado, contrato_id, contrato_folio, arrendatario_nombre, locales_display, numero_factura, factura_url, factura_xml_url, tiene_factura, tiene_comprobante')
      .in('estado', ['PAGADO', 'PARCIAL'])
      .order('fecha_vencimiento', { ascending: false })
    if (error) { toast.error('Error: ' + error.message); setLoading(false); return }

    const ids = (dataCargos || []).map(c => c.id)
    let pagosMap = {}
    if (ids.length) {
      const { data: aplicaciones } = await supabase
        .from('aplicaciones_pago')
        .select('cargo_id, importe_aplicado, ingresos(id, fecha, importe_total, forma_pago, referencia_banco, estatus_validacion, validado_por, validado_en)')
        .in('cargo_id', ids)
      for (const ap of (aplicaciones || [])) {
        const ing = ap.ingresos
        if (!ing) continue
        const prev = pagosMap[ap.cargo_id]
        const esValidado = ing.estatus_validacion === 'VALIDADO'
        if (!prev || (esValidado && prev.estatus_validacion !== 'VALIDADO'))
          pagosMap[ap.cargo_id] = { ...ing, importe_aplicado: ap.importe_aplicado }
      }
    }

    const merged = (dataCargos || [])
      .map(c => ({ ...c, pago: pagosMap[c.id] || null }))
      .filter(c => c.pago?.estatus_validacion === 'VALIDADO')
    setCargos(merged)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const aniosDisp = useMemo(() =>
    [...new Set(cargos.map(c => c.pago?.validado_en ? new Date(c.pago.validado_en).getFullYear() : null).filter(Boolean))].sort((a, b) => b - a),
    [cargos])

  const conceptosDisp = useMemo(() =>
    [...new Set(cargos.map(c => c.concepto).filter(Boolean))].sort(),
    [cargos])

  // Filtros — período por fecha en que Finanzas validó (validado_en)
  const filtrados = useMemo(() => cargos.filter(c => {
    if (mes !== 0 || anio !== 0) {
      const fv = c.pago?.validado_en ? new Date(c.pago.validado_en) : null
      if (!fv) return false
      if (mes  !== 0 && fv.getMonth() + 1 !== mes)  return false
      if (anio !== 0 && fv.getFullYear()   !== anio) return false
    }
    if (concepto !== 'TODOS' && c.concepto !== concepto) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!(c.arrendatario_nombre || '').toLowerCase().includes(q) &&
          !(c.locales_display     || '').toLowerCase().includes(q) &&
          !(c.contrato_folio      || '').toLowerCase().includes(q)) return false
    }
    return true
  }), [cargos, mes, anio, concepto, busqueda])

  const pendientes  = filtrados.filter(c => !c.tiene_factura)
  const facturados  = filtrados.filter(c =>  c.tiene_factura)

  const lista = tab === 'TODOS' ? filtrados : tab === 'PENDIENTES' ? pendientes : facturados

  const sumPend = pendientes.reduce((s, c) => s + (Number(c.importe) || 0), 0)
  const sumFact = facturados.reduce((s, c) => s + (Number(c.importe) || 0), 0)

  const hayFiltros = mes !== 0 || anio !== 0 || concepto !== 'TODOS' || busqueda

  const sel = { padding: '7px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, background: 'white', cursor: 'pointer', color: '#374151' }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1140, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Facturación</h1>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>
            Adjunta el CFDI PDF + ZIP a cada cobro validado por Finanzas
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => exportarCSV(lista)} disabled={lista.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: lista.length ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, color: '#374151', opacity: lista.length ? 1 : 0.4 }}>
            <Download size={14} /> Exportar
          </button>
          <button onClick={cargar} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Actualizar
          </button>
        </div>
      </div>

      {/* Filtros — ARRIBA de las métricas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap', background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>Validado en:</span>

        <select value={mes} onChange={e => setMes(Number(e.target.value))} style={sel}>
          <option value={0}>Todos los meses</option>
          {MESES_LARGOS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>

        <select value={anio} onChange={e => setAnio(Number(e.target.value))} style={sel}>
          <option value={0}>Todos los años</option>
          {aniosDisp.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={concepto} onChange={e => setConcepto(e.target.value)} style={sel}>
          <option value="TODOS">Todos los conceptos</option>
          {conceptosDisp.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Arrendatario, local o contrato…"
            style={{ width: '100%', padding: '7px 11px 7px 32px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: 'white' }} />
        </div>

        {hayFiltros && (
          <button onClick={() => { setMes(0); setAnio(0); setConcepto('TODOS'); setBusqueda('') }}
            style={{ fontSize: 12, color: '#0A66C2', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* KPI cards — ABAJO de los filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KPICard label="Pendientes de factura" count={pendientes.length} total={sumPend} color="#92400E" bg="#FEF3C7" border="#FDE68A" onClick={() => setTab('PENDIENTES')} active={tab === 'PENDIENTES'} />
        <KPICard label="Con CFDI adjunto"      count={facturados.length} total={sumFact} color="#166534" bg="#DCFCE7" border="#86EFAC" onClick={() => setTab('FACTURADOS')} active={tab === 'FACTURADOS'} />
        <KPICard label="Total filtrado"         count={filtrados.length}  total={sumPend + sumFact} color="#1D4ED8" bg="#DBEAFE" border="#93C5FD" onClick={() => setTab('TODOS')} active={tab === 'TODOS'} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 3, gap: 2 }}>
          {[
            ['TODOS',      `Todos (${filtrados.length})`],
            ['PENDIENTES', `Pendientes (${pendientes.length})`],
            ['FACTURADOS', `Facturados (${facturados.length})`],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: tab === k ? 'white' : 'transparent',
                color: tab === k ? 'var(--color-primary)' : '#6B7280',
                boxShadow: tab === k ? '0 1px 4px rgba(0,0,0,.10)' : 'none' }}>
              {l}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>
          {lista.length} cobro{lista.length !== 1 ? 's' : ''} · {fmt(lista.reduce((s, c) => s + (Number(c.importe) || 0), 0))}
        </span>
      </div>

      {/* Lista */}
      {loading
        ? <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Cargando…</div>
        : lista.length === 0
        ? <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF', fontSize: 14 }}>
            No hay cobros que coincidan con los filtros seleccionados
          </div>
        : <div style={{ display: 'grid', gap: 10 }}>
            {lista.map(c => <CargoFactura key={c.id} cargo={c} onActualizar={cargar} />)}
          </div>
      }
    </div>
  )
}

function KPICard({ label, count, total, color, bg, border, onClick, active }) {
  return (
    <div onClick={onClick}
      style={{ background: bg, border: `2px solid ${active ? color : border}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
        boxShadow: active ? `0 0 0 3px ${color}22` : 'none', transition: 'box-shadow .15s, border-color .15s' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1.1 }}>{count}</div>
      <div style={{ fontSize: 12, color, fontWeight: 600, marginTop: 3, opacity: 0.8 }}>{fmt(total)}</div>
    </div>
  )
}

function CargoFactura({ cargo: c, onActualizar }) {
  const [subiendo, setSubiendo]           = useState(null)
  const [folioEdit, setFolioEdit]         = useState(c.numero_factura || '')
  const [guardandoFolio, setGuardandoFolio] = useState(false)
  const pdfRef = useRef()
  const xmlRef = useRef()

  const subirArchivo = async (file, campo) => {
    if (!file) return
    setSubiendo(campo === 'factura_url' ? 'pdf' : 'xml')
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file)
      })
      const ext  = file.name.split('.').pop() || (campo === 'factura_url' ? 'pdf' : 'xml')
      const mime = file.type || (ext === 'zip' ? 'application/zip' : campo === 'factura_url' ? 'application/pdf' : 'application/xml')
      const nombre = campo === 'factura_url' ? `factura.${ext}` : `cfdi.${ext}`
      const resp = await llamarFuncion('subir-comprobante', {
        bucket: 'facturas-cfdi',
        path: `facturas/cargo-${c.id}/${nombre}`,
        file_base64: b64, mime_type: mime,
        cargo_id: c.id, campo,
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        toast.error('Error al subir: ' + (j.error || resp.status))
      } else {
        toast.success(campo === 'factura_url' ? 'PDF adjunto' : 'ZIP/XML adjunto')
        onActualizar()
      }
    } catch (e) { toast.error('Error: ' + e.message) }
    setSubiendo(null)
  }

  const guardarFolio = async () => {
    if (folioEdit === (c.numero_factura || '')) return
    setGuardandoFolio(true)
    const { error } = await supabase.from('cargos_programados').update({ factura: folioEdit.trim() || null }).eq('id', c.id)
    setGuardandoFolio(false)
    if (error) { toast.error(error.message); return }
    toast.success('Folio guardado')
    onActualizar()
  }

  const pago = c.pago
  const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderLeft: `4px solid ${c.tiene_factura ? '#057642' : '#E8A020'}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Info del cargo */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>{fmt(c.importe)}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#DBEAFE', color: '#1D4ED8' }}>
              {c.concepto}
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              {MESES[c.periodo_mes]} {c.periodo_anio}
            </span>
            {c.tiene_factura && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }}>
                ✓ Facturado
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{c.arrendatario_nombre}</div>
          <div style={{ fontSize: 11.5, color: '#6B7280' }}>{c.locales_display} · {c.contrato_folio}</div>

          {/* Ficha del pago */}
          <div style={{ marginTop: 8, padding: '8px 10px', background: '#F8FAFC', borderRadius: 7, border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
              <div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>PAGO RECIBIDO</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{pago?.fecha || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>MONTO APLICADO</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{fmt(pago?.importe_aplicado || pago?.importe_total)}</div>
              </div>
              {pago?.referencia_banco && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>REFERENCIA BANCARIA</div>
                  <div style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>{pago.referencia_banco}</div>
                </div>
              )}
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>VALIDADO POR FINANZAS</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#057642' }}>
                  ✓ {pago?.validado_por || '—'} · {fmtDT(pago?.validado_en)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Folio + archivos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 260 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={folioEdit} onChange={e => setFolioEdit(e.target.value)}
              onBlur={guardarFolio} onKeyDown={e => e.key === 'Enter' && guardarFolio()}
              placeholder="No. Factura / Folio"
              style={{ flex: 1, padding: '7px 10px', border: '1.5px solid #E5E7EB', borderRadius: 7, fontSize: 13, background: 'white' }} />
            {guardandoFolio && <span style={{ fontSize: 11, color: '#9CA3AF', alignSelf: 'center' }}>Guardando…</span>}
          </div>

          {/* PDF */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input ref={pdfRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) subirArchivo(f, 'factura_url'); e.target.value = '' }} />
            {c.factura_url
              ? <EnlacePrivado bucket="facturas-cfdi" valor={c.factura_url}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                    color: '#057642', background: '#DCFCE7', padding: '6px 12px', borderRadius: 20,
                    border: '1px solid #86EFAC', cursor: 'pointer', textDecoration: 'none', flex: 1, justifyContent: 'center' }}>
                  <FileText size={12} /> Factura PDF ✓
                </EnlacePrivado>
              : <button onClick={() => pdfRef.current?.click()} disabled={subiendo === 'pdf'}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '7px 12px', border: '1.5px dashed #D1D5DB', borderRadius: 20, background: 'white',
                    cursor: 'pointer', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                  <Upload size={12} /> {subiendo === 'pdf' ? 'Subiendo…' : 'Subir PDF'}
                </button>
            }
            {c.factura_url && (
              <button onClick={() => pdfRef.current?.click()} disabled={subiendo === 'pdf'} title="Reemplazar PDF"
                style={{ padding: '6px 8px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', cursor: 'pointer', color: '#9CA3AF' }}>
                <Upload size={12} />
              </button>
            )}
          </div>

          {/* ZIP / XML */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input ref={xmlRef} type="file" accept=".xml,.zip,application/xml,text/xml,application/zip" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) subirArchivo(f, 'factura_xml_url'); e.target.value = '' }} />
            {c.factura_xml_url
              ? <EnlacePrivado bucket="facturas-cfdi" valor={c.factura_xml_url}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                    color: '#7C3AED', background: '#F5F3FF', padding: '6px 12px', borderRadius: 20,
                    border: '1px solid #DDD6FE', cursor: 'pointer', textDecoration: 'none', flex: 1, justifyContent: 'center' }}>
                  <FileText size={12} /> ZIP / XML ✓
                </EnlacePrivado>
              : <button onClick={() => xmlRef.current?.click()} disabled={subiendo === 'xml'}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '7px 12px', border: '1.5px dashed #D1D5DB', borderRadius: 20, background: 'white',
                    cursor: 'pointer', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                  <Upload size={12} /> {subiendo === 'xml' ? 'Subiendo…' : 'Subir ZIP / XML'}
                </button>
            }
            {c.factura_xml_url && (
              <button onClick={() => xmlRef.current?.click()} disabled={subiendo === 'xml'} title="Reemplazar ZIP/XML"
                style={{ padding: '6px 8px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', cursor: 'pointer', color: '#9CA3AF' }}>
                <Upload size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
