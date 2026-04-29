import { useState, useEffect, useCallback } from 'react'
import { accountAPI } from '../api/client'
import TransactionList from '../components/TransactionList'
import SendMoneyModal from '../components/SendMoneyModal'

const s = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    padding: '0',
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
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  userName: { color: 'var(--text-dim)', fontSize: '14px' },
  logoutBtn: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text-dim)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    fontFamily: 'var(--font-body)',
  },
  main: { maxWidth: '900px', margin: '0 auto', padding: '40px 24px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '28px',
  },
  balanceCard: {
    background: 'linear-gradient(135deg, #00e5a022 0%, #00e5a008 100%)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius)',
    padding: '28px',
    gridColumn: '1 / -1',
  },
  balanceLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '12px',
  },
  balanceAmount: {
    fontFamily: 'var(--font-display)',
    fontSize: '48px',
    fontWeight: '800',
    color: 'var(--text)',
    letterSpacing: '-2px',
    lineHeight: 1,
    marginBottom: '6px',
  },
  balanceCurrency: {
    fontSize: '14px',
    color: 'var(--text-dim)',
    marginBottom: '28px',
  },
  actionRow: { display: 'flex', gap: '12px' },
  sendBtn: {
    background: 'var(--accent)',
    color: '#0a0a0f',
    fontFamily: 'var(--font-display)',
    fontWeight: '700',
    fontSize: '14px',
    padding: '13px 28px',
    borderRadius: '10px',
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
    transition: 'background 0.2s',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text)',
    marginBottom: '20px',
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '8px',
  },
  statValue: {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text)',
  },
}

export default function Dashboard({ user, onLogout }) {
  const [account, setAccount]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [showSend, setShowSend] = useState(false)
  const [txRefresh, setTxRefresh] = useState(0)

  const loadAccount = useCallback(async () => {
    try {
      const res = await accountAPI.getAccount()
      setAccount(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAccount() }, [loadAccount])

  const handleSendSuccess = () => {
    setShowSend(false)
    loadAccount()
    setTxRefresh(r => r + 1)
  }

  const formatBalance = (n) => {
    if (!n && n !== 0) return '—'
    return Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2 })
  }

  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.logo}>FinPay</div>
        <div style={s.navRight}>
          <span style={s.userName}>
            {user.firstName} {user.lastName}
          </span>
          <button style={s.logoutBtn} onClick={onLogout}
            onMouseEnter={e => e.target.style.color = 'var(--text)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}>
            Sign out
          </button>
        </div>
      </nav>
	{/* Help banner */}
	<div style={{
	  background: 'var(--surface)',
	  borderBottom: '1px solid var(--border)',
	  padding: '12px 32px',
	  display: 'flex',
	  alignItems: 'center',
	  gap: '24px',
	  flexWrap: 'wrap',
	}}>
	  <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '600' }}>
	    Demo Guide:
	  </span>
	  {[
	    '① Click "+ Add R1,000" to top up your wallet',
	    '② Click "↑ Send Money" to transfer to another account',
	    '③ Try alice@finpay.dev, bob@finpay.dev or charlie@finpay.dev',
	    '④ Login as a different user to see their balance change',
	  ].map((tip, i) => (
	    <span key={i} style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
	      {tip}
	    </span>
	  ))}
	</div>
      <main style={s.main}>
        {/* Balance card */}
        <div style={s.balanceCard} className="fade-up">
          <div style={s.balanceLabel}>Available Balance</div>
          {loading ? (
            <div style={{ ...s.balanceAmount, color: 'var(--text-dim)' }}>...</div>
          ) : (
            <div style={s.balanceAmount}>
              R {formatBalance(account?.balance)}
            </div>
          )}
          <div style={s.balanceCurrency}>
            {account?.currency || 'ZAR'} · {account?.user?.email}
          </div>
          <div style={s.actionRow}>
            <button style={s.sendBtn} onClick={() => setShowSend(true)}
              onMouseEnter={e => e.target.style.background = 'var(--accent-hover)'}
              onMouseLeave={e => e.target.style.background = 'var(--accent)'}>
              ↑ Send Money
            </button>
            <button style={s.topupBtn} onClick={async () => {
              try {
                await accountAPI.topUpo(1000)
		setTimeout(() => {
                  loadAccount()
		  setTxRefresh(r => r + 1)
		}, 500)
              } catch (err) {
                alert(err.response?.data?.message || 'Top-up failed')
              }
            }}
              onMouseEnter={e => e.target.style.background = 'var(--border)'}
              onMouseLeave={e => e.target.style.background = 'var(--surface2)'}>
              + Add R1,000
            </button>
          </div>
        </div>

        {/* Transaction history */}
        <div className="fade-up-2">
          <div style={s.sectionTitle}>Transaction History</div>
          <TransactionList
            accountId={account?.id}
            refresh={txRefresh}
          />
        </div>
      </main>

      {/* Send money modal */}
      {showSend && (
        <SendMoneyModal
          onSuccess={handleSendSuccess}
          onClose={() => setShowSend(false)}
        />
      )}
    </div>
  )
}
