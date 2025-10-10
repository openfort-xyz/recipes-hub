"use client";

import { useSwapController } from "@/features/lifi/hooks/use-swap-controller";
import { CoBrandHero } from "./co-branding";
import ActionButtons from "./ActionButtons";
import ExecutionDisplay from "./ExecutionDisplay";
import RouteDisplay from "./RouteDisplay";
import StatusMessages from "./StatusMessages";
import SwapForm from "./SwapForm";

export const SwapFlow = () => {
  const {
    state,
    chains,
    fromTokens,
    toTokens,
    isStatusLoading,
    actions,
  } = useSwapController();

  if (isStatusLoading) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-card text-card-foreground rounded-2xl shadow-lg p-6 border border-border text-center">
          <div className="w-16 h-16 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-xl text-muted-foreground">
            Loading wallet connection...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <CoBrandHero />
        {state.showExecutionDisplay ? (
          <ExecutionDisplay
            activeRoute={state.activeRoute}
            isExecuting={state.isExecuting}
            isRouteCompleted={state.isRouteCompleted}
            executionProgress={state.executionProgress}
            onStopRoute={actions.stopActiveRoute}
            onBackToForm={actions.backToForm}
          />
        ) : state.showRouteDisplay ? (
          <>
            <RouteDisplay
              routes={state.routes}
              selectedRoute={state.selectedRoute}
              toTokenSymbol={state.toToken?.symbol}
              onRouteSelect={actions.selectRoute}
              onBackToForm={actions.backToForm}
            />

            <ActionButtons
              isLoading={state.isLoading}
              isExecuting={state.isExecuting}
              hasRoutes={state.routes.length > 0}
              hasSelectedRoute={!!state.selectedRoute}
              showRouteDisplay={state.showRouteDisplay}
              hasActiveRoute={!!state.activeRoute}
              onGetRoutes={actions.getRoutes}
              onExecuteSwap={actions.executeSelectedRoute}
              onClear={actions.clear}
              onBackToForm={actions.backToForm}
              onShowExecutionDisplay={actions.showExecutionView}
            />

            <StatusMessages
              error={state.error}
              txHash={state.txHash}
              chainId={state.fromChain?.id}
            />
          </>
        ) : (
          <>
            <SwapForm
              fromChain={state.fromChain}
              toChain={state.toChain}
              fromToken={state.fromToken}
              toToken={state.toToken}
              amount={state.amount}
              estimatedToAmount={state.estimatedToAmount}
              isLoadingEstimate={state.isLoadingEstimate}
              chains={chains}
              fromTokens={fromTokens}
              toTokens={toTokens}
              onFromChainChange={actions.updateFromChain}
              onToChainChange={actions.updateToChain}
              onFromTokenChange={actions.updateFromToken}
              onToTokenChange={actions.updateToToken}
              onAmountChange={actions.updateAmount}
            />

            <ActionButtons
              isLoading={state.isLoading}
              isExecuting={state.isExecuting}
              hasRoutes={state.routes.length > 0}
              hasSelectedRoute={!!state.selectedRoute}
              showRouteDisplay={state.showRouteDisplay}
              hasActiveRoute={!!state.activeRoute}
              onGetRoutes={actions.getRoutes}
              onExecuteSwap={actions.executeSelectedRoute}
              onClear={actions.clear}
              onBackToForm={actions.backToForm}
              onShowExecutionDisplay={actions.showExecutionView}
            />

            <StatusMessages
              error={state.error}
              txHash={state.txHash}
              chainId={state.fromChain?.id}
            />
          </>
        )}
      </div>
    </main>
  );
};

export default SwapFlow;
