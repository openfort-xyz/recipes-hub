"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { useSendTransaction, useSwitchChain, useWriteContract } from "wagmi";
import { useOpenfortWallet } from "@/features/openfort/hooks/use-openfort-wallet";
import {
  chainLabel,
  DEFAULT_SWAP_AMOUNT,
  isOriginBlockchain,
  STATUS_POLL_INTERVAL_MS,
  TERMINAL_STATUSES,
} from "@/features/near-intents/constants";
import {
  getQuote,
  getStatus,
  loadTokens,
  notifyDeposit,
} from "@/features/near-intents/services/oneclick-client";
import {
  buildDestinationAssets,
  buildOriginAssets,
  pickDefaultPair,
} from "@/features/near-intents/utils/asset-helpers";
import type {
  ExecutionStatusResponse,
  Quote,
  QuoteResponse,
  SwapAsset,
  SwapStatus,
} from "@/features/near-intents/types";

export type SwapStep = "form" | "quote" | "tracking";

interface SwapState {
  fromAsset: SwapAsset | null;
  toAsset: SwapAsset | null;
  amount: string;
  recipient: string;
  liveQuote: Quote | null;
  estimateError: string | null;
  isLoadingEstimate: boolean;
  quote: QuoteResponse | null;
  isQuoting: boolean;
  depositTxHash: string | null;
  isDepositing: boolean;
  status: SwapStatus | null;
  statusDetail: ExecutionStatusResponse | null;
  error: string | null;
  step: SwapStep;
}

const INITIAL_STATE: SwapState = {
  fromAsset: null,
  toAsset: null,
  amount: DEFAULT_SWAP_AMOUNT,
  recipient: "",
  liveQuote: null,
  estimateError: null,
  isLoadingEstimate: false,
  quote: null,
  isQuoting: false,
  depositTxHash: null,
  isDepositing: false,
  status: null,
  statusDetail: null,
  error: null,
  step: "form",
};

const isTerminal = (status: SwapStatus | null): boolean =>
  status !== null && (TERMINAL_STATUSES as readonly string[]).includes(status);

// Turn raw 1Click errors into actionable copy. The "amount too low" error
// reports the minimum in origin base units; convert it to a human amount.
const humanizeQuoteError = (message: string, fromAsset: SwapAsset): string => {
  const match = message.match(/at least (\d+)/);
  if (match) {
    const min = formatUnits(BigInt(match[1]), fromAsset.decimals);
    return `Amount too low — minimum is about ${Number(min).toFixed(6)} ${fromAsset.symbol} for this route.`;
  }
  return message.replace(/^1Click \d+:\s*/, "");
};

export interface SwapController {
  state: SwapState;
  originAssets: SwapAsset[];
  destinationAssets: SwapAsset[];
  isLoadingAssets: boolean;
  walletAddress: string;
  isWalletReady: boolean;
  isStatusLoading: boolean;
  actions: {
    setFromAsset: (asset: SwapAsset | null) => void;
    setToAsset: (asset: SwapAsset | null) => void;
    setAmount: (amount: string) => void;
    setRecipient: (recipient: string) => void;
    flipAssets: () => void;
    getQuote: () => Promise<void>;
    confirmDeposit: () => Promise<void>;
    backToForm: () => void;
    reset: () => void;
  };
}

export const useSwapController = (): SwapController => {
  const {
    address: walletAddress,
    chainId: walletChainId,
    isReady,
    isStatusLoading,
  } = useOpenfortWallet();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const [originAssets, setOriginAssets] = useState<SwapAsset[]>([]);
  const [destinationAssets, setDestinationAssets] = useState<SwapAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [state, setState] = useState<SwapState>(INITIAL_STATE);

  const { fromAsset, toAsset, amount, step, quote, recipient } = state;

  useEffect(() => {
    let cancelled = false;

    loadTokens()
      .then((tokens) => {
        if (cancelled) {
          return;
        }
        const origin = buildOriginAssets(tokens);
        const destination = buildDestinationAssets(tokens);
        setOriginAssets(origin);
        setDestinationAssets(destination);
        setState((prev) => {
          if (prev.fromAsset && prev.toAsset) {
            return prev;
          }
          const { from, to } = pickDefaultPair(origin, destination);
          return {
            ...prev,
            fromAsset: prev.fromAsset ?? from,
            toAsset: prev.toAsset ?? to,
          };
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to load assets",
        }));
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingAssets(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Default the recipient to the wallet address for EVM destinations; clear it
  // for non-EVM destinations so the user supplies a destination-chain address.
  useEffect(() => {
    if (!toAsset || !walletAddress) {
      return;
    }
    setState((prev) => {
      if (toAsset.isEvm) {
        return prev.recipient ? prev : { ...prev, recipient: walletAddress };
      }
      return prev.recipient === walletAddress
        ? { ...prev, recipient: "" }
        : prev;
    });
  }, [toAsset, walletAddress]);

  // Debounced dry-run quote so the form shows a live output estimate.
  useEffect(() => {
    if (
      step !== "form" ||
      !fromAsset ||
      !toAsset ||
      !walletAddress ||
      !amount ||
      Number(amount) <= 0 ||
      fromAsset.assetId === toAsset.assetId
    ) {
      setState((prev) => ({
        ...prev,
        liveQuote: null,
        estimateError: null,
        isLoadingEstimate: false,
      }));
      return;
    }

    // The 1Click API validates the recipient address against the destination
    // chain even for dry quotes. EVM destinations can use the wallet's own
    // address; non-EVM destinations need a real address first.
    const effectiveRecipient = recipient || (toAsset.isEvm ? walletAddress : "");
    if (!effectiveRecipient) {
      setState((prev) => ({
        ...prev,
        liveQuote: null,
        isLoadingEstimate: false,
        estimateError: `Enter a ${chainLabel(toAsset.blockchain)} address to see a live quote.`,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoadingEstimate: true }));

    const timeout = window.setTimeout(async () => {
      try {
        const amountBase = parseUnits(amount, fromAsset.decimals).toString();
        const result = await getQuote({
          originAsset: fromAsset.assetId,
          destinationAsset: toAsset.assetId,
          amount: amountBase,
          recipient: effectiveRecipient,
          refundTo: walletAddress,
          dry: true,
        });
        setState((prev) => ({
          ...prev,
          liveQuote: result.quote,
          estimateError: null,
          isLoadingEstimate: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          liveQuote: null,
          isLoadingEstimate: false,
          estimateError:
            error instanceof Error
              ? humanizeQuoteError(error.message, fromAsset)
              : null,
        }));
      }
    }, 600);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [step, fromAsset, toAsset, amount, walletAddress, recipient]);

  const handleGetQuote = useCallback(async () => {
    if (!fromAsset || !toAsset || !amount || !walletAddress || !isReady) {
      setState((prev) => ({
        ...prev,
        error: "Connect your wallet and complete the form first.",
      }));
      return;
    }
    if (fromAsset.assetId === toAsset.assetId) {
      setState((prev) => ({ ...prev, error: "Choose two different assets." }));
      return;
    }
    if (!recipient) {
      setState((prev) => ({
        ...prev,
        error: "Enter a recipient address on the destination chain.",
      }));
      return;
    }

    let amountBase: string;
    try {
      amountBase = parseUnits(amount, fromAsset.decimals).toString();
    } catch {
      setState((prev) => ({ ...prev, error: "Enter a valid amount." }));
      return;
    }

    setState((prev) => ({ ...prev, isQuoting: true, error: null }));

    try {
      const result = await getQuote({
        originAsset: fromAsset.assetId,
        destinationAsset: toAsset.assetId,
        amount: amountBase,
        recipient,
        refundTo: walletAddress,
        dry: false,
      });
      if (!result.quote.depositAddress) {
        throw new Error("Quote did not return a deposit address.");
      }
      setState((prev) => ({
        ...prev,
        quote: result,
        isQuoting: false,
        step: "quote",
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isQuoting: false,
        error:
          error instanceof Error
            ? humanizeQuoteError(error.message, fromAsset)
            : "Failed to fetch quote",
      }));
    }
  }, [fromAsset, toAsset, amount, walletAddress, isReady, recipient]);

  const handleConfirmDeposit = useCallback(async () => {
    if (!quote || !fromAsset || !walletAddress || !fromAsset.chainId) {
      return;
    }
    const depositAddress = quote.quote.depositAddress as
      | `0x${string}`
      | undefined;
    if (!depositAddress) {
      setState((prev) => ({ ...prev, error: "Missing deposit address." }));
      return;
    }

    setState((prev) => ({ ...prev, isDepositing: true, error: null }));

    try {
      if (walletChainId !== fromAsset.chainId) {
        await switchChainAsync({ chainId: fromAsset.chainId });
      }

      const amountIn = BigInt(quote.quote.amountIn);
      let txHash: `0x${string}`;

      if (fromAsset.isNative) {
        txHash = await sendTransactionAsync({
          chainId: fromAsset.chainId,
          to: depositAddress,
          value: amountIn,
        });
      } else {
        if (!fromAsset.contractAddress) {
          throw new Error("Missing token contract address for the origin asset.");
        }
        txHash = await writeContractAsync({
          chainId: fromAsset.chainId,
          address: fromAsset.contractAddress,
          abi: erc20Abi,
          functionName: "transfer",
          args: [depositAddress, amountIn],
        });
      }

      // Best-effort: let 1Click detect the deposit faster.
      void notifyDeposit({
        txHash,
        depositAddress,
        memo: quote.quote.depositMemo,
      }).catch(() => undefined);

      setState((prev) => ({
        ...prev,
        depositTxHash: txHash,
        isDepositing: false,
        step: "tracking",
        status: "PENDING_DEPOSIT",
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isDepositing: false,
        error: error instanceof Error ? error.message : "Deposit failed",
      }));
    }
  }, [
    quote,
    fromAsset,
    walletAddress,
    walletChainId,
    switchChainAsync,
    sendTransactionAsync,
    writeContractAsync,
  ]);

  const depositAddress = quote?.quote.depositAddress;
  const depositMemo = quote?.quote.depositMemo;
  const trackingActive =
    step === "tracking" && !!depositAddress && !isTerminal(state.status);

  useEffect(() => {
    if (!trackingActive || !depositAddress) {
      return;
    }
    let cancelled = false;

    const poll = async () => {
      try {
        const detail = await getStatus(depositAddress, depositMemo);
        if (cancelled) {
          return;
        }
        setState((prev) => ({
          ...prev,
          status: detail.status,
          statusDetail: detail,
        }));
      } catch {
        // Transient error — keep polling.
      }
    };

    void poll();
    const interval = window.setInterval(poll, STATUS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [trackingActive, depositAddress, depositMemo]);

  const actions = useMemo(
    () => ({
      setFromAsset: (asset: SwapAsset | null) =>
        setState((prev) => ({ ...prev, fromAsset: asset })),
      setToAsset: (asset: SwapAsset | null) =>
        setState((prev) => ({ ...prev, toAsset: asset })),
      setAmount: (value: string) =>
        setState((prev) => ({ ...prev, amount: value })),
      setRecipient: (value: string) =>
        setState((prev) => ({ ...prev, recipient: value })),
      flipAssets: () =>
        setState((prev) => {
          // Origin must stay EVM, so only flip when the destination is an
          // origin-eligible EVM chain.
          if (!prev.toAsset || !isOriginBlockchain(prev.toAsset.blockchain)) {
            return prev;
          }
          return {
            ...prev,
            fromAsset: prev.toAsset,
            toAsset: prev.fromAsset,
          };
        }),
      getQuote: handleGetQuote,
      confirmDeposit: handleConfirmDeposit,
      backToForm: () =>
        setState((prev) => ({
          ...prev,
          step: "form",
          quote: null,
          error: null,
        })),
      reset: () =>
        setState((prev) => ({
          ...INITIAL_STATE,
          fromAsset: prev.fromAsset,
          toAsset: prev.toAsset,
          recipient: prev.recipient,
        })),
    }),
    [handleGetQuote, handleConfirmDeposit]
  );

  return {
    state,
    originAssets,
    destinationAssets,
    isLoadingAssets,
    walletAddress,
    isWalletReady: isReady,
    isStatusLoading,
    actions,
  };
};
