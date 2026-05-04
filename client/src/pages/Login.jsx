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
    marginBottom: '32px',
  },
  trustBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: 'var(--text-dim)',
    marginBottom: '32px',
    padding: '8px 12px',
    background: 'rgba(0, 229, 160, 0.05)',
    border: '1px solid rgba(0, 229, 160, 0.12)',
    borderRadius: '8px',
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
  inputWrap: {
    position: 'relative',
    marginBottom: '20px',
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
    boxSizing: 'border-box',
  },
  inputWithToggle: {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '14px 48px 14px 16px',
    color: 'var(--text)',
    fontSize: '15px',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute',
    right: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-dim)',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
  },
  forgotRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '-12px',
    marginBottom: '20px',
  },
  forgotLink: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    fontSize: '12px',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  rememberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: 'var(--accent)',
    cursor: 'pointer',
  },
  rememberLabel: {
    fontSize: '13px',
    color: 'var(--text-dim)',
    cursor: 'pointer',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    border: 'none',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(10,10,15,0.3)',
    borderTop: '2px solid #0a0a0f',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '24px 0',
    color: 'var(--text-dim)',
    fontSize: '12px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'var(--border)',
  },
  oauthRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '4px',
  },
  oauthBtn: {
    flex: 1,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '11px',
    color: 'var(--text)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'border-color 0.2s',
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

// Inject spinner keyframes once
if (typeof document !== 'undefined' && !document.getElementById('spin-style')) {
  const style = document.createElement('style')
  style.id = 'spin-style'
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
  document.head.appendChild(style)
}

export default function Login({ onLogin, onRegister }) {
  const [form, setForm]         = useState({ email: '', password: '' })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.login(form)
      onLogin(res.data.data.user, res.data.data.token)
    } catch (err) {
      const msg = err.response?.data?.message
      if (err.response?.status === 401) {
        setError('Invalid email or password. Please try again.')
      } else if (err.response?.status === 429) {
        setError('Too many attempts. Please wait 15 minutes and try again.')
      } else {
        setError(msg || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card} className="fade-up">
        <div style={{ marginBottom: '16px' }}>
	  <img
	   src="/logo.png"
	   alt="FinPay"
	   style={{ height: '60px', width: 'auto' }}
	  />
	</div>

        <div style={s.tagline}>Secure digital payments platform</div>

        <div style={s.trustBadge}>
          🔒 256-bit encrypted &nbsp;·&nbsp; PCI DSS compliant &nbsp;·&nbsp; SOC 2 ready
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={submit}>
          <label style={s.label}>Email</label>
          <div style={s.inputWrap}>
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
          </div>

          <label style={s.label}>Password</label>
          <div style={s.inputWrap}>
            <input
              style={s.inputWithToggle}
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              type="button"
              style={s.eyeBtn}
              onClick={() => setShowPass(v => !v)}
              tabIndex={-1}
            >
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>

          <div style={s.forgotRow}>
            <button type="button" style={s.forgotLink}>
              Forgot password?
            </button>
          </div>

          <div style={s.rememberRow}>
            <input
              type="checkbox"
              id="remember"
              style={s.checkbox}
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />
            <label htmlFor="remember" style={s.rememberLabel}>Remember me</label>
          </div>

          <button
            style={{ ...s.btn, opacity: loading ? 0.8 : 1 }}
            type="submit"
            disabled={loading}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--accent-hover)' }}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
          >
            {loading && <div style={s.spinner} />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={s.divider}>
          <div style={s.dividerLine} />
          or continue with
          <div style={s.dividerLine} />
        </div>

        <div style={s.oauthRow}>
          <button
            style={s.oauthBtn}
            type="button"
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          <button
            style={s.oauthBtn}
            type="button"
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </button>
        </div>

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
