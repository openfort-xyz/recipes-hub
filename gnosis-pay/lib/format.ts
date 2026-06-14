import { formatUnits, parseUnits } from "ethers";

/** Format a raw token amount to a trimmed, human string (max `maxFrac` decimals). */
export function formatAmount(value: bigint, decimals: number, maxFrac = 4): string {
  const full = formatUnits(value, decimals);
  const [int, frac = ""] = full.split(".");
  const trimmed = frac.slice(0, maxFrac).replace(/0+$/, "");
  return trimmed ? `${int}.${trimmed}` : int;
}

/** Parse a user-entered decimal string into raw token units. Throws on bad input. */
export function parseAmount(value: string, decimals: number): bigint {
  const trimmed = value.trim();
  if (!trimmed || Number(trimmed) <= 0) {
    throw new Error("Enter a positive amount.");
  }
  return parseUnits(trimmed, decimals);
}

/** Middle-truncate an address for display. */
export function shortAddress(address?: string | null): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
