import { type CSSProperties, type MouseEvent, useState } from 'react'
import { fontStack, monoStack, panelCard } from '../components/styles'
import { type Invoice, SUPPLIER_ADDRESS } from '../lib/invoices'
import { MONAD_EXPLORER } from '../unlink/unlink'

function truncateAddress(addr: string) {
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
}

export function SupplierPanel({
  invoices,
  onGenerateInvoice,
}: {
  invoices: Invoice[]
  onGenerateInvoice: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SUPPLIER_ADDRESS)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const paidInvoices = invoices.filter((inv) => inv.status === 'paid')
  const pendingInvoices = invoices.filter((inv) => inv.status !== 'paid')
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + Number.parseFloat(inv.amount), 0)

  const tabStyle = (isActive: boolean): CSSProperties => ({
    flex: 1,
    padding: '8px 0',
    background: 'none',
    border: 'none',
    borderBottom: `2px solid ${isActive ? 'var(--pd-brand)' : 'transparent'}`,
    fontFamily: fontStack,
    fontSize: '0.8rem',
    fontWeight: 600,
    color: isActive ? 'var(--pd-ink-900)' : 'var(--pd-ink-400)',
    cursor: 'pointer',
  })

  return (
    <div
      style={{
        ...panelCard,
        width: 340,
        minWidth: 340,
        height: 600,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontFamily: fontStack,
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--pd-ink-900)',
          }}
        >
          Shenzhen Supply Co
        </h2>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: '0.72rem',
            color: 'var(--pd-ink-400)',
            fontFamily: fontStack,
          }}
        >
          Supplier · Accounts Receivable
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <a
            href={`${MONAD_EXPLORER}/address/${SUPPLIER_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: monoStack,
              fontSize: '0.72rem',
              color: 'var(--pd-ink-500)',
              textDecoration: 'none',
            }}
          >
            {truncateAddress(SUPPLIER_ADDRESS)}
          </a>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--pd-ink-500)',
              fontSize: '0.8rem',
              lineHeight: 1,
            }}
            title="Copy address"
          >
            {copied ? '✓' : '⧉'}
          </button>
        </div>
      </div>

      <button type="button" onClick={onGenerateInvoice} style={issueButton}>
        <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
        Issue invoice
      </button>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--demo-border)', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          style={tabStyle(activeTab === 'pending')}
        >
          Pending ({pendingInvoices.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('paid')}
          style={tabStyle(activeTab === 'paid')}
        >
          Paid ({paidInvoices.length})
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflowY: activeTab === 'pending' ? 'auto' : 'hidden',
        }}
      >
        {activeTab === 'pending' &&
          (pendingInvoices.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pendingInvoices.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} />
              ))}
            </div>
          ) : (
            <p style={emptyText}>No pending invoices.</p>
          ))}

        {activeTab === 'paid' &&
          (paidInvoices.length > 0 ? (
            <>
              <div style={totalRow}>
                <span
                  style={{
                    fontFamily: fontStack,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--pd-ink-500)',
                  }}
                >
                  Total received
                </span>
                <span
                  style={{
                    fontFamily: monoStack,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#10b981',
                  }}
                >
                  ${totalPaid.toFixed(2)} USDC
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {paidInvoices.map((inv) => (
                    <InvoiceRow key={inv.id} invoice={inv} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p style={emptyText}>No paid invoices yet.</p>
          ))}
      </div>
    </div>
  )
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const [copied, setCopied] = useState(false)

  const handleCopyId = async (event: MouseEvent) => {
    event.stopPropagation()
    await navigator.clipboard.writeText(invoice.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const statusColor =
    invoice.status === 'paid' ? '#10b981' : invoice.status === 'paying' ? '#f59e0b' : '#dc2626'
  const statusLabel =
    invoice.status === 'paid' ? 'Paid' : invoice.status === 'paying' ? 'Paying...' : 'Open'

  return (
    <div
      style={{
        background: 'var(--pd-surface-soft)',
        border: '1px solid var(--demo-border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: monoStack,
            fontSize: '0.9rem',
            fontWeight: 700,
            color: 'var(--pd-ink-900)',
          }}
        >
          ${Number.parseFloat(invoice.amount).toFixed(2)}
        </span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {invoice.status === 'paid' && invoice.private && (
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                color: 'var(--pd-private)',
                padding: '2px 7px',
                borderRadius: 20,
                background: 'rgba(99,102,241,.12)',
              }}
            >
              🔒 Private
            </span>
          )}
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              color: statusColor,
              padding: '2px 8px',
              borderRadius: 20,
              background: `${statusColor}14`,
              flexShrink: 0,
            }}
          >
            {statusLabel}
          </span>
        </div>
      </div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
      >
        <button type="button" onClick={handleCopyId} style={idButton} title="Copy invoice ID">
          {invoice.id}
          <span style={{ flexShrink: 0 }}>{copied ? '✓' : '⧉'}</span>
        </button>
        <span
          style={{
            fontFamily: fontStack,
            fontSize: '0.68rem',
            color: 'var(--pd-ink-500)',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Due {invoice.dueDate}
        </span>
      </div>
      <div style={{ fontSize: '0.65rem', color: 'var(--pd-ink-400)', fontFamily: monoStack }}>
        {invoice.status === 'paid' && invoice.private
          ? 'Funded from a shielded balance · source hidden'
          : `To: ${truncateAddress(invoice.recipient)}`}
      </div>
    </div>
  )
}

const issueButton: CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 'var(--radius-md)',
  border: '2px dashed var(--demo-border)',
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: fontStack,
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--pd-ink-700)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  flexShrink: 0,
}

const emptyText: CSSProperties = {
  margin: 0,
  fontSize: '0.8rem',
  color: 'var(--pd-ink-300)',
  textAlign: 'center',
  padding: '32px 0',
}

const totalRow: CSSProperties = {
  background: '#10b98110',
  borderRadius: 'var(--radius-md)',
  padding: '10px 14px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0,
  marginBottom: 6,
}

const idButton: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontFamily: monoStack,
  fontSize: '0.68rem',
  color: 'var(--pd-ink-500)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
}
