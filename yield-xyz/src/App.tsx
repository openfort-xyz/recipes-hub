import { OpenfortButton, useUser } from '@openfort/react'
import { useAccount, useBalance } from 'wagmi'
import { DEMO } from './config/demos'
import { PositionsPanel } from './components/PositionsPanel'
import { StakePanel } from './components/StakePanel'
import { WalletBalance } from './components/WalletBalance'
import { WalletChip } from './components/WalletChip'

function App() {
  const { isAuthenticated } = useUser()
  const { address } = useAccount()
  const balance = useBalance({ address, chainId: DEMO.chainId })

  return (
    <div className="min-h-screen bg-neutral-950 p-4 sm:p-8 font-figtree">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center pt-8 pb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Openfort × Yield.xyz</h1>
          <p className="text-sm text-neutral-400 mt-2 max-w-md mx-auto">
            Native MON staking on Monad Testnet, routed through Yield.xyz's API. This recipe signs Yield.xyz's
            ready-to-sign transactions with an Openfort embedded wallet; Yield.xyz never holds funds or keys.
          </p>
        </header>

        <div className="flex justify-center">
          {isAuthenticated && address ? (
            <WalletChip address={address} demo={DEMO} onSettled={() => balance.refetch()} />
          ) : (
            <OpenfortButton />
          )}
        </div>

        {isAuthenticated && address && (
          <>
            <WalletBalance
              demo={DEMO}
              value={balance.data?.value}
              decimals={balance.data?.decimals}
              isLoading={balance.isLoading}
              onRefresh={() => balance.refetch()}
            />
            <StakePanel userAddress={address} demo={DEMO} onSettled={() => balance.refetch()} />
            <PositionsPanel userAddress={address} demo={DEMO} onSettled={() => balance.refetch()} />
          </>
        )}
      </div>
    </div>
  )
}

export default App
