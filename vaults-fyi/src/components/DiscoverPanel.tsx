import { useDepositOptions, type VaultOption } from "../hooks/useDepositOptions";
import { Card } from "./Card";

export function DiscoverPanel({
  userAddress,
  onSelect,
}: {
  userAddress?: string;
  onSelect: (vault: VaultOption) => void;
}) {
  const { data, isLoading, error } = useDepositOptions();

  return (
    <Card
      title="Recommended USDC vaults"
      subtitle="Top USDC vaults on Base sorted by 7-day APY, excluding complex deposit/redeem flows."
    >
      {!userAddress && (
        <p className="text-sm text-neutral-500">Sign in to load recommendations.</p>
      )}
      {isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {error && (
        <p className="text-sm text-red-400">{(error as Error).message}</p>
      )}
      {data?.length === 0 && (
        <p className="text-sm text-neutral-500">No vaults found.</p>
      )}
      <div className="space-y-2">
        {data?.slice(0, 5).map((vault) => (
          <button
            key={vault.vaultId}
            onClick={() => onSelect(vault)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition"
          >
            <div className="text-left">
              <div className="text-sm text-white font-medium">
                {vault.protocol.name} · {vault.name}
              </div>
              <div className="text-xs text-neutral-500 truncate max-w-[280px]">
                {vault.address}
              </div>
            </div>
            <div className="text-sm text-emerald-400 font-semibold">
              {(vault.apy["7day"].total * 100).toFixed(2)}%
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
