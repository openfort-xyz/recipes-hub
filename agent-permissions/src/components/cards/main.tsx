'use client'

import { useOpenfort, useUser, useWallets } from '@openfort/react'
import { useAccount } from 'wagmi'
import { Auth } from './auth'
import { Balance } from './balance'
import { Wallets } from './wallets'

type Step = 'loading' | 'auth' | 'wallet' | 'dashboard'

function useStep(): Step {
  const { isLoading: isSdkLoading } = useOpenfort()
  const { isAuthenticated } = useUser()
  const { isConnected } = useAccount()
  const { availableWallets, activeWallet, isLoadingWallets, isConnecting } = useWallets()

  // SDK still initializing — show nothing to avoid flashing auth/wallet screens
  if (isSdkLoading) return 'loading'
  if (isAuthenticated && (isLoadingWallets || isConnecting)) return 'loading'

  if (!isAuthenticated) return 'auth'
  if (!isConnected || (!activeWallet && availableWallets.length === 0)) return 'wallet'
  return 'dashboard'
}

export const Main = () => {
  const step = useStep()

  return (
    <div className="min-h-screen min-w-screen bg-background flex items-center justify-center p-4">
      <div className="card">
        {step === 'loading' && <p className="text-sm text-muted-foreground">Loading...</p>}
        {step === 'auth' && <Auth />}
        {step === 'wallet' && <Wallets />}
        {step === 'dashboard' && <Balance />}
      </div>
    </div>
  )
}
