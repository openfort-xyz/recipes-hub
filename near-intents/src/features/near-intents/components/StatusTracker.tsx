"use client";

import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getExplorerUrl } from "@/lib/utils";
import type {
  ExecutionStatusResponse,
  SwapAsset,
  SwapStatus,
} from "@/features/near-intents/types";

interface StatusTrackerProps {
  status: SwapStatus | null;
  detail: ExecutionStatusResponse | null;
  depositTxHash: string | null;
  fromAsset: SwapAsset;
}

const STAGES: { key: SwapStatus; label: string }[] = [
  { key: "PENDING_DEPOSIT", label: "Awaiting deposit" },
  { key: "PROCESSING", label: "Solvers settling swap" },
  { key: "SUCCESS", label: "Delivered to destination" },
];

const STAGE_RANK: Record<SwapStatus, number> = {
  PENDING_DEPOSIT: 0,
  KNOWN_DEPOSIT_TX: 0,
  INCOMPLETE_DEPOSIT: 0,
  PROCESSING: 1,
  SUCCESS: 2,
  REFUNDED: 2,
  FAILED: 2,
};

export default function StatusTracker({
  status,
  detail,
  depositTxHash,
  fromAsset,
}: StatusTrackerProps) {
  const current = status ?? "PENDING_DEPOSIT";
  const rank = STAGE_RANK[current];
  const isRefunded = current === "REFUNDED";
  const isFailed = current === "FAILED";
  const isSuccess = current === "SUCCESS";

  const depositExplorer = depositTxHash
    ? getExplorerUrl(depositTxHash, fromAsset.chainId)
    : null;

  const originTxs = detail?.swapDetails?.originChainTxHashes ?? [];
  const destinationTxs = detail?.swapDetails?.destinationChainTxHashes ?? [];

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-3">
          {STAGES.map((stage, index) => {
            const stageRank = STAGE_RANK[stage.key];
            const done = rank > stageRank || (isSuccess && index === 2);
            const active = rank === stageRank && !isSuccess;

            let Icon = Clock;
            let tone = "text-muted-foreground";
            if (done) {
              Icon = CheckCircle2;
              tone = "text-green-600 dark:text-green-400";
            } else if (active) {
              Icon = Loader2;
              tone = "text-primary";
            }

            return (
              <div key={stage.key} className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${tone} ${active ? "animate-spin" : ""}`} />
                <span className={done || active ? "font-medium" : "text-muted-foreground"}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {(isRefunded || isFailed) && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            <XCircle className="h-4 w-4" />
            <span>
              {isRefunded
                ? `Refunded${
                    detail?.swapDetails?.refundReason
                      ? ` (${detail.swapDetails.refundReason})`
                      : ""
                  }. Funds returned to your address.`
                : "The swap failed. Any deposited funds are refunded to your address."}
            </span>
          </div>
        )}

        <div className="space-y-2 border-t border-border pt-4 text-sm">
          {depositExplorer && (
            <TxRow label="Deposit transaction" href={depositExplorer} />
          )}
          {originTxs.map((tx) => (
            <TxRow key={tx.hash} label="Origin chain" href={tx.explorerUrl} />
          ))}
          {destinationTxs.map((tx) => (
            <TxRow
              key={tx.hash}
              label="Destination chain"
              href={tx.explorerUrl}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TxRow({ label, href }: { label: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
      >
        View
      </a>
    </div>
  );
}
