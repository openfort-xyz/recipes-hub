import type { Chain, Route, RouteExtended, Token } from "@lifi/sdk";

export interface ExecutionProgress {
  stepIndex: number;
  stepType: string;
  status: string;
  txHash?: string;
  explorerLink?: string;
  chainId?: number;
  message: string;
}

export interface SwapState {
  fromChain: Chain | null;
  toChain: Chain | null;
  fromToken: Token | null;
  toToken: Token | null;
  amount: string;
  estimatedToAmount: string;
  isLoadingEstimate: boolean;
  routes: Route[];
  selectedRoute: Route | null;
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  isExecuting: boolean;
  executionProgress: ExecutionProgress[];
  activeRoute: RouteExtended | null;
  isRouteCompleted: boolean;
  showRouteDisplay: boolean;
  showExecutionDisplay: boolean;
}
