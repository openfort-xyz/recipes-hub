"use client";

import { cn } from "@/lib/utils";
import { useOpenfortWallet } from "@/features/openfort/hooks/use-openfort-wallet";
import { OpenfortButton, useSignOut } from "@openfort/react";
import { Button } from "@/components/ui/button";

interface OpenfortConnectButtonProps {
  className?: string;
  compact?: boolean;
}

export default function OpenfortConnectButton({
  className,
  compact = false,
}: OpenfortConnectButtonProps) {
  const {
    isConnected,
    isAuthenticated,
    playerName,
    address,
  } = useOpenfortWallet();
  const { signOut } = useSignOut();

  if (!isAuthenticated || !isConnected) {
    return (
      <div className={cn("w-full", className)}>
        <OpenfortButton label="Connect Wallet" />
      </div>
    );
  }

  const displayName =
    playerName ||
    (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connected");

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 w-full", className)}>
        <span className="text-sm truncate max-w-[150px]">{displayName}</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            signOut();
          }}
        >
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex flex-col text-sm">
        <span className="font-semibold">{displayName}</span>
        <span className="text-xs text-muted-foreground">
          Wallet connected via Openfort
        </span>
      </div>
      <Button
        variant="secondary"
        onClick={() => {
          signOut();
        }}
      >
        Sign Out
      </Button>
    </div>
  );
}
