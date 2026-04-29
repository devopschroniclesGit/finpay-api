import { useState, useEffect } from 'react'
import { transactionAPI } from '../api/client'

const s = {
  wrap: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.15s',
  },
  icon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    marginRight: '16px',
    flexShrink: 0,
  },
  desc: { flex: 1, minWidth: 0 },
  descMain: {
    fontSize: '15px',
    color: 'var(--text)',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  descSub: { fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px' },
  amount: {
    fontFamily: 'var(--font-display)',
    fontSize: '16px',
    fontWeight: '700',
    textAlign: 'right',
  },
  empty: {
    padding: '48px 24px',
    textAlign: 'center',
    color: 'var(--text-dim)',
    fontSize: '14px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px',
  },
  pageBtn: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    fontFamily: 'var(--font-body)',
  }
}

const formatDate = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TransactionList({ refresh }) {
  const [txns, setTxns]     = useState([])
  const [pagination, setPag] = useState(null)
  const [page, setPage]     = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    transactionAPI.history(page)
      .then(res => {
        setTxns(res.data.data)
        setPag(res.data.pagination)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, refresh])

  if (loading) return (
    <div style={s.wrap}>
      <div style={s.empty}>Loading transactions...</div>
    </div>
  )

  if (!txns.length) return (
    <div style={s.wrap}>
      <div style={s.empty}>No transactions yet. Send money to get started.</div>
    </div>
  )

  return (
    <div style={s.wrap}>
      {txns.map((tx, i) => {
        const sent   = tx.direction === 'SENT'
        const colour = sent ? 'var(--red)' : 'var(--accent)'
        const bgCol  = sent ? 'var(--red-dim)' : 'var(--accent-dim)'
        const other  = sent
          ? `${tx.receiver?.user?.firstName} ${tx.receiver?.user?.lastName}`
          : `${tx.sender?.user?.firstName} ${tx.sender?.user?.lastName}`

        return (
          <div key={tx.id} style={{ ...s.row, animationDelay: `${i * 0.05}s` }}
            className="fade-up"
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

            <div style={{ ...s.icon, background: bgCol, color: colour }}>
              {sent ? '↑' : '↓'}
            </div>

            <div style={s.desc}>
              <div style={s.descMain}>
                {tx.description || (sent ? `Sent to ${other}` : `From ${other}`)}
              </div>
              <div style={s.descSub}>
                {sent ? `To ${other}` : `From ${other}`} · {formatDate(tx.createdAt)}
              </div>
            </div>

            <div style={{ ...s.amount, color: colour }}>
              {sent ? '−' : '+'} R {Number(tx.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </div>
          </div>
        )
      })}

      {pagination && pagination.totalPages > 1 && (
        <div style={s.pagination}>
          <button style={{ ...s.pageBtn, opacity: page <= 1 ? 0.4 : 1 }}
            disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            ← Prev
          </button>
          <span style={{ color: 'var(--text-dim)', fontSize: '13px', padding: '8px 4px' }}>
            {page} / {pagination.totalPages}
          </span>
          <button style={{ ...s.pageBtn, opacity: !pagination.hasNext ? 0.4 : 1 }}
            disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
