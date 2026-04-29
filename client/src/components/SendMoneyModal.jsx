import { useState } from 'react'
import { transactionAPI } from '../api/client'

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: '#00000088',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    animation: 'fadeUp 0.3s ease',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '22px',
    fontWeight: '800',
    marginBottom: '8px',
  },
  subtitle: { color: 'var(--text-dim)', fontSize: '14px', marginBottom: '32px' },
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
  amountWrap: {
    position: 'relative',
    marginBottom: '20px',
  },
  amountPrefix: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-dim)',
    fontSize: '16px',
    fontWeight: '600',
    pointerEvents: 'none',
  },
  amountInput: {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '14px 16px 14px 36px',
    color: 'var(--text)',
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
    fontWeight: '700',
  },
  row: { display: 'flex', gap: '12px', marginTop: '8px' },
  cancelBtn: {
    flex: 1,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: 'var(--font-display)',
    fontWeight: '600',
    fontSize: '15px',
    padding: '14px',
    borderRadius: '10px',
  },
  sendBtn: {
    flex: 2,
    background: 'var(--accent)',
    color: '#0a0a0f',
    fontFamily: 'var(--font-display)',
    fontWeight: '700',
    fontSize: '15px',
    padding: '14px',
    borderRadius: '10px',
  },
  success: {
    textAlign: 'center',
    padding: '16px 0',
  },
  successIcon: { fontSize: '48px', marginBottom: '16px' },
  successTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--accent)',
    marginBottom: '8px',
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
}

export default function SendMoneyModal({ onSuccess, onClose }) {
  const [form, setForm]       = useState({ receiverEmail: '', amount: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const focus = (e) => (e.target.style.borderColor = 'var(--accent)')
  const blur  = (e) => (e.target.style.borderColor = 'var(--border)')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await transactionAPI.send({
        receiverEmail: form.receiverEmail,
        amount: Number(form.amount),
        description: form.description || undefined,
      })
      setDone(true)
      setTimeout(onSuccess, 1800)
    } catch (err) {
      setError(err.response?.data?.message || 'Transfer failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        {done ? (
          <div style={s.success}>
            <div style={s.successIcon}>✅</div>
            <div style={s.successTitle}>Transfer Complete</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
              R {Number(form.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} sent successfully
            </div>
          </div>
        ) : (
          <>
            <div style={s.title}>Send Money</div>
            <div style={s.subtitle}>Transfers are instant and irreversible</div>

            {error && <div style={s.error}>{error}</div>}

            <form onSubmit={submit}>
              <label style={s.label}>Recipient Email</label>
              <input style={s.input} type="email" placeholder="recipient@example.com"
                value={form.receiverEmail} onChange={set('receiverEmail')}
                onFocus={focus} onBlur={blur} required />

              <label style={s.label}>Amount (ZAR)</label>
              <div style={s.amountWrap}>
                <span style={s.amountPrefix}>R</span>
                <input style={s.amountInput} type="number" placeholder="0.00"
                  min="1" max="50000" step="0.01"
                  value={form.amount} onChange={set('amount')}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  required />
              </div>

              <label style={s.label}>Description (optional)</label>
              <input style={s.input} type="text" placeholder="What's this for?"
                value={form.description} onChange={set('description')}
                onFocus={focus} onBlur={blur} maxLength={255} />

              <div style={s.row}>
                <button type="button" style={s.cancelBtn} onClick={onClose}
                  onMouseEnter={e => e.target.style.background = 'var(--border)'}
                  onMouseLeave={e => e.target.style.background = 'var(--surface2)'}>
                  Cancel
                </button>
                <button type="submit" style={{ ...s.sendBtn, opacity: loading ? 0.7 : 1 }}
                  disabled={loading}
                  onMouseEnter={e => e.target.style.background = 'var(--accent-hover)'}
                  onMouseLeave={e => e.target.style.background = 'var(--accent)'}>
                  {loading ? 'Sending...' : 'Send Money'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
