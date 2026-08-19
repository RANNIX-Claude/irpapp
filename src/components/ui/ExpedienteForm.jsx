/**
 * ExpedienteForm — Formulario de solicitud para inquilino / fiador / obligado solidario
 * Layout: dos columnas — campos a la izquierda, panel IA / INE sticky a la derecha.
 *
 * Props:
 *   tipo        — 'INQUILINO' | 'FIADOR' | 'OBLIGADO_SOLIDARIO'
 *   inicial     — datos iniciales para prellenar
 *   onChange    — callback(datos) cada que el formulario cambia
 *   readOnly    — boolean
 */

import { useState, useRef } from 'react'

const API = '/.netlify/functions/extraer-documento'

// ── Estilos base ──────────────────────────────────────────────────────────────
const S = {
  section: {
    background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10,
    padding: '16px 18px', marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 800, color: '#0A66C2', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 12,
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px' },
  grid4: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px 14px' },
  label: { fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 },
  inp: {
    width: '100%', padding: '7px 10px', border: '1.5px solid #CBD5E1',
    borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box',
    background: '#fff', color: '#1E293B',
  },
  inpFilled: { borderColor: '#0A66C2', background: '#EFF6FF' },
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
  },
}

const Field = ({ label, value, onChange, readOnly, style, span, type = 'text', placeholder }) => (
  <div style={span ? { gridColumn: `span ${span}` } : {}}>
    <label style={S.label}>{label}</label>
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange?.(e.target.value)}
      readOnly={readOnly}
      placeholder={placeholder ?? ''}
      style={{ ...S.inp, ...(value ? S.inpFilled : {}), ...style }}
    />
  </div>
)

const Select = ({ label, value, onChange, options }) => (
  <div>
    <label style={S.label}>{label}</label>
    <select
      value={value ?? ''}
      onChange={e => onChange?.(e.target.value)}
      style={{ ...S.inp, cursor: 'pointer' }}
    >
      <option value=''>— Seleccionar —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
)

// ── Bloque dirección reutilizable ─────────────────────────────────────────────
const DireccionBlock = ({ prefix, data, set, readOnly }) => (
  <>
    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 2fr', gap: '10px 14px' }}>
      <Field label='Calle'    value={data[prefix + '_calle']}    onChange={v => set(prefix + '_calle', v)}    readOnly={readOnly} />
      <Field label='No. Ext'  value={data[prefix + '_no_ext']}   onChange={v => set(prefix + '_no_ext', v)}   readOnly={readOnly} />
      <Field label='No. Int'  value={data[prefix + '_no_int']}   onChange={v => set(prefix + '_no_int', v)}   readOnly={readOnly} />
      <Field label='Edificio' value={data[prefix + '_edificio']} onChange={v => set(prefix + '_edificio', v)} readOnly={readOnly} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1fr', gap: '10px 14px', marginTop: 10 }}>
      <Field label='Colonia'              value={data[prefix + '_colonia']}   onChange={v => set(prefix + '_colonia', v)}   readOnly={readOnly} />
      <Field label='Alcaldía / Municipio' value={data[prefix + '_municipio']} onChange={v => set(prefix + '_municipio', v)} readOnly={readOnly} />
      <Field label='Estado'               value={data[prefix + '_estado']}    onChange={v => set(prefix + '_estado', v)}    readOnly={readOnly} />
      <Field label='C.P.'                 value={data[prefix + '_cp']}        onChange={v => set(prefix + '_cp', v)}        readOnly={readOnly} />
    </div>
  </>
)

// ── Panel lateral de importación ──────────────────────────────────────────────
function PanelImportarINE({ persona, onImport }) {
  const [mode, setMode] = useState('ine')   // 'ine' | 'texto'
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState(null)
  const [texto, setTexto]     = useState('')
  const fileRef = useRef()

  const callApi = async (body) => {
    setLoading(true); setMsg(null)
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json()
      if (!r.ok || !j.datos) throw new Error(j.error || 'Sin datos')
      onImport(j.datos)
      setMsg({ ok: true, txt: '✓ Datos importados' })
    } catch (e) {
      setMsg({ ok: false, txt: e.message })
    } finally { setLoading(false) }
  }

  const handleFile = async (file, tipo) => {
    const b64 = await new Promise((res, rej) => {
      const r = new FileReader()
      r.onload  = () => res(r.result.split(',')[1])
      r.onerror = rej
      r.readAsDataURL(file)
    })
    await callApi({ image_base64: b64, media_type: file.type, tipo_doc: tipo })
  }

  return (
    <div style={{
      background: '#F0F9FF', border: '2px solid #0A66C2', borderRadius: 12,
      padding: '14px', position: 'sticky', top: 8,
    }}>
      {/* Cabecera */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#0A66C2', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Importar — {persona}
        </div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
          Obtén los datos desde la credencial o pégalos como texto
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {[['ine', '📷 INE'], ['texto', '📋 Texto']].map(([k, lbl]) => (
          <button key={k} onClick={() => setMode(k)} style={{
            ...S.btn, flex: 1, justifyContent: 'center',
            padding: '6px 8px',
            background: mode === k ? '#0A66C2' : '#E2E8F0',
            color:      mode === k ? '#fff' : '#475569',
            fontSize: 11,
          }}>{lbl}</button>
        ))}
      </div>

      {/* Modo INE */}
      {mode === 'ine' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['INE_FRENTE',            '📸 Foto INE — Frente'],
            ['INE_REVERSO',           '📸 Foto INE — Reverso'],
            ['COMPROBANTE_DOMICILIO', '🏠 Comprobante domicilio'],
            ['COMPROBANTE_INGRESOS_1','💰 Comprobante ingresos'],
          ].map(([tipo, label]) => (
            <button
              key={tipo}
              disabled={loading}
              onClick={() => { fileRef.current._tipo = tipo; fileRef.current.click() }}
              style={{
                ...S.btn, width: '100%', justifyContent: 'center',
                background: '#fff', border: '1.5px solid #CBD5E1', color: '#334155',
                padding: '9px 6px',
                opacity: loading ? 0.6 : 1,
              }}
            >{label}</button>
          ))}
          {/* Input oculto — capture=environment activa cámara en móvil */}
          <input
            ref={fileRef}
            type='file'
            accept='image/*'
            capture='environment'
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files[0]
              if (f) handleFile(f, fileRef.current._tipo)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {/* Modo Texto */}
      {mode === 'texto' && (
        <div>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={6}
            placeholder={'Pega datos aquí...\nEjemplo:\nNombre: Juan Pérez López\nCURP: PELJ850315...\nColonia: Narvarte, CDMX'}
            style={{ ...S.inp, resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }}
          />
          <button
            onClick={() => {
              if (!texto.trim()) return
              callApi({ texto_libre: texto })
            }}
            disabled={loading || !texto.trim()}
            style={{ ...S.btn, background: '#0A66C2', color: '#fff', width: '100%', justifyContent: 'center', marginTop: 6, opacity: loading || !texto.trim() ? 0.6 : 1 }}
          >
            {loading ? 'Extrayendo…' : '✨ Extraer datos'}
          </button>
        </div>
      )}

      {/* Estado */}
      {loading && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#0A66C2', textAlign: 'center' }}>
          ⏳ Procesando con IA…
        </div>
      )}
      {msg && (
        <div style={{
          marginTop: 8, fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '6px 10px',
          borderRadius: 6,
          color:      msg.ok ? '#057642' : '#B24020',
          background: msg.ok ? '#D1FAE5' : '#FEE2E2',
        }}>
          {msg.txt}
        </div>
      )}
    </div>
  )
}

// ── EMPTY states ──────────────────────────────────────────────────────────────
const EMPTY_INQ = {
  nombre: '',
  dom_calle: '', dom_no_ext: '', dom_no_int: '', dom_edificio: '',
  dom_colonia: '', dom_municipio: '', dom_estado: '', dom_cp: '',
  dom_ine_igual: true,
  ine_calle: '', ine_no_ext: '', ine_no_int: '', ine_edificio: '',
  ine_colonia: '', ine_municipio: '', ine_estado: '', ine_cp: '',
  curp: '', rfc: '', clave_elector: '', fecha_nacimiento: '', sexo: '',
  tel_casa: '', celular: '', correo: '',
  estado_civil: '', regimen_matrimonial: '',
  conyugue_nombre: '', conyugue_empresa: '', conyugue_ocupacion: '',
  conyugue_ingresos: '', conyugue_tel: '', conyugue_correo: '',
  empresa: '', antiguedad: '', ingreso_mensual: '', puesto: '',
  emp_calle: '', emp_no_ext: '', emp_no_int: '', emp_edificio: '',
  emp_colonia: '', emp_municipio: '', emp_estado: '', emp_cp: '',
  emp_tel: '', emp_correo: '',
  arr_nombre: '', arr_tel: '', arr_tiempo: '',
  ref1_nombre: '', ref1_parentesco: '', ref1_anios: '', ref1_tel: '',
  ref2_nombre: '', ref2_parentesco: '', ref2_anios: '', ref2_tel: '',
  ref3_nombre: '', ref3_parentesco: '', ref3_anios: '', ref3_tel: '',
}

const EMPTY_FIA = {
  nombre: '',
  dom_calle: '', dom_no_ext: '', dom_no_int: '', dom_edificio: '',
  dom_colonia: '', dom_municipio: '', dom_estado: '', dom_cp: '',
  dom_ine_igual: true,
  ine_calle: '', ine_no_ext: '', ine_no_int: '', ine_edificio: '',
  ine_colonia: '', ine_municipio: '', ine_estado: '', ine_cp: '',
  curp: '', rfc: '', clave_elector: '', fecha_nacimiento: '', sexo: '',
  tel_casa: '', celular: '', correo: '',
  estado_civil: '', regimen_matrimonial: '', conyugue_nombre: '',
  empresa: '', antiguedad: '', ingreso_mensual: '', puesto: '',
  emp_calle: '', emp_no_ext: '', emp_no_int: '', emp_edificio: '',
  emp_colonia: '', emp_municipio: '', emp_estado: '', emp_cp: '',
  emp_tel: '', emp_correo: '',
  inm_calle: '', inm_no_ext: '', inm_no_int: '', inm_edificio: '',
  inm_colonia: '', inm_municipio: '', inm_estado: '', inm_cp: '',
  inm_entre_calle1: '', inm_entre_calle2: '',
  esc_numero: '', esc_fecha: '', esc_notario_no: '', esc_ciudad: '',
  esc_notario_nombre: '', esc_datos_registrales: '', esc_fecha_registro: '',
}

// Mapeo OCR → campos del formulario
const mapOCR = (datos) => {
  const m = {}
  const v = (k) => datos[k] || null

  // ── Identidad ──
  if (v('nombre_completo'))  m.nombre = v('nombre_completo')
  if (v('curp'))             m.curp   = (v('curp') || '').toUpperCase()
  if (v('rfc'))              m.rfc    = (v('rfc')  || '').toUpperCase()
  if (v('clave_elector'))    m.clave_elector    = (v('clave_elector') || '').toUpperCase()
  if (v('fecha_nacimiento')) m.fecha_nacimiento = v('fecha_nacimiento')
  if (v('sexo'))             m.sexo   = v('sexo')

  // ── Contacto ──
  if (v('celular'))          m.celular      = v('celular')
  if (v('tel_casa'))         m.tel_casa     = v('tel_casa')
  if (v('correo'))           m.correo       = v('correo')
  if (v('estado_civil'))     m.estado_civil = v('estado_civil')

  // ── Económicos ──
  if (v('empresa') || v('empresa_patron')) m.empresa = v('empresa') || v('empresa_patron')
  if (v('puesto'))           m.puesto = v('puesto')
  if (v('ingreso_mensual') || v('ingreso_mensual_neto'))
    m.ingreso_mensual = String(v('ingreso_mensual') || v('ingreso_mensual_neto') || '')
  if (v('antiguedad'))       m.antiguedad = v('antiguedad')

  // ── Domicilio INE (frente de credencial) ──
  // El prompt nuevo devuelve calle y no_ext separados.
  // domicilio_ine es fallback si el modelo devuelve la dirección completa en una sola cadena.
  const tieneDir = v('calle') || v('colonia_ine') || v('domicilio_ine')
  if (tieneDir) {
    m.ine_calle     = v('calle') || v('domicilio_ine') || ''
    m.ine_no_ext    = v('no_ext')  || ''
    m.ine_no_int    = v('no_int')  || ''
    m.ine_colonia   = v('colonia_ine')   || v('colonia')   || ''
    m.ine_municipio = v('municipio_ine') || v('municipio') || ''
    m.ine_estado    = v('estado_ine')    || v('estado')    || ''
    m.ine_cp        = v('cp_ine')        || v('cp')        || ''
    m.dom_ine_igual = false  // mostrar sección domicilio INE
  }

  // ── Comprobante de domicilio → domicilio actual ──
  if (v('nombre_titular')) {
    m.dom_calle     = v('calle')     || ''
    m.dom_no_ext    = v('no_ext')    || ''
    m.dom_colonia   = v('colonia')   || ''
    m.dom_municipio = v('municipio') || ''
    m.dom_estado    = v('estado')    || ''
    m.dom_cp        = v('cp')        || ''
  }

  return m
}

// ── Formulario principal ──────────────────────────────────────────────────────
export default function ExpedienteForm({ tipo = 'INQUILINO', inicial, onChange, readOnly }) {
  const esInquilino = tipo !== 'FIADOR'
  const [data, setDataRaw] = useState({ ...(esInquilino ? EMPTY_INQ : EMPTY_FIA), ...inicial })

  const setData = (upd) => {
    setDataRaw(prev => {
      const next = typeof upd === 'function' ? upd(prev) : { ...prev, ...upd }
      onChange?.(next)
      return next
    })
  }

  const set = (k, v) => setData(prev => ({ ...prev, [k]: v }))

  const handleImport = (datos) => {
    const mapped = mapOCR(datos)
    setData(prev => ({ ...prev, ...mapped }))
  }

  const labelTipo = tipo === 'INQUILINO' ? 'Inquilino' : tipo === 'FIADOR' ? 'Fiador' : 'Obligado Solidario'

  return (
    // Layout: dos columnas — campos | panel INE sticky
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 230px', gap: 16, alignItems: 'start' }}>

      {/* ── COLUMNA IZQUIERDA: campos ── */}
      <div>
        {/* ── DATOS PERSONALES ── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Datos personales — {labelTipo}</div>
          <div style={{ marginBottom: 10 }}>
            <Field label='Nombre completo *' value={data.nombre} onChange={v => set('nombre', v)} readOnly={readOnly} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr', gap: '10px 14px' }}>
            <Field label='CURP'               value={data.curp}             onChange={v => set('curp', v)}             readOnly={readOnly} style={{ fontFamily: 'monospace', textTransform: 'uppercase' }} />
            <Field label='RFC'                value={data.rfc}              onChange={v => set('rfc', v)}              readOnly={readOnly} style={{ fontFamily: 'monospace', textTransform: 'uppercase' }} />
            <Field label='Clave de elector'   value={data.clave_elector}    onChange={v => set('clave_elector', v)}    readOnly={readOnly} style={{ fontFamily: 'monospace', textTransform: 'uppercase' }} />
            <Field label='Fecha de nacimiento' value={data.fecha_nacimiento} onChange={v => set('fecha_nacimiento', v)} readOnly={readOnly} type='date' />
          </div>
        </div>

        {/* ── DOMICILIO ACTUAL ── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Domicilio actual</div>
          <DireccionBlock prefix='dom' data={data} set={set} readOnly={readOnly} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: '#475569', cursor: readOnly ? 'default' : 'pointer' }}>
            <input type='checkbox' checked={data.dom_ine_igual}
              onChange={e => set('dom_ine_igual', e.target.checked)}
              disabled={readOnly}
            />
            El domicilio actual es el mismo que aparece en la INE
          </label>
          {!data.dom_ine_igual && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #CBD5E1' }}>
              <div style={{ ...S.sectionTitle, color: '#475569' }}>Domicilio en INE (diferente al actual)</div>
              <DireccionBlock prefix='ine' data={data} set={set} readOnly={readOnly} />
            </div>
          )}
        </div>

        {/* ── CONTACTO ── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Datos de contacto</div>
          <div style={S.grid3}>
            <Field label='Tel. casa'  value={data.tel_casa} onChange={v => set('tel_casa', v)} readOnly={readOnly} />
            <Field label='Celular *'  value={data.celular}  onChange={v => set('celular', v)}  readOnly={readOnly} />
            <Field label='Correo electrónico *' value={data.correo} onChange={v => set('correo', v)} readOnly={readOnly} type='email' />
          </div>
          <div style={{ ...S.grid3, marginTop: 10 }}>
            <Select label='Estado civil' value={data.estado_civil} onChange={v => set('estado_civil', v)}
              options={['Soltero(a)', 'Casado(a)', 'Unión libre', 'Divorciado(a)', 'Viudo(a)']} />
            <Select label='Régimen matrimonial' value={data.regimen_matrimonial} onChange={v => set('regimen_matrimonial', v)}
              options={['Sociedad conyugal', 'Separación de bienes']} />
            <Field label='Nombre del cónyuge' value={data.conyugue_nombre} onChange={v => set('conyugue_nombre', v)} readOnly={readOnly} />
          </div>
        </div>

        {/* ── CÓNYUGE (solo cuando está casado) ── */}
        {data.estado_civil?.includes('Casad') && (
          <div style={S.section}>
            <div style={S.sectionTitle}>Datos del cónyuge</div>
            <div style={S.grid3}>
              <Field label='Empresa'    value={data.conyugue_empresa}   onChange={v => set('conyugue_empresa', v)}   readOnly={readOnly} />
              <Field label='Ocupación'  value={data.conyugue_ocupacion} onChange={v => set('conyugue_ocupacion', v)} readOnly={readOnly} />
              <Field label='Ingresos mensuales' value={data.conyugue_ingresos} onChange={v => set('conyugue_ingresos', v)} readOnly={readOnly} placeholder='$ 0.00' />
            </div>
            <div style={{ ...S.grid2, marginTop: 10 }}>
              <Field label='Tel. cónyuge'   value={data.conyugue_tel}    onChange={v => set('conyugue_tel', v)}    readOnly={readOnly} />
              <Field label='Correo cónyuge' value={data.conyugue_correo} onChange={v => set('conyugue_correo', v)} readOnly={readOnly} type='email' />
            </div>
          </div>
        )}

        {/* ── DATOS ECONÓMICOS ── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Datos económicos</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px 14px' }}>
            <Field label='Empresa donde labora *' value={data.empresa}        onChange={v => set('empresa', v)}        readOnly={readOnly} />
            <Field label='Puesto'                  value={data.puesto}         onChange={v => set('puesto', v)}         readOnly={readOnly} />
            <Field label='Antigüedad'              value={data.antiguedad}     onChange={v => set('antiguedad', v)}     readOnly={readOnly} placeholder='ej. 2 años' />
            <Field label='Ingreso mensual aprox.'  value={data.ingreso_mensual} onChange={v => set('ingreso_mensual', v)} readOnly={readOnly} placeholder='$ 0.00' />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ ...S.sectionTitle, fontSize: 10, color: '#64748B' }}>Domicilio de la empresa</div>
            <DireccionBlock prefix='emp' data={data} set={set} readOnly={readOnly} />
            <div style={{ ...S.grid2, marginTop: 10 }}>
              <Field label='Tel. empresa'   value={data.emp_tel}    onChange={v => set('emp_tel', v)}    readOnly={readOnly} />
              <Field label='Correo empresa' value={data.emp_correo} onChange={v => set('emp_correo', v)} readOnly={readOnly} type='email' />
            </div>
          </div>
        </div>

        {/* ── INMUEBLE EN GARANTÍA (solo fiador) ── */}
        {!esInquilino && (
          <>
            <div style={S.section}>
              <div style={S.sectionTitle}>Inmueble en garantía</div>
              <DireccionBlock prefix='inm' data={data} set={set} readOnly={readOnly} />
              <div style={{ ...S.grid2, marginTop: 10 }}>
                <Field label='Entre la calle' value={data.inm_entre_calle1} onChange={v => set('inm_entre_calle1', v)} readOnly={readOnly} />
                <Field label='Y la calle'     value={data.inm_entre_calle2} onChange={v => set('inm_entre_calle2', v)} readOnly={readOnly} />
              </div>
            </div>

            <div style={S.section}>
              <div style={S.sectionTitle}>Datos de la escritura</div>
              <div style={S.grid3}>
                <Field label='No. de escritura'   value={data.esc_numero}         onChange={v => set('esc_numero', v)}         readOnly={readOnly} />
                <Field label='Fecha de escritura' value={data.esc_fecha}           onChange={v => set('esc_fecha', v)}           readOnly={readOnly} type='date' />
                <Field label='Notario No.'         value={data.esc_notario_no}     onChange={v => set('esc_notario_no', v)}     readOnly={readOnly} />
              </div>
              <div style={{ ...S.grid2, marginTop: 10 }}>
                <Field label='Ciudad del notario' value={data.esc_ciudad}         onChange={v => set('esc_ciudad', v)}         readOnly={readOnly} />
                <Field label='Nombre del notario' value={data.esc_notario_nombre} onChange={v => set('esc_notario_nombre', v)} readOnly={readOnly} />
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={S.label}>Datos registrales (folio real, libro, volumen, partida, etc.)</label>
                <textarea value={data.esc_datos_registrales ?? ''} onChange={e => set('esc_datos_registrales', e.target.value)}
                  readOnly={readOnly} rows={2}
                  style={{ ...S.inp, resize: 'vertical' }} />
              </div>
              <div style={{ marginTop: 10 }}>
                <Field label='Fecha de registro' value={data.esc_fecha_registro} onChange={v => set('esc_fecha_registro', v)} readOnly={readOnly} type='date' />
              </div>
            </div>
          </>
        )}

        {/* ── REFERENCIA ARRENDADOR (solo inquilino) ── */}
        {esInquilino && (
          <>
            <div style={S.section}>
              <div style={S.sectionTitle}>Referencia del último arrendador</div>
              <div style={S.grid3}>
                <Field label='Nombre del arrendador' value={data.arr_nombre}  onChange={v => set('arr_nombre', v)}  readOnly={readOnly} />
                <Field label='Teléfono'               value={data.arr_tel}    onChange={v => set('arr_tel', v)}    readOnly={readOnly} />
                <Field label='Tiempo viviendo ahí'    value={data.arr_tiempo} onChange={v => set('arr_tiempo', v)} readOnly={readOnly} placeholder='ej. 2 años' />
              </div>
            </div>

            <div style={S.section}>
              <div style={S.sectionTitle}>Referencias personales</div>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px 14px', marginBottom: n < 3 ? 10 : 0 }}>
                  <Field label={`Referencia ${n} — Nombre`} value={data[`ref${n}_nombre`]}     onChange={v => set(`ref${n}_nombre`, v)}     readOnly={readOnly} />
                  <Field label='Parentesco'                   value={data[`ref${n}_parentesco`]} onChange={v => set(`ref${n}_parentesco`, v)} readOnly={readOnly} />
                  <Field label='Años de conocerlo'            value={data[`ref${n}_anios`]}      onChange={v => set(`ref${n}_anios`, v)}      readOnly={readOnly} />
                  <Field label='Tel.'                         value={data[`ref${n}_tel`]}        onChange={v => set(`ref${n}_tel`, v)}        readOnly={readOnly} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── COLUMNA DERECHA: panel sticky de importar INE ── */}
      {!readOnly && (
        <div>
          <PanelImportarINE persona={labelTipo} onImport={handleImport} />
        </div>
      )}
    </div>
  )
}
