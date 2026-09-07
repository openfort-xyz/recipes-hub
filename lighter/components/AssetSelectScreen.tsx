import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PortfolioCard } from "./PortfolioCard";
import { COLORS, RADII } from "../constants/theme";
import { useLighterMarkets } from "../hooks/useLighterMarkets";
import type { LighterAccount, Market } from "../services/lighterServerClient";

interface AssetSelectScreenProps {
  account: LighterAccount | null;
  onSelect: (market: Market) => void;
  onWithdraw: () => void;
}

function formatPrice(market: Market): string {
  const value = Number.parseFloat(market.price);
  if (!Number.isFinite(value)) return "—";
  return value >= 100 ? value.toFixed(2) : value.toFixed(4);
}

const TYPE_LABELS: Record<Market["marketType"], string> = { perp: "Perps", spot: "Spot" };

export function AssetSelectScreen({ account, onSelect, onWithdraw }: AssetSelectScreenProps) {
  const { markets, isLoading } = useLighterMarkets();

  // Only markets that can actually fill an order are offered. Listing the rest is what produced
  // "no liquidity, order book is empty" *after* picking an asset and typing an amount — on
  // testnet that was 173 of 176 markets, so the dead ones were the overwhelming majority.
  const tradeable = markets.filter((market) => market.hasLiquidity);
  const hiddenCount = markets.length - tradeable.length;

  // Group only when there's something to separate. Lighter testnet currently lists perps and no
  // spot markets at all, so an unconditional split would render a permanently empty "Spot"
  // heading; mainnet has both and gets the two sections.
  const presentTypes = (["perp", "spot"] as const).filter((type) =>
    tradeable.some((market) => market.marketType === type),
  );
  const sections = presentTypes.map((type) => ({
    type,
    markets: tradeable.filter((market) => market.marketType === type),
  }));

  const renderTile = (market: Market) => (
    <TouchableOpacity key={market.marketIndex} style={styles.tile} onPress={() => onSelect(market)} activeOpacity={0.7}>
      <View>
        <Text style={styles.symbol}>{market.symbol}</Text>
        <Text style={styles.type}>{market.marketType === "perp" ? "Perp" : "Spot"}</Text>
      </View>
      <Text style={styles.price}>${formatPrice(market)}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Trade</Text>
      <PortfolioCard account={account} markets={markets} />

      {isLoading && markets.length === 0 ? (
        <ActivityIndicator color={COLORS.accent} style={styles.spinner} />
      ) : tradeable.length === 0 ? (
        <Text style={styles.emptyState}>
          No market has a live order book right now. Lighter&apos;s testnet books come and go — pull back in a
          moment.
        </Text>
      ) : (
        sections.map((section) => (
          <View key={section.type} style={styles.section}>
            {sections.length > 1 && <Text style={styles.sectionHeading}>{TYPE_LABELS[section.type]}</Text>}
            <View style={styles.list}>{section.markets.map(renderTile)}</View>
          </View>
        ))
      )}

      {hiddenCount > 0 && (
        <Text style={styles.hiddenNote}>
          {hiddenCount} listed {hiddenCount === 1 ? "market has" : "markets have"} no order book right now and
          {hiddenCount === 1 ? " is" : " are"} hidden — an order there can&apos;t fill.
        </Text>
      )}

      <TouchableOpacity onPress={onWithdraw}>
        <Text style={styles.withdrawLink}>Withdraw</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 48,
    gap: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  spinner: {
    marginTop: 24,
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  emptyState: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  hiddenNote: {
    color: COLORS.textTertiary,
    fontSize: 12,
    lineHeight: 17,
  },
  list: {
    gap: 10,
  },
  tile: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  symbol: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  type: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  price: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  withdrawLink: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
});
