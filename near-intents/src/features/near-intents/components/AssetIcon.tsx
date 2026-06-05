"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CHAIN_META } from "@/features/near-intents/constants";
import type { SwapAsset } from "@/features/near-intents/types";

interface AssetIconProps {
  asset: SwapAsset;
  size?: number;
}

// EVM token logos come from the SmolDapp token-assets CDN (chain id + address).
// Native and non-EVM assets fall back to a deterministic monogram.
const logoUrl = (asset: SwapAsset): string | null => {
  if (asset.chainId && asset.contractAddress) {
    return `https://assets.smold.app/api/token/${asset.chainId}/${asset.contractAddress}/logo-128.png`;
  }
  return null;
};

const monogramColor = (symbol: string): string => {
  let hash = 0;
  for (let i = 0; i < symbol.length; i += 1) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360} 55% 45%)`;
};

export default function AssetIcon({ asset, size = 36 }: AssetIconProps) {
  const [errored, setErrored] = useState(false);
  const url = errored ? null : logoUrl(asset);
  const meta = CHAIN_META[asset.blockchain];
  const badgeSize = Math.round(size * 0.42);

  // Reset the error state when the asset changes so a new logo gets a fresh try.
  useEffect(() => {
    setErrored(false);
  }, [asset.assetId]);

  return (
    <span
      className="relative inline-flex flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {url ? (
        <Image
          src={url}
          alt={asset.symbol}
          width={size}
          height={size}
          unoptimized
          className="rounded-full bg-muted object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span
          className="flex items-center justify-center rounded-full text-[0.6rem] font-semibold uppercase text-white"
          style={{
            width: size,
            height: size,
            backgroundColor: monogramColor(asset.symbol),
          }}
        >
          {asset.symbol.slice(0, 3)}
        </span>
      )}
      <span
        className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-card"
        style={{
          width: badgeSize,
          height: badgeSize,
          backgroundColor: meta?.color ?? "#888",
        }}
        title={meta?.label ?? asset.blockchain}
      />
    </span>
  );
}
