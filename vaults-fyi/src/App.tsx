import { useState } from "react";
import { OpenfortButton, useUser } from "@openfort/react";
import { useAccount } from "wagmi";
import type { VaultOption } from "./hooks/useDepositOptions";
import { DiscoverPanel } from "./components/DiscoverPanel";
import { ActionPanel } from "./components/ActionPanel";
import { PositionsPanel } from "./components/PositionsPanel";
import { RewardsPanel } from "./components/RewardsPanel";

function App() {
  const { isAuthenticated } = useUser();
  const { address } = useAccount();
  const [selected, setSelected] = useState<VaultOption | null>(null);

  return (
    <div className="min-h-screen bg-neutral-950 p-4 sm:p-8 font-figtree">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center pt-8 pb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Openfort × vaults.fyi
          </h1>
          <p className="text-sm text-neutral-400 mt-2 max-w-md mx-auto">
            One API for every yield. Deposits route directly to the canonical
            vault, with no wrapper contract or required user-facing fee.
          </p>
        </header>

        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 flex justify-center">
          <OpenfortButton />
        </div>

        {isAuthenticated && address && (
          <>
            <DiscoverPanel
              userAddress={address}
              onSelect={(vault) => setSelected(vault)}
            />
            {selected && (
              <ActionPanel
                userAddress={address}
                selected={selected}
              />
            )}
            <PositionsPanel userAddress={address} />
            <RewardsPanel userAddress={address} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
