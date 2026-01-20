import React from "react";
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { CustomButton, GradientButton } from "./ui";
import { transactionHandlers } from "../utils/transactions";
import { useHypeOrderBook, useHypeOpenOrders } from "../services/HyperliquidClient";
import { HYPE_SYMBOL } from "../constants/hyperliquid";

type FlowStep = "overview" | "direction" | "amount" | "confirm" | "result";
type SwapDirection = "buy" | "sell";
type SwapStatus = "filled" | "resting";

type SwapResult = {
  status: SwapStatus;
  direction: SwapDirection;
  inputAmount: string;
  outputAmount: string | null;
  priceAtExecution: number | null;
  timestamp: number;
  orderId?: number;
  requestedPrice?: string;
  requestedSize?: string;
  avgPrice?: string;
  totalSize?: string;
};

interface MainAppScreenProps {
  activeWallet: any | null;
  openfortClient: any;
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
  openfortClient,
  walletBalance,
  walletBalanceLoading,
  hypeBalances,
  hypeBalancesLoading,
  refetchWalletBalance,
  refetchHypeBalances,
  hypeUsdcPrice,
  hypeUsdcLoading,
  hyperliquidAccountAddress,
}) => {
  const [flowStep, setFlowStep] = React.useState<FlowStep>("overview");
  const [swapDirection, setSwapDirection] = React.useState<SwapDirection | null>(null);
  const [swapAmount, setSwapAmount] = React.useState<string>("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [swapResult, setSwapResult] = React.useState<SwapResult | null>(null);

  const {
    book: orderBook,
    isLoading: orderBookLoading,
    error: orderBookError,
  } = useHypeOrderBook();
  const {
    orders: openOrders,
    isLoading: openOrdersLoading,
    error: openOrdersError,
    refetch: refetchOpenOrders,
  } = useHypeOpenOrders(hyperliquidAccountAddress, 5000);

  const hyperliquidUsdcBalance = React.useMemo(
    () => Number(hypeBalances?.account?.usdcBalance ?? 0),
    [hypeBalances]
  );

  const hyperliquidUsdcAvailableBalance = React.useMemo(() => {
    const usdcPosition = hypeBalances?.account?.assetPositions?.find((pos: any) => pos.coin === "USDC");
    if (!usdcPosition) return 0;
    const total = parseFloat(usdcPosition.total || "0");
    const hold = parseFloat(usdcPosition.hold || "0");
    return Math.max(0, total - hold);
  }, [hypeBalances]);

  const hypeTokenBalance = React.useMemo(() => {
    return parseFloat(hypeBalances?.positions?.hypePosition?.total || "0");
  }, [hypeBalances]);

  const hypeAvailableBalance = React.useMemo(() => {
    const position = hypeBalances?.positions?.hypePosition;
    if (!position) return 0;
    const total = parseFloat(position.total || "0");
    const hold = parseFloat(position.hold || "0");
    return Math.max(0, total - hold);
  }, [hypeBalances]);

  const hasOpenOrders = openOrders.length > 0;
  const visibleOpenOrders = React.useMemo(() => openOrders.slice(0, 3), [openOrders]);
  const orderBookBids = React.useMemo(() => orderBook?.levels?.[0]?.slice(0, 5) ?? [], [orderBook]);
  const orderBookAsks = React.useMemo(() => orderBook?.levels?.[1]?.slice(0, 5) ?? [], [orderBook]);

  const formatNumeric = React.useCallback(
    (value: string | number | undefined | null, decimals = 3) => {
      if (value === undefined || value === null) {
        return "—";
      }
      const numeric = typeof value === "number" ? value : parseFloat(value);
      if (Number.isNaN(numeric)) {
        return typeof value === "string" ? value : "—";
      }
      return numeric.toFixed(decimals);
    },
    []
  );

  const renderPendingOrdersBanner = () => {
    if (openOrdersLoading && !hasOpenOrders && openOrders.length === 0) {
      return (
        <View style={styles.pendingBanner}>
          <ActivityIndicator color="#00D4AA" size="small" />
          <Text style={styles.pendingBannerText}>Loading orders…</Text>
        </View>
      );
    }

    if (openOrdersError && !hasOpenOrders) {
      return (
        <View style={[styles.pendingBanner, styles.pendingBannerError]}>
          <Text style={styles.pendingOrderErrorText}>Unable to refresh open orders.</Text>
        </View>
      );
    }

    if (!hasOpenOrders) {
      return null;
    }

    return (
      <View style={styles.pendingBanner}>
        <Text style={styles.pendingBannerTitle}>Waiting on trade</Text>
        {visibleOpenOrders.map((order) => (
          <View key={`${order.oid}-${order.timestamp}`} style={styles.pendingOrderRow}>
            <Text style={styles.pendingOrderText}>
              {order.side === "B" ? "Buy" : "Sell"} {formatNumeric(order.sz, 4)} {HYPE_SYMBOL} @ {formatNumeric(order.limitPx, 3)} USDC
            </Text>
            <Text style={styles.pendingOrderSubtext}>
              Placed {new Date(order.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}
        {openOrders.length > visibleOpenOrders.length && (
          <Text style={styles.pendingOrderFootnote}>
            +{openOrders.length - visibleOpenOrders.length} more resting orders
          </Text>
        )}
      </View>
    );
  };

  const renderOrderBookSection = () => {
    // Filter open orders to show only user's orders, separated by side
    const userBids = openOrders.filter(order => order.side === "B");
    const userAsks = openOrders.filter(order => order.side === "A");

    return (
      <View style={styles.orderBookSection}>
        <View style={styles.orderBookHeader}>
          <Text style={styles.orderBookTitle}>My orders</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {openOrdersError ? (
            <Text style={styles.orderBookErrorText}>Unable to load your orders.</Text>
          ) : (
            <View style={styles.orderBookColumns}>
              <View style={styles.orderBookColumn}>
                <Text style={styles.orderBookColumnTitle}>My Bids</Text>
                {userBids.length === 0 && !openOrdersLoading ? (
                  <Text style={styles.orderBookEmpty}>No bids</Text>
                ) : (
                  userBids.map((order, index) => (
                    <View key={`bid-${order.oid}-${index}`} style={styles.orderBookRow}>
                      <Text style={[styles.orderBookPrice, styles.orderBookBid]}>{formatNumeric(order.limitPx, 3)}</Text>
                      <Text style={styles.orderBookSize}>{formatNumeric(parseFloat(order.limitPx) * parseFloat(order.sz), 3)} USDC</Text>
                    </View>
                  ))
                )}
              </View>
              <View style={styles.orderBookColumn}>
                <Text style={styles.orderBookColumnTitle}>My Asks</Text>
                {userAsks.length === 0 && !openOrdersLoading ? (
                  <Text style={styles.orderBookEmpty}>No asks</Text>
                ) : (
                  userAsks.map((order, index) => (
                    <View key={`ask-${order.oid}-${index}`} style={styles.orderBookRow}>
                      <Text style={[styles.orderBookPrice, styles.orderBookAsk]}>{formatNumeric(order.limitPx, 3)}</Text>
                      <Text style={styles.orderBookSize}>{formatNumeric(order.sz, 3)} {HYPE_SYMBOL}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      refetchWalletBalance();
      refetchHypeBalances();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetchWalletBalance, refetchHypeBalances]);

  React.useEffect(() => {
    refetchOpenOrders();
  }, [refetchOpenOrders]);

  React.useEffect(() => {
    setSwapAmount("");
  }, [swapDirection]);

  const resetForNewSwap = React.useCallback(() => {
    setSwapDirection(null);
    setSwapAmount("");
    setSwapResult(null);
    setIsProcessing(false);
  }, []);

  const balanceCards = (
    <View style={styles.balanceRow}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>USDC (Spot)</Text>
        <Text style={styles.balanceValue}>
          {hyperliquidUsdcBalance.toFixed(8)} USDC
        </Text>
      </View>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>HYPE Balance</Text>
        <Text style={styles.balanceValue}>
          {hypeTokenBalance.toFixed(8)} HYPE
        </Text>
      </View>
    </View>
  );

  const renderOverview = () => (
    <>
      <View style={styles.priceSection}>
        {hypeUsdcLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#00D4AA" />
            <Text style={styles.loadingText}>Fetching price…</Text>
          </View>
        ) : hypeUsdcPrice ? (
          <>
            <Text style={styles.priceValue}>${hypeUsdcPrice.toFixed(4)}</Text>
            <Text style={styles.priceLabel}>HYPE / USDC mid price</Text>
          </>
        ) : (
          <Text style={styles.errorText}>Unable to fetch price</Text>
        )}
      </View>

      {renderOrderBookSection()}

      {balanceCards}

      <GradientButton
        title="Swap HYPE/USDC"
        onPress={() => setFlowStep("direction")}
      />
    </>
  );

  const renderDirection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>Choose your swap</Text>
      <Text style={styles.sectionSubheading}>
        Select the direction for your trade. You can buy HYPE with USDC or sell HYPE for USDC.
      </Text>

      <View style={styles.swapButtons}>
        <TouchableOpacity
          style={[styles.swapButton, swapDirection === "buy" && styles.swapButtonSelected]}
          onPress={() => setSwapDirection("buy")}
        >
          <Text style={styles.swapButtonTitle}>USDC → {HYPE_SYMBOL}</Text>
          <Text style={styles.swapButtonSubtitle}>Buy {HYPE_SYMBOL} with USDC</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.swapButton, swapDirection === "sell" && styles.swapButtonSelected]}
          onPress={() => setSwapDirection("sell")}
        >
          <Text style={styles.swapButtonTitle}>{HYPE_SYMBOL} → USDC</Text>
          <Text style={styles.swapButtonSubtitle}>Sell {HYPE_SYMBOL} for USDC</Text>
        </TouchableOpacity>
      </View>

      <GradientButton
        title="Continue"
        onPress={() => {
          if (!swapDirection) {
            Alert.alert("Select a swap", "Please choose a direction to continue.");
            return;
          }
          setFlowStep("amount");
        }}
      />

      <CustomButton title="Back" onPress={() => setFlowStep("overview")} />
    </View>
  );

  const renderAmount = () => {
    const isBuy = swapDirection === "buy";
    const label = isBuy ? "Amount (USDC)" : `Amount (${HYPE_SYMBOL})`;
    const placeholder = isBuy ? "10.00" : "0.10";
    const availableBalance = isBuy
      ? `${hyperliquidUsdcAvailableBalance.toFixed(2)} USDC available on Hyperliquid`
      : `${hypeAvailableBalance.toFixed(4)} ${HYPE_SYMBOL} ready to sell`;

    const parsed = parseFloat(swapAmount);
    const isValid = !Number.isNaN(parsed) && parsed > 0;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Enter an amount</Text>
        <Text style={styles.sectionSubheading}>
          This is the notional you’ll swap. We’ll confirm everything on the next screen.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>{label}</Text>
          <TextInput
            style={styles.input}
            value={swapAmount}
            onChangeText={setSwapAmount}
            placeholder={placeholder}
            placeholderTextColor="#8B949E"
            keyboardType="numeric"
          />
          <Text style={styles.formHint}>{availableBalance}</Text>
        </View>

        <GradientButton
          title="Review swap"
          onPress={() => {
            if (!isValid) {
              Alert.alert("Invalid amount", "Enter a positive amount before continuing.");
              return;
            }
            setFlowStep("confirm");
          }}
          disabled={!isValid}
        />

        <CustomButton title="Back" onPress={() => setFlowStep("direction")} />
      </View>
    );
  };

  const renderConfirm = () => {
    const isBuy = swapDirection === "buy";
    const amountNumber = parseFloat(swapAmount) || 0;
    const estimatedOutput = (() => {
      if (!hypeUsdcPrice || amountNumber <= 0) return null;
      if (isBuy) {
        return (amountNumber / hypeUsdcPrice).toFixed(4);
      }
      return (amountNumber * hypeUsdcPrice).toFixed(2);
    })();

    const summaryLabel = isBuy
      ? `Spend ${swapAmount || "0"} USDC to receive ~${estimatedOutput ?? "—"} ${HYPE_SYMBOL}`
      : `Sell ${swapAmount || "0"} ${HYPE_SYMBOL} to receive ~${estimatedOutput ?? "—"} USDC`;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Confirm your swap</Text>
        <Text style={styles.sectionSubheading}>
          Double-check the details below. Price estimates use the latest Hyperliquid mid price.
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Swap summary</Text>
          <Text style={styles.summaryValue}>{summaryLabel}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Current price</Text>
            <Text style={styles.summaryValueSmall}>
              {hypeUsdcPrice ? `$${hypeUsdcPrice.toFixed(4)} / ${HYPE_SYMBOL}` : "—"}
            </Text>
          </View>
        </View>

        <GradientButton
          title={isProcessing ? "Swapping…" : "Swap now"}
          onPress={async () => {
            if (!activeWallet) {
              Alert.alert("No wallet", "Reconnect your Openfort wallet before swapping.");
              return;
            }
            if (!swapDirection) {
              Alert.alert("No direction", "Pick a swap direction before continuing.");
              return;
            }

            const amountToSwap = swapAmount;
            const expectedOutput = estimatedOutput;

            if (swapDirection === "buy") {
              const result = await transactionHandlers.handleBuy(
                activeWallet,
                openfortClient,
                amountToSwap,
                hypeBalances,
                setIsProcessing
              );
              if (result) {
                const computedPrice = (() => {
                  if (result.status === "filled") {
                    const avg = parseFloat(result.avgPrice ?? "");
                    if (!Number.isNaN(avg)) {
                      return avg;
                    }
                  }
                  const limitPx = parseFloat(result.requestedPrice ?? "");
                  if (!Number.isNaN(limitPx)) {
                    return limitPx;
                  }
                  return hypeUsdcPrice ?? null;
                })();

                await Promise.allSettled([
                  refetchWalletBalance(),
                  refetchHypeBalances(),
                  refetchOpenOrders(),
                ]);

                setSwapResult({
                  status: result.status,
                  direction: "buy",
                  inputAmount: amountToSwap,
                  outputAmount: expectedOutput ?? null,
                  priceAtExecution: computedPrice,
                  timestamp: result.timestamp,
                  orderId: result.orderId,
                  requestedPrice: result.requestedPrice,
                  requestedSize: result.requestedSize,
                  // avgPrice: result.avgPrice,
                  // totalSize: result.totalSize,
                });
                setSwapAmount("");
                setFlowStep("result");
                return;
              }
            } else {
              const result = await transactionHandlers.handleSell(
                activeWallet,
                openfortClient,
                amountToSwap,
                hypeBalances,
                setIsProcessing
              );
              if (result) {
                const computedPrice = (() => {
                  if (result.status === "filled") {
                    const avg = parseFloat(result.avgPrice ?? "");
                    if (!Number.isNaN(avg)) {
                      return avg;
                    }
                  }
                  const limitPx = parseFloat(result.requestedPrice ?? "");
                  if (!Number.isNaN(limitPx)) {
                    return limitPx;
                  }
                  return hypeUsdcPrice ?? null;
                })();

                await Promise.allSettled([
                  refetchWalletBalance(),
                  refetchHypeBalances(),
                  refetchOpenOrders(),
                ]);

                setSwapResult({
                  status: result.status,
                  direction: "sell",
                  inputAmount: amountToSwap,
                  outputAmount: expectedOutput ?? null,
                  priceAtExecution: computedPrice,
                  timestamp: result.timestamp,
                  orderId: result.orderId,
                  requestedPrice: result.requestedPrice,
                  requestedSize: result.requestedSize,
                  // avgPrice: result.avgPrice,
                  // totalSize: result.totalSize,
                });
                setSwapAmount("");
                setFlowStep("result");
                return;
              }
            }
          }}
          disabled={isProcessing}
          variant={swapDirection === "sell" ? "danger" : "primary"}
        />

        <CustomButton
          title="Back"
          onPress={() => {
            setIsProcessing(false);
            setFlowStep("amount");
          }}
          disabled={isProcessing}
        />
      </View>
    );
  };

  const renderResult = () => {
    if (!swapResult) {
      return null;
    }

    const isBuy = swapResult.direction === "buy";
    const isResting = swapResult.status === "resting";
    const headline = isResting
      ? "Waiting on trade"
      : isBuy
        ? "Swap complete"
        : "Sell order complete";
    const summaryText = isResting
      ? `Your ${isBuy ? "buy" : "sell"} order is resting on Hyperliquid as a GTC limit order. We'll keep it listed above until it fills.`
      : isBuy
        ? `Swapped ${swapResult.inputAmount} USDC for about ${swapResult.outputAmount ?? "—"} ${HYPE_SYMBOL}`
        : `Swapped ${swapResult.inputAmount} ${HYPE_SYMBOL} for about ${swapResult.outputAmount ?? "—"} USDC`;

    const priceLabel = isResting ? "Limit price" : "Avg price";
    const priceValue = isResting
      ? `${formatNumeric(swapResult.requestedPrice, 4)} USDC`
      : `${formatNumeric(swapResult.avgPrice ?? swapResult.priceAtExecution, 4)} USDC`;

    const sizeLabel = isResting ? "Order size" : "Filled size";
    const sizeValue = `${formatNumeric(
      swapResult.totalSize ?? swapResult.requestedSize ?? swapResult.outputAmount,
      4
    )} ${HYPE_SYMBOL}`;

    const timeLabel = isResting ? "Placed at" : "Filled at";
    const timestampValue = swapResult.timestamp
      ? new Date(swapResult.timestamp).toLocaleTimeString()
      : "—";

    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>{headline}</Text>
        <Text style={styles.sectionSubheading}>{summaryText}</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{isResting ? "Limit details" : "Fill details"}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>{priceLabel}</Text>
            <Text style={styles.summaryValueSmall}>{priceValue}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>{sizeLabel}</Text>
            <Text style={styles.summaryValueSmall}>{sizeValue}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Order ID</Text>
            <Text style={styles.summaryValueSmall}>{swapResult.orderId ?? "—"}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>{timeLabel}</Text>
            <Text style={styles.summaryValueSmall}>{timestampValue}</Text>
          </View>
        </View>

        <GradientButton
          title={isResting ? "Back to overview" : "Swap again"}
          onPress={() => {
            resetForNewSwap();
            setFlowStep("overview");
          }}
        />
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (flowStep) {
      case "overview":
        return renderOverview();
      case "direction":
        return renderDirection();
      case "amount":
        return renderAmount();
      case "confirm":
        return renderConfirm();
      case "result":
        return renderResult();
      default:
        return renderOverview();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0F1419", "#1A1F2E", "#0F1419"]}
        style={styles.backgroundGradient}
      />
      <View style={styles.wrapper}>
        <Text style={styles.heading}>HYPE/USDC Swap</Text>
        {renderCurrentStep()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1419",
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  wrapper: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
    gap: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  section: {
    backgroundColor: "rgba(26, 31, 46, 0.86)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 170, 0.15)",
    padding: 24,
    gap: 24,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sectionSubheading: {
    fontSize: 15,
    color: "#8B949E",
    lineHeight: 22,
  },
  balanceRow: {
    flexDirection: "row",
    gap: 16,
  },
  balanceCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(15, 20, 25, 0.8)",
    gap: 8,
  },
  balanceLabel: {
    color: "#8B949E",
    fontSize: 13,
  },
  balanceValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  chartCard: {
    backgroundColor: "rgba(15, 20, 25, 0.7)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 20,
    gap: 16,
  },
  chart: {
    borderRadius: 12,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#00D4AA",
    textAlign: "center",
  },
  priceLabel: {
    fontSize: 14,
    color: "#8B949E",
    textAlign: "center",
  },
  chartEmpty: {
    fontSize: 13,
    textAlign: "center",
    color: "#8B949E",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#8B949E",
    fontSize: 14,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
  },
  directionRow: {
    flexDirection: "column",
    gap: 16,
  },
  optionCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(15, 20, 25, 0.75)",
    gap: 8,
  },
  optionCardSelected: {
    borderColor: "rgba(0, 212, 170, 0.6)",
    backgroundColor: "rgba(0, 212, 170, 0.12)",
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  optionSubtitle: {
    fontSize: 14,
    color: "#8B949E",
    lineHeight: 20,
  },
  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(15, 20, 25, 0.7)",
    padding: 20,
    gap: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 16,
    backgroundColor: "rgba(15, 20, 25, 0.6)",
  },
  formHint: {
    fontSize: 13,
    color: "#8B949E",
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(15, 20, 25, 0.7)",
    padding: 20,
    gap: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#8B949E",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  summaryValue: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
    lineHeight: 22,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryKey: {
    fontSize: 14,
    color: "#8B949E",
  },
  summaryValueSmall: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  apiOnboardingNote: {
    fontSize: 13,
    color: "#EF4444",
    lineHeight: 18,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  priceSection: {
    backgroundColor: "rgba(26, 31, 46, 0.86)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 170, 0.15)",
    padding: 20,
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  pendingBanner: {
    backgroundColor: "rgba(15, 20, 25, 0.8)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 170, 0.25)",
    padding: 16,
    gap: 10,
    marginBottom: 16,
  },
  pendingBannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  pendingBannerText: {
    fontSize: 14,
    color: "#8B949E",
  },
  pendingBannerError: {
    borderColor: "rgba(239, 68, 68, 0.4)",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  pendingOrderErrorText: {
    fontSize: 14,
    color: "#F87171",
    textAlign: "center",
  },
  pendingOrderRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "rgba(15, 20, 25, 0.6)",
    padding: 12,
    gap: 4,
  },
  pendingOrderText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  pendingOrderSubtext: {
    color: "#8B949E",
    fontSize: 12,
  },
  pendingOrderFootnote: {
    fontSize: 12,
    color: "#8B949E",
  },
  orderBookSection: {
    backgroundColor: "rgba(26, 31, 46, 0.86)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 170, 0.15)",
    padding: 20,
    gap: 16,
    marginBottom: 16,
    maxHeight: 300,
  },
  orderBookHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderBookTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  orderBookColumns: {
    flexDirection: "row",
    gap: 16,
  },
  orderBookColumn: {
    flex: 1,
    gap: 8,
  },
  orderBookColumnTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8B949E",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  orderBookRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(15, 20, 25, 0.7)",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  orderBookPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  orderBookBid: {
    color: "#22C55E",
  },
  orderBookAsk: {
    color: "#F87171",
  },
  orderBookSize: {
    fontSize: 13,
    color: "#FFFFFF",
  },
  orderBookEmpty: {
    fontSize: 13,
    color: "#8B949E",
  },
  orderBookErrorText: {
    fontSize: 13,
    color: "#F87171",
  },
  swapOptionsSection: {
    backgroundColor: "rgba(26, 31, 46, 0.86)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 170, 0.15)",
    padding: 20,
    gap: 16,
  },
  swapHeading: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  swapButtons: {
    gap: 12,
  },
  swapButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(15, 20, 25, 0.75)",
  },
  swapButtonSelected: {
    borderColor: "rgba(0, 212, 170, 0.6)",
    backgroundColor: "rgba(0, 212, 170, 0.12)",
  },
  swapButtonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  swapButtonSubtitle: {
    fontSize: 13,
    color: "#8B949E",
  },
});
