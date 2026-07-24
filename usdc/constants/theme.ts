// constants/theme.ts
// Cash App-inspired design tokens shared across the USDC demo screens:
// a white canvas, one confident green, soft surface cards, and fully rounded
// pill controls with large tabular numerals.

export const colors = {
  bg: "#FFFFFF",
  surface: "#F4F5F7",
  surfaceBorder: "#ECEDF0",
  text: "#12131A",
  textMuted: "#8A8B93",
  green: "#00D54B",
  greenPressed: "#00BB41",
  greenSoft: "#E8FBEF",
  onGreen: "#06210F",
  danger: "#FF3B30",
} as const;

export const radii = {
  card: 22,
  field: 16,
  pill: 999,
} as const;

export const cardShadow = {
  shadowColor: "#0B1B2B",
  shadowOpacity: 0.06,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
} as const;

// Deterministic accent for a wallet's monogram avatar, keyed off its address.
const avatarPalette = ["#00D54B", "#2F6BFF", "#FF7A00", "#8B5CF6", "#FF3B6B", "#00B8D9"];

export function avatarColor(seed: string | undefined | null): string {
  if (!seed) return avatarPalette[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return avatarPalette[hash % avatarPalette.length];
}
