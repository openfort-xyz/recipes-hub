import { Spinner } from "./Spinner";
import { StatusBanner } from "./StatusBanner";

interface PaymentSummaryProps {
  walletAddress: string;
  balanceLabel: string;
  amountDue: number;
  chainName: string;
  description?: string;
  testnet: boolean;
  isCorrectChain: boolean | null;
  isWorking: boolean;
  isRefreshingBalance: boolean;
  onRefreshBalance: () => void;
  onSwitchNetwork: () => void;
  onSubmitPayment: () => void;
  statusMessage?: string;
}

export function PaymentSummary({
  walletAddress,
  balanceLabel,
  amountDue,
  chainName,
  description,
  testnet,
  isCorrectChain,
  isWorking,
  isRefreshingBalance,
  onRefreshBalance,
  onSwitchNetwork,
  onSubmitPayment,
  statusMessage,
}: PaymentSummaryProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 px-4 text-white">
      <div className="flex w-full max-w-3xl flex-col gap-8 rounded-lg border border-zinc-700 bg-zinc-800 p-8 shadow-xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Payment Required</h1>
          <p className="text-sm text-zinc-300">
            {description ? `${description}. ` : ""}To access this content, please pay ${amountDue} {chainName} USDC.
          </p>
          {testnet ? (
            <p className="text-xs text-zinc-400">
              Need Base Sepolia USDC?{" "}
              <a
                href="https://faucet.circle.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Get some here.
              </a>
            </p>
          ) : null}
        </div>

        <div className="space-y-4 rounded-lg border border-zinc-700 bg-zinc-900 p-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Wallet:</span>
              <span>{walletAddress}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Available balance:</span>
              <div className="flex items-center gap-2">
                <span className="text-white">{balanceLabel}</span>
                <button
                  onClick={onRefreshBalance}
                  disabled={isRefreshingBalance}
                  type="button"
                  className="text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
                  title="Refresh balance"
                >
                  <svg
                    className={`h-4 w-4 ${isRefreshingBalance ? "animate-spin" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Amount due:</span>
              <span>${amountDue} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Network:</span>
              <span>{chainName}</span>
            </div>
          </div>

          {isCorrectChain ? (
            <button
              className="w-full rounded bg-primary py-3 text-center font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onSubmitPayment}
              disabled={isWorking}
              type="button"
            >
              {isWorking ? <Spinner /> : "Pay now"}
            </button>
          ) : (
            <button
              className="w-full rounded bg-primary py-3 text-center font-medium text-white transition-colors hover:bg-primary-hover"
              onClick={onSwitchNetwork}
              type="button"
            >
              Switch to {chainName}
            </button>
          )}
        </div>
        {statusMessage ? <StatusBanner message={statusMessage} /> : null}
      </div>
    </div>
  );
}
