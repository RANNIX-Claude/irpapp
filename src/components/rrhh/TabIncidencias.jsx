import { useState } from 'react'
import { Plus, AlertTriangle, CheckCircle, X, Calendar, Save, AlertCircle } from 'lucide-react'
import { usePRP } from '../../hooks/usePRP'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { getLunes, fmtDate, generarSemanas, labelSemana } from './rh-semanas'

// ── Modal: Nueva Incidencia ──────────────────────────────────────────────────
function NuevaIncidenciaModal({ empleados, onClose, onSaved }) {
  const hoy = fmtDate(new Date())
  const [form, setForm] = useState({ empleado_id: '', fecha: hoy, tipo: 'INASISTENCIA', descripcion: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const TIPOS = [
    { id: 'INASISTENCIA',      label: 'Inasistencia',           afecta: true  },
    { id: 'RETARDO',           label: 'Retardo',                afecta: false },
    { id: 'PERMISO_SIN_GOCE', label: 'Permiso sin goce',       afecta: true  },
    { id: 'PERMISO_CON_GOCE', label: 'Permiso con goce',       afecta: false },
    { id: 'VACACIONES',        label: 'Vacaciones',             afecta: false },
    { id: 'INCAPACIDAD',       label: 'Incapacidad',            afecta: false },
  ]

  const guardar = async () => {
    if (!form.empleado_id || !form.fecha || !form.tipo) return toast.error('Empleado, fecha y tipo son obligatorios')
    const tipo = TIPOS.find(t => t.id === form.tipo)
    // Calcular lunes de la semana
    const lunes = fmtDate(getLunes(form.fecha))
    setSaving(true)
    const { error } = await supabase.from('rh_incidencias').insert({
      empleado_id: form.empleado_id,
      fecha: form.fecha,
      tipo: form.tipo,
      descripcion: form.descripcion || null,
      afecta_nomina: tipo?.afecta ?? true,
      semana_inicio: lunes,
      created_by: 'USUARIO',
    })
    setSaving(false)
    if (error) {
      if (error.code === '23505') return toast.error('Ya existe esa incidencia para este empleado y fecha')
      return toast.error(error.message)
    }
    toast.success('Incidencia registrada')
    onSaved()
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ background:'white',borderRadius:14,width:480,maxWidth:'95vw',padding:24,boxShadow:'0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h3 style={{ margin:0,fontSize:16,fontWeight:700,display:'flex',alignItems:'center',gap:8 }}>
            <AlertCircle size={18} color="var(--color-warning)" /> Nueva Incidencia
          </h3>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display:'grid',gap:14 }}>
          <div>
            <label style={{ fontSize:11,fontWeight:700,color:'var(--color-text-light)',display:'block',marginBottom:4,textTransform:'uppercase' }}>Empleado</label>
            <select value={form.empleado_id} onChange={e => set('empleado_id', e.target.value)}
              style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:13,background:'white' }}>
              <option value="">Seleccionar empleado…</option>
              {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre_completo}</option>)}
            </select>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div>
              <label style={{ fontSize:11,fontWeight:700,color:'var(--color-text-light)',display:'block',marginBottom:4,textTransform:'uppercase' }}>Fecha</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
                style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:13,boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:700,color:'var(--color-text-light)',display:'block',marginBottom:4,textTransform:'uppercase' }}>Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:13,background:'white' }}>
                {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11,fontWeight:700,color:'var(--color-text-light)',display:'block',marginBottom:4,textTransform:'uppercase' }}>Descripción (opcional)</label>
            <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              placeholder="Ej: Faltó sin avisar"
              style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:13,boxSizing:'border-box' }} />
          </div>
          {TIPOS.find(t => t.id === form.tipo)?.afecta && (
            <div style={{ background:'#FEF3C7',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#92400E',display:'flex',alignItems:'center',gap:6 }}>
              <AlertTriangle size={14} /> Esta incidencia descuenta del salario en nómina
            </div>
          )}
        </div>
        <div style={{ display:'flex',gap:10,marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,border:'1.5px solid #E5E7EB',borderRadius:8,background:'white',cursor:'pointer',fontWeight:600 }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ flex:2,padding:10,border:'none',borderRadius:8,background:'var(--color-warning)',color:'white',cursor:'pointer',fontWeight:700,opacity:saving?.6:1 }}>
            {saving ? 'Guardando…' : 'Registrar incidencia'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tab Incidencias ──────────────────────────────────────────────────────────
function TabIncidencias() {
  const SEMANAS = generarSemanas(16)
  const [semanaIdx, setSemanaIdx] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: empleados } = usePRP('prp_empleados', { order: { col: 'apellido_pat' } })
  const { data: incidencias, loading } = usePRP('prp_incidencias', {
    filters: [['semana_inicio', 'eq', SEMANAS[semanaIdx].lunes]],
    order: { col: 'fecha' },
    refreshKey,
  })

  const semana = SEMANAS[semanaIdx]
  const lista = incidencias ?? []
  const total_inasistencias = lista.filter(i => i.afecta_nomina).length

  const TIPO_COLOR = {
    INASISTENCIA:      ['#FEE2E2','#991B1B'],
    RETARDO:           ['#FEF3C7','#92400E'],
    PERMISO_SIN_GOCE: ['#FEE2E2','#92400E'],
    PERMISO_CON_GOCE: ['#DBEAFE','#1D4ED8'],
    VACACIONES:        ['#D1FAE5','#065F46'],
    INCAPACIDAD:       ['#F3F4F6','#374151'],
  }
  const TIPO_LABEL = {
    INASISTENCIA:      'Inasistencia',
    RETARDO:           'Retardo',
    PERMISO_SIN_GOCE: 'Permiso s/goce',
    PERMISO_CON_GOCE: 'Permiso c/goce',
    VACACIONES:        'Vacaciones',
    INCAPACIDAD:       'Incapacidad',
  }

  const eliminar = async (id) => {
    const { error } = await supabase.from('rh_incidencias').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Incidencia eliminada')
    setRefreshKey(k => k+1)
  }

  return (
    <div>
      {/* Selector de semana */}
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,background:'white',borderRadius:8,border:'1.5px solid #E5E7EB',padding:'4px 4px 4px 12px' }}>
          <Calendar size={14} color="var(--color-primary)" />
          <span style={{ fontSize:13,fontWeight:600 }}>Semana:</span>
          <select value={semanaIdx} onChange={e => setSemanaIdx(+e.target.value)}
            style={{ border:'none',background:'transparent',fontSize:13,fontWeight:600,color:'var(--color-primary)',cursor:'pointer',padding:'6px 8px',outline:'none' }}>
            {SEMANAS.map((s, i) => (
              <option key={s.lunes} value={i}>{labelSemana(s.lunes, s.domingo)}</option>
            ))}
          </select>
        </div>
        <div style={{ fontSize:12,color:'var(--color-text-light)' }}>
          {semana.lunes} → {semana.domingo}
        </div>
        <div style={{ marginLeft:'auto' }}>
          <button onClick={() => setShowModal(true)}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'var(--color-warning)',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer' }}>
            <Plus size={14} /> Nueva Incidencia
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20 }}>
        {[
          [lista.length, 'Total incidencias', '#6B7280'],
          [total_inasistencias, 'Afectan nómina', '#B24020'],
          [lista.filter(i=>!i.afecta_nomina).length, 'Sin descuento', '#057642'],
        ].map(([v,t,c]) => (
          <div key={t} style={{ background:'white',borderRadius:10,border:'1px solid #E5E7EB',padding:'14px 16px' }}>
            <div style={{ fontSize:11,fontWeight:600,color:'var(--color-text-light)',textTransform:'uppercase',marginBottom:4 }}>{t}</div>
            <div style={{ fontSize:24,fontWeight:700,color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center',padding:60,color:'#9CA3AF' }}>Cargando…</div>
      ) : lista.length === 0 ? (
        <div style={{ textAlign:'center',padding:60,background:'white',borderRadius:10,border:'1px solid #E5E7EB' }}>
          <CheckCircle size={36} color="#057642" style={{ display:'block',margin:'0 auto 12px',opacity:.4 }} />
          <p style={{ margin:0,fontWeight:600,color:'#374151' }}>Sin incidencias esta semana</p>
          <p style={{ margin:'6px 0 0',fontSize:12,color:'#9CA3AF' }}>Registra inasistencias o incidencias con el botón de arriba</p>
        </div>
      ) : (
        <div style={{ background:'white',borderRadius:10,border:'1px solid #E5E7EB',overflow:'hidden' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
            <thead>
              <tr style={{ background:'#F9FAFB',borderBottom:'1px solid #E5E7EB' }}>
                {['Fecha','Empleado','Puesto','Tipo','Descripción','Descuenta',''].map(h => (
                  <th key={h} style={{ padding:'11px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'var(--color-text-light)',whiteSpace:'nowrap',textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(inc => {
                const [bg, fg] = TIPO_COLOR[inc.tipo] || ['#F3F4F6','#374151']
                return (
                  <tr key={inc.id} style={{ borderBottom:'1px solid #F3F4F6' }}>
                    <td style={{ padding:'11px 14px',fontFamily:'monospace',fontSize:12 }}>{inc.fecha}</td>
                    <td style={{ padding:'11px 14px',fontWeight:600 }}>{inc.nombre_completo}</td>
                    <td style={{ padding:'11px 14px',fontSize:12,color:'var(--color-text-light)' }}>{inc.puesto}</td>
                    <td style={{ padding:'11px 14px' }}>
                      <span style={{ padding:'3px 9px',borderRadius:10,fontSize:11,fontWeight:700,background:bg,color:fg }}>
                        {TIPO_LABEL[inc.tipo] || inc.tipo}
                      </span>
                    </td>
                    <td style={{ padding:'11px 14px',fontSize:12,color:'var(--color-text-light)' }}>{inc.descripcion || '—'}</td>
                    <td style={{ padding:'11px 14px' }}>
                      {inc.afecta_nomina
                        ? <span style={{ color:'#991B1B',fontWeight:700,fontSize:12 }}>Sí</span>
                        : <span style={{ color:'#057642',fontSize:12 }}>No</span>}
                    </td>
                    <td style={{ padding:'11px 14px' }}>
                      <button onClick={() => eliminar(inc.id)}
                        style={{ padding:'3px 8px',border:'1.5px solid #FEE2E2',borderRadius:6,background:'white',color:'#B24020',cursor:'pointer',fontSize:11,fontWeight:600 }}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <NuevaIncidenciaModal
          empleados={(empleados ?? []).filter(e => e.estado_id === 'ACTIVO')}
          onClose={() => setShowModal(false)}
          onSaved={() => { setRefreshKey(k => k+1); setShowModal(false) }}
        />
      )}
    </div>
  )
}

export { NuevaIncidenciaModal }
export default TabIncidencias