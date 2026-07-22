// Shared design tokens for the Cash App-style dark UI.
export const colors = {
  background: "#0F0F0F",
  backgroundPure: "#000000",
  surface: "#161616",
  surfaceRaised: "#1C1C1C",
  border: "#222222",
  accent: "#00D632",
  accentMuted: "rgba(0, 214, 50, 0.12)",
  negative: "#FF3B30",
  negativeMuted: "rgba(255, 59, 48, 0.12)",
  textPrimary: "#FFFFFF",
  textSecondary: "#8E8E93",
  textTertiary: "#5C5C5E",
  disabled: "#2C2C2E",
} as const;

export const radii = {
  card: 20,
  cardSmall: 16,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
