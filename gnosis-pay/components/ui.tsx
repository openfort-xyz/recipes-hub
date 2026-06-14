import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

export const colors = {
  bg: "#FFFFFF",
  surface: "#F4F5F4", // light-gray cards / tiles
  track: "#E7E9E7",
  text: "#0A0F0C", // near-black
  muted: "#8A938D", // secondary gray
  green: "#00C244", // bright accent
  greenInk: "#067A36",
  greenWash: "#E7F7EC",
  black: "#0A0F0C",
  border: "#ECEEEC",
  danger: "#E5484D",
};

type FeatherName = keyof typeof Feather.glyphMap;

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

/** Circular icon button used in headers (back / help / log out). */
export function IconButton({ name, onPress }: { name: FeatherName; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      hitSlop={8}
    >
      <Feather name={name} size={20} color={colors.text} />
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

/** Big bold hero amount, Cash-App style. */
export function Balance({ label, amount }: { label: string; amount: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.balanceLabel}>{label}</Text>
      <Text style={styles.balanceAmount} numberOfLines={1} adjustsFontSizeToFit>
        {amount}
      </Text>
    </View>
  );
}

/** A debit-card visual: brand, contactless mark, balance, faux number, status. */
export function CardVisual({
  balance,
  last4,
  status,
  active,
}: {
  balance: string;
  last4: string;
  status: string;
  active: boolean;
}) {
  return (
    <View style={styles.cardVisual}>
      <View style={styles.cardRow}>
        <Text style={styles.cardBrand}>Gnosis Pay</Text>
        <Feather name="wifi" size={20} color="rgba(255,255,255,0.85)" />
      </View>
      <View style={styles.chip} />
      <View style={{ gap: 2 }}>
        <Text style={styles.cardBalanceLabel}>Card balance</Text>
        <Text style={styles.cardBalance} numberOfLines={1} adjustsFontSizeToFit>
          {balance}
        </Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardNumber}>•••• {last4}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: active ? colors.green : "rgba(255,255,255,0.4)" }]} />
          <Text style={styles.cardStatus}>{status}</Text>
        </View>
      </View>
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  tone?: "dark" | "light" | "green";
  icon?: FeatherName;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
};

export function Button({ title, onPress, tone = "dark", icon, loading, disabled, full = true }: ButtonProps) {
  const isDisabled = disabled || loading;
  const palette = {
    dark: { bg: colors.black, fg: "#FFFFFF" },
    light: { bg: colors.surface, fg: colors.text },
    green: { bg: colors.green, fg: "#062012" },
  }[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg },
        full && { alignSelf: "stretch" },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Feather name={icon} size={18} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, { color: palette.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Small metric tile (label + value), used two-up like the references. */
export function Tile({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {children}
    </View>
  );
}

export function ProgressBar({ ratio }: { ratio: number }) {
  const pct = Math.max(0, Math.min(1, ratio));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

/** Status pill: green dot + label, with optional right-side accessory. */
export function StatusPill({ label, ok = true }: { label: string; ok?: boolean }) {
  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusDot, { backgroundColor: ok ? colors.green : colors.muted }]} />
      <Text style={[styles.statusText, { color: ok ? colors.greenInk : colors.muted }]}>{label}</Text>
    </View>
  );
}

/** Tappable list row with leading icon, title/subtitle and a trailing accessory. */
export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  accessory,
}: {
  icon: FeatherName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  accessory?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, pressed && onPress && styles.pressed]}
    >
      <View style={styles.listIcon}>
        <Feather name={icon} size={18} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.listSubtitle} numberOfLines={1} ellipsizeMode="middle">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {accessory ?? (onPress ? <Feather name="chevron-right" size={20} color={colors.muted} /> : null)}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.8, lineHeight: 36 },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  sectionLabel: { fontSize: 17, fontWeight: "800", color: colors.text, letterSpacing: -0.3, marginTop: 6 },
  balanceLabel: { fontSize: 15, fontWeight: "600", color: colors.muted },
  balanceAmount: { fontSize: 52, fontWeight: "800", color: colors.text, letterSpacing: -2 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: 18, gap: 12 },
  cardVisual: {
    backgroundColor: "#123524",
    borderRadius: 24,
    padding: 22,
    gap: 18,
    minHeight: 196,
    justifyContent: "space-between",
    shadowColor: "#123524",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chip: {
    width: 42,
    height: 32,
    borderRadius: 7,
    backgroundColor: "#D9B863",
    opacity: 0.92,
  },
  cardBrand: { fontSize: 17, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.2 },
  cardBalanceLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.65)" },
  cardBalance: { fontSize: 40, fontWeight: "800", color: "#FFFFFF", letterSpacing: -1.5 },
  cardNumber: { fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.9)", letterSpacing: 2 },
  cardStatus: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.9)" },
  button: { height: 56, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  buttonInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttonText: { fontSize: 17, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 8 },
  tileLabel: { fontSize: 13, fontWeight: "600", color: colors.muted },
  tileValue: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.track, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: colors.green },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 12, height: 12, borderRadius: 4 },
  statusText: { fontSize: 15, fontWeight: "700" },
  listRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  listSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  input: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 18,
    fontSize: 17,
    fontWeight: "600",
    backgroundColor: colors.bg,
    color: colors.text,
  },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: colors.greenWash,
    color: colors.greenInk,
    fontWeight: "800",
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
});
