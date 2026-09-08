import { OpenfortButton, useUser } from '@openfort/react'
import { useState } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { PositionsPanel } from './components/PositionsPanel'
import { StakePanel } from './components/StakePanel'
import { VaultsPanel } from './components/VaultsPanel'
import { WalletBalance } from './components/WalletBalance'
import { WalletChip } from './components/WalletChip'
import { DEMO } from './config/demos'
import type { YieldOpportunity } from './lib/yieldXyz'

function App() {
  const { isAuthenticated } = useUser()
  const { address } = useAccount()
  const balance = useBalance({ address, chainId: DEMO.chainId })
  const [vault, setVault] = useState<YieldOpportunity | null>(null)

  return (
    <div className="min-h-screen bg-neutral-950 p-4 sm:p-8 font-figtree">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="text-center pt-8 pb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Openfort × Yield.xyz</h1>
          <p className="text-sm text-neutral-400 mt-2 max-w-md mx-auto">
            Native MON staking and ERC-4626 vaults on Monad, routed through Yield.xyz's API. This recipe signs
            Yield.xyz's ready-to-sign transactions with an Openfort embedded wallet; Yield.xyz never holds funds or
            keys.
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
              address={address}
              value={balance.data?.value}
              decimals={balance.data?.decimals}
              isLoading={balance.isLoading}
              onRefresh={() => balance.refetch()}
            />

            <div className="grid gap-6 md:grid-cols-2 items-start">
              <StakePanel userAddress={address} demo={DEMO} onSettled={() => balance.refetch()} />
              <VaultsPanel
                userAddress={address}
                demo={DEMO}
                selected={vault}
                onSelect={setVault}
                onSettled={() => balance.refetch()}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2 items-start">
              <PositionsPanel
                userAddress={address}
                demo={DEMO}
                title="Staking position"
                onSettled={() => balance.refetch()}
              />
              {vault && (
                <PositionsPanel
                  userAddress={address}
                  demo={DEMO}
                  title="Vault position"
                  yieldId={vault.id}
                  requiresValidator={false}
                  onSettled={() => balance.refetch()}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
