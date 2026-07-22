import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { BackChevron, Card, Keypad, PillButton, Sparkline, SuccessCheck, colors, spacing } from "./ui";
import { transactionHandlers } from "../utils/transactions";
import { useHypeOrderBook, useHypeOpenOrders } from "../services/HyperliquidClient";
import type { EmbeddedWallet, OrderPlacementResult } from "../services/HyperliquidClient";
import { usePriceChart } from "../hooks/usePriceChart";
import { HYPE_SYMBOL } from "../constants/hyperliquid";

type FlowStep = "overview" | "amount" | "confirm" | "result";
type SwapDirection = "buy" | "sell";

interface MainAppScreenProps {
  activeWallet: EmbeddedWallet | null;
  walletBalance: number | null;
  walletBalanceLoading: boolean;
  hypeBalances: { account: any; positions: any } | null;
  hypeBalancesLoading: boolean;
  refetchWalletBalance: () => void;
  refetchHypeBalances: () => void;
  hypeUsdcPrice: number | null;
  hypeUsdcLoading: boolean;
  hyperliquidAccountAddress?: `0x${string}`;
}

export const MainAppScreen: React.FC<MainAppScreenProps> = ({
  activeWallet,
  hypeBalances,
  refetchWalletBalance,
  refetchHypeBalances,
  hypeUsdcPrice,
  hypeUsdcLoading,
  hyperliquidAccountAddress,
}) => {
  const [flowStep, setFlowStep] = useState<FlowStep>("overview");
  const [swapDirection, setSwapDirection] = useState<SwapDirection>("buy");
  const [swapAmount, setSwapAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [swapResult, setSwapResult] = useState<OrderPlacementResult | null>(null);

  const { book: orderBook } = useHypeOrderBook();
  const { orders: openOrders, refetch: refetchOpenOrders } = useHypeOpenOrders(hyperliquidAccountAddress, 5000);
  const { priceHistory } = usePriceChart(hypeUsdcPrice, hypeUsdcLoading);

  const hyperliquidUsdcBalance = useMemo(() => Number(hypeBalances?.account?.usdcBalance ?? 0), [hypeBalances]);
  const hyperliquidUsdcAvailableBalance = useMemo(() => {
    const usdcPosition = hypeBalances?.account?.assetPositions?.find((pos: any) => pos.coin === "USDC");
    if (!usdcPosition) return 0;
    return Math.max(0, parseFloat(usdcPosition.total || "0") - parseFloat(usdcPosition.hold || "0"));
  }, [hypeBalances]);
  const hypeTokenBalance = useMemo(() => parseFloat(hypeBalances?.positions?.hypePosition?.total || "0"), [hypeBalances]);
  const hypeAvailableBalance = useMemo(() => {
    const position = hypeBalances?.positions?.hypePosition;
    if (!position) return 0;
    return Math.max(0, parseFloat(position.total || "0") - parseFloat(position.hold || "0"));
  }, [hypeBalances]);

  const resetFlow = () => {
    setSwapAmount("");
    setSwapResult(null);
    setFlowStep("overview");
  };

  const openAmountStep = (direction: SwapDirection) => {
    setSwapDirection(direction);
    setSwapAmount("");
    setFlowStep("amount");
  };

  const handleConfirm = async () => {
    if (!activeWallet) {
      Alert.alert("No wallet", "Reconnect your Openfort wallet before trading.");
      return;
    }

    setIsProcessing(true);
    const result =
      swapDirection === "buy"
        ? await transactionHandlers.handleBuy(activeWallet, swapAmount, hypeBalances, setIsProcessing)
        : await transactionHandlers.handleSell(activeWallet, swapAmount, hypeBalances, setIsProcessing);

    if (result) {
      await Promise.allSettled([refetchWalletBalance(), refetchHypeBalances(), refetchOpenOrders()]);
      setSwapResult(result);
      setFlowStep("result");
    }
  };

  if (flowStep === "amount") {
    return (
      <AmountStep
        direction={swapDirection}
        amount={swapAmount}
        onChangeAmount={setSwapAmount}
        price={hypeUsdcPrice}
        available={swapDirection === "buy" ? hyperliquidUsdcAvailableBalance : hypeAvailableBalance}
        onBack={() => setFlowStep("overview")}
        onContinue={() => setFlowStep("confirm")}
      />
    );
  }

  if (flowStep === "confirm") {
    return (
      <ConfirmStep
        direction={swapDirection}
        amount={swapAmount}
        price={hypeUsdcPrice}
        isProcessing={isProcessing}
        onBack={() => setFlowStep("amount")}
        onConfirm={handleConfirm}
      />
    );
  }

  if (flowStep === "result" && swapResult) {
    return <ResultStep result={swapResult} onDone={resetFlow} />;
  }

  return (
    <OverviewStep
      price={hypeUsdcPrice}
      priceLoading={hypeUsdcLoading}
      priceHistory={priceHistory}
      usdcBalance={hyperliquidUsdcBalance}
      hypeBalance={hypeTokenBalance}
      orderBook={orderBook}
      openOrders={openOrders}
      onBuy={() => openAmountStep("buy")}
      onSell={() => openAmountStep("sell")}
    />
  );
};

// --- Step components ---------------------------------------------------

interface OverviewStepProps {
  price: number | null;
  priceLoading: boolean;
  priceHistory: number[];
  usdcBalance: number;
  hypeBalance: number;
  orderBook: ReturnType<typeof useHypeOrderBook>["book"];
  openOrders: ReturnType<typeof useHypeOpenOrders>["orders"];
  onBuy: () => void;
  onSell: () => void;
}

const OverviewStep: React.FC<OverviewStepProps> = ({ price, priceLoading, priceHistory, usdcBalance, hypeBalance, openOrders, onBuy, onSell }) => (
  <View style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heroLabel}>Available to trade</Text>
      <View style={styles.heroRow}>
        <Text style={styles.heroDollar}>$</Text>
        <Text style={styles.heroValue}>{usdcBalance.toFixed(2)}</Text>
      </View>
      <Text style={styles.heroSubtext}>{hypeBalance.toFixed(4)} {HYPE_SYMBOL}</Text>

      <Card style={styles.priceCard}>
        <View style={styles.priceCardHeader}>
          <Text style={styles.priceLabel}>{HYPE_SYMBOL} / USDC</Text>
          <Text style={styles.priceValue}>{priceLoading || !price ? "—" : `$${price.toFixed(4)}`}</Text>
        </View>
        <Sparkline values={priceHistory} width={280} height={48} />
      </Card>

      {openOrders.length > 0 && (
        <Card style={styles.ordersCard}>
          <Text style={styles.ordersTitle}>Open orders</Text>
          {openOrders.slice(0, 3).map((order) => (
            <View key={`${order.oid}-${order.timestamp}`} style={styles.orderRow}>
              <Text style={[styles.orderSide, order.side === "B" ? styles.orderBuy : styles.orderSell]}>
                {order.side === "B" ? "Buy" : "Sell"}
              </Text>
              <Text style={styles.orderDetail}>{order.sz} {HYPE_SYMBOL} @ {order.limitPx}</Text>
            </View>
          ))}
        </Card>
      )}

      <View style={styles.actionRow}>
        <PillButton title={`Buy ${HYPE_SYMBOL}`} onPress={onBuy} style={styles.actionButton} />
        <PillButton title={`Sell ${HYPE_SYMBOL}`} onPress={onSell} variant="danger" style={styles.actionButton} />
      </View>
    </ScrollView>
  </View>
);

interface AmountStepProps {
  direction: SwapDirection;
  amount: string;
  onChangeAmount: (value: string) => void;
  price: number | null;
  available: number;
  onBack: () => void;
  onContinue: () => void;
}

const AmountStep: React.FC<AmountStepProps> = ({ direction, amount, onChangeAmount, price, available, onBack, onContinue }) => {
  const isBuy = direction === "buy";
  const unit = isBuy ? "USDC" : HYPE_SYMBOL;
  const parsed = parseFloat(amount);
  const isValid = !Number.isNaN(parsed) && parsed > 0;
  const estimated = price && parsed > 0 ? (isBuy ? parsed / price : parsed * price) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackChevron onPress={onBack} />
      </View>
      <View style={styles.amountContent}>
        <Text style={styles.title}>{isBuy ? `Buy ${HYPE_SYMBOL}` : `Sell ${HYPE_SYMBOL}`}</Text>
        <View style={styles.amountDisplayRow}>
          <Text style={styles.amountDisplay}>{amount || "0"}</Text>
          <Text style={styles.amountUnit}>{unit}</Text>
        </View>
        <Text style={styles.hint}>
          {estimated !== null ? `≈ ${estimated.toFixed(isBuy ? 4 : 2)} ${isBuy ? HYPE_SYMBOL : "USDC"}` : " "}
        </Text>
        <Text style={styles.available}>{available.toFixed(isBuy ? 2 : 4)} {unit} available</Text>

        <View style={styles.keypadWrapper}>
          <Keypad value={amount} onChange={onChangeAmount} maxDecimals={isBuy ? 2 : 4} />
        </View>
        <PillButton title="Review" onPress={onContinue} disabled={!isValid} />
      </View>
    </View>
  );
};

interface ConfirmStepProps {
  direction: SwapDirection;
  amount: string;
  price: number | null;
  isProcessing: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

const ConfirmStep: React.FC<ConfirmStepProps> = ({ direction, amount, price, isProcessing, onBack, onConfirm }) => {
  const isBuy = direction === "buy";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackChevron onPress={onBack} />
      </View>
      <View style={styles.amountContent}>
        <Text style={styles.title}>Confirm</Text>
        <Card style={styles.confirmCard}>
          <View style={styles.confirmRow}>
            <Text style={styles.hint}>{isBuy ? "Spend" : "Sell"}</Text>
            <Text style={styles.confirmValue}>{amount} {isBuy ? "USDC" : HYPE_SYMBOL}</Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.hint}>Price</Text>
            <Text style={styles.confirmValueSmall}>{price ? `$${price.toFixed(4)}` : "—"}</Text>
          </View>
        </Card>
        <PillButton
          title={isProcessing ? "Placing order…" : "Confirm"}
          onPress={onConfirm}
          loading={isProcessing}
          variant={isBuy ? "primary" : "danger"}
        />
      </View>
    </View>
  );
};

interface ResultStepProps {
  result: OrderPlacementResult;
  onDone: () => void;
}

const ResultStep: React.FC<ResultStepProps> = ({ result, onDone }) => {
  const isBuy = result.side === "buy";
  const unit = isBuy ? HYPE_SYMBOL : "USDC";

  const subtitle =
    result.status === "resting"
      ? `Your ${isBuy ? "buy" : "sell"} order is resting on Hyperliquid as a limit order.`
      : `Filled ${result.totalSize} ${unit} at ${result.avgPrice}.`;

  return (
    <View style={styles.container}>
      <View style={styles.resultContent}>
        {result.status === "resting" ? <View style={styles.pendingDot} /> : <SuccessCheck />}
        <Text style={styles.title}>{result.status === "resting" ? "Order placed" : "Done"}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <PillButton title="Done" onPress={onDone} />
      </View>
    </View>
  );
};

// --- Styles --------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: spacing.md,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 72,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  heroLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heroDollar: {
    color: colors.textPrimary,
    fontSize: 40,
    fontWeight: "800",
    marginTop: 8,
  },
  heroValue: {
    color: colors.textPrimary,
    fontSize: 72,
    fontWeight: "800",
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  heroSubtext: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  priceCard: {
    gap: spacing.sm,
  },
  priceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  priceValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  ordersCard: {
    gap: spacing.sm,
  },
  ordersTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderSide: {
    fontWeight: "700",
    fontSize: 14,
  },
  orderBuy: {
    color: colors.accent,
  },
  orderSell: {
    color: colors.negative,
  },
  orderDetail: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    width: undefined,
  },
  amountContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },
  amountDisplayRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.lg,
  },
  amountDisplay: {
    fontSize: 56,
    fontWeight: "800",
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  amountUnit: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  available: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: "center",
  },
  keypadWrapper: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  confirmCard: {
    gap: spacing.md,
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  confirmValue: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  confirmValueSmall: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  resultContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    gap: spacing.md,
  },
  pendingDot: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.disabled,
    alignSelf: "center",
  },
});
