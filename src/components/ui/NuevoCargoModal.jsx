import { useState, useEffect } from 'react'
import { X, Save, CalendarPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// Los cinco que acepta el CHECK de cargos_programados.
const CONCEPTOS = [
  { val: 'RENTA',         label: 'Renta' },
  { val: 'SANCION',       label: 'Sanción por mora' },
  { val: 'AGUA',          label: 'Agua' },
  { val: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { val: 'OTRO',          label: 'Otro' },
]

const inp = { width: '100%', padding: '9px 11px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '.03em' }

/**
 * Alta manual de un cargo a cobrar.
 *
 * La cobranza mensual debería generarse sola el día 1, pero cuando no corre —o
 * cuando hay que cobrar algo fuera del ciclo, como una sanción o el agua— este
 * formulario permite registrarlo a mano. El cargo entra como PENDIENTE y desde
 * ahí sigue el flujo normal de aplicación de pagos.
 */
export default function NuevoCargoModal({ onClose, onSaved, contratoFijo = null }) {
  const hoy = new Date()
  const [contratos, setContratos] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    contrato_id: contratoFijo?.id || '',
    concepto: 'RENTA',
    periodo_mes: hoy.getMonth() + 1,
    periodo_anio: hoy.getFullYear(),
    importe: '',
    fecha_vencimiento: '',
    descripcion: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const contrato = contratoFijo || contratos.find(c => c.id === form.contrato_id)

  useEffect(() => {
    if (contratoFijo) return  // ya sabemos el contrato, no hace falta el catálogo completo
    supabase.from('prp_contratos')
      .select('id, folio, arrendatario_nombre, locales_display, renta_mensual, dia_pago')
      .order('locales_display', { ascending: true, nullsFirst: false })
      .then(({ data }) => setContratos(data ?? []))
  }, [contratoFijo])

  // Al elegir contrato o cambiar el período, se proponen importe y vencimiento:
  // la renta del contrato y su día de pago. Ambos siguen siendo editables.
  useEffect(() => {
    if (!contrato) return
    const dia = Math.min(contrato.dia_pago || 1, new Date(form.periodo_anio, form.periodo_mes, 0).getDate())
    setForm(f => ({
      ...f,
      importe: f.concepto === 'RENTA' && contrato.renta_mensual ? String(contrato.renta_mensual) : f.importe,
      fecha_vencimiento: `${form.periodo_anio}-${String(form.periodo_mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
    }))
  }, [form.contrato_id, form.periodo_mes, form.periodo_anio, form.concepto])

  const guardar = async () => {
    if (!form.contrato_id) return toast.error('Elige el contrato')
    if (!form.importe || parseFloat(form.importe) <= 0) return toast.error('El importe debe ser mayor a cero')
    if (!form.fecha_vencimiento) return toast.error('Indica la fecha en que se debe cobrar')

    setSaving(true)
    const etiqueta = CONCEPTOS.find(c => c.val === form.concepto)?.label ?? form.concepto
    const local = contrato?.locales_display ? ` — ${contrato.locales_display}` : ''

    const { error } = await supabase.from('cargos_programados').insert({
      contrato_id:       form.contrato_id,
      concepto:          form.concepto,
      descripcion:       form.descripcion.trim()
        || `${etiqueta} ${MESES[form.periodo_mes]} ${form.periodo_anio}${local}`,
      periodo_mes:       parseInt(form.periodo_mes),
      periodo_anio:      parseInt(form.periodo_anio),
      importe:           parseFloat(form.importe),
      fecha_vencimiento: form.fecha_vencimiento,
      estado:            'PENDIENTE',
      generado_auto:     false,   // alta manual: no vino del proceso mensual
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Cargo agregado a la cartera')
    onSaved?.(); onClose()
  }

  const anios = [hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 14, width: 520, maxWidth: '96vw', maxHeight: '92vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
              <CalendarPlus size={17} color="var(--color-primary)" /> Agregar cobro
            </h3>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
              Un cargo por cobrar, no un pago recibido
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '18px 22px', display: 'grid', gap: 14 }}>
          <div>
            <label style={lbl}>Contrato *</label>
            {contratoFijo ? (
              <div style={{ ...inp, background: '#F9FAFB', color: '#374151', display: 'flex', alignItems: 'center' }}>
                {contratoFijo.locales_display ? `${contratoFijo.locales_display} · ` : ''}{contratoFijo.arrendatario_nombre}
              </div>
            ) : (
              <select value={form.contrato_id} onChange={e => set('contrato_id', e.target.value)}
                style={{ ...inp, background: 'white' }}>
                <option value="">— Seleccionar —</option>
                {contratos.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.locales_display ? `${c.locales_display} · ` : ''}{c.arrendatario_nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label style={lbl}>Concepto *</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CONCEPTOS.map(c => (
                <button key={c.val} type="button" onClick={() => set('concepto', c.val)}
                  style={{
                    padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    border: '1.5px solid', borderColor: form.concepto === c.val ? 'var(--color-primary)' : '#E5E7EB',
                    background: form.concepto === c.val ? 'var(--color-primary)' : 'white',
                    color: form.concepto === c.val ? 'white' : '#6B7280',
                  }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Período — mes</label>
              <select value={form.periodo_mes} onChange={e => set('periodo_mes', parseInt(e.target.value))}
                style={{ ...inp, background: 'white' }}>
                {MESES.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Período — año</label>
              <select value={form.periodo_anio} onChange={e => set('periodo_anio', parseInt(e.target.value))}
                style={{ ...inp, background: 'white' }}>
                {anios.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Importe *</label>
              <input type="number" step="0.01" value={form.importe}
                onChange={e => set('importe', e.target.value)} placeholder="0.00"
                style={{ ...inp, fontVariantNumeric: 'tabular-nums' }} />
            </div>
            <div>
              <label style={lbl}>Se debe cobrar el *</label>
              <input type="date" value={form.fecha_vencimiento}
                onChange={e => set('fecha_vencimiento', e.target.value)} style={inp} />
            </div>
          </div>

          {contrato && form.concepto === 'RENTA' && (
            <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: -6 }}>
              Renta del contrato: ${parseFloat(contrato.renta_mensual || 0).toLocaleString('es-MX')}
              {contrato.dia_pago ? ` · vence el día ${contrato.dia_pago} de cada mes` : ''}
            </div>
          )}

          <div>
            <label style={lbl}>Descripción</label>
            <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              placeholder={`${CONCEPTOS.find(c => c.val === form.concepto)?.label} ${MESES[form.periodo_mes]} ${form.periodo_anio}`}
              style={inp} />
            <div style={{ fontSize: 10.5, color: '#9CA3AF', marginTop: 3 }}>
              Si la dejas vacía se arma sola con el concepto, el período y el local
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: 10, border: '1.5px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={saving}
            style={{ flex: 2, padding: 10, border: 'none', borderRadius: 8, background: 'var(--color-primary)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: saving ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Save size={15} /> {saving ? 'Guardando…' : 'Agregar a la cartera'}
          </button>
        </div>
      </div>
    </div>
  )
}
