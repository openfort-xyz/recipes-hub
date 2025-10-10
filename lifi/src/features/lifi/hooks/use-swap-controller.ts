"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type Chain,
  type Route,
  type RouteExtended,
  type Token,
  getChains,
  getTokens,
} from "@lifi/sdk";
import { formatUnits, parseUnits } from "viem";
import { switchChain } from "@wagmi/core";
import { wagmiConfig } from "@/features/openfort/config/wagmi-config";
import { useOpenfortWallet } from "@/features/openfort/hooks/use-openfort-wallet";
import { DEFAULT_SWAP_AMOUNT } from "../constants";
import {
  fetchSwapRoutes,
  getActiveSwapRoutes,
  resumeSwapRoute,
  stopSwapRouteExecution,
  executeSwapRoute,
  updateSwapRouteExecution,
} from "../services/routes";
import type { ExecutionProgress, SwapState } from "../types";
import {
  getPreferredChain,
  pickDefaultFromToken,
  pickDefaultToToken,
  shouldReplaceToken,
} from "../utils/token-helpers";

const INITIAL_STATE: SwapState = {
  fromChain: null,
  toChain: null,
  fromToken: null,
  toToken: null,
  amount: DEFAULT_SWAP_AMOUNT,
  estimatedToAmount: "",
  isLoadingEstimate: false,
  routes: [],
  selectedRoute: null,
  isLoading: false,
  error: null,
  txHash: null,
  isExecuting: false,
  executionProgress: [],
  activeRoute: null,
  isRouteCompleted: false,
  showRouteDisplay: false,
  showExecutionDisplay: false,
};

const ensureExplorerMessage = (type: string, status: string) =>
  `${type}: ${status}`;

export interface SwapController {
  state: SwapState;
  chains: Chain[];
  fromTokens: Token[];
  toTokens: Token[];
  walletAddress: string;
  isWalletReady: boolean;
  isStatusLoading: boolean;
  actions: {
    updateFromChain: (chain: Chain | null) => void;
    updateToChain: (chain: Chain | null) => void;
    updateFromToken: (token: Token | null) => void;
    updateToToken: (token: Token | null) => void;
    updateAmount: (amount: string) => void;
    selectRoute: (route: Route) => void;
    showRouteOptions: () => void;
    showExecutionView: () => void;
    backToForm: () => void;
    clear: () => void;
    getRoutes: () => Promise<void>;
    executeSelectedRoute: () => Promise<void>;
    resumeActiveRoute: () => Promise<void>;
    stopActiveRoute: () => void;
    moveActiveRouteToBackground: () => void;
  };
}

export const useSwapController = (): SwapController => {
  const {
    address: walletAddress,
    chainId: walletChainId,
    isReady,
    isStatusLoading,
  } = useOpenfortWallet();

  const [swapState, setSwapState] = useState<SwapState>(INITIAL_STATE);
  const [chains, setChains] = useState<Chain[]>([]);
  const [fromTokens, setFromTokens] = useState<Token[]>([]);
  const [toTokens, setToTokens] = useState<Token[]>([]);
  const { fromChain, toChain, fromToken, toToken, amount } = swapState;
  const estimationInputs = useMemo(() => {
    if (
      !fromChain ||
      !toChain ||
      !fromToken ||
      !toToken ||
      !amount ||
      parseFloat(amount) <= 0
    ) {
      return null;
    }

    return {
      amount,
      fromChainId: fromChain.id,
      toChainId: toChain.id,
      fromTokenDecimals: fromToken.decimals,
      fromTokenAddress: fromToken.address,
      toTokenDecimals: toToken.decimals,
      toTokenAddress: toToken.address,
    };
  }, [amount, fromChain, fromToken, toChain, toToken]);

  const monitorRouteExecution = useCallback((route: RouteExtended) => {
    setSwapState((prev) => {
      const newProgress: ExecutionProgress[] = [];
      const fromChainId = prev.fromChain?.id;
      const toChainId = prev.toChain?.id;

      route.steps.forEach((step, stepIndex) => {
        if (!step.execution?.process) {
          return;
        }

        step.execution.process.forEach((process) => {
          let chainId: number | undefined;

          if (stepIndex === 0) {
            chainId = fromChainId;
          } else if (stepIndex === route.steps.length - 1) {
            chainId = toChainId;
          } else {
            chainId = toChainId;
          }

          const progressKey = `${stepIndex}-${process.type}`;

          const progressItem: ExecutionProgress = {
            stepIndex,
            stepType: process.type,
            status: process.status,
            txHash: process.txHash,
            explorerLink: process.explorerLink,
            chainId,
            message: ensureExplorerMessage(process.type, process.status),
          };

          const existingIndex = prev.executionProgress.findIndex(
            (p) => `${p.stepIndex}-${p.stepType}` === progressKey
          );

          if (existingIndex >= 0) {
            newProgress[existingIndex] = progressItem;
          } else {
            newProgress.push(progressItem);
          }
        });
      });

      const mergedProgress = [...prev.executionProgress];

      newProgress.forEach((newItem) => {
        const key = `${newItem.stepIndex}-${newItem.stepType}`;
        const existingIndex = mergedProgress.findIndex(
          (p) => `${p.stepIndex}-${p.stepType}` === key
        );

        if (existingIndex >= 0) {
          mergedProgress[existingIndex] = newItem;
        } else {
          mergedProgress.push(newItem);
        }
      });

      return {
        ...prev,
        executionProgress: mergedProgress,
        activeRoute: route,
      };
    });
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const checkActiveRoutes = () => {
      try {
        const activeRoutes = getActiveSwapRoutes();
        if (activeRoutes.length > 0) {
          const route = activeRoutes[0];
          setSwapState((prev) => ({
            ...prev,
            activeRoute: route,
            isExecuting: true,
          }));
          monitorRouteExecution(route);
        }
      } catch {
        setSwapState((prev) => ({
          ...prev,
          error: "Failed to check active routes",
        }));
      }
    };

    checkActiveRoutes();
  }, [isReady, monitorRouteExecution]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const fetchChains = async () => {
      try {
        const availableChains = await getChains();
        setChains(availableChains);

        const preferredChain = getPreferredChain(availableChains, walletChainId);

        if (!preferredChain) {
          return;
        }

        setSwapState((prev) => {
          if (prev.fromChain && prev.toChain) {
            return prev;
          }

          return {
            ...prev,
            fromChain: prev.fromChain ?? preferredChain,
            toChain: prev.toChain ?? preferredChain,
          };
        });
      } catch {
        setSwapState((prev) => ({
          ...prev,
          error: "Failed to fetch available chains",
        }));
      }
    };

    fetchChains();
  }, [isReady, walletChainId]);

  useEffect(() => {
    if (!isReady || !fromChain || !toChain) {
      return;
    }

    const fetchTokens = async () => {
      try {
        const fromChainId = fromChain.id;
        const toChainId = toChain.id;

        const [fromTokensResponse, toTokensResponse] = await Promise.all([
          getTokens({ chains: [fromChainId] }),
          getTokens({ chains: [toChainId] }),
        ]);

        const fromTokensList = fromTokensResponse.tokens[fromChainId] || [];
        const toTokensList = toTokensResponse.tokens[toChainId] || [];

        setFromTokens(fromTokensList);
        setToTokens(toTokensList);

        setSwapState((prev) => {
          const nextState: Partial<SwapState> = {};

          if (shouldReplaceToken(prev.fromToken, fromChainId)) {
            nextState.fromToken = pickDefaultFromToken(fromTokensList);
          }

          if (shouldReplaceToken(prev.toToken, toChainId)) {
            nextState.toToken = pickDefaultToToken(toTokensList, toChainId);
          }

          if (Object.keys(nextState).length === 0) {
            return prev;
          }

          return {
            ...prev,
            ...nextState,
          };
        });
      } catch {
        setSwapState((prev) => ({
          ...prev,
          error: "Failed to fetch available tokens",
        }));
      }
    };

    fetchTokens();
  }, [fromChain, isReady, toChain]);

  useEffect(() => {
    if (!isReady || !estimationInputs) {
      setSwapState((prev) => ({
        ...prev,
        estimatedToAmount: "",
        isLoadingEstimate: false,
      }));
      return;
    }

    setSwapState((prev) => ({
      ...prev,
      isLoadingEstimate: true,
    }));

    const timeoutId = window.setTimeout(async () => {
      try {
        const amountInWei = parseUnits(
          estimationInputs.amount,
          estimationInputs.fromTokenDecimals
        );
        const routesResult = await fetchSwapRoutes({
          fromChainId: estimationInputs.fromChainId,
          toChainId: estimationInputs.toChainId,
          fromTokenAddress: estimationInputs.fromTokenAddress,
          toTokenAddress: estimationInputs.toTokenAddress,
          amount: amountInWei.toString(),
          walletAddress,
        });

        if (routesResult.routes && routesResult.routes.length > 0) {
          const bestRoute = routesResult.routes[0];
          const estimatedAmount = formatUnits(
            BigInt(bestRoute.toAmount),
            estimationInputs.toTokenDecimals
          );
          setSwapState((prev) => ({
            ...prev,
            estimatedToAmount: estimatedAmount,
            isLoadingEstimate: false,
          }));
        } else {
          setSwapState((prev) => ({
            ...prev,
            estimatedToAmount: "",
            isLoadingEstimate: false,
          }));
        }
      } catch {
        setSwapState((prev) => ({
          ...prev,
          estimatedToAmount: "",
          isLoadingEstimate: false,
        }));
      }
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [estimationInputs, isReady, walletAddress]);

  const switchToChain = useCallback(async (targetChainId: number) => {
    try {
      await switchChain(wagmiConfig, { chainId: targetChainId });
    } catch (error) {
      throw error;
    }
  }, []);

  const handleGetRoutes = useCallback(async () => {
    const {
      fromChain,
      toChain,
      fromToken,
      toToken,
      amount,
    } = swapState;

    if (
      !fromChain ||
      !toChain ||
      !fromToken ||
      !toToken ||
      !amount ||
      !isReady
    ) {
      setSwapState((prev) => ({
        ...prev,
        error: "Please complete all fields before fetching routes.",
      }));
      return;
    }

    try {
      setSwapState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      const amountInWei = parseUnits(amount, fromToken.decimals);
      const routesResult = await fetchSwapRoutes({
        fromChainId: fromChain.id,
        toChainId: toChain.id,
        fromTokenAddress: fromToken.address,
        toTokenAddress: toToken.address,
        amount: amountInWei.toString(),
        walletAddress,
      });

      const routes = routesResult.routes ?? [];
      const selectedRoute = routes[0] ?? null;

      setSwapState((prev) => ({
        ...prev,
        routes,
        selectedRoute,
        showRouteDisplay: true,
        showExecutionDisplay: false,
        isLoading: false,
        txHash: null,
        error: routes.length === 0 ? "No routes found for this swap." : null,
      }));
    } catch (error) {
      setSwapState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to fetch swap routes",
        isLoading: false,
      }));
    }
  }, [swapState, isReady, walletAddress]);

  const handleExecuteSwap = useCallback(async () => {
    const { selectedRoute } = swapState;

    if (!selectedRoute || !isReady || !walletAddress) {
      setSwapState((prev) => ({
        ...prev,
        error: "Select a route before executing the swap.",
      }));
      return;
    }

    try {
      setSwapState((prev) => ({
        ...prev,
        isLoading: true,
        isExecuting: true,
        error: null,
        executionProgress: [],
        showExecutionDisplay: true,
      }));

      const executionResult = await executeSwapRoute(selectedRoute, {
        updateRouteHook: (updatedRoute) => {
          monitorRouteExecution(updatedRoute);

          const allStepsDone = updatedRoute.steps.every(
            (step) => step.execution?.status === "DONE"
          );

          const hasFailed = updatedRoute.steps.some(
            (step) => step.execution?.status === "FAILED"
          );

          const isComplete = updatedRoute.steps.every(
            (step) =>
              step.execution?.status === "DONE" ||
              step.execution?.status === "FAILED"
          );

          if (isComplete) {
            setSwapState((prev) => ({
              ...prev,
              isExecuting: false,
              txHash: allStepsDone ? "Execution completed" : null,
              isRouteCompleted: allStepsDone,
              error: hasFailed
                ? "Transaction failed or cancelled"
                : prev.error,
            }));
          }
        },
        updateTransactionRequestHook: async (txRequest) => txRequest,
        acceptExchangeRateUpdateHook: async (params) => {
          const accepted = window.confirm(
            `Exchange rate has changed!
Old amount: ${formatUnits(BigInt(params.oldToAmount), params.toToken.decimals)} ${
              params.toToken.symbol
            }
New amount: ${formatUnits(BigInt(params.newToAmount), params.toToken.decimals)} ${
              params.toToken.symbol
            }

Do you want to continue?`
          );
          return accepted;
        },
        switchChainHook: async (chainId) => {
          await switchToChain(chainId);
          return undefined;
        },
        executeInBackground: false,
        disableMessageSigning: false,
      });

      return executionResult;
    } catch (error) {
      setSwapState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to execute swap",
        isLoading: false,
        isExecuting: false,
      }));
    }
  }, [swapState, isReady, walletAddress, monitorRouteExecution, switchToChain]);

  const handleResumeRoute = useCallback(async () => {
    if (!swapState.activeRoute) {
      return;
    }

    try {
      setSwapState((prev) => ({ ...prev, isLoading: true }));
      await resumeSwapRoute(swapState.activeRoute);
      setSwapState((prev) => ({ ...prev, isLoading: false }));
    } catch (error) {
      setSwapState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to resume route",
        isLoading: false,
      }));
    }
  }, [swapState.activeRoute]);

  const handleStopRoute = useCallback(() => {
    if (!swapState.activeRoute) {
      return;
    }

    try {
      stopSwapRouteExecution(swapState.activeRoute);
      setSwapState((prev) => {
        const updatedProgress = prev.executionProgress.map((progress) => {
          if (progress.status !== "DONE") {
            return {
              ...progress,
              status: "FAILED",
              message: `${progress.stepType}: Stopped by user`,
            };
          }
          return progress;
        });

        return {
          ...prev,
          isExecuting: false,
          executionProgress: updatedProgress,
          error: "Route execution stopped by user",
        };
      });
    } catch {
      setSwapState((prev) => ({
        ...prev,
        error: "Failed to stop route execution",
      }));
    }
  }, [swapState.activeRoute]);

  const handleMoveToBackground = useCallback(() => {
    if (!swapState.activeRoute) {
      return;
    }

    try {
      updateSwapRouteExecution(swapState.activeRoute, {
        executeInBackground: true,
      });
      setSwapState((prev) => ({
        ...prev,
        isExecuting: false,
      }));
    } catch {
      setSwapState((prev) => ({
        ...prev,
        error: "Failed to move route to background",
      }));
    }
  }, [swapState.activeRoute]);

  const handleShowRouteOptions = useCallback(() => {
    setSwapState((prev) => ({
      ...prev,
      showRouteDisplay: true,
      showExecutionDisplay: false,
    }));
  }, []);

  const handleShowExecutionDisplay = useCallback(() => {
    setSwapState((prev) => ({
      ...prev,
      showExecutionDisplay: true,
    }));
  }, []);

  const handleBackToForm = useCallback(() => {
    setSwapState((prev) => ({
      ...prev,
      showRouteDisplay: false,
      showExecutionDisplay: false,
      isExecuting: false,
      isLoading: false,
      executionProgress: [],
      activeRoute: null,
      isRouteCompleted: false,
      txHash: null,
      error: null,
    }));
  }, []);

  const handleClear = useCallback(() => {
    setSwapState((prev) => ({
      ...prev,
      routes: [],
      selectedRoute: null,
      error: null,
      txHash: null,
      executionProgress: [],
      activeRoute: null,
      isRouteCompleted: false,
      showRouteDisplay: false,
      showExecutionDisplay: false,
    }));
  }, []);

  const derivedActions = useMemo(
    () => ({
      updateFromChain: (chain: Chain | null) => {
        setSwapState((prev) => ({
          ...prev,
          fromChain: chain,
          fromToken: null,
        }));
      },
      updateToChain: (chain: Chain | null) => {
        setSwapState((prev) => ({
          ...prev,
          toChain: chain,
          toToken: null,
        }));
      },
      updateFromToken: (token: Token | null) => {
        setSwapState((prev) => ({
          ...prev,
          fromToken: token,
        }));
      },
      updateToToken: (token: Token | null) => {
        setSwapState((prev) => ({
          ...prev,
          toToken: token,
        }));
      },
      updateAmount: (amount: string) => {
        setSwapState((prev) => ({
          ...prev,
          amount,
        }));
      },
      selectRoute: (route: Route) => {
        setSwapState((prev) => ({
          ...prev,
          selectedRoute: route,
        }));
      },
      showRouteOptions: handleShowRouteOptions,
      showExecutionView: handleShowExecutionDisplay,
      backToForm: handleBackToForm,
      clear: handleClear,
      getRoutes: handleGetRoutes,
      executeSelectedRoute: handleExecuteSwap,
      resumeActiveRoute: handleResumeRoute,
      stopActiveRoute: handleStopRoute,
      moveActiveRouteToBackground: handleMoveToBackground,
    }),
    [
      handleBackToForm,
      handleClear,
      handleExecuteSwap,
      handleGetRoutes,
      handleMoveToBackground,
      handleResumeRoute,
      handleShowExecutionDisplay,
      handleShowRouteOptions,
      handleStopRoute,
    ]
  );

  return {
    state: swapState,
    chains,
    fromTokens,
    toTokens,
    walletAddress,
    isWalletReady: isReady,
    isStatusLoading,
    actions: derivedActions,
  };
};
