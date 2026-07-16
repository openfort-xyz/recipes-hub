import { useSignOut } from '@openfort/react'
import { useUnlink } from '@unlink-xyz/sdk/react'
import { type CSSProperties, type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import {
  type Address,
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  http,
  parseUnits,
} from 'viem'
import { monadTestnet } from 'viem/chains'
import { useAccount, useReadContract, useSendTransaction } from 'wagmi'
import { fontStack, monoStack } from '../components/styles'
import type { Invoice } from '../lib/invoices'
import { MONAD_EXPLORER, MONAD_RPC_URL, UNLINK_TOKEN } from '../unlink/unlink'

const HAS_TOKEN = /^0x[0-9a-fA-F]{40}$/.test(UNLINK_TOKEN)

function truncateAddress(addr: string) {
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
}

function truncateUnlink(addr: string | null) {
  if (!addr) return 'registering…'
  return `${addr.slice(0, 10)}…${addr.slice(-4)}`
}

function explorerTx(hash: string) {
  return (
    <a
      href={`${MONAD_EXPLORER}/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'inherit', textDecoration: 'underline' }}
    >
      View on explorer
    </a>
  )
}

type Banner = { message: ReactNode; kind: 'info' | 'success' | 'error' }

export function PayerDashboard({
  invoices,
  onInvoiceStatusChange,
}: {
  invoices: Invoice[]
  onInvoiceStatusChange: (
    id: string,
    status: Invoice['status'],
    extra?: { txHash?: string; private?: boolean }
  ) => void
}) {
  const { address } = useAccount()
  const { signOut } = useSignOut()
  const unlink = useUnlink()
  const { sendTransactionAsync } = useSendTransaction()

  const [privateMode, setPrivateMode] = useState(true)
  const [fundingPublic, setFundingPublic] = useState(false)
  const [fundingPrivate, setFundingPrivate] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [moveAmount, setMoveAmount] = useState('10')
  const [moving, setMoving] = useState<'shield' | 'unshield' | null>(null)
  const [banner, setBanner] = useState<Banner | null>(null)
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notify = useCallback((message: ReactNode, kind: Banner['kind']) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current)
    setBanner({ message, kind })
    bannerTimer.current = setTimeout(() => setBanner(null), 7000)
  }, [])

  const { data: decimalsRaw } = useReadContract({
    address: HAS_TOKEN ? UNLINK_TOKEN : undefined,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: HAS_TOKEN },
  })
  const decimals = decimalsRaw ?? 18

  const { data: publicBalanceRaw, refetch: refetchPublic } = useReadContract({
    address: HAS_TOKEN ? UNLINK_TOKEN : undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: HAS_TOKEN && !!address },
  })
  const publicBalance =
    publicBalanceRaw !== undefined ? formatUnits(publicBalanceRaw, decimals) : '0'

  const privateBalance = useMemo(() => {
    const entry = unlink.balances?.balances?.find(
      (b) => b.token.toLowerCase() === UNLINK_TOKEN.toLowerCase()
    )
    return entry ? formatUnits(BigInt(entry.amount), decimals) : '0'
  }, [unlink.balances, decimals])

  const handleFundPublic = useCallback(async () => {
    if (!address) return
    setFundingPublic(true)
    try {
      await unlink.client.faucet.requestTestTokens({ token: UNLINK_TOKEN, evmAddress: address })
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        const res = await refetchPublic()
        if (res.data && res.data > BigInt(0)) break
      }
      notify('Public balance funded.', 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Faucet failed', 'error')
    } finally {
      setFundingPublic(false)
    }
  }, [address, unlink.client, refetchPublic, notify])

  const handleFundPrivate = useCallback(async () => {
    setFundingPrivate(true)
    try {
      await unlink.client.faucet.requestPrivateTokens({ token: UNLINK_TOKEN })
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        await unlink.refresh()
        const bal = await unlink.client.balanceOf(UNLINK_TOKEN)
        if (bal && BigInt(bal) > BigInt(0)) break
      }
      notify('Private balance funded (shielded).', 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Faucet failed', 'error')
    } finally {
      setFundingPrivate(false)
    }
  }, [unlink, notify])

  // Shield: deposit public USDC from the EOA into the Unlink shielded pool.
  const handleShield = useCallback(async () => {
    setMoving('shield')
    try {
      const amount = parseUnits(moveAmount || '0', decimals).toString()
      const result = await unlink.depositWithApproval({ token: UNLINK_TOKEN, amount })
      if (result.status !== 'processed') throw new Error(`Deposit ${result.status}`)
      notify(
        `Shielded $${Number.parseFloat(moveAmount).toFixed(2)} into your private balance.`,
        'success'
      )
      await unlink.refresh()
      await refetchPublic()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Shield failed', 'error')
    } finally {
      setMoving(null)
    }
  }, [moveAmount, decimals, unlink, refetchPublic, notify])

  // Unshield: withdraw the shielded balance back to your own EOA (relayer pays gas).
  const handleUnshield = useCallback(async () => {
    if (!address) return
    setMoving('unshield')
    try {
      const amount = parseUnits(moveAmount || '0', decimals).toString()
      const result = await unlink.withdraw({
        recipientEvmAddress: address,
        token: UNLINK_TOKEN,
        amount,
      })
      if (result.status !== 'processed') throw new Error(`Withdraw ${result.status}`)
      notify(
        `Unshielded $${Number.parseFloat(moveAmount).toFixed(2)} to your public balance.`,
        'success'
      )
      await unlink.refresh()
      await refetchPublic()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unshield failed', 'error')
    } finally {
      setMoving(null)
    }
  }, [address, moveAmount, decimals, unlink, refetchPublic, notify])

  const payPrivately = useCallback(
    async (invoice: Invoice) => {
      const amount = parseUnits(invoice.amount, decimals).toString()
      const result = await unlink.withdraw({
        recipientEvmAddress: invoice.recipient,
        token: UNLINK_TOKEN,
        amount,
      })
      if (result.status !== 'processed') throw new Error(`Withdrawal ${result.status}`)
      return result.txHash ?? undefined
    },
    [unlink, decimals]
  )

  const payPublicly = useCallback(
    async (invoice: Invoice) => {
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [invoice.recipient as Address, parseUnits(invoice.amount, decimals)],
      })
      const hash = await sendTransactionAsync({ to: UNLINK_TOKEN, data })
      const publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http(MONAD_RPC_URL),
      })
      await publicClient.waitForTransactionReceipt({ hash })
      return hash
    },
    [sendTransactionAsync, decimals]
  )

  const handlePay = useCallback(
    async (invoice: Invoice) => {
      if (payingId) return
      setPayingId(invoice.id)
      onInvoiceStatusChange(invoice.id, 'paying')
      const isPrivate = privateMode
      try {
        const txHash = isPrivate ? await payPrivately(invoice) : await payPublicly(invoice)
        onInvoiceStatusChange(invoice.id, 'paid', { txHash, private: isPrivate })
        notify(
          <span>
            {isPrivate ? 'Paid privately — funder hidden. ' : 'Payment sent. '}
            {txHash ? explorerTx(txHash) : null}
          </span>,
          'success'
        )
        if (isPrivate) await unlink.refresh()
        else await refetchPublic()
      } catch (err) {
        onInvoiceStatusChange(invoice.id, 'open')
        notify(err instanceof Error ? err.message : 'Payment failed', 'error')
      } finally {
        setPayingId(null)
      }
    },
    [
      payingId,
      privateMode,
      payPrivately,
      payPublicly,
      onInvoiceStatusChange,
      unlink,
      refetchPublic,
      notify,
    ]
  )

  const openInvoices = invoices.filter((inv) => inv.status === 'open' || inv.status === 'paying')
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid')

  if (!HAS_TOKEN) {
    return (
      <div
        style={{
          padding: 20,
          fontFamily: fontStack,
          color: 'var(--pd-ink-700)',
          fontSize: '0.85rem',
          lineHeight: 1.6,
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontWeight: 700, color: 'var(--pd-ink-900)' }}>
          Setup required
        </h2>
        Set <code style={{ fontFamily: monoStack }}>VITE_UNLINK_TOKEN</code> in{' '}
        <code style={{ fontFamily: monoStack }}>frontend/.env</code> to your Monad-testnet token
        address (Unlink dashboard → Tokens), then restart the dev server.
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        animation: 'pd-rise .5s ease both',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: fontStack,
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--pd-ink-900)',
            }}
          >
            Acme Imports
          </h1>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: '0.64rem',
              color: 'var(--pd-ink-400)',
              fontFamily: fontStack,
            }}
          >
            One wallet · two balances
          </p>
        </div>
        <button type="button" onClick={() => signOut()} style={signOutBtn}>
          Sign out
        </button>
      </div>

      {banner && (
        <div
          style={{
            padding: '8px 11px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.7rem',
            fontFamily: fontStack,
            fontWeight: 500,
            lineHeight: 1.45,
            color:
              banner.kind === 'error'
                ? '#b91c1c'
                : banner.kind === 'success'
                  ? '#047857'
                  : 'var(--pd-ink-700)',
            background:
              banner.kind === 'error'
                ? '#fef2f2'
                : banner.kind === 'success'
                  ? '#ecfdf5'
                  : 'var(--pd-surface-soft)',
            border: `1px solid ${banner.kind === 'error' ? '#fecaca' : banner.kind === 'success' ? '#a7f3d0' : 'var(--demo-border)'}`,
          }}
        >
          {banner.message}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <BalanceCard
          label="Public balance"
          value={publicBalance}
          accent="var(--pd-ink-700)"
          note="Traceable · visible"
          addressNode={
            address ? (
              <a
                href={`${MONAD_EXPLORER}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                style={addrLink}
                title={address}
              >
                {truncateAddress(address)}
              </a>
            ) : null
          }
          onFund={handleFundPublic}
          funding={fundingPublic}
        />
        <BalanceCard
          label="Private balance"
          value={privateBalance}
          accent="var(--pd-private)"
          note="🔒 Shielded · hidden"
          addressNode={
            <span style={addrText} title={unlink.address ?? ''}>
              {truncateUnlink(unlink.address)}
            </span>
          }
          onFund={handleFundPrivate}
          funding={fundingPrivate}
        />
      </div>

      {/* Move value between the public EOA and the shielded balance */}
      <div style={moveStrip}>
        <span
          style={{
            fontSize: '0.62rem',
            fontWeight: 600,
            color: 'var(--pd-ink-500)',
            fontFamily: fontStack,
          }}
        >
          Move $
        </span>
        <input
          value={moveAmount}
          onChange={(event) => setMoveAmount(event.target.value.replace(/[^0-9.]/g, ''))}
          inputMode="decimal"
          aria-label="Amount to move between balances"
          style={moveInput}
        />
        <button
          type="button"
          onClick={handleShield}
          disabled={moving !== null}
          title="Deposit public USDC into your private (shielded) balance"
          style={{
            ...moveBtn,
            color: 'var(--pd-private)',
            borderColor: 'var(--pd-private)',
            opacity: moving ? 0.5 : 1,
          }}
        >
          {moving === 'shield' ? 'Shielding…' : 'Shield ↑'}
        </button>
        <button
          type="button"
          onClick={handleUnshield}
          disabled={moving !== null}
          title="Withdraw your private balance back to your public wallet"
          style={{
            ...moveBtn,
            color: 'var(--pd-ink-700)',
            borderColor: 'var(--pd-chip-border)',
            opacity: moving ? 0.5 : 1,
          }}
        >
          {moving === 'unshield' ? 'Unshielding…' : 'Unshield ↓'}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 11px',
          borderRadius: 'var(--radius-md)',
          background: privateMode ? 'rgba(99,102,241,.08)' : 'var(--pd-surface-soft)',
          border: `1px solid ${privateMode ? 'rgba(99,102,241,.35)' : 'var(--demo-border)'}`,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: '0.78rem',
              fontWeight: 700,
              color: privateMode ? 'var(--pd-private)' : 'var(--pd-ink-700)',
              fontFamily: fontStack,
            }}
          >
            {privateMode ? 'Private payment' : 'Public payment'}
          </p>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: '0.66rem',
              color: 'var(--pd-ink-500)',
              fontFamily: fontStack,
            }}
          >
            {privateMode
              ? 'Settled from your shielded balance — funder hidden'
              : 'Direct transfer — sender, amount and recipient visible'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPrivateMode((v) => !v)}
          aria-label="Toggle private payment"
          style={{
            position: 'relative',
            width: 40,
            height: 22,
            borderRadius: 11,
            border: 'none',
            background: privateMode ? 'var(--pd-private)' : 'var(--pd-surface-muted)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: privateMode ? 20 : 2,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left .2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,.2)',
            }}
          />
        </button>
      </div>

      <div style={card}>
        <h2
          style={{
            margin: 0,
            fontFamily: fontStack,
            fontWeight: 700,
            fontSize: '0.88rem',
            color: 'var(--pd-ink-900)',
          }}
        >
          Invoices due
        </h2>
        {openInvoices.length === 0 ? (
          <p style={emptyLine}>No pending invoices</p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              maxHeight: 104,
              overflowY: 'auto',
            }}
          >
            {openInvoices.map((inv) => {
              const isPaying = inv.status === 'paying' || payingId === inv.id
              return (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    background: 'var(--pd-surface-soft)',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontFamily: monoStack,
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        color: 'var(--pd-ink-900)',
                      }}
                    >
                      ${Number.parseFloat(inv.amount).toFixed(2)}
                    </span>
                    <span
                      style={{
                        fontFamily: monoStack,
                        fontSize: '0.6rem',
                        color: 'var(--pd-ink-300)',
                        marginLeft: 6,
                      }}
                    >
                      INV-{String(inv.number).padStart(4, '0')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePay(inv)}
                    disabled={isPaying || !!payingId}
                    style={{
                      background: privateMode ? 'var(--pd-private)' : 'var(--pd-brand)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 12px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: isPaying || payingId ? 'not-allowed' : 'pointer',
                      fontFamily: fontStack,
                      opacity: isPaying || payingId ? 0.5 : 1,
                    }}
                  >
                    {isPaying ? 'Paying...' : privateMode ? 'Pay privately' : 'Pay'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={card}>
        <h3
          style={{
            margin: 0,
            fontFamily: fontStack,
            fontWeight: 600,
            fontSize: '0.8rem',
            color: 'var(--pd-ink-900)',
          }}
        >
          Payments
        </h3>
        {paidInvoices.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              maxHeight: 84,
              overflowY: 'auto',
            }}
          >
            {paidInvoices.map((inv) => (
              <div
                key={inv.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: 'var(--pd-surface-soft)',
                  borderRadius: 6,
                  fontSize: '0.7rem',
                }}
              >
                <span style={{ fontFamily: monoStack, color: 'var(--pd-ink-700)' }}>
                  INV-{String(inv.number).padStart(4, '0')}
                </span>
                {inv.private && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--pd-private)' }}>
                    🔒
                  </span>
                )}
                <span
                  style={{ fontFamily: monoStack, fontWeight: 600, color: 'var(--pd-success)' }}
                >
                  ${Number.parseFloat(inv.amount).toFixed(2)}
                </span>
                {inv.txHash ? (
                  <a
                    href={`${MONAD_EXPLORER}/tx/${inv.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: monoStack,
                      fontSize: '0.6rem',
                      color: 'var(--pd-brand)',
                      textDecoration: 'underline',
                      textUnderlineOffset: 2,
                    }}
                  >
                    {inv.txHash.substring(0, 10)}...
                  </a>
                ) : (
                  <span
                    style={{
                      fontFamily: monoStack,
                      fontSize: '0.6rem',
                      color: 'var(--pd-ink-300)',
                    }}
                  >
                    —
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={emptyLine}>No payments yet</p>
        )}
      </div>
    </div>
  )
}

function BalanceCard({
  label,
  value,
  accent,
  note,
  addressNode,
  onFund,
  funding,
}: {
  label: string
  value: string
  accent: string
  note: string
  addressNode?: ReactNode
  onFund: () => void
  funding: boolean
}) {
  return (
    <div
      style={{
        flex: 1,
        background: 'var(--pd-surface-soft)',
        border: '1px solid var(--demo-border)',
        borderRadius: 'var(--radius-md)',
        padding: '9px 11px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '0.62rem',
          color: 'var(--pd-ink-500)',
          fontFamily: fontStack,
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <div
        style={{
          fontFamily: monoStack,
          fontSize: '1.05rem',
          fontWeight: 700,
          color: 'var(--pd-ink-900)',
        }}
      >
        ${Number.parseFloat(value).toFixed(2)}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: '0.6rem',
          color: accent,
          fontFamily: fontStack,
          fontWeight: 600,
        }}
      >
        {note}
      </p>
      {addressNode && (
        <div
          style={{
            fontSize: '0.58rem',
            fontFamily: monoStack,
            color: 'var(--pd-ink-400)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {addressNode}
        </div>
      )}
      <button
        type="button"
        onClick={onFund}
        disabled={funding}
        style={{
          marginTop: 4,
          background: 'transparent',
          border: `1px solid ${accent}`,
          borderRadius: 6,
          padding: '4px 0',
          fontSize: '0.66rem',
          fontWeight: 600,
          color: accent,
          cursor: funding ? 'not-allowed' : 'pointer',
          fontFamily: fontStack,
          opacity: funding ? 0.5 : 1,
        }}
      >
        {funding ? 'Funding...' : '+ Fund'}
      </button>
    </div>
  )
}

const signOutBtn: CSSProperties = {
  background: 'none',
  border: '1px solid var(--pd-chip-border)',
  borderRadius: 'var(--radius-md)',
  padding: '4px 10px',
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'var(--pd-ink-500)',
  cursor: 'pointer',
  fontFamily: fontStack,
}

const card: CSSProperties = {
  background: 'var(--pd-surface)',
  border: '1px solid var(--demo-border)',
  borderRadius: 'var(--radius-md)',
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const emptyLine: CSSProperties = {
  margin: 0,
  fontSize: '0.75rem',
  color: 'var(--pd-ink-300)',
  textAlign: 'center',
  padding: '6px 0',
}

const addrLink: CSSProperties = { color: 'var(--pd-ink-400)', textDecoration: 'none' }

const addrText: CSSProperties = { color: 'var(--pd-ink-400)' }

const moveStrip: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 9px',
  borderRadius: 'var(--radius-md)',
  border: '1px dashed var(--demo-border)',
  background: 'var(--pd-surface-soft)',
}

const moveInput: CSSProperties = {
  width: 48,
  padding: '3px 6px',
  border: '1px solid var(--demo-border)',
  borderRadius: 6,
  fontFamily: monoStack,
  fontSize: '0.72rem',
  fontWeight: 600,
  background: 'var(--pd-surface)',
  color: 'var(--pd-ink-900)',
  outline: 'none',
  boxSizing: 'border-box',
}

const moveBtn: CSSProperties = {
  background: 'transparent',
  border: '1px solid',
  borderRadius: 6,
  padding: '4px 9px',
  fontSize: '0.66rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: fontStack,
  whiteSpace: 'nowrap',
}
