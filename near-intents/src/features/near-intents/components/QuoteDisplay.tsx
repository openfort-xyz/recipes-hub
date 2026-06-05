"use client";

import { formatUnits } from "viem";
import { ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { chainLabel } from "@/features/near-intents/constants";
import type { QuoteResponse, SwapAsset } from "@/features/near-intents/types";
import AssetIcon from "./AssetIcon";

interface QuoteDisplayProps {
  quote: QuoteResponse;
  fromAsset: SwapAsset;
  toAsset: SwapAsset;
  recipient: string;
}

const truncate = (value: string): string =>
  value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;

const formatDeadline = (iso?: string): string => {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString();
};

export default function QuoteDisplay({
  quote,
  fromAsset,
  toAsset,
  recipient,
}: QuoteDisplayProps) {
  const { quote: q } = quote;
  const minReceived = formatUnits(BigInt(q.minAmountOut), toAsset.decimals);

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-4 p-6">
        <Leg
          label="You send"
          asset={fromAsset}
          amount={q.amountInFormatted}
        />

        <div className="flex justify-center text-muted-foreground">
          <ArrowDown className="h-5 w-5" />
        </div>

        <Leg
          label="You receive"
          asset={toAsset}
          amount={q.amountOutFormatted}
        />

        <dl className="space-y-2 border-t border-border pt-4 text-sm">
          <Row label="Minimum received">
            {Number(minReceived).toFixed(6)} {toAsset.symbol}
          </Row>
          <Row label="Est. settlement time">~{q.timeEstimate}s</Row>
          <Row label="Quote valid until">{formatDeadline(q.deadline)}</Row>
          <Row label={`Recipient on ${chainLabel(toAsset.blockchain)}`}>
            <span className="font-mono">{truncate(recipient)}</span>
          </Row>
          <Row label="Deposit address">
            <span className="font-mono">
              {q.depositAddress ? truncate(q.depositAddress) : "—"}
            </span>
          </Row>
        </dl>

        <p className="text-xs text-muted-foreground">
          Confirming sends {q.amountInFormatted} {fromAsset.symbol} from your
          Openfort wallet to the deposit address. Solvers settle the swap and
          deliver {toAsset.symbol} on {chainLabel(toAsset.blockchain)}.
        </p>
      </CardContent>
    </Card>
  );
}

function Leg({
  label,
  asset,
  amount,
}: {
  label: string;
  asset: SwapAsset;
  amount: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <AssetIcon asset={asset} size={40} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-xl font-bold">
          {amount} {asset.symbol}
        </p>
        <p className="text-xs text-muted-foreground">
          on {chainLabel(asset.blockchain)}
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
