import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Keypad, PillButton } from "./ui";
import { COLORS, RADII } from "../constants/theme";
import { useLighterOrderBook } from "../hooks/useLighterOrderBook";
import { useLighterOrders } from "../hooks/useLighterOrders";
import type { LighterAccount, Market } from "../services/lighterServerClient";

const SLIPPAGE = 0.005; // 0.5%, marketable-limit IOC order
const ORDER_TYPE_LIMIT = 0;
const TIME_IN_FORCE_IMMEDIATE_OR_CANCEL = 0;
const ORDER_EXPIRY_NIL = 0;
// sendTx returns only a tx_hash — no fill status (verified live, see FRICTION_LOG.md) — so fill
// detection compares position/balance before vs. after this delay.
const FILL_CHECK_DELAY_MS = 2000;

type FlowStep = "overview" | "amount" | "confirm" | "result";
type Direction = "buy" | "sell";

interface TradingScreenProps {
  market: Market;
  account: LighterAccount | null;
  onBack: () => void;
  onRefreshAccount: () => Promise<LighterAccount | null>;
}

interface OrderResult {
  direction: Direction;
  txHash: string;
  requestedSize: number;
  requestedPrice: number;
  filled: boolean | "unknown";
}

function toRawInt(value: number, decimals: number): number {
  return Math.round(value * 10 ** decimals);
}

/** Perp: signed position size for this market. Spot: base-asset wallet balance. */
function getRelevantBalance(account: LighterAccount | null, market: Market): number {
  if (!account) return 0;
  if (market.marketType === "perp") {
    const position = account.positions.find((p) => p.market_id === market.marketIndex);
    if (!position) return 0;
    const size = Number.parseFloat(position.position);
    return position.sign >= 0 ? size : -size;
  }
  const baseSymbol = market.symbol.split("/")[0];
  const asset = account.assets?.find((a) => a.symbol === baseSymbol);
  return asset ? Number.parseFloat(asset.balance) : 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function TradingScreen({ market, account, onBack, onRefreshAccount }: TradingScreenProps) {
  const { bestBid, bestAsk, midPrice, isLoading: marketLoading } = useLighterOrderBook(market.marketIndex);
  const { orders, isLoading: ordersLoading, createOrder, cancelOrder } = useLighterOrders();
  const marketOrders = useMemo(
    () => orders.filter((o) => o.market_index === market.marketIndex),
    [orders, market.marketIndex],
  );

  const [step, setStep] = useState<FlowStep>("overview");
  const [direction, setDirection] = useState<Direction | null>(null);
  const [amount, setAmount] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);

  const estimatedSize = useMemo(() => {
    const usd = Number.parseFloat(amount) || 0;
    if (!midPrice || usd <= 0) return null;
    return usd / midPrice;
  }, [amount, midPrice]);

  const resetFlow = () => {
    setDirection(null);
    setAmount("0");
    setResult(null);
    setStep("overview");
  };

  const handleSubmit = async () => {
    if (!direction) return;
    const usdAmount = Number.parseFloat(amount);
    if (!Number.isFinite(usdAmount) || usdAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a positive USD amount.");
      return;
    }
    const isAsk = direction === "sell";
    const referencePrice = isAsk ? bestBid : bestAsk;
    if (!referencePrice) {
      Alert.alert("No liquidity", "Order book is empty right now — try again shortly.");
      return;
    }
    const limitPrice = isAsk ? referencePrice * (1 - SLIPPAGE) : referencePrice * (1 + SLIPPAGE);
    const baseSize = usdAmount / limitPrice;
    if (baseSize < Number.parseFloat(market.minBaseAmount)) {
      Alert.alert(
        "Amount too small",
        `Minimum order size is ${market.minBaseAmount} ${market.symbol} (~$${(
          Number.parseFloat(market.minBaseAmount) * limitPrice
        ).toFixed(2)}).`,
      );
      return;
    }

    setIsSubmitting(true);
    const balanceBefore = getRelevantBalance(account, market);
    try {
      const response = await createOrder({
        marketIndex: market.marketIndex,
        clientOrderIndex: 0, // NilClientOrderIndex — let the server assign the order index
        baseAmount: toRawInt(baseSize, market.sizeDecimals),
        price: toRawInt(limitPrice, market.priceDecimals),
        isAsk,
        orderType: ORDER_TYPE_LIMIT,
        timeInForce: TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
        orderExpiry: ORDER_EXPIRY_NIL,
      });

      await sleep(FILL_CHECK_DELAY_MS);
      const freshAccount = await onRefreshAccount();
      const balanceAfter = freshAccount ? getRelevantBalance(freshAccount, market) : null;
      const filled: boolean | "unknown" =
        balanceAfter === null ? "unknown" : Math.abs(balanceAfter - balanceBefore) > 1e-9;

      setResult({ direction, txHash: response.txHash, requestedSize: baseSize, requestedPrice: limitPrice, filled });
      setStep("result");
    } catch (err) {
      Alert.alert("Order failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (orderIndex: number) => {
    try {
      await cancelOrder(market.marketIndex, orderIndex);
    } catch (err) {
      Alert.alert("Cancel failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  const renderOverview = () => (
    <>
      <View style={styles.priceBlock}>
        {marketLoading && !midPrice ? (
          <ActivityIndicator color={COLORS.accent} />
        ) : (
          <>
            <Text style={styles.priceValue}>{midPrice ? `$${midPrice.toFixed(2)}` : "—"}</Text>
            <Text style={styles.priceLabel}>{market.symbol}</Text>
          </>
        )}
      </View>

      {marketOrders.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Open orders</Text>
          {marketOrders.map((order) => (
            <View key={order.order_id} style={styles.orderRow}>
              <View>
                <Text style={styles.orderText}>
                  {order.is_ask ? "Sell" : "Buy"} {order.remaining_base_amount} @ {order.price}
                </Text>
                <Text style={styles.orderSubtext}>{order.status}</Text>
              </View>
              <TouchableOpacity onPress={() => handleCancel(order.order_index)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {ordersLoading && marketOrders.length === 0 && <Text style={styles.mutedText}>Loading orders…</Text>}

      <View style={styles.actionRow}>
        <PillButton
          title="Buy"
          onPress={() => {
            setDirection("buy");
            setStep("amount");
          }}
          style={styles.actionButton}
        />
        <PillButton
          title="Sell"
          onPress={() => {
            setDirection("sell");
            setStep("amount");
          }}
          variant="danger"
          style={styles.actionButton}
        />
      </View>
      <PillButton title="Back to assets" onPress={onBack} variant="secondary" />
    </>
  );

  const renderAmount = () => (
    <View style={styles.amountFlow}>
      <Text style={styles.flowTitle}>
        {direction === "buy" ? "Buy" : "Sell"} {market.symbol}
      </Text>
      <Text style={styles.amountDisplay}>${amount}</Text>
      {estimatedSize !== null && (
        <Text style={styles.estimateText}>
          ≈ {estimatedSize.toFixed(4)} {market.symbol}
        </Text>
      )}
      <Keypad value={amount} onChange={setAmount} maxDecimals={2} />
      <View style={styles.amountActions}>
        <PillButton title="Back" onPress={() => setStep("overview")} variant="secondary" style={styles.amountActionButton} />
        <PillButton
          title="Review"
          onPress={() => setStep("confirm")}
          disabled={!Number.parseFloat(amount || "0")}
          style={styles.amountActionButton}
        />
      </View>
    </View>
  );

  const renderConfirm = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Confirm {direction}</Text>
      <Text style={styles.cardBody}>
        {direction === "buy" ? "Spend" : "Sell"} ${amount} of {market.symbol}, immediate-or-cancel.
      </Text>
      <PillButton
        title={isSubmitting ? "Submitting…" : "Confirm"}
        onPress={handleSubmit}
        loading={isSubmitting}
        variant={direction === "sell" ? "danger" : "primary"}
      />
      <PillButton title="Back" onPress={() => setStep("amount")} variant="secondary" disabled={isSubmitting} />
    </View>
  );

  const renderResult = () => {
    if (!result) return null;
    const statusText = result.filled === "unknown" ? "Submitted" : result.filled ? "Filled" : "Not filled";
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{statusText}</Text>
        <View style={styles.resultRow}>
          <Text style={styles.resultKey}>Asset</Text>
          <Text style={styles.resultValue}>{market.symbol}</Text>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultKey}>Side</Text>
          <Text style={styles.resultValue}>{result.direction === "buy" ? "Buy" : "Sell"}</Text>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultKey}>Size</Text>
          <Text style={styles.resultValue}>
            {result.requestedSize.toFixed(market.sizeDecimals)} {market.symbol.split("/")[0]}
          </Text>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultKey}>Price</Text>
          <Text style={styles.resultValue}>${result.requestedPrice.toFixed(2)}</Text>
        </View>
        {result.filled === false && (
          <Text style={styles.cardBody}>No match within the slippage buffer — nothing was charged.</Text>
        )}
        <Text style={styles.hashLabel}>Transaction</Text>
        <Text style={styles.hashText} selectable numberOfLines={2}>
          {result.txHash}
        </Text>
        <PillButton title="Done" onPress={resetFlow} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>{market.symbol}</Text>
        {step === "overview" && renderOverview()}
        {step === "amount" && renderAmount()}
        {step === "confirm" && renderConfirm()}
        {step === "result" && renderResult()}
      </ScrollView>
    </View>
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
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  priceBlock: {
    alignItems: "center",
    paddingVertical: 24,
  },
  priceValue: {
    fontSize: 64,
    fontWeight: "700",
    color: COLORS.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  priceLabel: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  card: {
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 14,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  cardBody: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  orderText: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  orderSubtext: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  cancelText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  mutedText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  amountFlow: {
    alignItems: "center",
    gap: 8,
  },
  flowTitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  amountDisplay: {
    fontSize: 56,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  estimateText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  amountActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 12,
  },
  amountActionButton: {
    flex: 1,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  resultKey: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  resultValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  hashLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  hashText: {
    color: COLORS.textTertiary,
    fontFamily: "Courier",
    fontSize: 11,
  },
});
