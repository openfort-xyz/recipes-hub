import {
  executeRoute,
  getActiveRoutes,
  getRoutes,
  resumeRoute,
  stopRouteExecution,
  updateRouteExecution,
  type ExecutionOptions,
  type Route,
  type RouteExtended,
} from "@lifi/sdk";

interface FetchRoutesParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  walletAddress: string;
}

export const fetchSwapRoutes = async ({
  fromChainId,
  toChainId,
  fromTokenAddress,
  toTokenAddress,
  amount,
  walletAddress,
}: FetchRoutesParams) =>
  getRoutes({
    fromChainId,
    toChainId,
    fromTokenAddress,
    toTokenAddress,
    fromAmount: amount,
    fromAddress: walletAddress,
    toAddress: walletAddress,
    options: {
      order: "CHEAPEST",
      maxPriceImpact: 0.3,
      slippage: 0.005,
      fee: 0.01,
    },
  });

export const executeSwapRoute = (route: Route, options: ExecutionOptions) =>
  executeRoute(route, options);

export const getActiveSwapRoutes = () => getActiveRoutes();

export const resumeSwapRoute = (route: RouteExtended) => resumeRoute(route);

export const stopSwapRouteExecution = (route: RouteExtended) =>
  stopRouteExecution(route);

export const updateSwapRouteExecution = (
  route: RouteExtended,
  options: Partial<ExecutionOptions>
) => updateRouteExecution(route, options);
