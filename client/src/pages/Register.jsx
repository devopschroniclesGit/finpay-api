import { useState } from 'react'
import { authAPI } from '../api/client'

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at 40% 80%, #00e5a011 0%, transparent 60%), var(--bg)',
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
    marginBottom: '8px',
  },
  tagline: { color: 'var(--text-dim)', fontSize: '14px', marginBottom: '40px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
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
  back: {
    background: 'none',
    color: 'var(--text-dim)',
    fontSize: '14px',
    padding: 0,
    marginTop: '24px',
    display: 'block',
    textAlign: 'center',
    width: '100%',
  }
}

export default function Register({ onLogin, onBack }) {
  const [form, setForm]       = useState({ email: '', password: '', firstName: '', lastName: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.register(form)
      onLogin(res.data.data.user, res.data.data.token)
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const focus = (e) => (e.target.style.borderColor = 'var(--accent)')
  const blur  = (e) => (e.target.style.borderColor = 'var(--border)')

  return (
    <div style={s.page}>
      <div style={s.card} className="fade-up">
        <div style={s.logo}>FinPay</div>
        <div style={s.tagline}>Create your account</div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={submit}>
          <div style={s.row}>
            <div>
              <label style={s.label}>First Name</label>
              <input style={s.input} placeholder="Alice" value={form.firstName}
                onChange={set('firstName')} onFocus={focus} onBlur={blur} required />
            </div>
            <div>
              <label style={s.label}>Last Name</label>
              <input style={s.input} placeholder="Smith" value={form.lastName}
                onChange={set('lastName')} onFocus={focus} onBlur={blur} required />
            </div>
          </div>

          <label style={s.label}>Email</label>
          <input style={s.input} type="email" placeholder="you@example.com"
            value={form.email} onChange={set('email')}
            onFocus={focus} onBlur={blur} required />

          <label style={s.label}>Password</label>
          <input style={s.input} type="password" placeholder="Min 8 chars, 1 uppercase, 1 number"
            value={form.password} onChange={set('password')}
            onFocus={focus} onBlur={blur} required />

          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
            type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <button style={s.back} onClick={onBack}>← Back to login</button>
      </div>
    </div>
  )
}
