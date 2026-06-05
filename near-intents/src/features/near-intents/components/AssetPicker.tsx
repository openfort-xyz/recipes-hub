"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CHAIN_META, chainLabel } from "@/features/near-intents/constants";
import type { SwapAsset } from "@/features/near-intents/types";
import AssetIcon from "./AssetIcon";

interface AssetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  assets: SwapAsset[];
  selected: SwapAsset | null;
  onSelect: (asset: SwapAsset) => void;
}

export default function AssetPicker({
  open,
  onOpenChange,
  title,
  assets,
  selected,
  onSelect,
}: AssetPickerProps) {
  const [chainFilter, setChainFilter] = useState<string | "all">("all");
  const [search, setSearch] = useState("");

  // Chains present in this asset set, ordered by CHAIN_META (EVM first).
  const availableChains = useMemo(() => {
    const present = new Set(assets.map((asset) => asset.blockchain));
    return Object.keys(CHAIN_META).filter((chain) => present.has(chain));
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (chainFilter !== "all" && asset.blockchain !== chainFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return asset.symbol.toLowerCase().includes(query);
    });
  }, [assets, chainFilter, search]);

  const handleSelect = (asset: SwapAsset) => {
    onSelect(asset);
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-border bg-popover text-popover-foreground">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <ChainChip
            label="All chains"
            active={chainFilter === "all"}
            onClick={() => setChainFilter("all")}
          />
          {availableChains.map((chain) => (
            <ChainChip
              key={chain}
              label={chainLabel(chain)}
              color={CHAIN_META[chain]?.color}
              active={chainFilter === chain}
              onClick={() => setChainFilter(chain)}
            />
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by symbol"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {filteredAssets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No assets match your search.
            </p>
          ) : (
            filteredAssets.map((asset) => {
              const isSelected = selected?.assetId === asset.assetId;
              return (
                <button
                  key={asset.assetId}
                  type="button"
                  onClick={() => handleSelect(asset)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                    isSelected && "border-primary bg-primary/10"
                  )}
                >
                  <AssetIcon asset={asset} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{asset.symbol}</span>
                    <span className="block text-xs text-muted-foreground">
                      {chainLabel(asset.blockchain)}
                      {asset.isNative ? " · native" : ""}
                    </span>
                  </span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChainChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-background hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}
