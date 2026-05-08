import { useState } from "react";
import { sdk } from "../lib/vaultsFyi";
import { useRewards } from "../hooks/useRewards";
import { useExecuteAction } from "../hooks/useExecuteAction";
import { Card } from "./Card";

const NETWORK = "base";

export function RewardsPanel({ userAddress }: { userAddress: string }) {
  const { data, isLoading, refetch } = useRewards(userAddress);
  const { running, step, hashes, error, execute } = useExecuteAction();
  const [preparing, setPreparing] = useState(false);

  const networkRewards = data?.claimable[NETWORK] ?? [];
  const totalUsd = networkRewards.reduce(
    (sum, r) => sum + parseFloat(r.asset.claimableAmountInUsd ?? "0"),
    0,
  );

  async function handleClaim() {
    if (networkRewards.length === 0) return;
    setPreparing(true);
    try {
      const claimIds = networkRewards.map((r) => r.claimId);
      const claim = await sdk.getRewardsClaimActions({
        path: { userAddress },
        query: { claimIds },
      });
      const networkClaim = claim[NETWORK];
      if (!networkClaim || networkClaim.actions.length === 0) return;
      await execute(networkClaim.currentActionIndex, networkClaim.actions);
      await refetch();
    } finally {
      setPreparing(false);
    }
  }

  return (
    <Card
      title="Claimable rewards on Base"
      subtitle="Two-step flow: discover claimIds, then sign the per-network claim transactions."
    >
      {isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {!isLoading && networkRewards.length === 0 && (
        <p className="text-sm text-neutral-500">No claimable rewards.</p>
      )}
      {networkRewards.length > 0 && (
        <>
          <ul className="space-y-1 text-sm text-neutral-300 mb-4">
            {networkRewards.map((r) => (
              <li key={r.claimId}>
                {r.asset.claimableAmount} {r.asset.symbol}
                {r.asset.claimableAmountInUsd
                  ? ` (${r.asset.claimableAmountInUsd} USD)`
                  : ""}
                {" · "}
                <span className="text-neutral-500">
                  {r.sources.map((s) => s.protocol.name).join(", ")}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={handleClaim}
            disabled={preparing || running}
            className="bg-white text-black font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {preparing || running
              ? `Claiming…${step ? ` (${step.current}/${step.total})` : ""}`
              : `Claim ${totalUsd.toFixed(2)} USD`}
          </button>
        </>
      )}
      {hashes.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs">
          {hashes.map((h) => (
            <li key={h.hash}>
              <a
                href={`https://basescan.org/tx/${h.hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline"
              >
                {h.hash}
              </a>{" "}
              <span className="text-neutral-500">({h.name})</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </Card>
  );
}
