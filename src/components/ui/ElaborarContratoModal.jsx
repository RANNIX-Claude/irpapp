import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react'
import { FileText, Download, X, ChevronRight, ChevronLeft, AlertCircle, CheckCircle } from 'lucide-react'
import { logAudit } from '../../hooks/useAudit'

const NETLIFY_FN = '/.netlify/functions/generar-documentos'

// ── Descarga DOCX desde Blob (la función devuelve binario con isBase64Encoded)
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Para tipo='ambos' la función devuelve JSON con base64 strings
function downloadBase64(b64, filename) {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  downloadBlob(blob, filename)
}

const STEPS = ['Arrendatario', 'Contrato', 'Fiador', 'Generar']

const CAMPOS_DOC = {
  FISICA: [
    { key: 'ine', label: 'INE / Pasaporte / Cédula Profesional', requerido: true },
    { key: 'comprobante_domicilio', label: 'Comprobante de domicilio (agua, luz, cable — últimos 3 meses)', requerido: true },
    { key: 'comprobante_ingresos_1', label: 'Comprobante de ingresos — mes 1 (nómina o estado de cuenta)', requerido: true },
    { key: 'comprobante_ingresos_2', label: 'Comprobante de ingresos — mes 2', requerido: true },
    { key: 'comprobante_ingresos_3', label: 'Comprobante de ingresos — mes 3', requerido: true },
    { key: 'curp', label: 'CURP', requerido: false },
    { key: 'acta_nacimiento', label: 'Acta de nacimiento', requerido: false },
  ],
  MORAL: [
    { key: 'acta_constitutiva', label: 'Acta Constitutiva / Instrumento Notarial', requerido: true },
    { key: 'poder_rep', label: 'Poder notarial del representante legal', requerido: true },
    { key: 'ine_rep', label: 'INE del representante legal', requerido: true },
    { key: 'cif', label: 'Constancia de Situación Fiscal / RFC', requerido: true },
    { key: 'comprobante_domicilio', label: 'Comprobante de domicilio fiscal (últimos 3 meses)', requerido: true },
    { key: 'estado_cuenta_1', label: 'Estado de cuenta bancario — mes 1', requerido: true },
    { key: 'estado_cuenta_2', label: 'Estado de cuenta bancario — mes 2', requerido: true },
    { key: 'estado_cuenta_3', label: 'Estado de cuenta bancario — mes 3', requerido: true },
  ],
}

// ── Context para pasar form/set a componentes de formulario ─────────────────
const FormCtx = createContext(null)

// ── Componentes de formulario FUERA del componente principal ─────────────────
// Al estar fuera, React los reconoce como tipos estables y no los desmonta
// en cada re-render (corrige bug de "solo permite 1 carácter").

function Field({ label, required, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function FInput({ field, ...props }) {
  const { form, set } = useContext(FormCtx)
  return (
    <input
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={form[field] ?? ''}
      onChange={e => set(field, e.target.value)}
      {...props}
    />
  )
}

function FSelect({ field, options, ...props }) {
  const { form, set } = useContext(FormCtx)
  return (
    <select
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={form[field] ?? ''}
      onChange={e => set(field, e.target.value)}
      {...props}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function FTextarea({ field, rows = 2, ...props }) {
  const { form, set } = useContext(FormCtx)
  return (
    <textarea
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      rows={rows}
      value={form[field] ?? ''}
      onChange={e => set(field, e.target.value)}
      {...props}
    />
  )
}

// ── Steps como componentes estables (fuera de ElaborarContratoModal) ─────────

function StepArrendatario({ docCheck, setDocCheck }) {
  const { form, set } = useContext(FormCtx)
  const camposDoc = CAMPOS_DOC[form.tipo_persona] || []
  const docsRequeridos = camposDoc.filter(c => c.requerido)
  const docsCompletos = docsRequeridos.every(c => docCheck[c.key])
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Datos del Arrendatario</h3>
      <Field label="Tipo de persona" required>
        <FSelect field="tipo_persona" options={[
          { value: 'FISICA', label: 'Persona Física' },
          { value: 'MORAL', label: 'Persona Moral / Empresa' },
        ]} />
      </Field>
      <Field label={form.tipo_persona === 'MORAL' ? 'Razón Social' : 'Nombre Completo'} required>
        <FInput field="arrendatario_nombre" placeholder="Nombre completo o Razón social" />
      </Field>
      {form.tipo_persona === 'MORAL' && (
        <>
          <Field label="Representante Legal" required>
            <FInput field="arrendatario_rep" placeholder="Nombre del representante legal" />
          </Field>
          <Field label="Instrumento Notarial (Acta constitutiva)">
            <FInput field="arrendatario_instrumento" placeholder="libro X, instrumento Y, fecha Z" />
          </Field>
        </>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="RFC" required>
          <FInput field="arrendatario_rfc" placeholder="RFC con homoclave" />
        </Field>
        <Field label="Teléfono">
          <FInput field="arrendatario_telefono" placeholder="55 1234 5678" />
        </Field>
      </div>
      <Field label="Domicilio" required>
        <FTextarea field="arrendatario_domicilio" placeholder="Calle, número, colonia, CP, ciudad" />
      </Field>
      <div className="mt-6">
        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span>Documentación recibida</span>
          {docsCompletos
            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={12} /> Completa</span>
            : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={12} /> Pendiente</span>
          }
        </h4>
        <div className="space-y-2">
          {camposDoc.map(campo => (
            <label key={campo.key} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={!!docCheck[campo.key]}
                onChange={e => setDocCheck(dc => ({ ...dc, [campo.key]: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                {campo.label}
                {campo.requerido && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>
          ))}
        </div>
        {!docsCompletos && (
          <p className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
            Los documentos marcados con * son requeridos para proceder con la elaboración del contrato.
          </p>
        )}
      </div>
    </div>
  )
}

function StepContrato() {
  const { form, set } = useContext(FormCtx)
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Condiciones del Contrato</h3>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Número de local" required>
          <FInput field="numero_local" placeholder="L-15 / 6 y 7" />
        </Field>
        <Field label="Duración (meses)" required>
          <FSelect field="duracion_meses" options={[6,12,24,36].map(n => ({ value: n, label: `${n} meses` }))} />
        </Field>
      </div>
      <Field label="Domicilio del local">
        <FTextarea field="domicilio_local" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Fecha de inicio" required>
          <FInput field="fecha_inicio" type="date" />
        </Field>
        <Field label="Fecha de término (auto)">
          <input
            className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500"
            value={form.fecha_fin}
            readOnly
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Renta mensual ($)" required>
          <FInput field="renta_mensual" type="number" placeholder="38682" />
        </Field>
        <Field label="Día de pago (del mes)" required>
          <FInput field="dia_pago" type="number" min="1" max="28" placeholder="10" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Interés moratorio">
          <FSelect field="interes_moratorio" options={[
            { value: 'cinco', label: '5% mensual' },
            { value: 'diez', label: '10% mensual' },
            { value: 'quince', label: '15% mensual' },
          ]} />
        </Field>
        <Field label="Depósito en garantía">
          <FSelect field="meses_deposito" options={[1,2,3].map(n => ({ value: n, label: `${n} mes${n>1?'es':''}` }))} />
        </Field>
      </div>
      <Field label="Giro / destino del local" required>
        <FTextarea field="giro_actividad" placeholder="Venta y distribución de electrónicos, servicio de cafetería..." />
      </Field>
    </div>
  )
}

function StepFiador() {
  const { form } = useContext(FormCtx)
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Fiador</h3>
      <Field label="Nombre completo del fiador" required>
        <FInput field="fiador_nombre" placeholder="Nombre del fiador solidario" />
      </Field>
      <Field label="No. de INE / identificación oficial">
        <FInput field="fiador_ine" placeholder="Número de credencial para votar" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Teléfono del fiador">
          <FInput field="fiador_telefono" placeholder="55 1234 5678" />
        </Field>
      </div>
      <Field label="Domicilio del fiador">
        <FTextarea field="fiador_domicilio" placeholder="Calle, número, colonia, CP, municipio, estado" />
      </Field>

      <h3 className="font-semibold text-gray-700 mt-6 mb-4 pb-2 border-b">Configuración de Pagarés</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
        Se generarán <strong>{form.duracion_meses} pagarés</strong> (2 copias por pagaré = {form.duracion_meses * 2} hojas).<br />
        Cada pagaré vence el día <strong>{form.dia_vencimiento}</strong> del mes correspondiente, iniciando desde el mes siguiente a la firma.
      </div>
      <Field label="Día de vencimiento de cada pagaré (del mes)" required>
        <FInput field="dia_vencimiento" type="number" min="1" max="28" placeholder="6" />
      </Field>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2 text-xs text-gray-600">
        <strong>Vista previa pagarés:</strong><br />
        {Array.from({ length: Math.min(3, Number(form.duracion_meses)) }, (_, i) => {
          if (!form.fecha_inicio) return null
          const d = new Date(form.fecha_inicio + 'T12:00:00')
          d.setMonth(d.getMonth() + i + 1)
          d.setDate(Number(form.dia_vencimiento))
          return (
            <span key={i} className="inline-block mr-3">
              Pagaré {String(i+1).padStart(2,'0')}/{String(form.duracion_meses).padStart(2,'0')} — vence {d.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}
            </span>
          )
        })}
        {Number(form.duracion_meses) > 3 && <span>... y {Number(form.duracion_meses) - 3} más</span>}
      </div>
    </div>
  )
}

function StepGenerar({ generando, error, onGenerar, docsCompletos }) {
  const { form } = useContext(FormCtx)
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Generar Documentos</h3>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-sm space-y-1">
        <div className="font-semibold text-gray-700 mb-2">Resumen del contrato</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-gray-500">Arrendatario</span>
          <span className="font-medium text-gray-800">{form.arrendatario_nombre}</span>
          <span className="text-gray-500">Local</span>
          <span className="font-medium text-gray-800">{form.numero_local}</span>
          <span className="text-gray-500">Período</span>
          <span className="font-medium text-gray-800">{form.fecha_inicio} → {form.fecha_fin} ({form.duracion_meses} meses)</span>
          <span className="text-gray-500">Renta mensual</span>
          <span className="font-medium text-gray-800">${Number(form.renta_mensual).toLocaleString('es-MX')}</span>
          <span className="text-gray-500">Depósito</span>
          <span className="font-medium text-gray-800">${(Number(form.renta_mensual) * Number(form.meses_deposito)).toLocaleString('es-MX')} ({form.meses_deposito} mes)</span>
          <span className="text-gray-500">Fiador</span>
          <span className="font-medium text-gray-800">{form.fiador_nombre}</span>
          <span className="text-gray-500">Pagarés</span>
          <span className="font-medium text-gray-800">{form.duracion_meses} pagarés — vencen día {form.dia_vencimiento} de c/mes</span>
          <span className="text-gray-500">Giro</span>
          <span className="font-medium text-gray-800">{form.giro_actividad}</span>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <span className="text-gray-500">Documentación:&nbsp;</span>
          {docsCompletos
            ? <span className="text-green-600 font-medium">✓ Completa</span>
            : <span className="text-yellow-600 font-medium">⚠ Incompleta — puede continuar pero valide antes de firmar</span>
          }
        </div>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => onGenerar('ambos')}
          disabled={!!generando || !form.fecha_inicio || !form.renta_mensual}
          className="flex items-center justify-center gap-3 bg-[#0A66C2] hover:bg-[#1A3C5E] disabled:opacity-50 text-white rounded-xl py-3.5 px-6 font-semibold text-base transition"
        >
          <Download size={20} />
          {generando === 'ambos' ? 'Generando...' : `Elaborar Contrato + ${form.duracion_meses} Pagarés`}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onGenerar('contrato')}
            disabled={!!generando || !form.fecha_inicio || !form.renta_mensual}
            className="flex items-center justify-center gap-2 border-2 border-[#0A66C2] text-[#0A66C2] hover:bg-blue-50 disabled:opacity-50 rounded-xl py-3 px-4 font-medium text-sm transition"
          >
            <FileText size={17} />
            {generando === 'contrato' ? 'Generando...' : 'Solo Contrato'}
          </button>
          <button
            onClick={() => onGenerar('pagares')}
            disabled={!!generando || !form.fecha_inicio || !form.renta_mensual}
            className="flex items-center justify-center gap-2 border-2 border-[#E8A020] text-[#E8A020] hover:bg-yellow-50 disabled:opacity-50 rounded-xl py-3 px-4 font-medium text-sm transition"
          >
            <FileText size={17} />
            {generando === 'pagares' ? 'Generando...' : 'Solo Pagarés'}
          </button>
        </div>
      </div>
      <p className="text-xs text-center text-gray-400 mt-3">
        Los documentos se descargan como archivos Word (.docx) listos para imprimir y firmar.
      </p>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
// `contrato` es opcional — cuando se pasa (desde Renovaciones) precarga todos los datos del contrato anterior
export default function ElaborarContratoModal({ prospecto, unidad, contrato, onClose }) {
  const [step, setStep] = useState(0)
  const [generando, setGenerando] = useState(null)
  const [docCheck, setDocCheck] = useState({})
  const [error, setError] = useState('')

  // Calcular fecha de inicio para renovación: día siguiente al vencimiento del contrato anterior
  const fechaInicioRenovacion = (() => {
    if (!contrato?.fecha_fin) return ''
    const d = new Date(contrato.fecha_fin + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()

  // Calcular meses de depósito según ratio depósito/renta del contrato anterior
  const mesesDepositoPrevio = (() => {
    if (!contrato?.deposito_garantia || !contrato?.renta_mensual) return 1
    const ratio = Math.round(contrato.deposito_garantia / contrato.renta_mensual)
    return [1, 2, 3].includes(ratio) ? ratio : 1
  })()

  const [form, setForm] = useState({
    tipo_persona: 'FISICA',
    arrendatario_nombre: prospecto?.nombre ? `${prospecto.nombre} ${prospecto.apellidos || ''}`.trim() : '',
    arrendatario_rep: '',
    arrendatario_domicilio: prospecto?.domicilio || '',
    arrendatario_rfc: prospecto?.rfc || '',
    arrendatario_telefono: prospecto?.telefono || '',
    arrendatario_instrumento: '',
    numero_local: unidad?.numero_local || '',
    domicilio_local: 'Avenida Gobernadores número 1622, Colonia La Providencia, Código Postal 52177, en Metepec, México',
    fecha_inicio: fechaInicioRenovacion,
    fecha_fin: '',
    duracion_meses: contrato?.duracion_meses || 12,
    renta_mensual: prospecto?.monto_ofertado || '',
    dia_pago: contrato?.dia_pago ? String(contrato.dia_pago) : '10',
    interes_moratorio: contrato?.penalizacion_pct === 5 ? 'cinco' : contrato?.penalizacion_pct === 10 ? 'diez' : contrato?.penalizacion_pct === 15 ? 'quince' : 'diez',
    meses_deposito: mesesDepositoPrevio,
    giro_actividad: prospecto?.giro_solicitado || '',
    fiador_nombre: prospecto?.fiador_nombre || '',
    fiador_telefono: prospecto?.fiador_telefono || '',
    fiador_domicilio: prospecto?.fiador_domicilio || '',
    fiador_ine: '',
    dia_vencimiento: contrato?.dia_pago || 10,
  })

  useEffect(() => {
    if (!form.fecha_inicio) return
    const d = new Date(form.fecha_inicio + 'T12:00:00')
    d.setMonth(d.getMonth() + Number(form.duracion_meses))
    const iso = d.toISOString().split('T')[0]
    setForm(f => ({ ...f, fecha_fin: iso }))
  }, [form.fecha_inicio, form.duracion_meses])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const camposDoc = CAMPOS_DOC[form.tipo_persona] || []
  const docsCompletos = camposDoc.filter(c => c.requerido).every(c => docCheck[c.key])

  async function generar(tipo) {
    setError('')
    setGenerando(tipo)
    try {
      const payload = {
        ...form,
        renta_mensual:  Number(form.renta_mensual),
        duracion_meses: Number(form.duracion_meses),
        meses_deposito: Number(form.meses_deposito),
        dia_vencimiento: Number(form.dia_vencimiento),
        fecha_firma: form.fecha_inicio,
        tipo,
        beneficiario: 'INMOBILIARIA ALCEDINES DEL NORTE SA.DE.CV',
      }

      const res = await fetch(NETLIFY_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt)
      }

      const nombre = form.arrendatario_nombre.replace(/\s+/g, '_')

      if (tipo === 'ambos') {
        // La función devuelve JSON con dos campos base64
        const { contrato, pagares } = await res.json()
        downloadBase64(contrato, `Contrato_${nombre}.docx`)
        downloadBase64(pagares,  `Pagares_${nombre}.docx`)
      } else {
        // La función devuelve binario DOCX directamente (isBase64Encoded en Netlify
        // lo decodifica antes de enviarlo al browser → usar blob())
        const blob = await res.blob()
        const fname = tipo === 'contrato'
          ? `Contrato_${nombre}.docx`
          : `Pagares_${nombre}.docx`
        downloadBlob(blob, fname)
      }

      logAudit({
        modulo: 'CONTRATOS',
        accion: tipo === 'pagares' ? 'GENERAR_PAGARES' : 'GENERAR_CONTRATO',
        entidad: 'ARRENDATARIO',
        descripcion: `${tipo.toUpperCase()} generado para ${form.arrendatario_nombre} — Local ${form.numero_local}`,
      })
    } catch (e) {
      setError(e.message || 'Error generando documento')
    } finally {
      setGenerando(null)
    }
  }

  const canNext = step === 0 ? true : step === 1 ? !!form.fecha_inicio && !!form.renta_mensual : true

  return (
    <FormCtx.Provider value={{ form, set }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: '16px' }}>
        <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#1A3C5E', borderRadius: '14px 14px 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText size={22} color="#E8A020" />
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'white' }}>Elaborar Contrato</h2>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#93C5FD' }}>{form.arrendatario_nombre || 'Nuevo arrendatario'} · Local {form.numero_local || '—'}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93C5FD', padding: '4px' }}>
              <X size={22} />
            </button>
          </div>

          {/* Steps indicator */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 24px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', gap: '4px' }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                <button
                  onClick={() => i <= step && setStep(i)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: i <= step ? 'pointer' : 'default', fontSize: '12px', fontWeight: 600, color: i === step ? '#0A66C2' : i < step ? '#16a34a' : '#9CA3AF', padding: 0 }}
                >
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, background: i === step ? '#0A66C2' : i < step ? '#16a34a' : '#E5E7EB', color: i <= step ? 'white' : '#9CA3AF', flexShrink: 0 }}>
                    {i < step ? '✓' : i + 1}
                  </span>
                  {s}
                </button>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: '2px', borderRadius: '1px', background: i < step ? '#16a34a' : '#E5E7EB' }} />}
              </div>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {step === 0 && <StepArrendatario docCheck={docCheck} setDocCheck={setDocCheck} />}
            {step === 1 && <StepContrato />}
            {step === 2 && <StepFiador />}
            {step === 3 && <StepGenerar generando={generando} error={error} onGenerar={generar} docsCompletos={docsCompletos} />}
          </div>

          {/* Footer nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB', borderRadius: '0 0 14px 14px' }}>
            <button
              onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#6B7280', fontWeight: 500 }}
            >
              <ChevronLeft size={16} />
              {step > 0 ? 'Anterior' : 'Cancelar'}
            </button>
            {step < STEPS.length - 1 && (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: canNext ? '#0A66C2' : '#9CA3AF', border: 'none', cursor: canNext ? 'pointer' : 'not-allowed', color: 'white', borderRadius: '8px', padding: '9px 20px', fontSize: '14px', fontWeight: 600 }}
              >
                Siguiente <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </FormCtx.Provider>
  )
}
