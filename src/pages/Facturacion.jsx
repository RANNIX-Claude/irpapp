import { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Upload, Search, RefreshCw } from 'lucide-react'
import { supabase, llamarFuncion, urlFirmada } from '../lib/supabase'
import { EnlacePrivado } from '../components/ui/ArchivoPrivado'
import toast from 'react-hot-toast'

const fmt = n => n == null ? '—' : Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

const fmtDT = iso => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function Facturacion() {
  const [cargos, setCargos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('PENDIENTE')

  const cargar = useCallback(async () => {
    setLoading(true)

    // 1. Cargos pagados/parciales
    const { data: dataCargos, error } = await supabase
      .from('prp_cartera')
      .select('id, concepto, descripcion, periodo_mes, periodo_anio, importe, fecha_vencimiento, estado, contrato_id, contrato_folio, arrendatario_nombre, locales_display, numero_factura, factura_url, factura_xml_url, tiene_factura, tiene_comprobante')
      .in('estado', ['PAGADO', 'PARCIAL'])
      .order('fecha_vencimiento', { ascending: false })
    if (error) { toast.error('Error: ' + error.message); setLoading(false); return }

    // 2. Aplicaciones de pago con datos del ingreso (fecha pago + validación Finanzas)
    const ids = (dataCargos || []).map(c => c.id)
    let pagosMap = {}
    if (ids.length) {
      const { data: aplicaciones } = await supabase
        .from('aplicaciones_pago')
        .select('cargo_id, importe_aplicado, ingresos(id, fecha, importe_total, forma_pago, referencia_banco, estatus_validacion, validado_por, validado_en)')
        .in('cargo_id', ids)
      // Para cada cargo guardamos el primer ingreso VALIDADO (o el primero disponible)
      for (const ap of (aplicaciones || [])) {
        const ing = ap.ingresos
        if (!ing) continue
        const prev = pagosMap[ap.cargo_id]
        const esValidado = ing.estatus_validacion === 'VALIDADO'
        if (!prev || (esValidado && prev.estatus_validacion !== 'VALIDADO')) {
          pagosMap[ap.cargo_id] = { ...ing, importe_aplicado: ap.importe_aplicado }
        }
      }
    }

    // 3. Merge — solo cargos cuyo ingreso ya fue VALIDADO por Finanzas
    const merged = (dataCargos || [])
      .map(c => ({ ...c, pago: pagosMap[c.id] || null }))
      .filter(c => c.pago?.estatus_validacion === 'VALIDADO')
    setCargos(merged)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const pendientes  = cargos.filter(c => !c.tiene_factura)
  const completados = cargos.filter(c => c.tiene_factura)

  const lista = (filtro === 'PENDIENTE' ? pendientes : completados)
    .filter(c => !busqueda || (c.arrendatario_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) || (c.locales_display || '').toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Facturación</h1>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>
            Adjunta el CFDI PDF + ZIP a cada cobro validado
          </div>
        </div>
        <button onClick={cargar} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22, maxWidth: 480 }}>
        {[
          { label: 'Pendientes de factura', val: pendientes.length, color: '#92400E', bg: '#FEF3C7' },
          { label: 'Con CFDI adjunto',      val: completados.length, color: '#166534', bg: '#DCFCE7' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs + búsqueda */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 3, gap: 2 }}>
          {[['PENDIENTE','Pendientes'], ['COMPLETADO','Con CFDI']].map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              style={{ padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: filtro === k ? 'white' : 'transparent',
                color: filtro === k ? 'var(--color-primary)' : '#6B7280',
                boxShadow: filtro === k ? '0 1px 4px rgba(0,0,0,.10)' : 'none' }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar arrendatario o local…"
            style={{ width: '100%', padding: '9px 11px 9px 32px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
        </div>
      </div>

      {loading
        ? <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Cargando cargos…</div>
        : lista.length === 0
        ? <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF', fontSize: 14 }}>
            {filtro === 'PENDIENTE' ? 'Todos los cobros tienen CFDI adjunto ✓' : 'Aún no hay cobros con factura adjunta'}
          </div>
        : <div style={{ display: 'grid', gap: 10 }}>
            {lista.map(c => (
              <CargoFactura key={c.id} cargo={c} onActualizar={cargar} />
            ))}
          </div>
      }
    </div>
  )
}

function CargoFactura({ cargo: c, onActualizar }) {
  const [subiendo, setSubiendo] = useState(null) // 'pdf' | 'xml'
  const [folioEdit, setFolioEdit] = useState(c.numero_factura || '')
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
      const ext = file.name.split('.').pop() || (campo === 'factura_url' ? 'pdf' : 'xml')
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

  const pago = c.pago  // ingreso VALIDADO que cubrió este cargo
  const pagoValidado = pago?.estatus_validacion === 'VALIDADO'

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
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{c.arrendatario_nombre}</div>
          <div style={{ fontSize: 11.5, color: '#6B7280' }}>{c.locales_display} · {c.contrato_folio}</div>

          {/* Ficha del pago que cubrió este cobro */}
          <div style={{ marginTop: 8, padding: '8px 10px', background: '#F8FAFC', borderRadius: 7, border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
              <div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>PAGO RECIBIDO</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{pago?.fecha || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>MONTO PAGADO</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{fmt(pago?.importe_total || pago?.importe_aplicado)}</div>
              </div>
              {pago?.referencia_banco && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>REFERENCIA BANCARIA</div>
                  <div style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>{pago.referencia_banco}</div>
                </div>
              )}
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>VALIDADO POR FINANZAS</div>
                {pagoValidado
                  ? <div style={{ fontSize: 11.5, fontWeight: 700, color: '#057642' }}>
                      ✓ {pago.validado_por || '—'} · {fmtDT(pago.validado_en)}
                    </div>
                  : <div style={{ fontSize: 11.5, color: '#F59E0B', fontWeight: 600 }}>⏳ Pendiente de validación</div>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Folio + archivos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 260 }}>

          {/* Folio */}
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={folioEdit} onChange={e => setFolioEdit(e.target.value)}
              onBlur={guardarFolio}
              onKeyDown={e => e.key === 'Enter' && guardarFolio()}
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
