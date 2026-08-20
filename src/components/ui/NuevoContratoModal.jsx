// NuevoContratoModal — inserta en public.contratos + public.contratos_locales
import { useState } from 'react'
import { X } from 'lucide-react'
import { usePRP } from '../../hooks/usePRP'
import { supabase } from '../../lib/supabase'

export default function NuevoContratoModal({ onClose, onCreated, fromProspecto = null }) {
  // Arrendatarios activos de public.arrendatarios
  const { data: arrendatarios } = usePRP('arrendatarios', {
    filters: [['estatus', 'eq', 'ACTIVO']],
    order: { col: 'locatario' },
  })
  // Locales disponibles de public.cat_locales
  const { data: localesDisp } = usePRP('cat_locales', {
    filters: [['estatus', 'eq', 'DISPONIBLE']],
    order: { col: 'numero_local' },
  })

  const yearNow = new Date().getFullYear()
  const defaultFin = new Date()
  defaultFin.setFullYear(defaultFin.getFullYear() + 1)
  defaultFin.setDate(defaultFin.getDate() - 1)

  const [form, setForm] = useState({
    arrendatario_id: '',
    local_id: '',          // id_local de cat_locales (TEXT)
    tipo_contrato: 'ANUAL',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: defaultFin.toISOString().split('T')[0],
    renta_mensual: fromProspecto?.renta || '',
    deposito_garantia: '',
    dia_cobro: '1',
    penalizacion_mora: '5',
    incremento_anual: '0',
    notas: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.arrendatario_id || !form.local_id || !form.renta_mensual) {
      setError('Completa los campos obligatorios (arrendatario, local, renta).'); return
    }
    setSaving(true); setError(null)
    try {
      const renta = parseFloat(form.renta_mensual)
      const seq   = Math.floor(Math.random() * 9000) + 1000
      const folio = `CA-${yearNow}-${seq}`

      // 1. Insertar contrato en public.contratos
      const { data: nuevo, error: e1 } = await supabase.from('contratos').insert({
        numero_contrato:      folio,
        arrendatario_id:      form.arrendatario_id,
        fecha_inicio:         form.fecha_inicio,
        fecha_fin:            form.fecha_fin || null,
        renta_mensual:        renta,
        deposito_garantia:    parseFloat(form.deposito_garantia) || renta * 2,
        dia_pago:             parseInt(form.dia_cobro) || 1,
        penalizacion_pct:     parseFloat(form.penalizacion_mora) || 5,
        incremento_anual_pct: parseFloat(form.incremento_anual) || 0,
        estatus:              'VIGENTE',
        notas:                form.notas || null,
      }).select().single()
      if (e1) throw e1

      // 2. Asociar local en public.contratos_locales
      const { error: e2 } = await supabase.from('contratos_locales').insert({
        contrato_id: nuevo.id,
        local_id:    form.local_id,
        renta_local: renta,
      })
      if (e2) throw e2

      setSuccess(`Contrato ${folio} creado exitosamente.`)
      setTimeout(() => { onCreated?.(); onClose() }, 1800)
    } catch (err) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', marginBottom: '5px', textTransform: 'uppercase' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0A66C2' }}>Nuevo Contrato</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9CA3AF' }}>Folio generado automáticamente</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
        </div>

        {fromProspecto && (
          <div style={{ margin: '16px 24px 0', padding: '10px 14px', background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📋</span>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desde prospecto aprobado</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#065F46' }}>{fromProspecto.nombre || 'Sin nombre'}</div>
            </div>
            {fromProspecto.renta && (
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: '#059669', fontWeight: 700 }}>RENTA PROPUESTA</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#065F46' }}>${Number(fromProspecto.renta).toLocaleString('es-MX')}</div>
              </div>
            )}
          </div>
        )}

        {success ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#057642' }}>{success}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'grid', gap: '16px' }}>
            {error && <div style={{ padding: '10px 14px', background: '#FEE2E2', color: '#B24020', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

              {/* Arrendatario */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Arrendatario *</label>
                <select value={form.arrendatario_id} onChange={e => set('arrendatario_id', e.target.value)} style={inp} required>
                  <option value="">— Seleccionar —</option>
                  {(arrendatarios ?? []).map(a => (
                    <option key={a.id} value={a.id}>{a.locatario} {a.nombre_negocio ? `· ${a.nombre_negocio}` : ''} {a.rfc ? `(${a.rfc})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Local disponible */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Local disponible *</label>
                <select value={form.local_id} onChange={e => set('local_id', e.target.value)} style={inp} required>
                  <option value="">— Seleccionar —</option>
                  {(localesDisp ?? []).map(l => (
                    <option key={l.id_local} value={l.id_local}>{l.numero_local} {l.nivel ? `· ${l.nivel}` : ''} {l.metros_cuadrados ? `· ${l.metros_cuadrados}m²` : ''}</option>
                  ))}
                </select>
                {localesDisp?.length === 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#B45309' }}>⚠ Sin locales disponibles actualmente.</p>
                )}
              </div>

              {/* Tipo contrato */}
              <div>
                <label style={lbl}>Tipo de contrato</label>
                <select value={form.tipo_contrato} onChange={e => set('tipo_contrato', e.target.value)} style={inp}>
                  {[['ANUAL','Anual'],['SEMESTRAL','Semestral'],['MENSUAL','Mensual'],['EVENTUAL','Eventual']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Renta */}
              <div>
                <label style={lbl}>Renta mensual *</label>
                <input type="number" value={form.renta_mensual} onChange={e => set('renta_mensual', e.target.value)}
                  placeholder="0.00" style={inp} required min="1" step="0.01" />
              </div>

              {/* Depósito */}
              <div>
                <label style={lbl}>Depósito en garantía</label>
                <input type="number" value={form.deposito_garantia} onChange={e => set('deposito_garantia', e.target.value)}
                  placeholder={form.renta_mensual ? String(parseFloat(form.renta_mensual || 0) * 2) : '2 meses renta'}
                  style={inp} min="0" step="0.01" />
              </div>

              {/* Día de cobro */}
              <div>
                <label style={lbl}>Día de cobro</label>
                <input type="number" value={form.dia_cobro} onChange={e => set('dia_cobro', e.target.value)}
                  style={inp} min="1" max="28" />
              </div>

              {/* % mora */}
              <div>
                <label style={lbl}>% mora mensual</label>
                <input type="number" value={form.penalizacion_mora} onChange={e => set('penalizacion_mora', e.target.value)}
                  style={inp} min="0" max="100" step="0.1" />
              </div>

              {/* % incremento anual */}
              <div>
                <label style={lbl}>% incremento anual</label>
                <input type="number" value={form.incremento_anual} onChange={e => set('incremento_anual', e.target.value)}
                  style={inp} min="0" max="100" step="0.1" />
              </div>

              {/* Fechas */}
              <div>
                <label style={lbl}>Fecha inicio *</label>
                <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} style={inp} required />
              </div>
              <div>
                <label style={lbl}>Fecha fin</label>
                <input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)}
                  style={inp} min={form.fecha_inicio} />
              </div>

              {/* Notas */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Notas</label>
                <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
                  style={{ ...inp, height: '60px', resize: 'vertical' }} placeholder="Observaciones del contrato..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
              <button type="submit" disabled={saving}
                style={{ flex: 1, padding: '11px', background: saving ? '#9CA3AF' : '#0A66C2', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: saving ? 'default' : 'pointer' }}>
                {saving ? 'Creando...' : 'Crear Contrato'}
              </button>
              <button type="button" onClick={onClose}
                style={{ padding: '11px 20px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
