import { useState } from 'react'
import { Car, Plus, Search, Clock, DollarSign, MapPin, AlertTriangle } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import StatusBadge from '../components/ui/StatusBadge'

const CAJONES = Array.from({ length: 40 }, (_, i) => ({
  id: `C-${String(i + 1).padStart(2, '0')}`,
  zona: i < 10 ? 'A' : i < 20 ? 'B' : i < 30 ? 'C' : 'D',
  tipo: i < 5 ? 'Discapacitados' : i < 8 ? 'Directivos' : i < 38 ? 'General' : 'Motocicletas',
  estado: i < 28 ? 'OCUPADO' : 'DISPONIBLE',
  arrendatario: i < 28 ? ['Tacos El Norteño', 'Farmacia Similares', 'Banco Azteca', 'Tiendas 3B', 'Óptica Devlyn', 'GNC Nutrition', 'Elektra', null][i % 8] : null,
  placa: i < 28 ? `SIN-${100 + i * 17}` : null,
  hora_entrada: i < 28 ? `${String(6 + (i % 12)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}` : null,
}))

const MENSUALIDADES = [
  { id: 'M-001', arrendatario: 'Tacos El Norteño', cajones: 3, tarifa: 800, total: 2400, estado: 'VIGENTE', vence: '2026-07-31' },
  { id: 'M-002', arrendatario: 'Farmacia Similares', cajones: 2, tarifa: 800, total: 1600, estado: 'VIGENTE', vence: '2026-07-31' },
  { id: 'M-003', arrendatario: 'Banco Azteca', cajones: 5, tarifa: 900, total: 4500, estado: 'EN_MORA', vence: '2026-06-30' },
  { id: 'M-004', arrendatario: 'Tiendas 3B', cajones: 4, tarifa: 800, total: 3200, estado: 'VIGENTE', vence: '2026-07-31' },
]

const ZONA_COLORS = { A: '#EFF6FF', B: '#F0FDF4', C: '#FFF7ED', D: '#FDF2F8' }
const ZONA_TEXT = { A: '#1E40AF', B: '#166534', C: '#9A3412', D: '#86198F' }
const TIPO_COLOR = { Discapacitados: '#DBEAFE', Directivos: '#FEF9C3', General: '#F3F4F6', Motocicletas: '#DCFCE7' }

export default function Estacionamiento() {
  const [tab, setTab] = useState('mapa')
  const [zonaFiltro, setZonaFiltro] = useState('Todas')

  const ocupados = CAJONES.filter(c => c.estado === 'OCUPADO').length
  const disponibles = CAJONES.filter(c => c.estado === 'DISPONIBLE').length
  const pct = Math.round((ocupados / CAJONES.length) * 100)

  const cajonesVisibles = zonaFiltro === 'Todas' ? CAJONES : CAJONES.filter(c => c.zona === zonaFiltro)

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Estacionamiento</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{CAJONES.length} cajones — {pct}% ocupado</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Registro Manual
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Cajones Ocupados" value={ocupados} icon={Car} color="var(--color-danger)" />
        <KPICard title="Disponibles" value={disponibles} icon={MapPin} color="var(--color-success)" />
        <KPICard title="Mensualidades" value={MENSUALIDADES.length} icon={DollarSign} color="var(--color-primary)" />
        <KPICard title="Ocupación" value={`${pct}%`} icon={Clock} color="var(--color-secondary)" />
      </div>

      {/* Barra ocupación */}
      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>
          <span>Ocupación en tiempo real</span>
          <span style={{ color: pct > 80 ? 'var(--color-danger)' : 'var(--color-success)' }}>{pct}%</span>
        </div>
        <div style={{ height: '12px', background: '#F3F4F6', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? 'var(--color-danger)' : 'var(--color-success)', borderRadius: '8px', transition: 'width 0.4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--color-text-light)' }}>
          <span>{ocupados} ocupados</span>
          <span>{disponibles} disponibles</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #E5E7EB' }}>
        {[['mapa', 'Mapa de Cajones'], ['mensualidades', 'Mensualidades']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            color: tab === id ? 'var(--color-primary)' : 'var(--color-text-light)',
            borderBottom: tab === id ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-2px',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'mapa' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {['Todas', 'A', 'B', 'C', 'D'].map(z => (
              <button key={z} onClick={() => setZonaFiltro(z)} style={{
                padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                borderColor: zonaFiltro === z ? 'var(--color-primary)' : '#E5E7EB',
                background: zonaFiltro === z ? 'var(--color-primary)' : 'white',
                color: zonaFiltro === z ? 'white' : 'var(--color-text-light)',
              }}>Zona {z}</button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '14px', height: '14px', background: '#FEE2E2', borderRadius: '3px', display: 'inline-block' }} />Ocupado</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '14px', height: '14px', background: '#DCFCE7', borderRadius: '3px', display: 'inline-block' }} />Disponible</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
            {cajonesVisibles.map(c => (
              <div key={c.id} title={c.arrendatario || 'Disponible'} style={{
                borderRadius: '8px', padding: '10px 6px', textAlign: 'center', cursor: 'pointer',
                background: c.estado === 'OCUPADO' ? '#FEE2E2' : '#DCFCE7',
                border: `1.5px solid ${c.estado === 'OCUPADO' ? '#FECACA' : '#BBF7D0'}`,
                fontSize: '11px', transition: 'transform 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                <Car size={14} style={{ color: c.estado === 'OCUPADO' ? 'var(--color-danger)' : 'var(--color-success)', marginBottom: '3px' }} />
                <div style={{ fontWeight: 700, color: c.estado === 'OCUPADO' ? 'var(--color-danger)' : 'var(--color-success)', fontSize: '10px' }}>{c.id}</div>
                <div style={{ color: 'var(--color-text-light)', fontSize: '9px', marginTop: '2px' }}>
                  {c.placa || '—'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'mensualidades' && (
        <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['ID', 'Arrendatario', 'Cajones', 'Tarifa/cajón', 'Total mensual', 'Vence', 'Estado', 'Acción'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: 'var(--color-text-light)', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MENSUALIDADES.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-primary)' }}>{m.id}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>{m.arrendatario}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>{m.cajones}</td>
                  <td style={{ padding: '12px 14px' }}>${m.tarifa.toLocaleString()}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-success)' }}>${m.total.toLocaleString()}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px' }}>{m.vence}</td>
                  <td style={{ padding: '12px 14px' }}><StatusBadge status={m.estado} /></td>
                  <td style={{ padding: '12px 14px' }}>
                    <button style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-primary-light)', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>Gestionar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
