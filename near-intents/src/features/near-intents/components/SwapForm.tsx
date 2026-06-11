"use client";

import { useState } from "react";
import { ArrowDown, ChevronDown } from "lucide-react";
import { erc20Abi, formatUnits } from "viem";
import { useBalance, useReadContract } from "wagmi";
import {
  chainLabel,
  isOriginBlockchain,
} from "@/features/near-intents/constants";
import type { Quote, SwapAsset } from "@/features/near-intents/types";
import AssetIcon from "./AssetIcon";
import AssetPicker from "./AssetPicker";
import FundWallet from "./FundWallet";

interface SwapFormProps {
  originAssets: SwapAsset[];
  destinationAssets: SwapAsset[];
  fromAsset: SwapAsset | null;
  toAsset: SwapAsset | null;
  amount: string;
  recipient: string;
  liveQuote: Quote | null;
  estimateError: string | null;
  isLoadingEstimate: boolean;
  walletAddress: string;
  onFromAssetChange: (asset: SwapAsset) => void;
  onToAssetChange: (asset: SwapAsset) => void;
  onAmountChange: (amount: string) => void;
  onRecipientChange: (recipient: string) => void;
  onFlip: () => void;
}

export default function SwapForm({
  originAssets,
  destinationAssets,
  fromAsset,
  toAsset,
  amount,
  recipient,
  liveQuote,
  estimateError,
  isLoadingEstimate,
  walletAddress,
  onFromAssetChange,
  onToAssetChange,
  onAmountChange,
  onRecipientChange,
  onFlip,
}: SwapFormProps) {
  const [pickerField, setPickerField] = useState<"from" | "to" | null>(null);

  const handleSelect = (asset: SwapAsset) => {
    if (pickerField === "from") {
      onFromAssetChange(asset);
    } else if (pickerField === "to") {
      onToAssetChange(asset);
    }
  };

  const canFlip = !!toAsset && isOriginBlockchain(toAsset.blockchain);
  const destinationIsNonEvm = !!toAsset && !toAsset.isEvm;

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Swap</h2>
          {walletAddress && <FundWallet walletAddress={walletAddress} />}
        </div>

        <AssetField
          label="You send"
          asset={fromAsset}
          walletAddress={walletAddress}
          showBalance
          onOpenPicker={() => setPickerField("from")}
        >
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder="0.0"
            className="w-full bg-transparent text-2xl font-semibold outline-none"
          />
        </AssetField>

        <div className="my-3 flex justify-center">
          <button
            type="button"
            onClick={onFlip}
            disabled={!canFlip}
            title={canFlip ? "Swap direction" : "Origin must be an EVM chain"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Swap direction"
          >
            <ArrowDown className="h-5 w-5" />
          </button>
        </div>

        <AssetField
          label="You receive"
          asset={toAsset}
          walletAddress={walletAddress}
          showBalance={false}
          onOpenPicker={() => setPickerField("to")}
        >
          <div className="text-2xl font-semibold text-muted-foreground">
            {isLoadingEstimate ? (
              <span className="animate-pulse">Estimating…</span>
            ) : liveQuote ? (
              `~${Number(liveQuote.amountOutFormatted).toFixed(6)}`
            ) : (
              "0.0"
            )}
          </div>
        </AssetField>

        {liveQuote && toAsset && fromAsset ? (
          <LiveQuoteDetails
            quote={liveQuote}
            fromAsset={fromAsset}
            toAsset={toAsset}
            stale={isLoadingEstimate}
          />
        ) : estimateError && !isLoadingEstimate ? (
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {estimateError}
          </p>
        ) : null}

        <div className="mt-4">
          <label
            htmlFor="recipient"
            className="mb-1.5 block text-sm font-medium"
          >
            Recipient {toAsset ? `on ${chainLabel(toAsset.blockchain)}` : ""}
          </label>
          <input
            id="recipient"
            type="text"
            value={recipient}
            onChange={(event) => onRecipientChange(event.target.value)}
            placeholder={
              toAsset
                ? `Your ${chainLabel(toAsset.blockchain)} address`
                : "Destination address"
            }
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-mono text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {destinationIsNonEvm && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {chainLabel(toAsset!.blockchain)} is non-EVM — paste a{" "}
              {chainLabel(toAsset!.blockchain)} address, not your 0x wallet.
            </p>
          )}
        </div>
      </div>

      <AssetPicker
        open={pickerField !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPickerField(null);
          }
        }}
        title={pickerField === "to" ? "Receive — pick any chain" : "Send from"}
        assets={pickerField === "from" ? originAssets : destinationAssets}
        selected={pickerField === "from" ? fromAsset : toAsset}
        onSelect={handleSelect}
      />
    </div>
  );
}

function LiveQuoteDetails({
  quote,
  fromAsset,
  toAsset,
  stale,
}: {
  quote: Quote;
  fromAsset: SwapAsset;
  toAsset: SwapAsset;
  stale: boolean;
}) {
  const amountIn = Number(quote.amountInFormatted);
  const amountOut = Number(quote.amountOutFormatted);
  const rate = amountIn > 0 ? amountOut / amountIn : 0;
  const minReceived = formatUnits(BigInt(quote.minAmountOut), toAsset.decimals);

  return (
    <div
      className={`mt-4 space-y-1.5 rounded-xl border border-border bg-muted/30 p-3 text-sm transition-opacity ${
        stale ? "opacity-50" : "opacity-100"
      }`}
    >
      <Detail label="Rate">
        1 {fromAsset.symbol} ≈ {rate.toFixed(6)} {toAsset.symbol}
      </Detail>
      <Detail label="Minimum received">
        {Number(minReceived).toFixed(6)} {toAsset.symbol}
      </Detail>
      <Detail label="Est. settlement">~{quote.timeEstimate}s</Detail>
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

interface AssetFieldProps {
  label: string;
  asset: SwapAsset | null;
  walletAddress: string;
  showBalance: boolean;
  onOpenPicker: () => void;
  children: React.ReactNode;
}

// wagmi v3 removed `token` from useBalance (native-only). Fetch native balances
// with useBalance and ERC-20 balances with useReadContract(balanceOf).
function useTokenBalance({
  address,
  chainId,
  token,
  decimals,
  enabled,
}: {
  address?: `0x${string}`;
  chainId?: number;
  token?: `0x${string}`;
  decimals?: number;
  enabled: boolean;
}): { formatted: string; isFetching: boolean } {
  const isNative = !token;
  const native = useBalance({
    address,
    chainId,
    query: { enabled: enabled && isNative },
  });
  const erc20 = useReadContract({
    abi: erc20Abi,
    address: token,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: enabled && !isNative && Boolean(address) },
  });
  if (isNative) {
    return {
      formatted: native.data ? formatUnits(native.data.value, native.data.decimals) : "0",
      isFetching: native.isFetching,
    };
  }
  return {
    formatted:
      erc20.data != null && decimals != null ? formatUnits(erc20.data, decimals) : "0",
    isFetching: erc20.isFetching,
  };
}

function AssetField({
  label,
  asset,
  walletAddress,
  showBalance,
  onOpenPicker,
  children,
}: AssetFieldProps) {
  const balanceEnabled = Boolean(
    showBalance && walletAddress && asset && asset.isEvm && asset.chainId
  );
  const { formatted: balanceFormatted, isFetching } = useTokenBalance({
    address: walletAddress ? (walletAddress as `0x${string}`) : undefined,
    chainId: asset?.chainId,
    token: asset?.contractAddress,
    decimals: asset?.decimals,
    enabled: balanceEnabled,
  });

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {asset && (
          <span className="text-xs text-muted-foreground">
            {chainLabel(asset.blockchain)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          onClick={onOpenPicker}
          className="flex flex-shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-lg font-semibold transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {asset ? (
            <>
              <AssetIcon asset={asset} size={28} />
              <span>{asset.symbol}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Select</span>
          )}
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {showBalance && asset && walletAddress && (
        <div className="mt-2 text-sm text-muted-foreground">
          Balance:{" "}
          {!balanceEnabled
            ? "—"
            : isFetching
              ? "…"
              : `${Number(balanceFormatted).toFixed(4)} ${asset.symbol}`}
        </div>
      )}
    </div>
  );
}
