"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import OpenfortConnectButton from "@/features/openfort/components/connect-button";
import { TERMINAL_STATUSES } from "@/features/near-intents/constants";
import { useSwapController } from "@/features/near-intents/hooks/use-swap-controller";
import { CoBrandHero } from "./co-branding";
import ActionButtons from "./ActionButtons";
import QuoteDisplay from "./QuoteDisplay";
import StatusTracker from "./StatusTracker";
import SwapForm from "./SwapForm";

export default function SwapFlow() {
  const {
    state,
    originAssets,
    destinationAssets,
    isLoadingAssets,
    walletAddress,
    isWalletReady,
    isStatusLoading,
    actions,
  } = useSwapController();

  const isTerminal =
    state.status !== null &&
    (TERMINAL_STATUSES as readonly string[]).includes(state.status);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <CoBrandHero />

        {isStatusLoading ? (
          <InfoCard>Loading wallet…</InfoCard>
        ) : !isWalletReady ? (
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Sign in with your Openfort wallet to choose a chain and asset
                and start a swap.
              </p>
              <OpenfortConnectButton className="justify-center" />
            </CardContent>
          </Card>
        ) : isLoadingAssets ? (
          <InfoCard>Loading assets…</InfoCard>
        ) : (
          <>
            {state.step === "form" && (
              <SwapForm
                originAssets={originAssets}
                destinationAssets={destinationAssets}
                fromAsset={state.fromAsset}
                toAsset={state.toAsset}
                amount={state.amount}
                recipient={state.recipient}
                liveQuote={state.liveQuote}
                estimateError={state.estimateError}
                isLoadingEstimate={state.isLoadingEstimate}
                walletAddress={walletAddress}
                onFromAssetChange={actions.setFromAsset}
                onToAssetChange={actions.setToAsset}
                onAmountChange={actions.setAmount}
                onRecipientChange={actions.setRecipient}
                onFlip={actions.flipAssets}
              />
            )}

            {state.step === "quote" &&
              state.quote &&
              state.fromAsset &&
              state.toAsset && (
                <QuoteDisplay
                  quote={state.quote}
                  fromAsset={state.fromAsset}
                  toAsset={state.toAsset}
                  recipient={state.recipient}
                />
              )}

            {state.step === "tracking" && state.fromAsset && (
              <StatusTracker
                status={state.status}
                detail={state.statusDetail}
                depositTxHash={state.depositTxHash}
                fromAsset={state.fromAsset}
              />
            )}

            <ActionButtons
              step={state.step}
              isQuoting={state.isQuoting}
              isDepositing={state.isDepositing}
              isTerminal={isTerminal}
              onGetQuote={actions.getQuote}
              onConfirm={actions.confirmDeposit}
              onBack={actions.backToForm}
              onReset={actions.reset}
            />
          </>
        )}

        {state.error && (
          <Card className="w-full max-w-md border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-300">
                {state.error}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-6 text-center text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}
