import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Clock, AlertTriangle, Paperclip, Search, RefreshCw } from 'lucide-react'
import { supabase, urlFirmada } from '../lib/supabase'
import { EnlacePrivado } from '../components/ui/ArchivoPrivado'
import { useApp } from '../context/AppContext'
import toast from 'react-hot-toast'

const fmt = n => n == null ? '—' : Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

const ESTATUS = {
  POR_VALIDAR: { label: 'Por validar', bg: '#FEF3C7', color: '#92400E' },
  VALIDADO:    { label: 'Validado',    bg: '#DCFCE7', color: '#166534' },
  OBSERVADO:   { label: 'Observado',   bg: '#FEE2E2', color: '#991B1B' },
}

const FP_LABEL = {
  TRANSFERENCIA: 'Transferencia',
  DEPOSITO:      'Depósito',
  CHEQUE:        'Cheque',
  EFECTIVO:      'Efectivo',
}

export default function Finanzas() {
  const { perfil } = useApp()
  const [ingresos, setIngresos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [validando, setValidando] = useState(null) // id del ingreso que se está validando

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('prp_ingresos')
      .select('id, fecha, importe, importe_total, forma_pago, referencia_banco, comprobante_url, estatus_validacion, validado_por, validado_en, contrato_id, folio, arrendatario_nombre, locales_display, nota')
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
    setIngresos(prev => prev.map(r => r.id === ing.id
      ? { ...r, estatus_validacion: 'VALIDADO', validado_por: perfil?.nombre || perfil?.email || 'Finanzas', validado_en: new Date().toISOString() }
      : r))
  }

  const observar = async (ing) => {
    if (validando) return
    setValidando(ing.id)
    const { error } = await supabase
      .from('ingresos')
      .update({ estatus_validacion: 'OBSERVADO' })
      .eq('id', ing.id)
    setValidando(null)
    if (error) { toast.error('Error: ' + error.message); return }
    toast('Depósito marcado como Observado', { icon: '⚠️' })
    setIngresos(prev => prev.map(r => r.id === ing.id ? { ...r, estatus_validacion: 'OBSERVADO' } : r))
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
          { label: 'Por validar', valor: porValidar.length, monto: totalPorValidar, color: '#92400E', bg: '#FEF3C7', icono: Clock },
          { label: 'Observados',  valor: observados.length,  monto: null, color: '#991B1B', bg: '#FEE2E2', icono: AlertTriangle },
          { label: 'Validados',   valor: validados.length,   monto: null, color: '#166534', bg: '#DCFCE7', icono: CheckCircle2 },
        ].map(({ label, valor, monto, color, bg, icono: Icono }) => (
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
          {/* ── Por validar ── */}
          <SeccionDepositos
            titulo="Por validar"
            color="#92400E" bg="#FEF9C3"
            lista={filtrar(porValidar)}
            onValidar={validar}
            onObservar={observar}
            validando={validando}
          />

          {/* ── Observados ── */}
          {filtrar(observados).length > 0 && (
            <SeccionDepositos
              titulo="Observados — requieren revisión"
              color="#991B1B" bg="#FEE2E2"
              lista={filtrar(observados)}
              onValidar={validar}
              validando={validando}
            />
          )}

          {/* ── Validados (colapsado) ── */}
          {filtrar(validados).length > 0 && (
            <SeccionDepositos
              titulo={`Validados este período (${filtrar(validados).length})`}
              color="#166534" bg="#F0FDF4"
              lista={filtrar(validados)}
              colapsado
              validando={validando}
            />
          )}
        </>
      }
    </div>
  )
}

function SeccionDepositos({ titulo, color, bg, lista, onValidar, onObservar, validando, colapsado = false }) {
  const [abierto, setAbierto] = useState(!colapsado)

  if (lista.length === 0) return null

  const fmt = n => n == null ? '—' : Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

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

            return (
              <div key={ing.id} style={{ background: 'white', border: `1px solid #E5E7EB`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Datos del depósito */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{fmt(monto)}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      background: esEfectivo ? '#FEF3C7' : '#DBEAFE',
                      color: esEfectivo ? '#92400E' : '#1D4ED8' }}>
                      {esEfectivo ? '💵 Efectivo' : `⇄ ${fpLabel}`}
                    </span>
                    {ing.estatus_validacion === 'VALIDADO' && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#DCFCE7', color: '#166534' }}>✓ Validado</span>
                    )}
                    {ing.estatus_validacion === 'OBSERVADO' && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#FEE2E2', color: '#991B1B' }}>⚠ Observado</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{ing.arrendatario_nombre}</div>
                  <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 2 }}>
                    {ing.folio && <span>{ing.folio}</span>}
                    {ing.locales_display && <span> · {ing.locales_display}</span>}
                    {ing.fecha && <span> · {ing.fecha}</span>}
                  </div>
                  {ing.referencia_banco && (
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>Ref: {ing.referencia_banco}</div>
                  )}
                  {ing.nota && (
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3, fontStyle: 'italic' }}>{ing.nota}</div>
                  )}
                  {ing.estatus_validacion === 'VALIDADO' && ing.validado_por && (
                    <div style={{ fontSize: 10.5, color: '#166534', marginTop: 4 }}>
                      Validó {ing.validado_por}{ing.validado_en ? ` · ${ing.validado_en.slice(0, 10)}` : ''}
                    </div>
                  )}
                </div>

                {/* Comprobante */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  {ing.comprobante_url
                    ? <EnlacePrivado bucket="facturas-cfdi" valor={ing.comprobante_url}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                          color: '#0A66C2', background: '#EFF6FF', padding: '6px 12px', borderRadius: 20,
                          border: '1px solid #BFDBFE', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        <Paperclip size={12} /> Comprobante
                      </EnlacePrivado>
                    : <span style={{ fontSize: 11.5, color: '#9CA3AF', padding: '6px 12px', border: '1px dashed #E5E7EB', borderRadius: 20 }}>
                        Sin comprobante
                      </span>
                  }

                  {/* Acciones */}
                  {(ing.estatus_validacion || 'POR_VALIDAR') !== 'VALIDADO' && onValidar && (
                    <button onClick={() => onValidar(ing)} disabled={validando === ing.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', borderRadius: 8,
                        background: '#057642', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                        opacity: validando === ing.id ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                      <CheckCircle2 size={14} /> {validando === ing.id ? 'Validando…' : 'Validar'}
                    </button>
                  )}
                  {(ing.estatus_validacion || 'POR_VALIDAR') === 'POR_VALIDAR' && onObservar && (
                    <button onClick={() => onObservar(ing)} disabled={!!validando}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1.5px solid #FCA5A5', borderRadius: 8,
                        background: 'white', color: '#991B1B', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      <AlertTriangle size={12} /> Observar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
