import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Keypad, PillButton } from "./ui";
import { COLORS, RADII } from "../constants/theme";
import { useLighterMarket } from "../hooks/useLighterMarket";
import { useLighterOrders } from "../hooks/useLighterOrders";
import type { LighterAccount } from "../services/lighterServerClient";

const SLIPPAGE = 0.005; // 0.5%, marketable-limit IOC order
const ORDER_TYPE_LIMIT = 0;
const TIME_IN_FORCE_IMMEDIATE_OR_CANCEL = 0;
const ORDER_EXPIRY_NIL = 0;

type FlowStep = "overview" | "direction" | "amount" | "confirm" | "result";
type Direction = "buy" | "sell";

interface TradingScreenProps {
  account: LighterAccount | null;
  onOpenWithdraw: () => void;
  onRefreshAccount: () => void;
}

function toRawInt(value: number, decimals: number): number {
  return Math.round(value * 10 ** decimals);
}

export function TradingScreen({ account, onOpenWithdraw, onRefreshAccount }: TradingScreenProps) {
  const { market, orderBook, midPrice, isLoading: marketLoading } = useLighterMarket();
  const { orders, isLoading: ordersLoading, createOrder, cancelOrder } = useLighterOrders();

  const [step, setStep] = useState<FlowStep>("overview");
  const [direction, setDirection] = useState<Direction | null>(null);
  const [amount, setAmount] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ txHash: string; direction: Direction; amount: string } | null>(null);

  const collateral = account ? Number.parseFloat(account.available_balance) : 0;

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
    if (!market || !direction || !orderBook) return;
    const usdAmount = Number.parseFloat(amount);
    if (!Number.isFinite(usdAmount) || usdAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a positive USD amount.");
      return;
    }
    const bestAsk = orderBook.asks[0] ? Number.parseFloat(orderBook.asks[0].price) : null;
    const bestBid = orderBook.bids[0] ? Number.parseFloat(orderBook.bids[0].price) : null;
    const isAsk = direction === "sell";
    const referencePrice = isAsk ? bestBid : bestAsk;
    if (!referencePrice) {
      Alert.alert("No liquidity", "Order book is empty right now — try again shortly.");
      return;
    }
    const limitPrice = isAsk ? referencePrice * (1 - SLIPPAGE) : referencePrice * (1 + SLIPPAGE);
    const baseSize = usdAmount / limitPrice;
    if (baseSize < Number.parseFloat(market.min_base_amount)) {
      Alert.alert(
        "Amount too small",
        `Minimum order size is ${market.min_base_amount} ${market.symbol} (~$${(
          Number.parseFloat(market.min_base_amount) * limitPrice
        ).toFixed(2)}).`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createOrder({
        clientOrderIndex: 0, // NilClientOrderIndex — let the server assign the order index
        baseAmount: toRawInt(baseSize, market.supported_size_decimals),
        price: toRawInt(limitPrice, market.supported_price_decimals),
        isAsk,
        orderType: ORDER_TYPE_LIMIT,
        timeInForce: TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
        orderExpiry: ORDER_EXPIRY_NIL,
      });
      setResult({ txHash: response.txHash, direction, amount });
      setStep("result");
      onRefreshAccount();
    } catch (err) {
      Alert.alert("Order failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (orderIndex: number) => {
    try {
      await cancelOrder(orderIndex);
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
            <Text style={styles.priceLabel}>{market?.symbol ?? "…"} mid price</Text>
          </>
        )}
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available balance</Text>
        <Text style={styles.balanceValue}>${collateral.toFixed(2)}</Text>
      </View>

      {orders.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Open orders</Text>
          {orders.map((order) => (
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
      {ordersLoading && orders.length === 0 && <Text style={styles.mutedText}>Loading orders…</Text>}

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
      <PillButton title="Withdraw" onPress={onOpenWithdraw} variant="secondary" />
    </>
  );

  const renderAmount = () => (
    <View style={styles.amountFlow}>
      <Text style={styles.flowTitle}>{direction === "buy" ? "Buy" : "Sell"} {market?.symbol}</Text>
      <Text style={styles.amountDisplay}>${amount}</Text>
      {estimatedSize !== null && (
        <Text style={styles.estimateText}>
          ≈ {estimatedSize.toFixed(4)} {market?.symbol}
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
        {direction === "buy" ? "Spend" : "Sell"} ${amount} of {market?.symbol} at market (IOC, 0.5% slippage
        buffer). This submits immediately to Lighter mainnet.
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

  const renderResult = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Order submitted</Text>
      <Text style={styles.cardBody}>
        {result?.direction === "buy" ? "Bought" : "Sold"} ~${result?.amount} of {market?.symbol}.
      </Text>
      <Text style={styles.hashText} numberOfLines={1}>
        {result?.txHash}
      </Text>
      <PillButton title="Done" onPress={resetFlow} />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>{market?.symbol ?? "Lighter"}</Text>
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
  balanceCard: {
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  balanceValue: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: "700",
    marginTop: 4,
    fontVariant: ["tabular-nums"],
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
  hashText: {
    color: COLORS.textTertiary,
    fontFamily: "Courier",
    fontSize: 11,
  },
});
