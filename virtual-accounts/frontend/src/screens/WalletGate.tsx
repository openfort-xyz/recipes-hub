import { AccountTypeEnum, RecoveryMethod } from '@openfort/react'
import { useEthereumEmbeddedWallet } from '@openfort/react/ethereum'
import { useState } from 'react'
import { errorText, fontStack, muted, primaryBtn } from '../components/styles'

/**
 * Creates (or passkey-recovers) the EOA that Noah will deliver USDC to. This is
 * the address bound to the virtual account, so it has to exist before the
 * account is issued.
 */
export function WalletGate() {
  const wallet = useEthereumEmbeddedWallet()
  const [error, setError] = useState<string | null>(null)

  const eoaWallets = (wallet.wallets ?? []).filter(
    (w) => w.accountType === AccountTypeEnum.EOA && w.isAvailable !== false
  )
  const existing = eoaWallets[0]
  const busy = wallet.status === 'creating' || wallet.isConnecting
  const walletError = wallet.status === 'error' ? wallet.error : null

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet setup failed')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: fontStack, fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
          {existing ? 'Unlock your wallet' : 'Create your wallet'}
        </h1>
        <p style={{ ...muted, marginTop: 6 }}>
          A self-custodial EOA secured by a passkey. Every deposit to your bank account is converted
          and sent here.
        </p>
      </div>

      {existing ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(() =>
              wallet.setActive({
                address: existing.address,
                recoveryMethod: RecoveryMethod.PASSKEY,
              })
            )
          }
          style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Unlocking...' : 'Unlock with passkey'}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(() =>
              wallet.create({
                accountType: AccountTypeEnum.EOA,
                recoveryMethod: RecoveryMethod.PASSKEY,
              })
            )
          }
          style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Creating...' : 'Create wallet with passkey'}
        </button>
      )}

      {(error || walletError) && <p style={errorText}>{error ?? walletError}</p>}
    </div>
  )
}
