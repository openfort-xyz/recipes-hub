import { formatSupplyBalance } from '../utils/format';

interface UsdcSupplyData {
  rawBalance: string;
  apy: string;
}

interface AaveSupplyCardProps {
  isConnected: boolean;
  address: string | undefined;
  suppliesLoading: boolean;
  usdcSupplyData: UsdcSupplyData;
  suppliesError: Error | null;
}

export function AaveSupplyCard({
  isConnected,
  address,
  suppliesLoading,
  usdcSupplyData,
  suppliesError
}: AaveSupplyCardProps) {
  return (
    <div className="bg-black/95 rounded-2xl p-8 border border-neutral-700 shadow-xl w-80 h-64 flex items-center justify-center">
      <div className="text-center">
        {isConnected && address ? (
          <div className="space-y-3">
            <div className="text-xs text-neutral-400 uppercase tracking-wider">
              Aave Supply
            </div>
            <div className="text-4xl font-bold text-white">
              {suppliesLoading ? (
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                formatSupplyBalance(usdcSupplyData.rawBalance)
              )}
            </div>
            <div className="text-sm text-neutral-300">
              USDC
            </div>
            {!suppliesLoading && usdcSupplyData.apy !== "0.00" && (
              <div className="text-sm text-green-400 font-semibold">
                🌱 {usdcSupplyData.apy}% APY
              </div>
            )}
            {suppliesError && (
              <div className="text-xs text-red-400">
                Failed to load
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