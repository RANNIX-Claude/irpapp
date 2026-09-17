import { useState } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { TIPOS_CONTRATO } from './rh-helpers'

// ── Modal Renovar Contrato ──────────────────────────────────────────────────
export default function RenovarContratoModal({ empleado, onClose, onSaved }) {
  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ tipo_contrato: 'TEMPORAL_3SEM', fecha_inicio: hoy, fecha_fin: '', salario_diario: empleado.salario_diario || '' })
  const [saving, setSaving] = useState(false)

  const semanas3 = () => {
    const d = new Date(form.fecha_inicio || Date.now())
    d.setDate(d.getDate() + 21)
    setForm(p => ({ ...p, fecha_fin: d.toISOString().split('T')[0] }))
  }

  const guardar = async () => {
    if (!form.fecha_inicio || !form.tipo_contrato) return toast.error('Tipo y fecha inicio son obligatorios')
    setSaving(true)
    await supabase.from('rh_contratos').update({ activo: false }).eq('empleado_id', empleado.id).eq('activo', true)
    const { error } = await supabase.from('rh_contratos').insert({
      empleado_id: empleado.id,
      tipo_contrato: form.tipo_contrato,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      salario_diario: parseFloat(form.salario_diario) || null,
      activo: true,
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Contrato renovado')
    onSaved(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 12, width: 480, maxWidth: '95vw', padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Renovar Contrato — {empleado.nombre_completo}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {[['Tipo de contrato', <select value={form.tipo_contrato} onChange={e => setForm(p => ({...p, tipo_contrato:e.target.value}))} style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,background:'white' }}>{TIPOS_CONTRATO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>],
             ['Fecha inicio', <input type="date" value={form.fecha_inicio} onChange={e => setForm(p=>({...p,fecha_inicio:e.target.value}))} style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} />],
             ['Vencimiento', <div style={{ display:'flex',gap:8 }}><input type="date" value={form.fecha_fin} onChange={e => setForm(p=>({...p,fecha_fin:e.target.value}))} style={{ flex:1,padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} /><button onClick={semanas3} style={{ padding:'8px 10px',border:'1.5px solid #7B5EA7',borderRadius:7,fontSize:12,fontWeight:600,color:'#7B5EA7',background:'white',cursor:'pointer',whiteSpace:'nowrap' }}>+3 sem</button></div>],
             ['Salario diario ($)', <input type="number" step="0.01" value={form.salario_diario} onChange={e => setForm(p=>({...p,salario_diario:e.target.value}))} style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} />]
          ].map(([lbl, ctrl]) => (
            <div key={lbl}>
              <label style={{ fontSize:11,fontWeight:700,color:'var(--color-text-light)',display:'block',marginBottom:4,textTransform:'uppercase' }}>{lbl}</label>
              {ctrl}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,border:'1.5px solid #E5E7EB',borderRadius:8,background:'white',cursor:'pointer',fontWeight:600 }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ flex:2,padding:10,border:'none',borderRadius:8,background:'var(--color-primary)',color:'white',cursor:'pointer',fontWeight:700 }}>
            {saving ? 'Guardando…' : 'Renovar contrato'}
          </button>
        </div>
      </div>
    </div>
  )
}
