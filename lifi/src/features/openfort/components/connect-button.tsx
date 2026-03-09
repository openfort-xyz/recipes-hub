"use client";

import { useCallback, useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOpenfortWallet } from "@/features/openfort/hooks/use-openfort-wallet";
import { OpenfortButton, useSignOut } from "@openfort/react";
import { Button } from "@/components/ui/button";

const FAUCETS = [
  { label: "ETH faucet", href: "https://www.alchemy.com/faucets/base-sepolia" },
  { label: "USDC faucet", href: "https://faucet.circle.com/" },
];

interface OpenfortConnectButtonProps {
  className?: string;
  compact?: boolean;
}

export default function OpenfortConnectButton({
  className,
  compact = false,
}: OpenfortConnectButtonProps) {
  const { isConnected, isAuthenticated, playerName, address } = useOpenfortWallet();
  const { signOut } = useSignOut();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }, [address]);

  if (!isAuthenticated || !isConnected) {
    return (
      <div className={cn("w-full", className)}>
        <OpenfortButton label="Connect Wallet" />
      </div>
    );
  }

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Connected";
  const displayName = playerName || shortAddress;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 w-full", className)}>
        <button
          type="button"
          className="flex items-center gap-1 text-sm truncate max-w-[150px] cursor-pointer hover:text-primary transition-colors"
          onClick={handleCopyAddress}
          title={address}
        >
          <span>{copied ? "Copied!" : displayName}</span>
          {copied ? <Check className="h-3 w-3 shrink-0" /> : <Copy className="h-3 w-3 shrink-0 opacity-50" />}
        </button>
        <Button variant="secondary" size="sm" onClick={signOut}>
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex flex-col gap-1 text-sm">
        <button
          type="button"
          className="flex items-center gap-1.5 font-semibold cursor-pointer hover:text-primary transition-colors"
          onClick={handleCopyAddress}
          title={address}
        >
          <span>{copied ? "Copied!" : displayName}</span>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 opacity-50" />}
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Base Sepolia</span>
          <span>·</span>
          {FAUCETS.map((f) => (
            <a
              key={f.href}
              href={f.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 hover:text-primary transition-colors"
            >
              {f.label}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          ))}
        </div>
      </div>
      <Button variant="secondary" onClick={signOut}>
        Sign Out
      </Button>
    </div>
  );
}
