import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Keypad, PillButton } from "./ui";
import { COLORS, RADII } from "../constants/theme";
import { useLighterOrderBook } from "../hooks/useLighterOrderBook";
import { useLighterOrders } from "../hooks/useLighterOrders";
import { fetchServerConfig, LighterServerError } from "../services/lighterServerClient";
import type { LighterServerConfig, Market } from "../services/lighterServerClient";

const SLIPPAGE = 0.005; // 0.5%, marketable-limit IOC order
const ORDER_TYPE_LIMIT = 0;
const TIME_IN_FORCE_IMMEDIATE_OR_CANCEL = 0;
const ORDER_EXPIRY_NIL = 0;

// Explorer lives inside the trading app itself, not a standalone domain (see FRICTION_LOG.md
// correction). Verified live: both hosts resolve real /explorer/logs/<tx_hash> lookups (a
// bogus hash on either host renders "Log not found" rather than a generic app shell).
const EXPLORER_HOST: Record<LighterServerConfig["network"], string> = {
  testnet: "https://testnet.app.lighter.xyz",
  mainnet: "https://app.lighter.xyz",
};

function explorerUrl(network: LighterServerConfig["network"] | null, txHash: string): string | null {
  if (!network) return null;
  return `${EXPLORER_HOST[network]}/explorer/logs/${txHash}`;
}

type FlowStep = "overview" | "amount" | "confirm" | "result";
type Direction = "buy" | "sell";

interface TradingScreenProps {
  market: Market;
  accountIndex: number;
  onBack: () => void;
  onRefreshAccount: () => Promise<void>;
}

interface OrderResult {
  direction: Direction;
  txHash: string;
  size: number;
  price: number;
  /**
   * The server polls Lighter's own trade record before responding (see
   * server/src/fillConfirmation.ts) — `false` means it never observed a matching trade within its
   * wait budget, not a confirmed non-match. An IOC order that genuinely expires unmatched leaves
   * no record either way, so this never claims "nothing was charged".
   */
  filled: boolean;
}

function toRawInt(value: number, decimals: number): number {
  return Math.round(value * 10 ** decimals);
}

/**
 * A 409 here means the server is signing for a different account than this screen — normally
 * caught before the user ever reaches trading (UserScreen's onboarding gate re-evaluates
 * continuously), but a server restart mid-session could still land in this narrow window.
 * "Fix setup" just forces an immediate refresh instead of waiting for the ambient poll —
 * UserScreen's gate does the actual navigating once it sees the mismatch.
 */
function showOrderError(title: string, err: unknown, onFixSetup: () => void): void {
  const message = err instanceof Error ? err.message : "Unknown error";
  if (err instanceof LighterServerError && err.status === 409) {
    Alert.alert(title, message, [{ text: "Fix setup", onPress: onFixSetup }, { text: "OK" }]);
    return;
  }
  Alert.alert(title, message);
}

export function TradingScreen({ market, accountIndex, onBack, onRefreshAccount }: TradingScreenProps) {
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
  const [network, setNetwork] = useState<LighterServerConfig["network"] | null>(null);

  useEffect(() => {
    // Best-effort: an explorer link is a nice-to-have, so a failed fetch just means no link
    // renders rather than surfacing an error on the trading screen.
    fetchServerConfig()
      .then((config) => setNetwork(config.network))
      .catch(() => {});
  }, []);

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
    // Refresh again on the way back to the overview/portfolio — the fill was already confirmed
    // server-side before this screen ever showed a result, but this is cheap insurance against
    // the earlier refresh racing ahead of it for any reason.
    void onRefreshAccount();
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
    try {
      // The server waits for and confirms the fill itself (polling Lighter's trade record)
      // before responding — this call can take a few seconds, covered by the button's spinner.
      const response = await createOrder({
        accountIndex,
        marketIndex: market.marketIndex,
        clientOrderIndex: 0, // NilClientOrderIndex — let the server assign the order index
        baseAmount: toRawInt(baseSize, market.sizeDecimals),
        price: toRawInt(limitPrice, market.priceDecimals),
        isAsk,
        orderType: ORDER_TYPE_LIMIT,
        timeInForce: TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
        orderExpiry: ORDER_EXPIRY_NIL,
      });
      // Refresh the portfolio in the background so it's current once the user backs out — not
      // needed for fill status, which the server already confirmed above.
      void onRefreshAccount();

      const size = response.trade ? Number.parseFloat(response.trade.size) : baseSize;
      const price = response.trade ? Number.parseFloat(response.trade.price) : limitPrice;
      setResult({ direction, txHash: response.txHash, size, price, filled: response.filled });
      setStep("result");
    } catch (err) {
      showOrderError("Order failed", err, () => void onRefreshAccount());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (orderIndex: number) => {
    try {
      await cancelOrder(accountIndex, market.marketIndex, orderIndex);
    } catch (err) {
      showOrderError("Cancel failed", err, () => void onRefreshAccount());
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
      <PillButton
        title="Back to assets"
        onPress={() => {
          void onRefreshAccount();
          onBack();
        }}
        variant="secondary"
      />
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
    const statusText = result.filled ? "Filled" : "Couldn't confirm";
    const txExplorerUrl = explorerUrl(network, result.txHash);
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
            {result.size.toFixed(market.sizeDecimals)} {market.symbol.split("/")[0]}
          </Text>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultKey}>Price</Text>
          <Text style={styles.resultValue}>${result.price.toFixed(2)}</Text>
        </View>
        {!result.filled && (
          <Text style={styles.cardBody}>
            Didn&apos;t see it land within a few seconds — check your portfolio before retrying.
          </Text>
        )}
        <Text style={styles.hashLabel}>Transaction</Text>
        <Text style={styles.hashText} selectable numberOfLines={2}>
          {result.txHash}
        </Text>
        {txExplorerUrl && (
          <TouchableOpacity onPress={() => Linking.openURL(txExplorerUrl)}>
            <Text style={styles.explorerLink}>View on explorer</Text>
          </TouchableOpacity>
        )}
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
  explorerLink: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: "600",
  },
});
