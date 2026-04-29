import { useState } from 'react'
import { authAPI } from '../api/client'

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at 60% 20%, #00e5a011 0%, transparent 60%), var(--bg)',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '48px 40px',
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--accent)',
    letterSpacing: '-0.5px',
    marginBottom: '8px',
  },
  tagline: {
    color: 'var(--text-dim)',
    fontSize: '14px',
    marginBottom: '40px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '14px 16px',
    color: 'var(--text)',
    fontSize: '15px',
    transition: 'border-color 0.2s',
    marginBottom: '20px',
  },
  btn: {
    width: '100%',
    background: 'var(--accent)',
    color: '#0a0a0f',
    fontFamily: 'var(--font-display)',
    fontWeight: '700',
    fontSize: '15px',
    padding: '15px',
    borderRadius: '10px',
    transition: 'background 0.2s, transform 0.1s',
    marginTop: '4px',
  },
  error: {
    background: 'var(--red-dim)',
    border: '1px solid var(--red)',
    color: 'var(--red)',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  footer: {
    marginTop: '28px',
    textAlign: 'center',
    color: 'var(--text-dim)',
    fontSize: '14px',
  },
  link: {
    color: 'var(--accent)',
    background: 'none',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
  }
}

export default function Login({ onLogin, onRegister }) {
  const [form, setForm]       = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.login(form)
      onLogin(res.data.data.user, res.data.data.token)
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card} className="fade-up">
        <div style={s.logo}>FinPay</div>
        <div style={s.tagline}>Secure digital payments platform</div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={submit}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />

          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />

          <button
            style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
            type="submit"
            disabled={loading}
            onMouseEnter={e => e.target.style.background = 'var(--accent-hover)'}
            onMouseLeave={e => e.target.style.background = 'var(--accent)'}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={s.footer}>
          Don't have an account?{' '}
          <button style={s.link} onClick={onRegister}>Create one</button>
        </div>

        <div style={{ ...s.footer, marginTop: '16px', fontSize: '12px' }}>
          Demo: alice@finpay.dev / SecurePass123
        </div>
      </div>
    </div>
  )
}
