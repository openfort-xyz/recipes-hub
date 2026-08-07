import { type CSSProperties, useState } from 'react'
import { fontStack, inputStyle, primaryBtn } from './styles'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={spinnerWrap}>
      <svg
        viewBox="0 0 50 50"
        style={{ width: 38, height: 38, animation: 'pd-spin 1s linear infinite' }}
      >
        <circle
          cx={25}
          cy={25}
          r={20}
          fill="none"
          strokeWidth={4}
          stroke="var(--pd-surface-muted)"
        />
        <circle
          cx={25}
          cy={25}
          r={20}
          fill="none"
          strokeWidth={4}
          stroke="var(--pd-brand)"
          strokeLinecap="round"
          strokeDasharray="80 46"
        />
      </svg>
      <span style={{ fontFamily: fontStack, fontSize: '0.85rem', color: 'var(--pd-ink-500)' }}>
        {label}
      </span>
    </div>
  )
}

/**
 * Amount input + action button with built-in busy / status / error handling.
 * `onSubmit` receives the entered amount and may return a status string to show.
 */
export function AmountAction({
  buttonText,
  placeholder = '0.00',
  unit,
  disabled,
  onSubmit,
}: {
  buttonText: string
  placeholder?: string
  unit?: string
  disabled?: boolean
  onSubmit: (amount: string) => Promise<string | undefined>
}) {
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const run = async () => {
    if (!amount || Number(amount) <= 0) return
    setBusy(true)
    setStatus(null)
    try {
      const msg = await onSubmit(amount)
      setStatus({ kind: 'ok', text: msg || 'Done.' })
      setAmount('')
    } catch (err) {
      setStatus({ kind: 'err', text: err instanceof Error ? err.message : 'Transaction failed' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            inputMode="decimal"
            placeholder={placeholder}
            value={amount}
            disabled={busy || disabled}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            style={inputStyle}
          />
          {unit && <span style={unitStyle}>{unit}</span>}
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy || disabled || !amount}
          style={{ ...primaryBtn, minWidth: 116, opacity: busy || disabled || !amount ? 0.55 : 1 }}
        >
          {busy ? 'Working…' : buttonText}
        </button>
      </div>
      {status && (
        <p style={{ ...statusBase, color: status.kind === 'ok' ? 'var(--pd-success)' : '#dc2626' }}>
          {status.text}
        </p>
      )}
    </div>
  )
}

const spinnerWrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  padding: 28,
}
const unitStyle: CSSProperties = {
  position: 'absolute',
  right: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  fontFamily: fontStack,
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--pd-ink-400)',
  pointerEvents: 'none',
}
const statusBase: CSSProperties = {
  margin: 0,
  fontFamily: fontStack,
  fontSize: '0.78rem',
  wordBreak: 'break-word',
}
