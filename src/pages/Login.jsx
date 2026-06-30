import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { signInWithGoogle, signInWithEmail } from '../lib/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmail = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signInWithEmail(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    const { error } = await signInWithGoogle()
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
      padding: '16px',
    }}>
      <div style={{
        background: 'white', borderRadius: '12px', padding: '40px',
        width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'var(--color-primary)', marginBottom: '16px',
          }}>
            <Building2 size={32} color="white" />
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-text)' }}>IRP</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-light)' }}>Inmueble Resource Planning</p>
          <div style={{ width: '40px', height: '3px', background: 'var(--color-secondary)', margin: '12px auto 0', borderRadius: '2px' }} />
        </div>

        {/* Form email */}
        <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
              Correo electronico
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="admin@ejemplo.com"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-neutral)', borderRadius: 'var(--border-radius)', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-primary)', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
              Contrasena
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="Tu contrasena"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-neutral)', borderRadius: 'var(--border-radius)', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-primary)', boxSizing: 'border-box' }}
            />
          </div>
          {error && (
            <div style={{ padding: '10px 12px', background: '#FEE2E2', color: '#991b1b', borderRadius: 'var(--border-radius)', fontSize: '13px' }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} style={{
            padding: '12px', background: 'var(--color-primary)', color: 'white', border: 'none',
            borderRadius: 'var(--border-radius)', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
            opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-primary)',
          }}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-neutral)' }} />
          <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>o continua con</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-neutral)' }} />
        </div>

        {/* Google */}
        <button onClick={handleGoogle} disabled={loading} style={{
          width: '100%', padding: '11px', background: 'white', color: 'var(--color-text)',
          border: '1px solid var(--color-neutral)', borderRadius: 'var(--border-radius)',
          cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: '10px',
          fontFamily: 'var(--font-primary)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-light)', marginTop: '20px', marginBottom: 0 }}>
          RANNIX Consulting &copy; 2026 - Confidencial
        </p>
      </div>
    </div>
  )
}
