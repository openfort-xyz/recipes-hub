import { formatUsdcBalance } from '../lib/utils';

interface WalletBalanceCardProps {
  isConnected: boolean;
  address: string | undefined;
  usdcBalance: bigint | undefined;
}

export function WalletBalanceCard({ isConnected, address, usdcBalance }: WalletBalanceCardProps) {
  return (
    <div className="bg-black/95 rounded-2xl p-8 border border-neutral-700 shadow-xl w-80 h-64 flex items-center justify-center">
      <div className="text-center">
        {isConnected && address ? (
          <div className="space-y-3">
            <div className="text-xs text-neutral-400 uppercase tracking-wider">
              Wallet Balance
            </div>
            <div className="text-4xl font-bold text-white">
              {formatUsdcBalance(usdcBalance as bigint | undefined)}
            </div>
            <div className="text-sm text-neutral-300">
              USDC
            </div>
          </div>
        ) : (
          <div className="text-neutral-500 text-sm">
            Connect wallet to view balance
          </div>
        )}
      </div>
    </div>
  );
}