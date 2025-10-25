import { OpenfortButton } from "@openfort/react";

interface UsdcSupplyData {
  rawBalance: string;
  apy: string;
}

interface ActionButtonsProps {
  isConnected: boolean;
  isLoading: boolean;
  usdcReserve: any;
  usdcBalance: bigint | undefined;
  usdcSupplyData: UsdcSupplyData;
  isSupplying: boolean;
  supplyingLoading: boolean;
  isWithdrawing: boolean;
  withdrawingLoading: boolean;
  onDepositToAave: () => void;
  onWithdrawFromAave: () => void;
}

export function ActionButtons({
  isConnected,
  isLoading,
  usdcReserve,
  usdcBalance,
  usdcSupplyData,
  isSupplying,
  supplyingLoading,
  isWithdrawing,
  withdrawingLoading,
  onDepositToAave,
  onWithdrawFromAave
}: ActionButtonsProps) {
  const handleSupplyClick = () => {
    if (!usdcBalance || usdcBalance < BigInt(100000)) { // 0.1 USDC = 100,000 (6 decimals)
      alert('Insufficient balance. You need at least 0.1 USDC to supply to the pool.');
      return;
    }
    onDepositToAave();
  };
  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-700 shadow-xl p-8 mb-6 flex flex-col items-center justify-center space-y-4">
      <OpenfortButton
        showBalance={false}
        showAvatar={true}
        label="Connect Wallet"
      />

      {isConnected && (
        <div className="w-80 space-y-4">
          <button
            onClick={handleSupplyClick}
            disabled={isLoading || !usdcReserve || !usdcBalance || usdcBalance === 0n}
            className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg border border-gray-200 flex flex-row items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(isSupplying || supplyingLoading) && !isWithdrawing && !withdrawingLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>
                  {isSupplying ? 'Supplying...' :
                    supplyingLoading ? 'Preparing...' :
                      'Sending Transaction...'}
                </span>
              </>
            ) : (
              <>
                <span className="mr-2">️↗️</span>
                Supply 0.1 USDC to pool
              </>
            )}
          </button>

          <button
            onClick={onWithdrawFromAave}
            disabled={isLoading || !usdcReserve || parseFloat(usdcSupplyData.rawBalance) === 0}
            className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg border border-gray-200 flex flex-row items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(isWithdrawing || withdrawingLoading) && !isSupplying && !supplyingLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>
                  {isWithdrawing ? 'Withdrawing...' :
                    withdrawingLoading ? 'Preparing...' :
                      'Sending Transaction...'}
                </span>
              </>
            ) : (
              <>
                <span className="mr-2">️↙️</span>
                Withdraw all from pool
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}