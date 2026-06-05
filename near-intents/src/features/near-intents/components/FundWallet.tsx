"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FundWalletProps {
  walletAddress: string;
}

interface LinkItem {
  label: string;
  href: string;
}

// Mainnet on-ramps / bridges — funds bought here can actually be swapped.
const ONRAMP_LINKS: LinkItem[] = [
  { label: "Buy USDC (Coinbase)", href: "https://www.coinbase.com/price/usdc" },
  { label: "Buy with card (Transak)", href: "https://global.transak.com" },
  { label: "Bridge to Base / Arbitrum / OP", href: "https://superbridge.app" },
];

// Testnet faucets — handy for poking at the wallet, but NEAR Intents has no
// testnet so these tokens cannot be swapped.
const FAUCET_LINKS: LinkItem[] = [
  { label: "Circle USDC faucet (testnet)", href: "https://faucet.circle.com" },
  {
    label: "Coinbase Base faucet (testnet)",
    href: "https://portal.cdp.coinbase.com/products/faucet",
  },
];

export default function FundWallet({ walletAddress }: FundWalletProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <Wallet className="h-4 w-4" />
        Need tokens? Fund your wallet
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border border-border bg-popover text-popover-foreground">
          <DialogHeader>
            <DialogTitle>Fund your wallet</DialogTitle>
          </DialogHeader>

          <div>
            <p className="mb-1.5 text-sm font-medium">Your wallet address</p>
            <button
              type="button"
              onClick={copyAddress}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left font-mono text-sm transition-colors hover:bg-accent"
              title="Copy address"
            >
              <span className="truncate">{walletAddress}</span>
              {copied ? (
                <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 flex-shrink-0 opacity-60" />
              )}
            </button>
          </div>

          <LinkGroup
            title="On-ramp (mainnet — swappable)"
            description="NEAR Intents settles on mainnet, so fund a small amount here to run a real swap."
            links={ONRAMP_LINKS}
          />

          <LinkGroup
            title="Testnet faucets (experiment only)"
            description="Free, but NEAR Intents has no testnet — these tokens can't be swapped."
            links={FAUCET_LINKS}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function LinkGroup({
  title,
  description,
  links,
}: {
  title: string;
  description: string;
  links: LinkItem[];
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {link.label}
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </a>
        ))}
      </div>
    </div>
  );
}
