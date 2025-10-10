import { ERC20_BALANCE_OF_SIGNATURE, ERC20_BALANCE_TIMEOUT_MS, USDC_CONTRACT_ADDRESS, ERC20_TRANSFER_SIGNATURE } from "../constants/erc20";
import { useEffect, useRef, useState } from "react";

// ------------------------------------
// Constants
// ------------------------------------
const ZERO_BALANCE = "0.000000";
const USDC_DECIMALS = 6;

// ------------------------------------
// Helpers
// ------------------------------------

function strip0x(value: string): string {
  return value?.startsWith("0x") ? value.slice(2) : value;
}

function encodeAddress32(address: string): string {
  return strip0x(address).padStart(64, "0");
}

function toHex32(value: bigint): string {
  return value.toString(16).padStart(64, "0");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveProvider(activeWalletOrProvider: any): Promise<any | null> {
  if (!activeWalletOrProvider) return null;
  if (typeof activeWalletOrProvider?.request === "function") return activeWalletOrProvider;
  return await activeWalletOrProvider?.getProvider?.();
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs?: number,
  message?: string
): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  return (await Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message || "Operation timed out")), timeoutMs)
    ),
  ])) as T;
}

function buildBalanceOfData(ownerAddress: string): string {
  return ERC20_BALANCE_OF_SIGNATURE + encodeAddress32(ownerAddress);
}

function buildTransferData(toAddress: string, amountHex32: string): string {
  return ERC20_TRANSFER_SIGNATURE + encodeAddress32(toAddress) + amountHex32;
}

function parseAmountToUnits(amount: string, decimals: number): bigint {
  const trimmed = String(amount ?? "").trim();
  if (!trimmed) throw new Error("Invalid amount. Enter a positive amount.");
  if (trimmed.startsWith("-")) throw new Error("Invalid amount. Must be positive.");

  const [intPartRaw, fracPartRaw = ""] = trimmed.split(".");
  const intPart = intPartRaw.replace(/\D/g, "");
  const fracTruncated = fracPartRaw.replace(/\D/g, "").slice(0, decimals);
  const fracPadded = fracTruncated.padEnd(decimals, "0");

  const base = BigInt(10) ** BigInt(decimals);
  const integerUnits = BigInt(intPart || "0") * base;
  const fractionalUnits = BigInt(fracPadded || "0");
  return integerUnits + fractionalUnits; // floor semantics (no rounding)
}

async function pollUntil<T>(
  fn: (ctx: { timeLeftMs: number }) => Promise<T>,
  predicate: (value: T) => boolean,
  options?: { timeoutMs?: number; intervalMs?: number }
): Promise<T | null> {
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const intervalMs = options?.intervalMs ?? 1_000;
  const endTime = Date.now() + timeoutMs;

  while (Date.now() < endTime) {
    const timeLeftMs = Math.max(0, endTime - Date.now());
    try {
      const value = await fn({ timeLeftMs });
      if (predicate(value)) return value;
    } catch (_) {
      // ignore and retry until timeout
    }
    await delay(intervalMs);
  }
  return null;
}

// ------------------------------------
// Hooks
// ------------------------------------
/**
 * React hook: Subscribe to a USDC balance for an address. Handles initial fetch and polling.
 * Returns { balance, hasBalance }. Optionally notifies a consumer via onBalanceUpdate.
 */
export function useUsdcBalance(params: {
  activeWalletOrProvider: any | null | undefined;
  ownerAddress: string | null | undefined;
  onBalanceUpdate?: (balance: string) => void;
  options?: { pollIntervalMs?: number; stopWhenPositive?: boolean; timeoutMs?: number };
}): { balance: string; hasBalance: boolean } {
  const { activeWalletOrProvider, ownerAddress, onBalanceUpdate, options } = params;
  const [balance, setBalance] = useState("0.000000");

  const onBalanceUpdateRef = useRef(onBalanceUpdate);
  onBalanceUpdateRef.current = onBalanceUpdate;

  useEffect(() => {
    if (!activeWalletOrProvider || !ownerAddress) return;

    const stop = startUsdcBalancePolling(
      activeWalletOrProvider,
      ownerAddress,
      (b) => {
        setBalance(b);
        onBalanceUpdateRef.current?.(b);
      },
      {
        pollIntervalMs: options?.pollIntervalMs ?? 5000,
        stopWhenPositive: options?.stopWhenPositive ?? true,
        timeoutMs: options?.timeoutMs ?? ERC20_BALANCE_TIMEOUT_MS,
      }
    );

    return () => {
      stop?.();
    };
  }, [activeWalletOrProvider, ownerAddress, options?.pollIntervalMs, options?.stopWhenPositive, options?.timeoutMs]);

  const hasBalance = parseFloat(balance) > 0;

  return { balance, hasBalance };
}

// ------------------------------------
// Functions (generic ERC-20)
// ------------------------------------

/**
 * Fetch an ERC20 token balance for an owner address using a JSON-RPC provider.
 * Returns a string fixed to 6 decimals for UI consistency. Returns null on error/timeout.
 */
export async function getErc20Balance(
  provider: any,
  tokenAddress: string,
  ownerAddress: string,
  decimals: number,
  timeoutMs?: number
): Promise<string | null> {
  try {
    const data = buildBalanceOfData(ownerAddress);

    const callPromise = provider.request({
      method: "eth_call",
      params: [
        {
          to: tokenAddress,
          data: data,
        },
        "latest",
      ],
    });

    const effectiveTimeout = timeoutMs ?? ERC20_BALANCE_TIMEOUT_MS;
    const resultHex = (await withTimeout(callPromise, effectiveTimeout, "Balance fetch timeout")) as string;

    const balance = parseInt(resultHex, 16);
    const divisor = Math.pow(10, decimals);
    return (balance / divisor).toFixed(6);
  } catch (error) {
    console.error("getErc20Balance error:", error);
    return null;
  }
}


/**
 * Convenience: Get USDC balance for an address using a UserWallet or Provider.
 * Returns a fixed 6-decimal string or "0.000000" on error.
 */
export async function getUSDCBalance(
  activeWalletOrProvider: any,
  ownerAddress: string,
  options?: { timeoutMs?: number }
): Promise<string> {
  try {
    const provider = await resolveProvider(activeWalletOrProvider);
    if (!provider) return ZERO_BALANCE;

    const result = await getErc20Balance(
      provider,
      USDC_CONTRACT_ADDRESS,
      ownerAddress,
      USDC_DECIMALS,
      options?.timeoutMs ?? ERC20_BALANCE_TIMEOUT_MS
    );
    return result ?? ZERO_BALANCE;
  } catch (error) {
    console.error("getUSDCBalance error:", error);
    return ZERO_BALANCE;
  }
}


/**
 * Start polling USDC balance for an address. Invokes onBalance each time it fetches.
 * Returns a stop() function to cancel polling.
 */
export function startUsdcBalancePolling(
  activeWalletOrProvider: any,
  ownerAddress: string,
  onBalance: (balance: string) => void,
  options?: { pollIntervalMs?: number; stopWhenPositive?: boolean; timeoutMs?: number }
): () => void {
  let stopped = false;
  let intervalId: any = null;

  const pollIntervalMs = options?.pollIntervalMs ?? 5000;
  const stopWhenPositive = options?.stopWhenPositive ?? false;

  const checkOnce = async () => {
    if (stopped) return;
    try {
      const balance = await getUSDCBalance(activeWalletOrProvider, ownerAddress, {
        timeoutMs: options?.timeoutMs,
      });
      if (stopped) return;
      onBalance(balance);
      if (stopWhenPositive && parseFloat(balance) > 0) {
        stop();
      }
    } catch (error) {
      // Log and continue polling
      console.error("startUsdcBalancePolling checkOnce error:", error);
    }
  };

  // Initial check
  void checkOnce();

  // Start interval
  intervalId = setInterval(checkOnce, pollIntervalMs);

  function stop() {
    if (stopped) return;
    stopped = true;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return stop;
}


/**
 * Transfer USDC from a wallet to a recipient address. Ensures the wallet is active if
 * activeWallet and setActiveWallet are provided. Throws on failure. Returns the confirmed
 * transaction hash when available, otherwise the transaction intent id (`tin_*`).
 */
export async function transferUSDC(params: {
  fromWallet: { address: string; wallet: { getProvider: () => Promise<any> } };
  toAddress: string;
  amount: string;
  activeWallet?: { address?: string } | null;
  setActiveWallet?: (options?: any) => Promise<any>;
  chainIdHex?: string; // default: Sepolia 0xaa36a7
  waitForReceipt?: boolean; // default true
}): Promise<string> {
  const { fromWallet, toAddress, amount, activeWallet, setActiveWallet } = params;
  const chainIdHex = params.chainIdHex ?? "0xaa36a7"; // Sepolia
  const waitForReceipt = params.waitForReceipt ?? true;

  const transferAmountNum = parseFloat(amount || "0");
  if (!amount || isNaN(transferAmountNum) || transferAmountNum <= 0) {
    throw new Error("Invalid amount. Enter a positive USDC amount.");
  }

  // Ensure acting from the intended wallet if helpers provided
  if (activeWallet?.address && activeWallet.address !== fromWallet.address && setActiveWallet) {
    await setActiveWallet({ address: fromWallet.address, chainId: 11155111 });
  }

  const provider = await fromWallet.wallet.getProvider();

  // Convert amount to 6 decimals (USDC) using safe integer math
  const amountUnits = parseAmountToUnits(amount, USDC_DECIMALS);
  const amountHex = toHex32(amountUnits);

  // ERC20 transfer(address,uint256)
  const transferData = buildTransferData(toAddress, amountHex);

  const transactionIntentId = await provider.request({
    method: "wallet_sendCalls",
    params: [
      {
        version: "1.0",
        chainId: chainIdHex,
        from: fromWallet.address,
        calls: [
          { to: USDC_CONTRACT_ADDRESS, value: "0x0", data: transferData },
        ],
      },
    ],
  });

  let finalTxHash: string | null = null;

  if (waitForReceipt) {
    try {
      const statusResult = await waitForTransactionReceipt(provider, transactionIntentId, {
        timeoutMs: 10_000,
        intervalMs: 1_000,
      });
      if (statusResult?.status === "CONFIRMED") {
        const receipt = statusResult.receipts?.[0];
        if (receipt?.status === "reverted") {
          throw new Error("Transaction was mined but failed.");
        }
        finalTxHash = receipt?.transactionHash || null;
      }
    } catch (err: any) {
      // If polling failed, allow caller to proceed; they can refresh balances
      if (String(err?.message || "").includes("failed")) {
        throw err;
      }
    }
  }

  return finalTxHash ?? (transactionIntentId as string);
}


/**
 * Poll for a transaction intent status until it is confirmed or times out.
 * Returns the status payload or null on timeout.
 */
export async function waitForTransactionReceipt(
  provider: any,
  transactionIntentId: string,
  options?: { timeoutMs?: number; intervalMs?: number }
): Promise<any | null> {
  return await pollUntil<any>(
    async () => {
      return await provider.request({
        method: "wallet_getCallsStatus",
        params: [transactionIntentId],
      });
    },
    (result) => result?.status === "CONFIRMED",
    { timeoutMs: options?.timeoutMs ?? 10_000, intervalMs: options?.intervalMs ?? 1_000 }
  );
}

// ------------------------------------
// Functions (USDC-specific)
// ------------------------------------
