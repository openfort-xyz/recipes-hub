import type { UserWallet } from "@openfort/react";

import { Spinner } from "./Spinner";

interface WalletSelectorProps {
  wallets: UserWallet[];
  isConnecting: boolean;
  onSelect: (wallet: UserWallet) => void;
}

export function WalletSelector({ wallets, isConnecting, onSelect }: WalletSelectorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
      <div className="w-full max-w-lg space-y-6 rounded-lg border border-zinc-700 bg-zinc-800 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold">Connect your wallet</h1>
        <p className="text-sm text-zinc-400">
          Select a wallet to connect and continue with your payment.
        </p>
        <div className="space-y-3">
          {wallets.map(wallet => (
            <button
              key={wallet.id + wallet.address}
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-4 py-3 text-left transition-colors hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-60"
              onClick={() => onSelect(wallet)}
              disabled={wallet.isActive || isConnecting}
              type="button"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </span>
              </div>
            </button>
          ))}
        </div>
        {isConnecting ? (
          <div className="flex items-center justify-center">
            <Spinner />
          </div>
        ) : null}
      </div>
    </div>
  );
}
