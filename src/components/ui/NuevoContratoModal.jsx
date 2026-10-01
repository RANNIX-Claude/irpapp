// NuevoContratoModal — inserta en public.contratos + public.contratos_locales
import { useState } from 'react'
import { X, CheckCircle, DollarSign, ChevronRight } from 'lucide-react'
import { usePRP } from '../../hooks/usePRP'
import { supabase } from '../../lib/supabase'

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }

export default function NuevoContratoModal({ onClose, onCreated, fromProspecto = null, arrendatarioId = null, arrendatarioNombre = null }) {
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
    arrendatario_id: arrendatarioId || '',
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
  const [contratoCreado, setContratoCreado] = useState(null) // { id, folio, deposito, fecha_inicio, contrato_id }
  const [depositoForm, setDepositoForm] = useState({ origen: 'EFECTIVO', fecha: '', yaCobrado: false })
  const [savingDep, setSavingDep] = useState(false)
  const [errDep, setErrDep] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setDep = (k, v) => setDepositoForm(f => ({ ...f, [k]: v }))

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
        local_id:        form.local_id,
        renta_asignada:  renta,
      })
      if (e2) throw e2

      const dep = parseFloat(form.deposito_garantia) || parseFloat(form.renta_mensual || 0) * 2
      setContratoCreado({ id: nuevo.id, folio, deposito: dep, fecha_inicio: form.fecha_inicio })
      setDepositoForm(f => ({ ...f, fecha: form.fecha_inicio }))
    } catch (err) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  const registrarDeposito = async () => {
    setSavingDep(true); setErrDep(null)
    try {
      const fechaDep = depositoForm.fecha || contratoCreado.fecha_inicio
      const _fd = new Date(fechaDep + 'T12:00:00')

      // Cargo programado de Depósito en Garantía
      const { data: cargo, error: eCargo } = await supabase.from('cargos_programados').insert({
        contrato_id:      contratoCreado.id,
        concepto:         'DEPOSITO_GARANTIA',
        descripcion:      'Depósito en garantía',
        periodo_mes:      _fd.getMonth() + 1,
        periodo_anio:     _fd.getFullYear(),
        importe:          contratoCreado.deposito,
        fecha_vencimiento: fechaDep,
        generado_auto:    false,
      }).select().single()
      if (eCargo) throw eCargo

      // Si ya fue cobrado, crear ingreso + aplicación
      if (depositoForm.yaCobrado) {
        const { data: ing, error: eIng } = await supabase.from('ingresos').insert({
          fecha:          fechaDep,
          mes:            _fd.getMonth() + 1,
          anio:           _fd.getFullYear(),
          tipo:           'DEPOSITO_GARANTIA',
          tipo_concepto:  'DEPOSITO_GARANTIA',
          origen:         depositoForm.origen,
          importe:        contratoCreado.deposito,
          contrato_id:    contratoCreado.id,
          concepto_origen: `Depósito en Garantía - ${contratoCreado.folio}`,
        }).select().single()
        if (eIng) throw eIng

        const { error: eAp } = await supabase.from('aplicaciones_pago').insert({
          ingreso_id:       ing.id,
          cargo_id:         cargo.id,
          importe_aplicado: contratoCreado.deposito,
        })
        if (eAp) throw eAp
      }

      onCreated?.()
      onClose()
    } catch (err) {
      setErrDep(err.message)
    } finally { setSavingDep(false) }
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

        {contratoCreado ? (
          /* ── Paso 2: Depósito en Garantía ── */
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '10px', marginBottom: '20px' }}>
              <CheckCircle size={20} color="#057642" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#065F46' }}>Contrato {contratoCreado.folio} creado</div>
                <div style={{ fontSize: '12px', color: '#059669' }}>Ahora registra el cobro del depósito en garantía</div>
              </div>
            </div>

            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '10px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase', marginBottom: '2px' }}>Depósito en Garantía</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#0A66C2' }}>{fmt(contratoCreado.deposito)}</div>
              </div>
              <DollarSign size={32} color="#BAE6FD" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={lbl}>Fecha del depósito</label>
                <input type="date" value={depositoForm.fecha} onChange={e => setDep('fecha', e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Forma de cobro</label>
                <select value={depositoForm.origen} onChange={e => setDep('origen', e.target.value)} style={inp}>
                  {['EFECTIVO','TRANSFERENCIA','CHEQUE','DEPOSITO'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: depositoForm.yaCobrado ? '#ECFDF5' : '#F9FAFB', border: `1.5px solid ${depositoForm.yaCobrado ? '#6EE7B7' : '#E5E7EB'}`, borderRadius: '8px', cursor: 'pointer', marginBottom: '16px' }}>
              <input type="checkbox" checked={depositoForm.yaCobrado} onChange={e => setDep('yaCobrado', e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#057642' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: depositoForm.yaCobrado ? '#065F46' : '#374151' }}>Ya fue cobrado</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Crea también el ingreso y lo aplica al cargo</div>
              </div>
            </label>

            {errDep && <div style={{ padding: '8px 12px', background: '#FEF2F2', color: '#B24020', borderRadius: '7px', fontSize: '12px', marginBottom: '12px' }}>{errDep}</div>}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { onCreated?.(); onClose() }}
                style={{ flex: 1, padding: '10px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Omitir
              </button>
              <button onClick={registrarDeposito} disabled={savingDep}
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: savingDep ? '#9CA3AF' : '#0A66C2', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: savingDep ? 'default' : 'pointer' }}>
                <DollarSign size={14} />
                {savingDep ? 'Registrando…' : 'Registrar depósito'}
                {!savingDep && <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'grid', gap: '16px' }}>
            {error && <div style={{ padding: '10px 14px', background: '#FEE2E2', color: '#B24020', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

              {/* Arrendatario */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Arrendatario *</label>
                {arrendatarioId ? (
                  <div style={{ ...inp, background: '#F0F9FF', color: '#0A66C2', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                    {arrendatarioNombre || 'Arrendatario seleccionado'}
                  </div>
                ) : (
                  <select value={form.arrendatario_id} onChange={e => set('arrendatario_id', e.target.value)} style={inp} required>
                    <option value="">— Seleccionar —</option>
                    {(arrendatarios ?? []).map(a => (
                      <option key={a.id} value={a.id}>{a.locatario} {a.nombre_negocio ? `· ${a.nombre_negocio}` : ''} {a.rfc ? `(${a.rfc})` : ''}</option>
                    ))}
                  </select>
                )}
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
