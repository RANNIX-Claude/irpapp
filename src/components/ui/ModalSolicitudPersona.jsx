/**
 * ModalSolicitudPersona — Formulario completo de solicitud para una persona del expediente
 * Guarda en prospecto_personas.datos_solicitud (JSONB)
 */

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import ExpedienteForm from './ExpedienteForm'

export default function ModalSolicitudPersona({ persona, onClose, onSaved }) {
  const [datos, setDatos] = useState(persona.datos_solicitud || {})
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const guardar = async () => {
    setSaving(true); setError(null)
    try {
      // Sincronizar también los campos planos que ya existen en la tabla
      const sync = {}
      if (datos.nombre)         sync.nombre_completo   = datos.nombre
      if (datos.curp)           sync.curp              = datos.curp
      if (datos.rfc)            sync.rfc               = datos.rfc
      if (datos.celular)        sync.cel               = datos.celular
      if (datos.dom_calle)      sync.calle             = datos.dom_calle
      if (datos.dom_no_ext)     sync.no_ext            = datos.dom_no_ext
      if (datos.dom_no_int)     sync.no_int            = datos.dom_no_int
      if (datos.dom_colonia)    sync.colonia           = datos.dom_colonia
      if (datos.dom_municipio)  sync.municipio         = datos.dom_municipio
      if (datos.dom_estado)     sync.estado_domicilio  = datos.dom_estado
      if (datos.dom_cp)         sync.cp                = datos.dom_cp
      if (datos.empresa)        sync.empresa           = datos.empresa
      if (datos.puesto)         sync.puesto            = datos.puesto
      if (datos.ingreso_mensual)sync.ingreso_mensual   = parseFloat(datos.ingreso_mensual) || null
      // Fiador: inmueble en garantía
      if (datos.inm_calle)      sync.garantia_calle    = datos.inm_calle
      if (datos.inm_colonia)    sync.garantia_colonia  = datos.inm_colonia
      if (datos.inm_municipio)  sync.garantia_municipio= datos.inm_municipio
      if (datos.inm_estado)     sync.garantia_estado   = datos.inm_estado
      if (datos.esc_numero)     sync.escritura_no      = datos.esc_numero
      if (datos.esc_notario_nombre) sync.escritura_notario = datos.esc_notario_nombre
      if (datos.esc_fecha)      sync.escritura_fecha   = datos.esc_fecha

      const { error: e } = await supabase
        .from('prospecto_personas')
        .update({ datos_solicitud: datos, ...sync })
        .eq('id', persona.id)

      if (e) throw e
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 1200, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
    }}>
      {/* Panel lateral deslizante */}
      <div style={{
        background: '#fff', width: 'min(820px, 96vw)', height: '100vh',
        display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 22px', borderBottom: '1.5px solid #E2E8F0',
          background: '#0A66C2', color: '#fff',
        }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Solicitud de arrendamiento — {persona.tipo === 'INQUILINO' ? 'Inquilino' : persona.tipo === 'FIADOR' ? 'Fiador' : 'Obligado Solidario'}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>
              {persona.nombre_completo || '(sin nombre)'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {/* Formulario con scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          <ExpedienteForm
            tipo={persona.tipo}
            inicial={datos}
            onChange={setDatos}
          />
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: '1.5px solid #E2E8F0',
          display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center',
          background: '#F8FAFC',
        }}>
          {error && <span style={{ fontSize: 12, color: '#B24020', flex: 1 }}>✗ {error}</span>}
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 7, border: '1.5px solid #CBD5E1',
            background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{
            padding: '9px 22px', borderRadius: 7, border: 'none',
            background: saving ? '#93C5FD' : '#0A66C2', color: '#fff',
            fontWeight: 800, fontSize: 13, cursor: saving ? 'default' : 'pointer',
          }}>{saving ? 'Guardando…' : '💾 Guardar solicitud'}</button>
        </div>
      </div>
    </div>
  )
}
