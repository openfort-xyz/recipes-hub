import { AccountTypeEnum, RecoveryMethod } from '@openfort/react'
import { useEthereumEmbeddedWallet } from '@openfort/react/ethereum'
import { useCallback, useEffect, useRef, useState } from 'react'
import { errorText, fontStack, muted, primaryBtn } from '../components/styles'

/**
 * Brings up the EOA that Noah delivers USDC to: recovers the existing one, or
 * creates it on first sign-in. Runs on its own — the only button here is the
 * retry after a failure, since the passkey prompt can be dismissed.
 */
export function WalletGate() {
  const wallet = useEthereumEmbeddedWallet()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  const { wallets, status, isConnecting, create, setActive } = wallet
  const existing = (wallets ?? []).find(
    (w) => w.accountType === AccountTypeEnum.EOA && w.isAvailable !== false
  )

  const setUpWallet = useCallback(async () => {
    setError(null)
    try {
      if (existing) {
        await setActive({ address: existing.address, recoveryMethod: RecoveryMethod.PASSKEY })
      } else {
        await create({ accountType: AccountTypeEnum.EOA, recoveryMethod: RecoveryMethod.PASSKEY })
      }
    } catch (err) {
      started.current = false // let the user retry a dismissed passkey prompt
      setError(err instanceof Error ? err.message : 'Wallet setup failed')
    }
  }, [existing, create, setActive])

  useEffect(() => {
    // Wait for the wallet list before deciding between recover and create.
    if (started.current || status === 'fetching-wallets' || isConnecting) return
    started.current = true
    void setUpWallet()
  }, [status, isConnecting, setUpWallet])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={muted}>
        {error
          ? 'Confirm the passkey prompt to unlock your wallet.'
          : existing
            ? 'Unlocking your wallet with your passkey...'
            : 'Creating your wallet...'}
      </p>
      {error && (
        <>
          <p style={errorText}>{error}</p>
          <button
            type="button"
            onClick={() => {
              started.current = true
              void setUpWallet()
            }}
            style={primaryBtn}
          >
            Try again
          </button>
        </>
      )}
      <p style={{ ...muted, fontFamily: fontStack, fontSize: '0.78rem' }}>
        A self-custodial EOA secured by a passkey. Deposits to your bank account are converted and
        sent here.
      </p>
    </div>
  )
}
