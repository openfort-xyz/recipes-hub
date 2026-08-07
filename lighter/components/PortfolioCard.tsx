import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, RADII } from "../constants/theme";
import type { LighterAccount, LighterAccountPosition, Market } from "../services/lighterServerClient";

interface PortfolioCardProps {
  account: LighterAccount | null;
  markets: Market[];
}

function formatUsd(value: number): string {
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : "—";
}

function formatSize(position: LighterAccountPosition, market: Market | undefined): string {
  const size = Number.parseFloat(position.position);
  return market && Number.isFinite(size) ? size.toFixed(market.sizeDecimals) : position.position;
}

function formatEntryPrice(position: LighterAccountPosition, market: Market | undefined): string {
  const price = Number.parseFloat(position.avg_entry_price);
  return market && Number.isFinite(price) ? price.toFixed(market.priceDecimals) : position.avg_entry_price;
}

function positionValueUsd(position: LighterAccountPosition, market: Market | undefined): number {
  if (!market) return NaN;
  const size = Number.parseFloat(position.position);
  const price = Number.parseFloat(market.price);
  return Math.abs(size) * price;
}

export function PortfolioCard({ account, markets }: PortfolioCardProps) {
  const cash = account ? Number.parseFloat(account.available_balance) : 0;
  const positions = account?.positions.filter((p) => Number.parseFloat(p.position) !== 0) ?? [];

  const positionsValue = positions.reduce((sum, position) => {
    const market = markets.find((m) => m.marketIndex === position.market_id);
    const value = positionValueUsd(position, market);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>Cash</Text>
      <Text style={styles.balance}>{formatUsd(cash)}</Text>

      {positions.length > 0 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Positions</Text>
          <View style={styles.positions}>
            {positions.map((position) => {
              const market = markets.find((m) => m.marketIndex === position.market_id);
              const pnl = Number.parseFloat(position.unrealized_pnl);
              const isLong = position.sign >= 0;
              return (
                <View key={position.market_id} style={styles.positionRow}>
                  <View style={styles.positionLeft}>
                    <Text style={styles.positionSymbol}>{position.symbol}</Text>
                    <Text style={styles.positionMeta}>
                      {isLong ? "Long" : "Short"} {formatSize(position, market)} @{" "}
                      {formatEntryPrice(position, market)}
                    </Text>
                  </View>
                  <View style={styles.positionRight}>
                    <Text style={styles.positionValue}>{formatUsd(positionValueUsd(position, market))}</Text>
                    <Text style={[styles.pnl, pnl >= 0 ? styles.pnlPositive : styles.pnlNegative]}>
                      {pnl >= 0 ? "+" : ""}
                      {pnl.toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatUsd(cash + positionsValue)}</Text>
          </View>
        </>
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
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  sectionLabel: {
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
    gap: 12,
    marginTop: 4,
  },
  positionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  positionLeft: {
    gap: 2,
  },
  positionRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  positionSymbol: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  positionMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  positionValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  pnl: {
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  pnlPositive: {
    color: COLORS.accent,
  },
  pnlNegative: {
    color: COLORS.danger,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  totalValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
