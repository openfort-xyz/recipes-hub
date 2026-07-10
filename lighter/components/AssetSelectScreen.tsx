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

export function AssetSelectScreen({ account, onSelect, onWithdraw }: AssetSelectScreenProps) {
  const { markets, isLoading } = useLighterMarkets();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Trade</Text>
      <PortfolioCard account={account} />

      {isLoading && markets.length === 0 ? (
        <ActivityIndicator color={COLORS.accent} style={styles.spinner} />
      ) : (
        <View style={styles.list}>
          {markets.map((market) => (
            <TouchableOpacity
              key={market.marketIndex}
              style={styles.tile}
              onPress={() => onSelect(market)}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.symbol}>{market.symbol}</Text>
                <Text style={styles.type}>{market.marketType === "perp" ? "Perp" : "Spot"}</Text>
              </View>
              <Text style={styles.price}>${formatPrice(market)}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
