import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Clock, AlertTriangle, Paperclip, Search, RefreshCw, X, ChevronRight, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { EnlacePrivado } from '../components/ui/ArchivoPrivado'
import { useApp } from '../context/AppContext'
import toast from 'react-hot-toast'

const fmt = n => n == null ? '—' : Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

const FP_LABEL = {
  TRANSFERENCIA: 'Transferencia',
  DEPOSITO:      'Depósito bancario',
  CHEQUE:        'Cheque',
  EFECTIVO:      'Efectivo',
}

const BUCKETS_COMPROBANTE = ['comprobantes-pago', 'facturas-cfdi', 'tickets-gastos']

// Intenta firmar la URL con el bucket correcto
function EnlaceComprobante({ url, style, children }) {
  // Detectar bucket del path si es una URL completa de Supabase
  const bucket = url?.includes('comprobantes-pago') ? 'comprobantes-pago'
    : url?.includes('facturas-cfdi') ? 'facturas-cfdi'
    : 'comprobantes-pago'
  return <EnlacePrivado bucket={bucket} valor={url} style={style}>{children}</EnlacePrivado>
}

export default function Finanzas() {
  const { perfil } = useApp()
  const [ingresos, setIngresos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [validando, setValidando] = useState(null)
  const [verIngreso, setVerIngreso] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('prp_ingresos')
      .select('id, fecha, importe, importe_total, forma_pago, referencia_banco, comprobante_url, estatus_validacion, validado_por, validado_en, contrato_id, folio, arrendatario_nombre, locales_display, nota, tipo, concepto_origen')
      .order('fecha', { ascending: false })
    if (error) { toast.error('Error al cargar depósitos: ' + error.message); setLoading(false); return }
    setIngresos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const validar = async (ing) => {
    if (validando) return
    setValidando(ing.id)
    const { error } = await supabase
      .from('ingresos')
      .update({
        estatus_validacion: 'VALIDADO',
        validado_por: perfil?.nombre || perfil?.email || 'Finanzas',
        validado_en: new Date().toISOString(),
      })
      .eq('id', ing.id)
    setValidando(null)
    if (error) { toast.error('No se pudo validar: ' + error.message); return }
    toast.success(`Depósito de ${fmt(ing.importe_total || ing.importe)} validado`)
    const actualizado = { ...ing, estatus_validacion: 'VALIDADO', validado_por: perfil?.nombre || perfil?.email || 'Finanzas', validado_en: new Date().toISOString() }
    setIngresos(prev => prev.map(r => r.id === ing.id ? actualizado : r))
    if (verIngreso?.id === ing.id) setVerIngreso(actualizado)
  }

  const observar = async (ing) => {
    if (validando) return
    setValidando(ing.id)
    const { error } = await supabase.from('ingresos').update({ estatus_validacion: 'OBSERVADO' }).eq('id', ing.id)
    setValidando(null)
    if (error) { toast.error('Error: ' + error.message); return }
    toast('Depósito marcado como Observado', { icon: '⚠️' })
    const actualizado = { ...ing, estatus_validacion: 'OBSERVADO' }
    setIngresos(prev => prev.map(r => r.id === ing.id ? actualizado : r))
    if (verIngreso?.id === ing.id) setVerIngreso(actualizado)
  }

  const porValidar  = ingresos.filter(r => (r.estatus_validacion || 'POR_VALIDAR') === 'POR_VALIDAR')
  const observados  = ingresos.filter(r => (r.estatus_validacion || 'POR_VALIDAR') === 'OBSERVADO')
  const validados   = ingresos.filter(r => (r.estatus_validacion || 'POR_VALIDAR') === 'VALIDADO')

  const filtrar = list => list.filter(r =>
    !busqueda ||
    (r.arrendatario_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (r.folio || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (r.locales_display || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (r.referencia_banco || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalPorValidar = porValidar.reduce((s, r) => s + (parseFloat(r.importe_total || r.importe) || 0), 0)

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Validación de depósitos</h1>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>
            Confirma los depósitos registrados por el administrador de la plaza
          </div>
        </div>
        <button onClick={cargar} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Por validar', valor: porValidar.length, monto: totalPorValidar, color: '#92400E', icono: Clock },
          { label: 'Observados',  valor: observados.length,  monto: null, color: '#991B1B', icono: AlertTriangle },
          { label: 'Validados',   valor: validados.length,   monto: null, color: '#166534', icono: CheckCircle2 },
        ].map(({ label, valor, monto, color, icono: Icono }) => (
          <div key={label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Icono size={14} style={{ color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>{label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{valor}</div>
            {monto != null && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{fmt(monto)}</div>}
          </div>
        ))}
      </div>

      {/* Búsqueda */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 380 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar arrendatario, contrato, referencia…"
          style={{ width: '100%', padding: '9px 11px 9px 32px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
      </div>

      {loading
        ? <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Cargando depósitos…</div>
        : <>
          <SeccionDepositos titulo="Por validar" color="#92400E" lista={filtrar(porValidar)}
            onValidar={validar} onObservar={observar} validando={validando} onVer={setVerIngreso} />
          {filtrar(observados).length > 0 && (
            <SeccionDepositos titulo="Observados — requieren revisión" color="#991B1B" lista={filtrar(observados)}
              onValidar={validar} validando={validando} onVer={setVerIngreso} />
          )}
          {filtrar(validados).length > 0 && (
            <SeccionDepositos titulo={`Validados este período (${filtrar(validados).length})`} color="#166534"
              lista={filtrar(validados)} colapsado validando={validando} onVer={setVerIngreso} />
          )}
        </>
      }

      {/* Panel de detalle */}
      {verIngreso && (
        <DetalleIngreso
          ing={verIngreso}
          onClose={() => setVerIngreso(null)}
          onValidar={validar}
          onObservar={observar}
          validando={validando}
        />
      )}
    </div>
  )
}

/* ── Sección colapsable ─────────────────────────────────── */
function SeccionDepositos({ titulo, color, lista, onValidar, onObservar, validando, colapsado = false, onVer }) {
  const [abierto, setAbierto] = useState(!colapsado)
  if (lista.length === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <button onClick={() => setAbierto(a => !a)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{titulo}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: color, borderRadius: 20, padding: '1px 8px' }}>{lista.length}</span>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div style={{ display: 'grid', gap: 10 }}>
          {lista.map(ing => {
            const monto = parseFloat(ing.importe_total || ing.importe) || 0
            const esEfectivo = (ing.forma_pago || '').toUpperCase() === 'EFECTIVO'
            const fpLabel = FP_LABEL[(ing.forma_pago || '').toUpperCase()] || ing.forma_pago || '—'
            const estatus = ing.estatus_validacion || 'POR_VALIDAR'

            return (
              <div key={ing.id}
                onClick={() => onVer?.(ing)}
                style={{ background: 'white', border: '1px solid #E5E7EB', borderLeft: `4px solid ${color}`, borderRadius: 10,
                  padding: '14px 16px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
                  cursor: 'pointer', transition: 'box-shadow .12s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,.10)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                {/* Info principal */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: '#111827' }}>{fmt(monto)}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      background: esEfectivo ? '#FEF3C7' : '#DBEAFE',
                      color: esEfectivo ? '#92400E' : '#1D4ED8' }}>
                      {esEfectivo ? '💵 Efectivo' : `⇄ ${fpLabel}`}
                    </span>
                    {estatus === 'VALIDADO' && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#DCFCE7', color: '#166534' }}>✓ Validado</span>}
                    {estatus === 'OBSERVADO' && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#FEE2E2', color: '#991B1B' }}>⚠ Observado</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{ing.arrendatario_nombre}</div>
                  <div style={{ fontSize: 11.5, color: '#6B7280' }}>
                    {ing.folio && <span>{ing.folio}</span>}
                    {ing.locales_display && <span> · {ing.locales_display}</span>}
                    {ing.fecha && <span> · {ing.fecha}</span>}
                  </div>
                  {ing.referencia_banco && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Ref: {ing.referencia_banco}</div>}
                </div>

                {/* Estado comprobante + acciones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }} onClick={e => e.stopPropagation()}>
                  {ing.comprobante_url
                    ? <span style={{ fontSize: 11, fontWeight: 700, color: '#0A66C2', background: '#EFF6FF', padding: '4px 10px', borderRadius: 20, border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Paperclip size={11} /> Con comprobante
                      </span>
                    : <span style={{ fontSize: 11, color: '#9CA3AF', padding: '4px 10px', border: '1px dashed #E5E7EB', borderRadius: 20 }}>
                        Sin comprobante
                      </span>
                  }
                  {estatus !== 'VALIDADO' && onValidar && (
                    <button onClick={e => { e.stopPropagation(); onValidar(ing) }} disabled={validando === ing.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: 'none', borderRadius: 7,
                        background: '#057642', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: validando === ing.id ? 0.7 : 1 }}>
                      <CheckCircle2 size={13} /> {validando === ing.id ? 'Validando…' : 'Validar'}
                    </button>
                  )}
                  {estatus === 'POR_VALIDAR' && onObservar && (
                    <button onClick={e => { e.stopPropagation(); onObservar(ing) }} disabled={!!validando}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1.5px solid #FCA5A5', borderRadius: 7,
                        background: 'white', color: '#991B1B', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                      <AlertTriangle size={11} /> Observar
                    </button>
                  )}
                </div>

                <ChevronRight size={16} style={{ color: '#D1D5DB', flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Panel de detalle ───────────────────────────────────── */
function DetalleIngreso({ ing, onClose, onValidar, onObservar, validando }) {
  const [aplicaciones, setAplicaciones] = useState([])
  const estatus = ing.estatus_validacion || 'POR_VALIDAR'
  const monto = parseFloat(ing.importe_total || ing.importe) || 0
  const esEfectivo = (ing.forma_pago || '').toUpperCase() === 'EFECTIVO'
  const fpLabel = FP_LABEL[(ing.forma_pago || '').toUpperCase()] || ing.forma_pago || '—'

  useEffect(() => {
    supabase
      .from('aplicaciones_pago')
      .select('id, importe_aplicado, cargo_id, cargos_programados(concepto, periodo_mes, periodo_anio, importe)')
      .eq('ingreso_id', ing.id)
      .then(({ data }) => setAplicaciones(data || []))
  }, [ing.id])

  const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />

      {/* Panel */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '100vw',
        background: 'white', zIndex: 1001, boxShadow: '-4px 0 32px rgba(0,0,0,.15)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Encabezado del panel */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
                Detalle del depósito
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#111827' }}>{fmt(monto)}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, borderRadius: 6 }}>
              <X size={20} />
            </button>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              background: esEfectivo ? '#FEF3C7' : '#DBEAFE', color: esEfectivo ? '#92400E' : '#1D4ED8' }}>
              {esEfectivo ? '💵 Efectivo' : `⇄ ${fpLabel}`}
            </span>
            {estatus === 'VALIDADO' && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#DCFCE7', color: '#166534' }}>✓ Validado</span>}
            {estatus === 'OBSERVADO' && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#FEE2E2', color: '#991B1B' }}>⚠ Observado</span>}
            {estatus === 'POR_VALIDAR' && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#FEF3C7', color: '#92400E' }}>⏳ Por validar</span>}
          </div>
        </div>

        {/* Cuerpo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Arrendatario */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Arrendatario</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{ing.arrendatario_nombre || '—'}</div>
            <div style={{ fontSize: 12.5, color: '#6B7280' }}>{ing.folio}{ing.locales_display ? ` · ${ing.locales_display}` : ''}</div>
          </section>

          {/* Datos del pago */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Datos del pago</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
              {[
                ['Fecha',        ing.fecha || '—'],
                ['Forma de pago', fpLabel],
                ['Importe',      fmt(ing.importe)],
                ['Total recibido', fmt(ing.importe_total || ing.importe)],
                ['Referencia bancaria', ing.referencia_banco || '—'],
                ['Tipo', ing.tipo || '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10.5, color: '#9CA3AF', fontWeight: 600, marginBottom: 1 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{val}</div>
                </div>
              ))}
            </div>
            {ing.nota && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#F9FAFB', borderRadius: 7, fontSize: 12.5, color: '#6B7280', fontStyle: 'italic', border: '1px solid #F3F4F6' }}>
                {ing.nota}
              </div>
            )}
          </section>

          {/* Comprobante */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Comprobante de pago</div>
            {ing.comprobante_url
              ? <EnlaceComprobante url={ing.comprobante_url}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 9,
                    background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#0A66C2',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'none' }}>
                  <FileText size={15} /> Ver comprobante
                </EnlaceComprobante>
              : <div style={{ padding: '12px 14px', background: '#F9FAFB', borderRadius: 9, border: '1px dashed #E5E7EB', fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                  Sin comprobante adjunto
                </div>
            }
          </section>

          {/* Cargos aplicados */}
          {aplicaciones.length > 0 && (
            <section>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                Cargos cubiertos ({aplicaciones.length})
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {aplicaciones.map(ap => {
                  const cp = ap.cargos_programados
                  return (
                    <div key={ap.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #F3F4F6' }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#374151' }}>{cp?.concepto || 'Cargo'}</div>
                        {cp?.periodo_mes && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{MESES[cp.periodo_mes]} {cp.periodo_anio}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{fmt(ap.importe_aplicado)}</div>
                        {cp?.importe && parseFloat(ap.importe_aplicado) < parseFloat(cp.importe) && (
                          <div style={{ fontSize: 10, color: '#F59E0B' }}>de {fmt(cp.importe)}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Validación */}
          {estatus === 'VALIDADO' && ing.validado_por && (
            <section>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Validación</div>
              <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, fontSize: 13, color: '#166534' }}>
                ✓ Validado por <strong>{ing.validado_por}</strong>
                {ing.validado_en && <span style={{ color: '#4ADE80' }}> · {ing.validado_en.slice(0, 10)}</span>}
              </div>
            </section>
          )}
        </div>

        {/* Acciones */}
        {estatus !== 'VALIDADO' && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 8 }}>
            <button onClick={() => onValidar(ing)} disabled={validando === ing.id}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '11px', border: 'none', borderRadius: 9, background: '#057642', color: 'white',
                cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: validando === ing.id ? 0.7 : 1 }}>
              <CheckCircle2 size={16} /> {validando === ing.id ? 'Validando…' : 'Validar depósito'}
            </button>
            {estatus === 'POR_VALIDAR' && (
              <button onClick={() => onObservar(ing)} disabled={!!validando}
                style={{ padding: '11px 16px', border: '1.5px solid #FCA5A5', borderRadius: 9, background: 'white',
                  color: '#991B1B', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertTriangle size={14} /> Observar
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
