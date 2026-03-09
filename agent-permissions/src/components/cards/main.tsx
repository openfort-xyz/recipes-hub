'use client'

import { useOpenfort, useUser } from '@openfort/react'
import { useEthereumEmbeddedWallet } from '@openfort/react/ethereum'
import { useAccount } from 'wagmi'
import { Auth } from './auth'
import { Balance } from './balance'
import { Wallets } from './wallets'

type Step = 'loading' | 'auth' | 'wallet' | 'dashboard'

function useStep(): Step {
  const { isLoading: isSdkLoading } = useOpenfort()
  const { isAuthenticated } = useUser()
  const { isConnected } = useAccount()
  const { activeWallet, isLoading: isLoadingWallets, isConnecting } = useEthereumEmbeddedWallet()

  // SDK still initializing — show nothing to avoid flashing auth/wallet screens
  if (isSdkLoading) return 'loading'
  if (isAuthenticated && (isLoadingWallets || isConnecting)) return 'loading'

  if (!isAuthenticated) return 'auth'
  if (!isConnected || !activeWallet) return 'wallet'
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
