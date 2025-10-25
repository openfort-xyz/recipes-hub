import { formatUsdcBalance } from '../utils/format';

interface BalanceCardProps {
  title: string;
  balance: bigint | undefined;
  currency: string;
  apy?: string;
  isConnected: boolean;
}

export function BalanceCard({ title, balance, currency, apy, isConnected }: BalanceCardProps) {
  return (
    <div className="bg-black/95 rounded-2xl p-8 border border-neutral-700 shadow-xl w-80 h-64 flex items-center justify-center">
      <div className="text-center">
        {isConnected ? (
          <div className="space-y-3">
            <div className="text-xs text-neutral-400 uppercase tracking-wider">
              {title}
            </div>
            <div className="text-4xl font-bold text-white">
              {formatUsdcBalance(balance)}
            </div>
            <div className="text-sm text-neutral-300">{currency}</div>
            {apy && (
              <div className="text-sm text-green-400 font-semibold">
                🌱 {apy}% APY
              </div>
            )}
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
