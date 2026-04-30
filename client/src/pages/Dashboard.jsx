import { useState, useEffect, useCallback } from 'react'
import { accountAPI } from '../api/client'
import TransactionList from '../components/TransactionList'
import SendMoneyModal from '../components/SendMoneyModal'

const s = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 32px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--accent)',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userName: {
    color: 'var(--text-dim)',
    fontSize: '14px',
  },
  logoutBtn: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text-dim)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  },
  helpBar: {
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    padding: '10px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
  },
  helpLabel: {
    fontSize: '13px',
    color: 'var(--accent)',
    fontWeight: '600',
    flexShrink: 0,
  },
  helpTip: {
    fontSize: '13px',
    color: 'var(--text-dim)',
  },
  main: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '40px 24px',
  },
  balanceCard: {
    background: 'linear-gradient(135deg, #00e5a022 0%, #00e5a008 100%)',
    border: '1px solid var(--accent)',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '32px',
  },
  balanceLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: '12px',
  },
  balanceAmount: {
    fontFamily: 'var(--font-display)',
    fontSize: '52px',
    fontWeight: '800',
    color: 'var(--text)',
    letterSpacing: '-2px',
    lineHeight: 1,
    marginBottom: '6px',
  },
  balanceSub: {
    fontSize: '14px',
    color: 'var(--text-dim)',
    marginBottom: '28px',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  sendBtn: {
    background: 'var(--accent)',
    color: '#0a0a0f',
    fontFamily: 'var(--font-display)',
    fontWeight: '700',
    fontSize: '14px',
    padding: '13px 28px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  topupBtn: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: 'var(--font-display)',
    fontWeight: '600',
    fontSize: '14px',
    padding: '13px 28px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text)',
    marginBottom: '16px',
  },
  toast: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    background: 'var(--surface)',
    border: '1px solid var(--accent)',
    color: 'var(--accent)',
    borderRadius: '10px',
    padding: '14px 20px',
    fontSize: '14px',
    fontWeight: '600',
    zIndex: 9999,
    animation: 'fadeUp 0.3s ease',
  },
}

export default function Dashboard({ user, onLogout }) {
  const [account, setAccount]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [showSend, setShowSend]   = useState(false)
  const [txRefresh, setTxRefresh] = useState(0)
  const [toast, setToast]         = useState('')
  const [topupLoading, setTopupLoading] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadAccount = useCallback(async () => {
    try {
      const res = await accountAPI.getAccount()
      setAccount(res.data.data)
    } catch (err) {
      console.error('loadAccount error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccount()
  }, [loadAccount])

  const handleTopUp = async () => {
    if (topupLoading) return
    setTopupLoading(true)
    try {
      console.log('Calling topUp...')
      const res = await accountAPI.topUp(1000)
      console.log('topUp response:', res.data)
      showToast('✅ R1,000 added to your wallet')
      // Wait for cache to expire then reload
      setTimeout(() => {
        loadAccount()
        setTxRefresh(r => r + 1)
      }, 600)
    } catch (err) {
      console.error('topUp error:', err)
      const msg = err.response?.data?.message || err.message || 'Top-up failed'
      showToast(`❌ ${msg}`)
    } finally {
      setTopupLoading(false)
    }
  }

  const handleSendSuccess = () => {
    setShowSend(false)
    showToast('✅ Transfer completed')
    setTimeout(() => {
      loadAccount()
      setTxRefresh(r => r + 1)
    }, 600)
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (_) {}
    onLogout()
  }

  const formatBalance = (n) => {
    if (n === null || n === undefined) return '—'
    return Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2 })
  }

  return (
    <div style={s.page}>
      {/* Navbar */}
      <nav style={s.nav}>
        <div style={s.logo}>FinPay</div>
        <div style={s.navRight}>
          <span style={s.userName}>
            {user.firstName} {user.lastName}
          </span>
          <button
            style={s.logoutBtn}
            onClick={handleLogout}
            onMouseEnter={e => e.target.style.color = 'var(--text)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Help bar */}
      <div style={s.helpBar}>
        <span style={s.helpLabel}>Demo Guide:</span>
        {[
          '① Click "+ Add R1,000" to top up your wallet',
          '② Click "↑ Send Money" to transfer funds',
          '③ Send to alice@finpay.dev, bob@finpay.dev or charlie@finpay.dev',
          '④ Sign in as a different user to see their balance change',
        ].map((tip, i) => (
          <span key={i} style={s.helpTip}>{tip}</span>
        ))}
      </div>

      {/* Main content */}
      <main style={s.main}>
        {/* Balance card */}
        <div style={s.balanceCard} className="fade-up">
          <div style={s.balanceLabel}>Available Balance</div>

          {loading ? (
            <div style={{ ...s.balanceAmount, color: 'var(--text-dim)', fontSize: '36px' }}>
              Loading...
            </div>
          ) : (
            <div style={s.balanceAmount}>
              R {formatBalance(account?.balance)}
            </div>
          )}

          <div style={s.balanceSub}>
            {account?.currency || 'ZAR'} · {account?.user?.email || user.email}
          </div>

          <div style={s.actionRow}>
            <button
              style={s.sendBtn}
              onClick={() => setShowSend(true)}
              onMouseEnter={e => e.target.style.background = 'var(--accent-hover)'}
              onMouseLeave={e => e.target.style.background = 'var(--accent)'}
            >
              ↑ Send Money
            </button>

            <button
              style={{
                ...s.topupBtn,
                opacity: topupLoading ? 0.6 : 1,
              }}
              onClick={handleTopUp}
              disabled={topupLoading}
              onMouseEnter={e => { if (!topupLoading) e.target.style.background = 'var(--border)' }}
              onMouseLeave={e => e.target.style.background = 'var(--surface2)'}
            >
              {topupLoading ? 'Adding...' : '+ Add R1,000'}
            </button>
          </div>
        </div>

        {/* Transaction history */}
        <div className="fade-up-2">
          <div style={s.sectionTitle}>Transaction History</div>
          <TransactionList refresh={txRefresh} />
        </div>
      </main>

      {/* Send money modal */}
      {showSend && (
        <SendMoneyModal
          onSuccess={handleSendSuccess}
          onClose={() => setShowSend(false)}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div style={s.toast}>{toast}</div>
      )}
    </div>
  )
}
