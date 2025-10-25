interface ActionButtonsProps {
  isSupplying: boolean;
  isWithdrawing: boolean;
  onSupply: () => void;
  onWithdraw: () => void;
}

export function ActionButtons({ isSupplying, isWithdrawing, onSupply, onWithdraw }: ActionButtonsProps) {
  const isLoading = isSupplying || isWithdrawing;

  return (
    <div className="w-80 space-y-4">
      <button
        onClick={onSupply}
        disabled={isLoading}
        className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg border border-gray-200 flex flex-row items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSupplying ? (
          <>
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
            <span>Supplying...</span>
          </>
        ) : (
          <>
            <span className="mr-2">️↗️</span>
            Supply 0.1 USDC to pool
          </>
        )}
      </button>

      <button
        onClick={onWithdraw}
        disabled={isLoading}
        className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg border border-gray-200 flex flex-row items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isWithdrawing ? (
          <>
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
            <span>Withdrawing...</span>
          </>
        ) : (
          <>
            <span className="mr-2">️↙️</span>
            Withdraw all from pool
          </>
        )}
      </button>
    </div>
  );
}