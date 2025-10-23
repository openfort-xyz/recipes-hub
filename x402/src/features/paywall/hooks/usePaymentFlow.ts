import { useCallback, useEffect, useMemo, useState } from "react";
import { useWaitForTransactionReceipt } from "wagmi";

import {
  selectPaymentRequirements,
  type PaymentRequirements,
  type SupportedNetwork,
} from "../../../integrations/x402";

type PaymentSource = PaymentRequirements | PaymentRequirements[] | undefined;

export type PaymentFlowState =
  | "idle"
  | "loading"
  | "ready"
  | "paying"
  | "confirming"
  | "unlocking"
  | "success"
  | "error";

interface UsePaymentFlowOptions {
  network: SupportedNetwork;
  resourceUrl?: string;
  paymentChainId: number;
}

interface UsePaymentFlowValue {
  // State
  state: PaymentFlowState;
  paymentRequirements?: PaymentRequirements;
  currentUrl: string;
  amount: number;
  statusMessage: string;
  error?: Error;
  successContent?: any;

  // Actions
  initiatePayment: (hash: `0x${string}`) => void;
  refetch: () => Promise<void>;
  reset: () => void;
}

// Defaults from environment variables
const DEFAULT_RESOURCE_URL =
  import.meta.env.VITE_X402_RESOURCE_URL ?? "http://localhost:3007/api/protected-content";
const DEFAULT_AMOUNT_USDC = resolveDefaultAmount();

function resolveDefaultAmount(): number {
  const configuredAmount = Number(import.meta.env.VITE_X402_DEFAULT_AMOUNT);
  return Number.isFinite(configuredAmount) && configuredAmount > 0 ? configuredAmount : 0.1;
}

function getWindowRequirements(): PaymentSource {
  return window.x402?.paymentRequirements;
}

async function fetchPaymentRequirementsFromResource(resourceUrl: string): Promise<PaymentSource> {
  const response = await fetch(resourceUrl);

  if (response.status !== 402) {
    console.warn("Expected 402 status, received:", response.status);
    return undefined;
  }

  const payload = await response.json();
  return payload.paymentRequirements;
}

function syncWindowRequirements(paymentRequirements: PaymentSource): void {
  if (!window.x402 || !paymentRequirements) {
    return;
  }

  window.x402.paymentRequirements = paymentRequirements;
}

function toRequirementList(source: PaymentSource): PaymentRequirements[] {
  if (!source) {
    return [];
  }

  return Array.isArray(source) ? source : [source];
}

function deriveAmount(paymentRequirements?: PaymentRequirements): number {
  if (window.x402?.amount) {
    return window.x402.amount;
  }

  if (paymentRequirements?.maxAmountRequired) {
    return Number(paymentRequirements.maxAmountRequired) / 1_000_000;
  }

  return DEFAULT_AMOUNT_USDC;
}

export function usePaymentFlow({
  network,
  resourceUrl = DEFAULT_RESOURCE_URL,
  paymentChainId,
}: UsePaymentFlowOptions): UsePaymentFlowValue {
  const [state, setState] = useState<PaymentFlowState>("idle");
  const [requirementsSource, setRequirementsSource] = useState<PaymentSource>(getWindowRequirements);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<Error | undefined>();
  const [paymentHash, setPaymentHash] = useState<`0x${string}` | undefined>();
  const [successContent, setSuccessContent] = useState<any>(null);

  // Fetch payment requirements
  const fetchRequirements = useCallback(async () => {
    setState("loading");
    setError(undefined);
    setStatusMessage("Loading payment details...");

    try {
      const nextSource = await fetchPaymentRequirementsFromResource(resourceUrl);
      setRequirementsSource(nextSource);
      syncWindowRequirements(nextSource);

      if (!nextSource) {
        throw new Error("No payment requirements returned from server");
      }

      setState("ready");
      setStatusMessage("");
    } catch (cause) {
      const err = new Error("Failed to fetch payment requirements", { cause });
      setError(err);
      setState("error");
      setStatusMessage("Could not retrieve payment requirements from the server.");
    }
  }, [resourceUrl]);

  // Fetch requirements on mount if not already available
  useEffect(() => {
    if (!requirementsSource) {
      void fetchRequirements();
    } else {
      setState("ready");
    }
  }, [requirementsSource, fetchRequirements]);

  // Select the appropriate payment requirement for the network
  const paymentRequirements = useMemo(() => {
    if (!requirementsSource) return undefined;

    const requirementList = toRequirementList(requirementsSource);
    return selectPaymentRequirements(requirementList, network, "exact");
  }, [requirementsSource, network]);

  // Calculate amount from payment requirements or use defaults
  const amount = useMemo(() => {
    const derivedAmount = deriveAmount(paymentRequirements);

    // Sync to window.x402 for cross-frame communication
    if (window.x402) {
      window.x402.amount = derivedAmount;
      window.x402.testnet = network !== "base";
    }

    return derivedAmount;
  }, [paymentRequirements, network]);

  const currentUrl = window.x402?.currentUrl ?? resourceUrl;

  // Monitor transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: paymentHash,
    chainId: paymentChainId,
    query: {
      enabled: Boolean(paymentHash),
    },
  });

  // Update state when transaction is being confirmed
  useEffect(() => {
    if (paymentHash && isConfirming && state === "paying") {
      setState("confirming");
      setStatusMessage("Transaction submitted. Waiting for confirmation...");
    }
  }, [paymentHash, isConfirming, state]);

  // Unlock content when transaction is confirmed
  useEffect(() => {
    if (!isConfirmed || !paymentHash || !currentUrl) {
      return;
    }

    const unlockContent = async () => {
      setState("unlocking");
      setStatusMessage("Payment confirmed. Unlocking content...");

      try {
        const response = await fetch(currentUrl, {
          headers: {
            "X-TRANSACTION-HASH": paymentHash,
          },
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`Unable to unlock content: ${errorText}`);
        }

        const contentType = response.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
          const data = await response.json();
          setSuccessContent(data);
          setState("success");
          setStatusMessage("Payment successful! Content unlocked.");
          return;
        }

        if (contentType.includes("text/html")) {
          document.documentElement.innerHTML = await response.text();
          return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.location.href = url;
      } catch (error) {
        console.error("Failed to unlock content", error);
        setError(error instanceof Error ? error : new Error("Unable to unlock content"));
        setState("error");
        setStatusMessage(error instanceof Error ? error.message : "Unable to unlock content");
      }
    };

    void unlockContent();
  }, [currentUrl, isConfirmed, paymentHash]);

  const initiatePayment = useCallback((hash: `0x${string}`) => {
    setPaymentHash(hash);
    setState("paying");
    setStatusMessage("Transaction submitted. Waiting for confirmation...");
  }, []);

  const reset = useCallback(() => {
    setSuccessContent(null);
    setPaymentHash(undefined);
    setState("ready");
    setStatusMessage("");
    setError(undefined);
  }, []);

  return {
    state,
    paymentRequirements,
    currentUrl,
    amount,
    statusMessage,
    error,
    successContent,
    initiatePayment,
    refetch: fetchRequirements,
    reset,
  };
}
