import { type CSSProperties, useState } from 'react'
import { formatUnits } from 'viem'
import { DECIMALS } from '../contracts/addresses'
import {
  type BatchKind,
  batchInfo,
  claimBatch,
  decryptHandles,
  type Runtime,
  readBatchPosition,
} from '../zama/confidential'
import { fontStack, ghostBtn, monoStack, primaryBtn } from './styles'

type Batch = { kind: BatchKind; batchId: bigint; state: number }

const STEPS = [
  { title: 'Open', body: 'Your deposit is pooling with others in the current batch.' },
  { title: 'Dispatched', body: 'The batch closed and was sent to settle off-chain.' },
  { title: 'Finalized', body: 'Settled — claim to receive your confidential shares.' },
] as const

/** Full in-phone "page" showing one batch's lifecycle + claim. */
export function BatchStatus({
  rt,
  batch,
  onBack,
  onState,
  onClaimed,
}: {
  rt: Runtime
  batch: Batch
  onBack: () => void
  onState: (state: number) => void
  onClaimed: () => void
}) {
  const [busy, setBusy] = useState<null | 'refresh' | 'claim' | 'reveal'>(null)
  const [pending, setPending] = useState<bigint | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const ready = batch.state >= 2
  const unit = batch.kind === 'deposit' ? 'cUSDC' : 'shares'

  const refresh = async () => {
    setBusy('refresh')
    setMsg(null)
    try {
      const info = await batchInfo(rt, batch.kind, batch.batchId)
      onState(info.state)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not read status')
    } finally {
      setBusy(null)
    }
  }

  const revealPending = async () => {
    setBusy('reveal')
    setMsg(null)
    try {
      const ref = await readBatchPosition(rt, batch.kind, batch.batchId)
      const map = await decryptHandles(rt, [ref])
      setPending(map[ref.handle.toLowerCase()] ?? 0n)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not decrypt your position')
    } finally {
      setBusy(null)
    }
  }

  const claim = async () => {
    setBusy('claim')
    setMsg(null)
    try {
      await claimBatch(rt, batch.kind, batch.batchId)
      onClaimed()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Claim failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        animation: 'pd-rise .35s ease both',
      }}
    >
      <button type="button" onClick={onBack} style={backBtn}>
        ‹ Wallet
      </button>

      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: fontStack,
            fontWeight: 800,
            fontSize: '1.35rem',
            letterSpacing: '-0.02em',
          }}
        >
          {batch.kind === 'deposit' ? 'Deposit' : 'Redeem'} batch
        </h1>
        <p
          style={{
            margin: '2px 0 0',
            fontFamily: monoStack,
            fontSize: '0.8rem',
            color: 'var(--pd-ink-500)',
          }}
        >
          #{batch.batchId.toString()}
        </p>
      </div>

      {/* Lifecycle tracker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {STEPS.map((step, i) => {
          const done = batch.state > i
          const active = batch.state === i
          const color =
            done || (active && i === 2)
              ? 'var(--pd-success)'
              : active
                ? 'var(--pd-brand)'
                : 'var(--pd-ink-300)'
          return (
            <div key={step.title} style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ ...dot, background: color }}>{done ? '✓' : i + 1}</div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      ...rail,
                      background: done ? 'var(--pd-success)' : 'var(--demo-border)',
                    }}
                  />
                )}
              </div>
              <div style={{ paddingBottom: 18 }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: fontStack,
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    color: active || done ? 'var(--pd-ink-900)' : 'var(--pd-ink-400)',
                  }}
                >
                  {step.title}
                </p>
                <p
                  style={{
                    margin: '2px 0 0',
                    fontFamily: fontStack,
                    fontSize: '0.78rem',
                    color: 'var(--pd-ink-500)',
                    lineHeight: 1.45,
                  }}
                >
                  {step.body}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pending position */}
      <div style={posCard}>
        <span style={{ fontFamily: fontStack, fontSize: '0.78rem', color: 'var(--pd-ink-500)' }}>
          Your position in this batch
        </span>
        {pending === null ? (
          <button
            type="button"
            onClick={revealPending}
            disabled={busy !== null}
            style={{ ...ghostBtn, alignSelf: 'flex-start' }}
          >
            {busy === 'reveal' ? 'Decrypting…' : '👁 Reveal'}
          </button>
        ) : (
          <span
            style={{
              fontFamily: monoStack,
              fontWeight: 700,
              fontSize: '1.2rem',
              color: 'var(--pd-private)',
            }}
          >
            {Number(formatUnits(pending, DECIMALS)).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{' '}
            {unit}
          </span>
        )}
      </div>

      {msg && (
        <p
          style={{
            margin: 0,
            color: '#dc2626',
            fontFamily: fontStack,
            fontSize: '0.78rem',
            wordBreak: 'break-word',
          }}
        >
          {msg}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={refresh}
          disabled={busy !== null}
          style={{ ...ghostBtn, flex: 1, padding: '11px' }}
        >
          {busy === 'refresh' ? 'Checking…' : 'Refresh status'}
        </button>
        <button
          type="button"
          onClick={claim}
          disabled={busy !== null || !ready}
          style={{ ...primaryBtn, flex: 1, opacity: busy !== null || !ready ? 0.5 : 1 }}
        >
          {busy === 'claim' ? 'Claiming…' : ready ? 'Claim' : 'Not ready'}
        </button>
      </div>

      {!ready && (
        <p
          style={{
            margin: 0,
            fontFamily: fontStack,
            fontSize: '0.74rem',
            color: 'var(--pd-ink-400)',
            lineHeight: 1.5,
          }}
        >
          Batches settle when an operator finalizes them. Tap <strong>Refresh status</strong> until
          it reads Finalized, then claim — your {batch.kind === 'deposit' ? 'shares' : 'cUSDC'} land
          in your wallet.
        </p>
      )}
    </div>
  )
}

const backBtn: CSSProperties = {
  alignSelf: 'flex-start',
  background: 'none',
  border: 'none',
  padding: 0,
  fontFamily: fontStack,
  fontSize: '0.95rem',
  fontWeight: 600,
  color: 'var(--pd-brand)',
  cursor: 'pointer',
}
const dot: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: fontStack,
  fontSize: '0.8rem',
  fontWeight: 700,
  flexShrink: 0,
}
const rail: CSSProperties = { width: 2, flex: 1, minHeight: 20, marginTop: 2 }
const posCard: CSSProperties = {
  background: 'var(--pd-surface)',
  borderRadius: 16,
  border: '1px solid var(--demo-border)',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}
