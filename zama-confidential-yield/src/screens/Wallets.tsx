import { RecoveryMethod, useUser } from '@openfort/react'
import { useEthereumEmbeddedWallet } from '@openfort/react/ethereum'
import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { fontStack, ghostBtn, monoStack, primaryBtn } from '../components/styles'
import { ACCOUNT_TYPE } from '../openfort/Providers'

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

type WalletEntry = NonNullable<ReturnType<typeof useEthereumEmbeddedWallet>['wallets']>[number]

export function Wallets() {
  const embedded = useEthereumEmbeddedWallet()
  const wallets = useMemo(() => embedded.wallets ?? [], [embedded.wallets])
  const usable = wallets.filter((w) => w.accountType === ACCOUNT_TYPE && w.isAvailable !== false)
  const activeWallet = embedded.activeWallet
  const isCreating = embedded.status === 'creating'
  const isConnecting = embedded.isConnecting
  const walletError = embedded.status === 'error' ? embedded.error : null
  const { user, isAuthenticated } = useUser()
  const { isConnected } = useAccount()
  const [error, setError] = useState<string | null>(null)

  if (!activeWallet && isConnecting) return <p style={muted}>Recovering wallet with passkey…</p>
  if (embedded.status === 'fetching-wallets' || (!user && isAuthenticated))
    return <p style={muted}>Loading wallets…</p>

  const create = async () => {
    setError(null)
    try {
      await embedded.create({ accountType: ACCOUNT_TYPE, recoveryMethod: RecoveryMethod.PASSKEY })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet creation failed')
    }
  }

  const recover = async (wallet: WalletEntry) => {
    setError(null)
    try {
      await embedded.setActive({ address: wallet.address, recoveryMethod: RecoveryMethod.PASSKEY })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recovery failed')
    }
  }

  const createBtn = (
    <button
      type="button"
      disabled={isCreating}
      onClick={create}
      style={{ ...primaryBtn, opacity: isCreating ? 0.6 : 1 }}
    >
      {isCreating ? 'Creating…' : 'Create wallet with passkey'}
    </button>
  )

  if (usable.length === 0) {
    return (
      <div style={col}>
        <h1 style={heading}>Create your wallet</h1>
        <p style={body}>
          A self-custodial wallet on Ethereum mainnet, secured by a passkey (Face ID / Touch ID). It
          signs your confidential balance decryptions and every shield / vault action.
        </p>
        {createBtn}
        {(error || walletError) && <p style={errText}>{error || walletError}</p>}
      </div>
    )
  }

  if (!isConnected || activeWallet?.accountType !== ACCOUNT_TYPE) {
    return (
      <div style={col}>
        <h1 style={heading}>Unlock wallet</h1>
        <p style={body}>Recover your wallet with its passkey.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {usable.map((wallet) => (
            <div key={wallet.id + wallet.address} style={row}>
              <div>
                <p
                  style={{ margin: 0, fontWeight: 600, fontFamily: monoStack, fontSize: '0.9rem' }}
                >
                  {truncate(wallet.address)}
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: '0.74rem',
                    color: 'var(--pd-ink-500)',
                    fontFamily: fontStack,
                  }}
                >
                  Passkey-secured
                </p>
              </div>
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => recover(wallet)}
                style={{ ...primaryBtn, fontSize: '0.85rem', opacity: isConnecting ? 0.6 : 1 }}
              >
                {wallet.isConnecting ? 'Unlocking…' : 'Unlock'}
              </button>
            </div>
          ))}
        </div>
        {(error || walletError) && <p style={errText}>{error || walletError}</p>}
        <button type="button" disabled={isCreating} onClick={create} style={ghostBtn}>
          Create a new wallet instead
        </button>
      </div>
    )
  }

  return null
}

const col = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  animation: 'pd-rise .5s ease both',
} as const
const muted = {
  padding: 24,
  fontFamily: fontStack,
  fontSize: '0.9rem',
  color: 'var(--pd-ink-500)',
  textAlign: 'center',
} as const
const heading = { margin: 0, fontFamily: fontStack, fontWeight: 700, fontSize: '1.18rem' } as const
const body = {
  margin: 0,
  fontSize: '0.85rem',
  color: 'var(--pd-ink-500)',
  fontFamily: fontStack,
  lineHeight: 1.5,
} as const
const errText = { margin: 0, color: '#dc2626', fontSize: '0.82rem', fontFamily: fontStack } as const
const row = {
  background: 'var(--pd-surface-soft)',
  border: '1px solid var(--demo-border)',
  borderRadius: 'var(--radius-md)',
  padding: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
} as const
