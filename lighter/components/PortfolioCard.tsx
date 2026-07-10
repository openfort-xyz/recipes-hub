import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, RADII } from "../constants/theme";
import type { LighterAccount } from "../services/lighterServerClient";

interface PortfolioCardProps {
  account: LighterAccount | null;
}

export function PortfolioCard({ account }: PortfolioCardProps) {
  const balance = account ? Number.parseFloat(account.collateral) : 0;
  const positions = account?.positions.filter((p) => Number.parseFloat(p.position) !== 0) ?? [];

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Balance</Text>
      <Text style={styles.balance}>${balance.toFixed(2)}</Text>

      {positions.length > 0 && (
        <View style={styles.positions}>
          {positions.map((position) => {
            const pnl = Number.parseFloat(position.unrealized_pnl);
            const isLong = position.sign >= 0;
            return (
              <View key={position.market_id} style={styles.positionRow}>
                <View style={styles.positionLeft}>
                  <Text style={styles.positionSymbol}>{position.symbol}</Text>
                  <Text style={styles.positionSize}>
                    {isLong ? "Long" : "Short"} {position.position} @ {position.avg_entry_price}
                  </Text>
                </View>
                <Text style={[styles.pnl, pnl >= 0 ? styles.pnlPositive : styles.pnlNegative]}>
                  {pnl >= 0 ? "+" : ""}
                  {pnl.toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 12,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  balance: {
    color: COLORS.textPrimary,
    fontSize: 40,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  positions: {
    gap: 8,
    marginTop: 4,
  },
  positionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  positionLeft: {
    gap: 2,
  },
  positionSymbol: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  positionSize: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  pnl: {
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  pnlPositive: {
    color: COLORS.accent,
  },
  pnlNegative: {
    color: COLORS.danger,
  },
});
