import { useSignOut } from '@openfort/react'
import { useEthereumEmbeddedWallet } from '@openfort/react/ethereum'
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react'
import { type EIP1193Provider, formatUnits } from 'viem'
import { ADDRESSES, DECIMALS, FAUCET_URL, NETWORK } from '../contracts/addresses'
import {
  type BatchKind,
  decryptHandles,
  type HandleRef,
  makeClients,
  mintTestUsdc,
  type Runtime,
  readEncryptedHandle,
  readUsdcBalance,
  shield,
  unshield,
  vaultDeposit,
  vaultRedeem,
  vaultValueUsdc,
} from '../zama/confidential'
import { BatchStatus } from './BatchStatus'
import { chip, fontStack, ghostBtn, iosCard, monoStack, sectionLabel } from './styles'
import { AmountAction, Spinner } from './ui'

type Hex = `0x${string}`
const ZERO: Hex = `0x${'0'.repeat(64)}`
const GASLESS = Boolean(import.meta.env.VITE_OPENFORT_FEE_SPONSORSHIP_ID)
const fmt = (v: bigint) =>
  Number(formatUnits(v, DECIMALS)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

type Pending = { key: string; kind: BatchKind; batchId: bigint; state: number }
const STATE_LABEL = ['Open', 'Dispatched', 'Ready'] as const

export function Dashboard() {
  const wallet = useEthereumEmbeddedWallet()
  const { signOut } = useSignOut()
  const account = wallet.activeWallet?.address as Hex | undefined
  const provider =
    'provider' in wallet ? (wallet.provider as EIP1193Provider | undefined) : undefined
  const rt = useMemo<Runtime | null>(
    () => (provider && account ? makeClients(provider, account) : null),
    [provider, account]
  )

  const [usdc, setUsdc] = useState<bigint | null>(null)
  const [handles, setHandles] = useState<{ cusdc: Hex; share: Hex }>({ cusdc: ZERO, share: ZERO })
  const [revealed, setRevealed] = useState<{ cusdc: bigint; vaultUsdc: bigint } | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending[]>([])
  const [copied, setCopied] = useState(false)
  const [minting, setMinting] = useState(false)
  const [viewKey, setViewKey] = useState<string | null>(null)

  const copyAddress = async () => {
    if (!account) return
    await navigator.clipboard.writeText(account)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  /** Light poll: refresh just the public USDC balance, leaving reveal state intact. */
  const refreshUsdc = useCallback(async () => {
    if (!rt) return
    setUsdc(await readUsdcBalance(rt))
  }, [rt])

  const load = useCallback(async () => {
    if (!rt) return
    setRevealed(null)
    const [bal, cusdc, share] = await Promise.all([
      readUsdcBalance(rt),
      readEncryptedHandle(rt, 'cusdc').catch(() => ZERO),
      readEncryptedHandle(rt, 'share').catch(() => ZERO),
    ])
    setUsdc(bal)
    setHandles({ cusdc: cusdc as Hex, share: share as Hex })
  }, [rt])

  useEffect(() => {
    void load()
  }, [load])

  // Poll the wallet's USDC balance every 10s so it updates without a reload.
  useEffect(() => {
    const id = setInterval(() => void refreshUsdc(), 10_000)
    return () => clearInterval(id)
  }, [refreshUsdc])

  const getUsdc = async () => {
    if (!rt) return
    setMinting(true)
    setErr(null)
    try {
      await mintTestUsdc(rt)
      await refreshUsdc()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Mint failed')
    } finally {
      setMinting(false)
    }
  }

  const reveal = async () => {
    if (!rt) return
    setRevealing(true)
    setErr(null)
    try {
      const refs: HandleRef[] = [
        { handle: handles.cusdc, contractAddress: ADDRESSES.cusdc },
        { handle: handles.share, contractAddress: ADDRESSES.confidentialShare },
      ]
      const map = await decryptHandles(rt, refs)
      const shareVal = map[handles.share.toLowerCase()] ?? 0n
      const vaultUsdc = shareVal > 0n ? await vaultValueUsdc(rt, shareVal) : 0n
      setRevealed({ cusdc: map[handles.cusdc.toLowerCase()] ?? 0n, vaultUsdc })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Decryption failed')
    } finally {
      setRevealing(false)
    }
  }

  const after = (msg: string) => async () => {
    await load()
    return msg
  }
  const addBatch = (kind: BatchKind, batchId: bigint) =>
    setPending((p) => [{ key: `${kind}-${batchId}-${p.length}`, kind, batchId, state: 0 }, ...p])

  if (!rt || usdc === null) return <Spinner label="Loading balances…" />

  const viewed = viewKey ? (pending.find((p) => p.key === viewKey) ?? null) : null
  if (viewed) {
    return (
      <BatchStatus
        rt={rt}
        batch={viewed}
        onBack={() => setViewKey(null)}
        onState={(state) =>
          setPending((p) => p.map((x) => (x.key === viewed.key ? { ...x, state } : x)))
        }
        onClaimed={() => {
          setPending((p) => p.filter((x) => x.key !== viewed.key))
          setViewKey(null)
          void load()
        }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1
          style={{
            margin: 0,
            fontFamily: fontStack,
            fontWeight: 800,
            fontSize: '1.55rem',
            letterSpacing: '-0.02em',
          }}
        >
          Wallet
        </h1>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={chip('var(--pd-private)')}>
            {NETWORK === 'mainnet' ? 'Mainnet' : 'Sepolia'}
          </span>
          <span style={chip(GASLESS ? 'var(--pd-success)' : 'var(--pd-ink-500)')}>
            {GASLESS ? '⚡ Gasless' : 'Self-pay'}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            style={{ ...ghostBtn, padding: '6px 10px', fontSize: '0.74rem' }}
          >
            Exit
          </button>
        </div>
      </header>

      {/* Hero — public USDC */}
      <div style={hero}>
        <span style={{ fontFamily: fontStack, fontSize: '0.78rem', opacity: 0.7 }}>
          USDC · Available
        </span>
        <div
          style={{
            fontFamily: fontStack,
            fontWeight: 800,
            fontSize: '2.6rem',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}
        >
          ${fmt(usdc)}
        </div>
        <div style={heroActions}>
          <button type="button" onClick={copyAddress} style={heroPill} title="Copy wallet address">
            {copied ? (
              '✓ Copied'
            ) : (
              <>
                <span style={{ fontFamily: monoStack }}>
                  {account?.slice(0, 6)}…{account?.slice(-4)}
                </span>
                <span aria-hidden>⧉</span>
              </>
            )}
          </button>
          {NETWORK === 'sepolia' ? (
            <button
              type="button"
              onClick={getUsdc}
              disabled={minting}
              style={{ ...heroPill, opacity: minting ? 0.6 : 1 }}
              title="Mint 100 test USDC to this wallet"
            >
              {minting ? 'Minting…' : '＋ Get test USDC'}
            </button>
          ) : (
            <a
              href={FAUCET_URL}
              target="_blank"
              rel="noreferrer"
              style={heroPill}
              title="Circle USDC faucet"
            >
              Get USDC ↗
            </a>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={revealed ? () => setRevealed(null) : reveal}
        disabled={revealing}
        style={{ ...revealBtn, opacity: revealing ? 0.6 : 1 }}
      >
        {revealing
          ? 'Decrypting…'
          : revealed
            ? '🙈  Hide private balances'
            : '🔓  Reveal private balances'}
      </button>
      {err && <p style={errStyle}>{err}</p>}

      {/* Shielded cUSDC */}
      <section>
        <p style={sectionLabel}>Shielded</p>
        <div style={iosCard}>
          <Row
            label="cUSDC"
            sub="confidential"
            value={revealed ? `$${fmt(revealed.cusdc)}` : '••••'}
            locked={!revealed}
          />
          <Divider />
          <p style={hint}>
            Wrap public USDC into encrypted cUSDC and back. The shield amount is visible; balances
            stay private.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AmountAction
              buttonText="Shield"
              unit="USDC"
              onSubmit={async (a) => {
                await shield(rt, a)
                return after('Shielded into cUSDC.')()
              }}
            />
            <AmountAction
              buttonText="Unshield"
              unit="cUSDC"
              onSubmit={async (a) => {
                await unshield(rt, a)
                return after('Unshielded to USDC.')()
              }}
            />
          </div>
        </div>
      </section>

      {/* Earn — confidential vault */}
      <section>
        <p style={sectionLabel}>Earn · private yield</p>
        <div style={iosCard}>
          <Row
            label="In vault"
            sub="cUSDC + yield"
            value={revealed ? `$${fmt(revealed.vaultUsdc)}` : '••••'}
            locked={!revealed}
            badge="~4% APY"
          />
          <Divider />
          <p style={hint}>
            Deposit cUSDC to earn ~4% privately; your position shows in cUSDC and grows as the vault
            earns. (Internally it's an ERC-4626 vault that issues appreciating{' '}
            <strong>shares</strong> — the value above already converts them back to cUSDC.) Deposits
            join a <strong>batch</strong>; tap a pending batch below to claim once it settles.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AmountAction
              buttonText="Deposit"
              unit="cUSDC"
              onSubmit={async (a) => {
                const id = await vaultDeposit(rt, a)
                addBatch('deposit', id)
                return after(`Joined deposit batch #${id}.`)()
              }}
            />
            <AmountAction
              buttonText="Redeem"
              unit="shares"
              onSubmit={async (a) => {
                const id = await vaultRedeem(rt, a)
                addBatch('redeem', id)
                return after(`Joined redeem batch #${id}.`)()
              }}
            />
          </div>
        </div>
      </section>

      {pending.length > 0 && (
        <section>
          <p style={sectionLabel}>Pending batches</p>
          <div style={{ ...iosCard, padding: 6 }}>
            {pending.map((b) => (
              <button key={b.key} type="button" onClick={() => setViewKey(b.key)} style={batchRow}>
                <div style={{ textAlign: 'left' }}>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: fontStack,
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}
                  >
                    {b.kind === 'deposit' ? 'Deposit' : 'Redeem'} batch #{b.batchId.toString()}
                  </p>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontFamily: fontStack,
                      fontSize: '0.72rem',
                      color: b.state >= 2 ? 'var(--pd-success)' : 'var(--pd-ink-400)',
                    }}
                  >
                    {STATE_LABEL[b.state] ?? 'Open'}
                    {b.state >= 2 ? ' · tap to claim' : ' · tap for status'}
                  </p>
                </div>
                <span style={{ color: 'var(--pd-ink-400)', fontSize: '1.2rem' }}>›</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <footer style={{ textAlign: 'center', padding: '4px 0 8px' }}>
        <span style={{ fontFamily: fontStack, fontSize: '0.68rem', color: 'var(--pd-ink-400)' }}>
          Openfort wallet · Zama cUSDC · Ethereum {NETWORK === 'mainnet' ? 'mainnet' : 'Sepolia'}
        </span>
      </footer>
    </div>
  )
}

function Row({
  label,
  sub,
  value,
  locked,
  badge,
}: {
  label: string
  sub: string
  value: string
  locked?: boolean
  badge?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 4,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ margin: 0, fontFamily: fontStack, fontWeight: 600, fontSize: '0.95rem' }}>
            {label}
          </p>
          {badge && <span style={chip('var(--pd-success)')}>{badge}</span>}
        </div>
        <p
          style={{
            margin: '2px 0 0',
            fontFamily: fontStack,
            fontSize: '0.72rem',
            color: 'var(--pd-ink-400)',
          }}
        >
          {sub}
        </p>
      </div>
      <span
        style={{
          fontFamily: monoStack,
          fontWeight: 600,
          fontSize: '1.15rem',
          color: locked ? 'var(--pd-ink-400)' : 'var(--pd-private)',
        }}
      >
        {locked ? `🔒 ${value}` : value}
      </span>
    </div>
  )
}

const Divider = () => (
  <div style={{ height: 1, background: 'var(--demo-border)', margin: '12px 0' }} />
)

const hero: CSSProperties = {
  borderRadius: 22,
  padding: '20px 22px',
  color: '#fff',
  background: 'linear-gradient(150deg, #FC3927 0%, #c81e10 100%)',
  boxShadow: '0 12px 30px rgba(252,57,39,.32)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}
const heroActions: CSSProperties = { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }
const heroPill: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'rgba(255,255,255,.18)',
  color: '#fff',
  border: 'none',
  borderRadius: 999,
  padding: '5px 12px',
  fontFamily: fontStack,
  fontSize: '0.74rem',
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
}
const revealBtn: CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: 14,
  border: 'none',
  background: 'var(--pd-surface-muted)',
  color: 'var(--pd-ink-900)',
  fontFamily: fontStack,
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
}
const batchRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  background: 'none',
  border: 'none',
  padding: '10px 8px',
  cursor: 'pointer',
}
const hint: CSSProperties = {
  margin: '0 0 12px',
  fontFamily: fontStack,
  fontSize: '0.76rem',
  color: 'var(--pd-ink-500)',
  lineHeight: 1.5,
}
const errStyle: CSSProperties = {
  margin: 0,
  color: '#dc2626',
  fontFamily: fontStack,
  fontSize: '0.78rem',
  wordBreak: 'break-word',
}
