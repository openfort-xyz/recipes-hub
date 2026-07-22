import React, { useCallback, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useFunding, useFundingChains } from "@openfort/react-native";
import type { FundingChain, FundingCurrency } from "@openfort/react-native";
import { parseUnits } from "viem";

import { BackChevron, Card, Keypad, PillButton, SuccessCheck, colors, spacing } from "../ui";
import { CAIP2_CHAINS } from "../../constants/network";
import { HYPERLIQUID_USDC_TOKEN_ADDRESS } from "../../constants/hyperliquid";

type FundStep = "overview" | "source" | "source-amount" | "source-result" | "move-amount" | "move-confirm" | "move-result";

interface FundHyperliquidScreenProps {
  walletAddress?: string;
  hyperliquidAddress?: string;
  walletBalance?: number | null;
  hyperliquidBalance?: number | null;
  isLoading: boolean;
  onContinue: () => void;
  onTransfer: (amount: string) => Promise<boolean>;
  isTransferring: boolean;
  step: number;
  totalSteps: number;
}

export const FundHyperliquidScreen: React.FC<FundHyperliquidScreenProps> = ({
  walletAddress,
  hyperliquidAddress,
  hyperliquidBalance,
  walletBalance,
  isLoading,
  onContinue,
  onTransfer,
  isTransferring,
  step,
  totalSteps,
}) => {
  const [flow, setFlow] = useState<FundStep>("overview");
  const [selectedChain, setSelectedChain] = useState<FundingChain | null>(null);
  const [sourceAmount, setSourceAmount] = useState("");
  const [moveAmount, setMoveAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const funding = useFunding();
  const fundingChains = useFundingChains();

  const hasExchangeBalance = (hyperliquidBalance ?? 0) > 0;

  const copyAddress = useCallback(async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
  }, [walletAddress]);

  const usdcCurrency = useCallback(
    (chain: FundingChain): FundingCurrency | undefined =>
      chain.currencies.find((currency) => currency.symbol === "USDC") ?? chain.currencies[0],
    []
  );

  const startFunding = useCallback(async () => {
    if (!walletAddress || !selectedChain) return;
    const currency = usdcCurrency(selectedChain);
    if (!currency) return;

    setFlow("source-result");
    try {
      await funding.fund(
        { chain: CAIP2_CHAINS.ARBITRUM_SEPOLIA, currency: HYPERLIQUID_USDC_TOKEN_ADDRESS, address: walletAddress },
        {
          type: "evm",
          source: {
            chain: selectedChain.id,
            currency: currency.address,
            amount: parseUnits(sourceAmount || "0", currency.decimals).toString(),
          },
        }
      );
    } catch {
      // funding.error already carries the failure; the result screen reads it.
    }
  }, [walletAddress, selectedChain, sourceAmount, usdcCurrency, funding]);

  if (flow === "source") {
    return (
      <SourceChainStep
        step={step}
        totalSteps={totalSteps}
        chains={fundingChains.chains}
        loading={fundingChains.loading}
        isAvailable={fundingChains.isAvailable}
        onBack={() => setFlow("overview")}
        onSelect={(chain) => {
          setSelectedChain(chain);
          setFlow("source-amount");
        }}
      />
    );
  }

  if (flow === "source-amount" && selectedChain) {
    const currency = usdcCurrency(selectedChain);
    return (
      <AmountStep
        title={`Deposit from ${selectedChain.name}`}
        subtitle={`Enter how much ${currency?.symbol ?? "USDC"} to send from ${selectedChain.name}.`}
        amount={sourceAmount}
        onChangeAmount={setSourceAmount}
        onBack={() => setFlow("source")}
        onContinue={startFunding}
        continueLabel="Get deposit address"
      />
    );
  }

  if (flow === "source-result") {
    return (
      <SourceResultStep
        session={funding.session}
        status={funding.status}
        loading={funding.loading}
        error={funding.error}
        onDone={() => {
          funding.reset();
          setSourceAmount("");
          setSelectedChain(null);
          setFlow("overview");
        }}
      />
    );
  }

  if (flow === "move-amount") {
    return (
      <AmountStep
        title="Move to Hyperliquid"
        subtitle="USDC sent here is credited to your Hyperliquid account in under a minute. Minimum 5 USDC."
        amount={moveAmount}
        onChangeAmount={setMoveAmount}
        onBack={() => setFlow("overview")}
        onContinue={() => setFlow("move-confirm")}
        continueLabel="Review"
      />
    );
  }

  if (flow === "move-confirm") {
    return (
      <MoveConfirmStep
        amount={moveAmount}
        isTransferring={isTransferring}
        onBack={() => setFlow("move-amount")}
        onConfirm={async () => {
          const success = await onTransfer(moveAmount);
          if (success) {
            setFlow("move-result");
          }
        }}
      />
    );
  }

  if (flow === "move-result") {
    return (
      <MoveResultStep
        amount={moveAmount}
        onDone={() => {
          setMoveAmount("");
          setFlow("overview");
        }}
      />
    );
  }

  return (
    <OverviewStep
      step={step}
      totalSteps={totalSteps}
      walletAddress={walletAddress}
      hyperliquidAddress={hyperliquidAddress}
      walletBalance={walletBalance}
      hyperliquidBalance={hyperliquidBalance}
      hasExchangeBalance={hasExchangeBalance}
      isLoading={isLoading}
      copied={copied}
      onCopyAddress={copyAddress}
      onAddMoney={() => setFlow("source")}
      onMoveToHyperliquid={() => setFlow("move-amount")}
      onContinue={onContinue}
    />
  );
};

// --- Step components -------------------------------------------------------

interface OverviewStepProps {
  step: number;
  totalSteps: number;
  walletAddress?: string;
  hyperliquidAddress?: string;
  walletBalance?: number | null;
  hyperliquidBalance?: number | null;
  hasExchangeBalance: boolean;
  isLoading: boolean;
  copied: boolean;
  onCopyAddress: () => void;
  onAddMoney: () => void;
  onMoveToHyperliquid: () => void;
  onContinue: () => void;
}

const OverviewStep: React.FC<OverviewStepProps> = ({
  step,
  totalSteps,
  walletAddress,
  hyperliquidAddress,
  walletBalance,
  hyperliquidBalance,
  hasExchangeBalance,
  isLoading,
  copied,
  onCopyAddress,
  onAddMoney,
  onMoveToHyperliquid,
  onContinue,
}) => {
  const truncatedAddress = walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "—";
  const tradesOnDifferentAccount =
    !!hyperliquidAddress && !!walletAddress && hyperliquidAddress.toLowerCase() !== walletAddress.toLowerCase();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>Step {step} of {totalSteps}</Text>
        </View>

        <Text style={styles.title}>Add balance</Text>
        <Text style={styles.subtitle}>Fund your wallet, then move USDC into Hyperliquid to start trading.</Text>

        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Wallet (Arbitrum Sepolia)</Text>
          <Text style={styles.balanceValue}>{isLoading ? "…" : `${(walletBalance ?? 0).toFixed(2)} USDC`}</Text>
        </Card>

        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Hyperliquid</Text>
          <View style={styles.balanceValueRow}>
            <Text style={styles.balanceValue}>{isLoading ? "…" : `${(hyperliquidBalance ?? 0).toFixed(2)} USDC`}</Text>
            <Text style={[styles.badge, hasExchangeBalance ? styles.badgeReady : styles.badgePending]}>
              {hasExchangeBalance ? "Ready" : "No funds"}
            </Text>
          </View>
        </Card>

        {tradesOnDifferentAccount && (
          <Card style={styles.addressCard}>
            <Text style={styles.hint}>
              Trading is configured to use a different Hyperliquid account ({hyperliquidAddress?.slice(0, 6)}…
              {hyperliquidAddress?.slice(-4)}). The &quot;Move to Hyperliquid&quot; deposit below always credits{" "}
              <Text style={styles.hintLink}>this wallet&apos;s</Text> own address, not that account.
            </Text>
          </Card>
        )}

        <PillButton title="Add money" onPress={onAddMoney} />
        <PillButton title="Move to Hyperliquid" onPress={onMoveToHyperliquid} variant="secondary" />

        <Card style={styles.addressCard}>
          <Text style={styles.balanceLabel}>Wallet address</Text>
          <View style={styles.addressRow}>
            <Text style={styles.addressValue}>{truncatedAddress}</Text>
            <TouchableOpacity onPress={onCopyAddress}>
              <Text style={styles.copyLink}>{copied ? "Copied" : "Copy"}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            On testnet, real bridges rarely route to Arbitrum Sepolia — the fastest way to fund this address is the{" "}
            <Text style={styles.hintLink} onPress={() => Linking.openURL("https://app.hyperliquid-testnet.xyz/drip")}>
              Hyperliquid testnet faucet
            </Text>
            .
          </Text>
        </Card>

        <PillButton title={hasExchangeBalance ? "Continue to trading" : "I'll fund later"} onPress={onContinue} variant="secondary" />
      </ScrollView>
    </View>
  );
};

interface SourceChainStepProps {
  step: number;
  totalSteps: number;
  chains: FundingChain[];
  loading: boolean;
  isAvailable: boolean;
  onBack: () => void;
  onSelect: (chain: FundingChain) => void;
}

const SourceChainStep: React.FC<SourceChainStepProps> = ({ chains, loading, isAvailable, onBack, onSelect }) => (
  <View style={styles.container}>
    <View style={styles.header}>
      <BackChevron onPress={onBack} />
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Deposit from</Text>
      <Text style={styles.subtitle}>Pick the chain you&apos;re sending USDC from.</Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : !isAvailable || chains.length === 0 ? (
        <Card>
          <Text style={styles.hint}>
            Funding isn&apos;t available for this project yet, or no route exists to Arbitrum Sepolia testnet. Use the wallet
            address on the previous screen with the Hyperliquid faucet instead.
          </Text>
        </Card>
      ) : (
        chains.map((chain) => (
          <TouchableOpacity key={chain.id} style={styles.chainRow} onPress={() => onSelect(chain)} activeOpacity={0.7}>
            <Text style={styles.chainName}>{chain.name}</Text>
            <Text style={styles.chainCurrencies}>{chain.currencies.map((c) => c.symbol).join(", ")}</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  </View>
);

interface AmountStepProps {
  title: string;
  subtitle: string;
  amount: string;
  onChangeAmount: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
  continueLabel: string;
}

const AmountStep: React.FC<AmountStepProps> = ({ title, subtitle, amount, onChangeAmount, onBack, onContinue, continueLabel }) => {
  const parsed = parseFloat(amount);
  const isValid = !Number.isNaN(parsed) && parsed > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackChevron onPress={onBack} />
      </View>
      <View style={styles.amountContent}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.amountDisplay}>${amount || "0"}</Text>
        <View style={styles.keypadWrapper}>
          <Keypad value={amount} onChange={onChangeAmount} />
        </View>
        <PillButton title={continueLabel} onPress={onContinue} disabled={!isValid} />
      </View>
    </View>
  );
};

interface SourceResultStepProps {
  session: ReturnType<typeof useFunding>["session"];
  status: ReturnType<typeof useFunding>["status"];
  loading: boolean;
  error: Error | null;
  onDone: () => void;
}

const SourceResultStep: React.FC<SourceResultStepProps> = ({ session, status, loading, error, onDone }) => {
  const paymentMethod = session?.paymentMethod;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Deposit address</Text>
        {loading && !paymentMethod ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.hint}>Preparing your deposit address…</Text>
          </View>
        ) : error ? (
          <Card>
            <Text style={styles.hint}>{error.message}</Text>
          </Card>
        ) : paymentMethod ? (
          <>
            <Card style={styles.addressCard}>
              <Text style={styles.balanceLabel}>Send to</Text>
              <Text style={styles.addressValue}>{paymentMethod.receiverAddress}</Text>
              <Text style={styles.hint}>Status: {status}</Text>
            </Card>
            {paymentMethod.deeplinks.map((deeplink) => (
              <PillButton
                key={deeplink.app}
                title={deeplink.label}
                variant="secondary"
                onPress={() => Linking.openURL(deeplink.url)}
              />
            ))}
          </>
        ) : null}
        <PillButton title="Done" onPress={onDone} />
      </ScrollView>
    </View>
  );
};

interface MoveConfirmStepProps {
  amount: string;
  isTransferring: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

const MoveConfirmStep: React.FC<MoveConfirmStepProps> = ({ amount, isTransferring, onBack, onConfirm }) => (
  <View style={styles.container}>
    <View style={styles.header}>
      <BackChevron onPress={onBack} />
    </View>
    <View style={styles.amountContent}>
      <Text style={styles.title}>Confirm</Text>
      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Sending to Hyperliquid</Text>
        <Text style={styles.balanceValue}>{amount} USDC</Text>
      </Card>
      <PillButton title="Confirm transfer" onPress={onConfirm} loading={isTransferring} />
    </View>
  </View>
);

interface MoveResultStepProps {
  amount: string;
  onDone: () => void;
}

const MoveResultStep: React.FC<MoveResultStepProps> = ({ amount, onDone }) => (
  <View style={styles.container}>
    <View style={styles.resultContent}>
      <SuccessCheck />
      <Text style={styles.title}>Sent</Text>
      <Text style={styles.subtitle}>{amount} USDC is on its way to your Hyperliquid account.</Text>
      <PillButton title="Done" onPress={onDone} />
    </View>
  </View>
);

// --- Styles ------------------------------------------------------------

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
    paddingTop: 56,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  amountContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  resultContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    gap: spacing.md,
  },
  stepBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accentMuted,
  },
  stepText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 21,
    textAlign: "center",
  },
  balanceCard: {
    gap: spacing.xs,
  },
  balanceLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  balanceValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
  badgeReady: {
    backgroundColor: colors.accentMuted,
    color: colors.accent,
  },
  badgePending: {
    backgroundColor: colors.disabled,
    color: colors.textSecondary,
  },
  addressCard: {
    gap: spacing.sm,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addressValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "monospace",
    flex: 1,
  },
  copyLink: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 14,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  hintLink: {
    color: colors.accent,
  },
  chainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chainName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  chainCurrencies: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  amountDisplay: {
    fontSize: 56,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  keypadWrapper: {
    marginTop: spacing.md,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
});
