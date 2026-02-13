'use client'

import { AccountTypeEnum, RecoveryMethod, useUser, useWallets } from '@openfort/react'
import { useAccount } from 'wagmi'

export const Wallets = () => {
  const { wallets, isLoadingWallets, activeWallet, availableWallets, setActiveWallet, isConnecting, createWallet, isCreating } = useWallets()
  const { user, isAuthenticated } = useUser()
  const { isConnected } = useAccount()

  if (!activeWallet && isConnecting) return <div>Recovering wallet...</div>
  if (isLoadingWallets || (!user && isAuthenticated)) return <div>Loading wallets...</div>

  if (availableWallets.length === 0) {
    return (
      <div className="space-y-4">
        <h1>Create a wallet</h1>
        <p className="text-sm text-muted-foreground">You don't have a wallet yet. Create one to get started.</p>
        <button
          type="button"
          className="btn"
          disabled={isCreating}
          onClick={() => createWallet({ 
            accountType: AccountTypeEnum.DELEGATED_ACCOUNT,
            recovery: { recoveryMethod: RecoveryMethod.PASSKEY } 
          })}
        >
          {isCreating ? 'Creating...' : 'Create wallet with passkey'}
        </button>
      </div>
    )
  }

  // User has wallets but none active — let them pick one to recover
  if (!isConnected) {
    return (
      <div className="space-y-4">
        <h1>Connect wallet</h1>
        <p className="text-sm text-muted-foreground">Select a wallet to connect.</p>
        <div className="flex flex-col gap-2">
          {wallets.map((wallet) => (
            <button
              key={wallet.id + wallet.address}
              type="button"
              className="px-4 py-3 border border-border rounded cursor-pointer hover:bg-muted/20 hover:border-foreground transition-colors text-sm text-left"
              disabled={isConnecting}
              onClick={() =>
                setActiveWallet({
                  walletId: 'xyz.openfort',
                  address: wallet.address,
                })
              }
            >
              {wallet.isConnecting ? (
                <p>Connecting...</p>
              ) : (
                <p className="font-medium">{`${wallet.address.substring(0, 6)}...${wallet.address.substring(wallet.address.length - 4)}`}</p>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn"
          disabled={isCreating}
          onClick={() => createWallet({ accountType: AccountTypeEnum.DELEGATED_ACCOUNT,recovery: { recoveryMethod: RecoveryMethod.PASSKEY } })}
        >
          {isCreating ? 'Creating...' : 'Create another wallet'}
        </button>
      </div>
    )
  }

  return null
}
