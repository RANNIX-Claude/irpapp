import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useSupabaseQuery } from '../../hooks/useSupabase'
import LoadingSpinner from '../ui/LoadingSpinner'
import EmptyState from '../ui/EmptyState'
import { Plus, CheckCircle } from 'lucide-react'

export default function DummyTable() {
  const { data, loading } = useSupabaseQuery('dummy', { order: { column: 'created_at', ascending: false } })
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!desc.trim()) return
    setSaving(true)
    await supabase.from('dummy').insert({ descripcion: desc, etiqueta: 'usuario' })
    setDesc('')
    setSaving(false)
  }

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      {/* Header tabla */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-neutral)', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>✓ Conexión Supabase — tabla dummy</div>
        <div style={{ fontSize: '12px', opacity: 0.8 }}>{data.length} registros</div>
      </div>

      {/* Formulario de prueba */}
      <form onSubmit={handleAdd} style={{ padding: '12px 16px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-neutral)', background: 'var(--color-primary-light)' }}>
        <input
          value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="Agregar registro de prueba..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-neutral)', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-primary)' }}
        />
        <button type="submit" disabled={saving} style={{
          padding: '8px 16px', background: 'var(--color-primary)', color: 'white', border: 'none',
          borderRadius: 'var(--border-radius)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Plus size={14} /> Agregar
        </button>
      </form>

      {/* Tabla */}
      {loading ? <LoadingSpinner /> : data.length === 0 ? <EmptyState /> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--color-background)' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-light)', fontSize: '11px', textTransform: 'uppercase' }}>Descripción</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-light)', fontSize: '11px', textTransform: 'uppercase' }}>Etiqueta</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-light)', fontSize: '11px', textTransform: 'uppercase' }}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id} style={{ borderTop: '1px solid var(--color-neutral)', background: i % 2 === 0 ? 'white' : 'var(--color-background)' }}>
                <td style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={14} color="var(--color-success)" />
                  {row.descripcion}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                    {row.etiqueta}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--color-text-light)' }}>
                  {new Date(row.created_at).toLocaleDateString('es-MX')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
