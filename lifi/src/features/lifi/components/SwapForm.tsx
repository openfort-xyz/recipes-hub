"use client";

import { cn } from "@/lib/utils";
import type { Chain, Token } from "@lifi/sdk";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useMemo, useState, memo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAccount, useBalance } from "wagmi";
import { zeroAddress } from "viem";
import { useVirtualizer } from "@tanstack/react-virtual";

interface SwapFormProps {
  fromChain: Chain | null;
  toChain: Chain | null;
  fromToken: Token | null;
  toToken: Token | null;
  amount: string;
  estimatedToAmount: string;
  isLoadingEstimate: boolean;
  chains: Chain[];
  fromTokens: Token[];
  toTokens: Token[];
  onFromChainChange: (chain: Chain | null) => void;
  onToChainChange: (chain: Chain | null) => void;
  onFromTokenChange: (token: Token | null) => void;
  onToTokenChange: (token: Token | null) => void;
  onAmountChange: (amount: string) => void;
}

export default function SwapForm({
  fromChain,
  toChain,
  fromToken,
  toToken,
  amount,
  estimatedToAmount,
  isLoadingEstimate,
  chains,
  fromTokens,
  toTokens,
  onFromChainChange,
  onToChainChange,
  onFromTokenChange,
  onToTokenChange,
  onAmountChange,
}: SwapFormProps) {
  // Modal states
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [modalType, setModalType] = useState<"from" | "to">("from");
  const [searchQuery, setSearchQuery] = useState("");
  const [parentRef, setParentRef] = useState<HTMLDivElement | null>(null);

  const { address } = useAccount();
  const walletAddress = address ?? undefined;

  const resolveTokenAddress = (token: Token | null) => {
    if (!token?.address || token.address === zeroAddress) {
      return undefined;
    }
    return token.address as `0x${string}`;
  };

  const {
    data: fromBalanceData,
    isFetching: isFetchingFromBalances,
  } = useBalance({
    address: walletAddress,
    chainId: fromChain?.id,
    token: resolveTokenAddress(fromToken),
    watch: true,
    query: {
      enabled: Boolean(walletAddress && fromChain && fromToken),
    },
  });

  const {
    data: toBalanceData,
    isFetching: isFetchingToBalances,
  } = useBalance({
    address: walletAddress,
    chainId: toChain?.id,
    token: resolveTokenAddress(toToken),
    watch: true,
    query: {
      enabled: Boolean(walletAddress && toChain && toToken),
    },
  });

  const fromTokenBalance = fromBalanceData?.formatted ?? "0.00";
  const toTokenBalance = toBalanceData?.formatted ?? "0.00";
  const isLoadingFromBalances = isFetchingFromBalances;
  const isLoadingToBalances = isFetchingToBalances;

  // Modal handlers
  const handleChainSelect = useCallback((chain: Chain) => {
    if (modalType === "from") {
      onFromChainChange(chain);
    } else {
      onToChainChange(chain);
    }
  }, [modalType, onFromChainChange, onToChainChange]);

  const handleTokenSelect = useCallback((token: Token) => {
    if (modalType === "from") {
      onFromTokenChange(token);
    } else {
      onToTokenChange(token);
    }
    setShowTokenModal(false);
    setSearchQuery("");
  }, [modalType, onFromTokenChange, onToTokenChange]);

  const openTokenModal = useCallback((type: "from" | "to") => {
    setModalType(type);
    setShowTokenModal(true);
  }, []);

  const filteredTokens = useMemo(
    () =>
      (modalType === "from" ? fromTokens : toTokens).filter((token) => {
        const q = searchQuery.toLowerCase();
        return (
          token.symbol.toLowerCase().includes(q) ||
          token.name.toLowerCase().includes(q)
        );
      }),
    [modalType, fromTokens, toTokens, searchQuery]
  );

  const currentChain = modalType === "from" ? fromChain : toChain;
  const currentToken = modalType === "from" ? fromToken : toToken;

  const virtualizer = useVirtualizer({
    count: filteredTokens.length,
    getScrollElement: () => parentRef,
    estimateSize: () => 64,
    overscan: 5,
  });

  return (
    <div className="w-full max-w-md">
      {/* Swap Card */}
      <div className="bg-card text-card-foreground rounded-2xl shadow-lg p-6 border border-border">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Cross Chain Swap</h1>
          <p className="text-muted-foreground text-sm">
            Swap tokens across different blockchain networks
          </p>
        </div>

        {/* From Section */}
        <div className="bg-muted/40 rounded-xl p-4 mb-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">From</span>
            <button
              onClick={() => openTokenModal("from")}
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <span>{fromChain?.name || "Select Chain"}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => openTokenModal("from")}
                className="flex items-center space-x-2 text-lg font-semibold hover:bg-accent hover:text-accent-foreground rounded-lg px-2 py-1 cursor-pointer"
              >
                {fromToken ? (
                  <>
                    {fromToken?.logoURI ? (
                      <Image
                        src={fromToken.logoURI}
                        alt={`${fromToken.symbol} logo`}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full"
                        unoptimized
                      />
                    ) : (
                      <span className="text-2xl">🪙</span>
                    )}
                    <span>{fromToken.symbol}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Select token</span>
                )}
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <button
              className="text-sm text-primary hover:underline font-medium cursor-pointer"
              onClick={() => {
                // Set max amount to the actual balance
                if (fromTokenBalance && fromTokenBalance !== "0.00") {
                  onAmountChange(fromTokenBalance);
                }
              }}
              disabled={
                !fromTokenBalance ||
                fromTokenBalance === "0.00" ||
                isLoadingFromBalances
              }
            >
              Max
            </button>
          </div>

          <input
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            className="w-full text-2xl font-semibold bg-transparent border-none outline-none"
          />

          <div className="text-sm text-muted-foreground mt-2">
            <span className="border-b border-dashed border-border w-full block h-4"></span>
          </div>

          {fromToken && (
            <div className="text-sm text-muted-foreground mt-1">
              Balance:{" "}
              {isLoadingFromBalances
                ? "Loading..."
                : `${fromTokenBalance} ${fromToken.symbol}`}
            </div>
          )}
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center mb-4">
          <button
            className="w-10 h-10 bg-accent text-accent-foreground rounded-full flex items-center justify-center hover:bg-accent/80 transition-colors cursor-pointer"
            onClick={() => {
              onFromChainChange(toChain);
              onToChainChange(fromChain);
              onFromTokenChange(toToken);
              onToTokenChange(fromToken);
            }}
          >
            <ArrowUpDown className="w-5 h-5" />
          </button>
        </div>

        {/* To Section */}
        <div className="bg-muted/40 rounded-xl p-4 mb-6 border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">To</span>
            <button
              onClick={() => openTokenModal("to")}
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <span>{toChain?.name || "Select Chain"}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => openTokenModal("to")}
                className="flex items-center space-x-2 text-lg font-semibold hover:bg-accent hover:text-accent-foreground rounded-lg px-2 py-1 cursor-pointer"
              >
                {toToken ? (
                  <>
                    {toToken?.logoURI ? (
                      <Image
                        src={toToken.logoURI}
                        alt={`${toToken.symbol} logo`}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full"
                        unoptimized
                      />
                    ) : (
                      <span className="text-2xl">🪙</span>
                    )}
                    <span>{toToken.symbol}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Select token</span>
                )}
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-2xl font-semibold mb-2 text-muted-foreground">
            {isLoadingEstimate ? (
              <span className="animate-pulse">Loading...</span>
            ) : estimatedToAmount ? (
              `~${parseFloat(estimatedToAmount).toFixed(6)}`
            ) : (
              "0.00"
            )}
          </div>

          <div className="text-sm text-muted-foreground mt-2">
            <span className="border-b border-dashed border-border w-full block h-4"></span>
          </div>

          {toToken && (
            <div className="text-sm text-muted-foreground mt-1">
              Balance:{" "}
              {isLoadingToBalances
                ? "Loading..."
                : `${toTokenBalance} ${toToken.symbol}`}
            </div>
          )}
        </div>
      </div>

      {/* Token Selection Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogContent className="border border-border bg-popover text-popover-foreground">
          <DialogHeader>
            <DialogTitle>Select a token</DialogTitle>
          </DialogHeader>
          <div className="mb-4 overflow-hidden">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Available chains
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full min-w-0">
              {chains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleChainSelect(chain)}
                  className={cn(
                    "flex-shrink-0 flex items-center space-x-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                    currentChain?.id === chain.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-accent-foreground/20 hover:bg-accent"
                  )}
                >
                  <Image
                    src={chain.logoURI || ""}
                    alt={chain.name}
                    width={20}
                    height={20}
                    className="w-5 h-5 rounded-full"
                    unoptimized
                  />
                  <span className="text-sm font-medium whitespace-nowrap">
                    {chain.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search for a token"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-4 py-3 border border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-ring bg-background"
            />
          </div>
          <div
            ref={setParentRef}
            className="max-h-96 overflow-y-auto"
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const token = filteredTokens[virtualItem.index];
                return (
                  <div
                    key={token.address}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <TokenItem
                      token={token}
                      isSelected={currentToken?.address === token.address}
                      onSelect={handleTokenSelect}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Memoized token item component for better performance
const TokenItem = memo(({ token, isSelected, onSelect }: {
  token: Token;
  isSelected: boolean;
  onSelect: (token: Token) => void;
}) => {
  return (
    <button
      onClick={() => onSelect(token)}
      className={cn(
        "w-full flex items-center space-x-3 p-3 rounded-xl transition-colors hover:bg-accent hover:text-accent-foreground border border-transparent cursor-pointer mb-2",
        isSelected && "bg-primary/10 border-primary"
      )}
    >
      {token.logoURI ? (
        <Image
          src={token.logoURI}
          alt={`${token.symbol} logo`}
          width={24}
          height={24}
          className="w-6 h-6 rounded-full"
          unoptimized
        />
      ) : (
        <span className="text-2xl">🪙</span>
      )}
      <div className="flex-1 text-left">
        <div className="font-medium">{token.name}</div>
        <div className="text-sm text-muted-foreground">
          {token.symbol}
        </div>
      </div>
      {isSelected && (
        <div className="w-4 h-4 bg-primary rounded-full border-2 border-background"></div>
      )}
    </button>
  );
});

TokenItem.displayName = "TokenItem";
