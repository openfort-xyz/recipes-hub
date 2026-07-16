import { AccountTypeEnum, RecoveryMethod, useUser } from '@openfort/react'
import { useEthereumEmbeddedWallet } from '@openfort/react/ethereum'
import { type CSSProperties, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { fontStack, monoStack, primaryBtn } from '../components/styles'

function truncateAddress(addr: string) {
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
}

type WalletEntry = NonNullable<ReturnType<typeof useEthereumEmbeddedWallet>['wallets']>[number]

export const Wallets = () => {
  const embeddedWallet = useEthereumEmbeddedWallet()
  const wallets = useMemo(() => embeddedWallet.wallets ?? [], [embeddedWallet.wallets])
  const eoaWallets = wallets.filter(
    (w) => w.accountType === AccountTypeEnum.EOA && w.isAvailable !== false
  )
  const activeWallet = embeddedWallet.activeWallet
  const isLoadingWallets = embeddedWallet.status === 'fetching-wallets'
  const isCreating = embeddedWallet.status === 'creating'
  const isConnecting = embeddedWallet.isConnecting
  const walletError = embeddedWallet.status === 'error' ? embeddedWallet.error : null
  const { user, isAuthenticated } = useUser()
  const { isConnected } = useAccount()
  const [error, setError] = useState<string | null>(null)

  if (!activeWallet && isConnecting)
    return <div style={muted}>Recovering wallet with passkey...</div>
  if (isLoadingWallets || (!user && isAuthenticated))
    return <div style={muted}>Loading wallets...</div>

  const handleCreate = async () => {
    setError(null)
    try {
      await embeddedWallet.create({
        accountType: AccountTypeEnum.EOA,
        recoveryMethod: RecoveryMethod.PASSKEY,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet creation failed')
    }
  }

  const handleRecover = async (wallet: WalletEntry) => {
    setError(null)
    try {
      await embeddedWallet.setActive({
        address: wallet.address,
        recoveryMethod: RecoveryMethod.PASSKEY,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recovery failed')
    }
  }

  const createButton = (
    <button
      type="button"
      disabled={isCreating}
      onClick={handleCreate}
      style={{ ...primaryBtn, opacity: isCreating ? 0.6 : 1 }}
    >
      {isCreating ? 'Creating...' : 'Create wallet with passkey'}
    </button>
  )

  if (eoaWallets.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          animation: 'pd-rise .5s ease both',
        }}
      >
        <h1 style={heading}>Create your wallet</h1>
        <p style={body}>
          A self-custodial EOA on Monad testnet, secured by a passkey (Face ID / Touch ID). It owns
          both your public balance and your shielded balance.
        </p>
        {createButton}
        {(error || walletError) && <p style={errorText}>{error || walletError}</p>}
      </div>
    )
  }

  const isEoaActive = activeWallet?.accountType === AccountTypeEnum.EOA
  if (!isConnected || !isEoaActive) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          animation: 'pd-rise .5s ease both',
        }}
      >
        <h1 style={heading}>Recover wallet</h1>
        <p style={body}>Unlock your wallet with its passkey.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {eoaWallets.map((wallet) => (
            <div key={wallet.id + wallet.address} style={walletRow}>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    fontFamily: monoStack,
                    fontSize: '0.9rem',
                    color: 'var(--pd-ink-900)',
                  }}
                >
                  {truncateAddress(wallet.address)}
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: '0.75rem',
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
                onClick={() => handleRecover(wallet)}
                style={{ ...primaryBtn, fontSize: '0.85rem', opacity: isConnecting ? 0.6 : 1 }}
              >
                {wallet.isConnecting ? 'Unlocking...' : 'Unlock with passkey'}
              </button>
            </div>
          ))}
        </div>

        {(error || walletError) && <p style={errorText}>{error || walletError}</p>}

        <div
          style={{
            borderTop: '1px solid var(--demo-border)',
            paddingTop: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <p style={body}>Or create a new wallet:</p>
          {createButton}
        </div>
      </div>
    )
  }

  return null
}

const muted: CSSProperties = {
  padding: 24,
  fontFamily: fontStack,
  fontSize: '0.9rem',
  color: 'var(--pd-ink-500)',
  textAlign: 'center',
}
const heading: CSSProperties = {
  margin: 0,
  fontFamily: fontStack,
  fontWeight: 700,
  fontSize: '1.15rem',
  color: 'var(--pd-ink-900)',
}
const body: CSSProperties = {
  margin: 0,
  fontSize: '0.85rem',
  color: 'var(--pd-ink-500)',
  fontFamily: fontStack,
  lineHeight: 1.5,
}
const errorText: CSSProperties = {
  margin: 0,
  color: '#dc2626',
  fontSize: '0.85rem',
  fontFamily: fontStack,
}
const walletRow: CSSProperties = {
  background: 'var(--pd-surface-soft)',
  border: '1px solid var(--demo-border)',
  borderRadius: 'var(--radius-md)',
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}
