'use client'

import { AccountTypeEnum, RecoveryMethod, useUser, useWallets } from '@openfort/react'
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

function truncateAddress(addr: string) {
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
}

function useIsPasskeyAvailable() {
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof PublicKeyCredential === 'undefined' ||
      !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
    ) {
      setAvailable(false)
      return
    }
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(setAvailable)
      .catch(() => setAvailable(false))
  }, [])

  return available
}

export const Wallets = () => {
  const {
    wallets,
    isLoadingWallets,
    activeWallet,
    availableWallets,
    setActiveWallet,
    isConnecting,
    createWallet,
    isCreating,
  } = useWallets()
  const { user, isAuthenticated } = useUser()
  const { isConnected } = useAccount()
  const isPasskeyAvailable = useIsPasskeyAvailable()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!activeWallet && isConnecting) return <div>Recovering wallet...</div>
  if (isLoadingWallets || (!user && isAuthenticated)) return <div>Loading wallets...</div>
  // Wait for passkey check to resolve
  if (isPasskeyAvailable === null) return <div>Loading...</div>

  const recoveryMethod = isPasskeyAvailable ? RecoveryMethod.PASSKEY : RecoveryMethod.PASSWORD

  const handleCreate = async () => {
    setError(null)
    try {
      if (recoveryMethod === RecoveryMethod.PASSWORD && !password) {
        setError('Please enter a recovery password.')
        return
      }
      await createWallet({
        accountType: AccountTypeEnum.DELEGATED_ACCOUNT,
        recovery:
          recoveryMethod === RecoveryMethod.PASSKEY
            ? { recoveryMethod: RecoveryMethod.PASSKEY }
            : { recoveryMethod: RecoveryMethod.PASSWORD, password },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wallet creation failed'
      // If passkey failed, prompt to retry with password
      if (isPasskeyAvailable && msg.toLowerCase().includes('passkey')) {
        setError('Passkey failed. Try creating with a password instead.')
      } else {
        setError(msg)
      }
    }
  }

  const handleRecover = async (wallet: (typeof wallets)[0]) => {
    setError(null)
    try {
      if (wallet.recoveryMethod === RecoveryMethod.PASSWORD && !password) {
        setError('Please enter your recovery password.')
        return
      }
      await setActiveWallet({
        walletId: 'xyz.openfort',
        address: wallet.address,
        recovery:
          wallet.recoveryMethod === RecoveryMethod.PASSKEY
            ? { recoveryMethod: RecoveryMethod.PASSKEY }
            : wallet.recoveryMethod === RecoveryMethod.PASSWORD
              ? { recoveryMethod: RecoveryMethod.PASSWORD, password }
              : undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recovery failed')
    }
  }

  // No wallets yet — create one
  if (availableWallets.length === 0) {
    return (
      <div className="space-y-4">
        <h1>Create a wallet</h1>
        <p className="text-sm text-muted-foreground">You don't have a wallet yet. Create one to get started.</p>

        {recoveryMethod === RecoveryMethod.PASSWORD && (
          <div>
            <label htmlFor="create-password" className="block text-sm font-medium mb-1">
              Recovery password
            </label>
            <input
              id="create-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a recovery password"
            />
          </div>
        )}

        <button type="button" className="btn" disabled={isCreating} onClick={handleCreate}>
          {isCreating
            ? 'Creating...'
            : recoveryMethod === RecoveryMethod.PASSKEY
              ? 'Create wallet with passkey'
              : 'Create wallet with password'}
        </button>
        {!isPasskeyAvailable && (
          <p className="text-xs text-muted-foreground">
            Passkeys are not available on this device. Using password recovery.
          </p>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    )
  }

  // Has wallets but none connected — recover
  if (!isConnected) {
    return (
      <div className="space-y-4">
        {wallets.length > 0 && (
          <>
            <h1>Recover wallet</h1>
            <p className="text-sm text-muted-foreground">Select a wallet to recover.</p>
          </>
        )}

        {wallets.length > 0 && (
          <div className="flex flex-col gap-2">
            {wallets.map((wallet) => {
              const needsPassword = wallet.recoveryMethod === RecoveryMethod.PASSWORD
              return (
                <div key={wallet.id + wallet.address} className="p-3 border border-border rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium font-mono">{truncateAddress(wallet.address)}</p>
                      <p className="text-xs text-muted-foreground">
                        Recovery:{' '}
                        {wallet.recoveryMethod === RecoveryMethod.PASSKEY
                          ? 'passkey'
                          : wallet.recoveryMethod === RecoveryMethod.PASSWORD
                            ? 'password'
                            : 'automatic'}
                      </p>
                    </div>
                    {!needsPassword && (
                      <button
                        type="button"
                        className="btn text-sm"
                        disabled={isConnecting}
                        onClick={() => handleRecover(wallet)}
                      >
                        {wallet.isConnecting ? 'Recovering...' : 'Recover'}
                      </button>
                    )}
                  </div>
                  {needsPassword && (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Recovery password"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        className="btn text-sm"
                        disabled={isConnecting || !password}
                        onClick={() => handleRecover(wallet)}
                      >
                        {wallet.isConnecting ? 'Recovering...' : 'Recover'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className={wallets.length > 0 ? 'border-t border-border pt-4 space-y-3' : 'space-y-3'}>
          {wallets.length > 0 && <p className="text-sm text-muted-foreground">Or create a new wallet:</p>}
          {wallets.length === 0 && (
            <>
              <h1>Create a wallet</h1>
              <p className="text-sm text-muted-foreground">Create a wallet to get started.</p>
            </>
          )}
          {recoveryMethod === RecoveryMethod.PASSWORD && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Recovery password for new wallet"
            />
          )}
          <button type="button" className="btn" disabled={isCreating} onClick={handleCreate}>
            {isCreating
              ? 'Creating...'
              : recoveryMethod === RecoveryMethod.PASSKEY
                ? 'Create wallet with passkey'
                : 'Create wallet with password'}
          </button>
        </div>
      </div>
    )
  }

  return null
}
