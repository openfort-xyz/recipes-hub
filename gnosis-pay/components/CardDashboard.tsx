import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import { CARD_TOKEN, GNOSIS_CHAIN } from "@/lib/constants";
import { createCardAccount, fundCard, setupCardAccount, spendFromCard, stageLabel } from "@/lib/gnosisPay";
import { waitForTx } from "@/lib/erc20";
import { formatAmount, parseAmount, shortAddress } from "@/lib/format";
import { useCardAccount } from "@/hooks/useCardAccount";
import {
  Button,
  Card,
  CardVisual,
  IconButton,
  ListRow,
  ProgressBar,
  Screen,
  SectionLabel,
  Tile,
  colors,
  styles,
} from "@/components/ui";
import type { Eip1193Provider } from "@/lib/eip1193";

type Props = { owner: string; provider: Eip1193Provider; onLogout: () => void };

const eur = (raw: bigint) => `€${formatAmount(raw, CARD_TOKEN.decimals)}`;

function formatPeriod(seconds: bigint): string {
  const n = Number(seconds);
  if (n > 0 && n % 86400 === 0) return `${n / 86400}d`;
  if (n > 0 && n % 3600 === 0) return `${n / 3600}h`;
  return `${n}s`;
}

function formatDate(seconds: bigint | null): string {
  if (!seconds) return "—";
  return new Date(Number(seconds) * 1000).toLocaleDateString();
}

function StepCard(props: { tag: string; title: string; body: string; cta: string; onPress: () => void; loading: boolean }) {
  return (
    <Card style={{ gap: 12 }}>
      <Text style={local.stepTag}>{props.tag}</Text>
      <Text style={local.stepTitle}>{props.title}</Text>
      <Text style={styles.subtitle}>{props.body}</Text>
      <Button title={props.cta} onPress={props.onPress} loading={props.loading} icon="arrow-right" />
    </Card>
  );
}

export function CardDashboard({ owner, provider, onLogout }: Props) {
  const { account, relayer, sponsored, stage, allowance, balances, loading, error, reload } = useCardAccount(
    provider,
    owner
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [amount, setAmount] = useState("1");

  const fundAddress = relayer ?? owner;

  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    Alert.alert("Copied", value);
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
      await reload();
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      let friendly = msg || "Something went wrong.";
      if (/insufficient funds/i.test(msg)) {
        friendly = sponsored
          ? "The sponsored transaction failed. Check your Pimlico paymaster policy covers Gnosis Chain, then retry."
          : "Your wallet has no xDAI for gas. Copy the fund address below, send a little xDAI on Gnosis Chain, then tap Refresh.";
      }
      Alert.alert("Action failed", friendly);
    } finally {
      setBusy(null);
    }
  };

  const onCreate = () => run("create", async () => void (await waitForTx(await createCardAccount(provider, owner))));
  const onSetup = () => run("setup", async () => void (await waitForTx(await setupCardAccount(provider, owner, account))));
  const onFund = () =>
    run("fund", async () => {
      const value = parseAmount(amount, CARD_TOKEN.decimals);
      if (!balances || balances.relayerToken < value) {
        const held = balances ? eur(balances.relayerToken) : "—";
        throw new Error(
          `Not enough ${CARD_TOKEN.symbol} to fund — your fund address holds ${held}. Copy it from Manage, send ${CARD_TOKEN.symbol} on Gnosis Chain, then Refresh.`
        );
      }
      await waitForTx(await fundCard(provider, owner, account, value));
    });
  const onSpend = () =>
    run("spend", async () => {
      const value = parseAmount(amount, CARD_TOKEN.decimals);
      if (cardBal < value) throw new Error(`Card balance is ${eur(cardBal)}. Fund the card first, then spend.`);
      const ok = await waitForTx(await spendFromCard(provider, owner, account, value));
      if (!ok) throw new Error("Spend reverted — over the remaining allowance or card balance.");
    });

  // Auto-create the card account once (it's gasless), so the user lands on setup directly.
  const autoCreated = useRef(false);
  useEffect(() => {
    if (stage === "not-created" && !busy && !autoCreated.current) {
      autoCreated.current = true;
      onCreate();
    }
  }, [stage, busy]);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator color={colors.green} size="large" />
          <Text style={styles.subtitle}>Loading your account…</Text>
        </View>
      </Screen>
    );
  }

  const active = stage === "active";
  const cardBal = balances?.cardToken ?? 0n;
  const limit = allowance?.refill ?? 0n;
  const avail = allowance?.balance ?? 0n;
  const ratio = limit > 0n ? Number(avail) / Number(limit) : 0;
  const needsGas = !sponsored && !!balances && balances.relayerXdai === 0n;

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={local.brand}>Gnosis Pay</Text>
            <IconButton name="log-out" onPress={onLogout} />
          </View>

          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

          <CardVisual
            balance={eur(cardBal)}
            last4={account.slice(-4)}
            status={stage ? stageLabel(stage) : "—"}
            active={active}
          />

          {needsGas ? (
            <Card style={local.banner}>
              <Text style={styles.sectionLabel}>Fund your wallet for gas</Text>
              <Text style={styles.subtitle}>
                On-chain actions need a little xDAI on Gnosis Chain. Send some to the fund address, then tap Refresh.
                {"\n"}Tip: set PIMLICO_API_KEY to make gas sponsored and skip this.
              </Text>
              <Button title="Copy fund address" tone="green" icon="copy" onPress={() => copy(fundAddress)} />
            </Card>
          ) : null}

          {active ? (
            <Card>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder={`Amount in ${CARD_TOKEN.symbol}`}
                placeholderTextColor={colors.muted}
              />
              <View style={local.actions}>
                <View style={{ flex: 1 }}>
                  <Button title="Fund" tone="light" icon="plus" onPress={onFund} loading={busy === "fund"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Spend" tone="dark" icon="arrow-up-right" onPress={onSpend} loading={busy === "spend"} />
                </View>
              </View>
            </Card>
          ) : null}

          {active && allowance ? (
            <>
              <SectionLabel>Spending allowance</SectionLabel>
              <Card>
                <View style={local.tiles}>
                  <Tile label="Limit" value={`${eur(limit)}/${formatPeriod(allowance.period)}`} />
                  <Tile label="Available" value={eur(avail)}>
                    <ProgressBar ratio={ratio} />
                  </Tile>
                </View>
                <Text style={local.note}>Refills to the limit · next {formatDate(allowance.nextRefill)}</Text>
              </Card>
            </>
          ) : null}

          {stage === "not-created" ? (
            <StepCard
              tag="STEP 1 · CREATE"
              title="Create your card account"
              body="Deploy the 1/1 Safe that becomes your Gnosis Pay account. Your wallet is its sole owner."
              cta="Create account"
              onPress={onCreate}
              loading={busy === "create"}
            />
          ) : null}

          {stage === "needs-setup" ? (
            <StepCard
              tag="STEP 2 · SET UP"
              title="Set up your debit card"
              body="Attach the Roles + Delay modules and a spending allowance — the machinery a real card account uses."
              cta="Set up account"
              onPress={onSetup}
              loading={busy === "setup"}
            />
          ) : null}

          <SectionLabel>Manage</SectionLabel>
          <Card style={{ paddingVertical: 4, gap: 0 }}>
            <ListRow
              icon="credit-card"
              title="Card account"
              subtitle={shortAddress(account)}
              onPress={() => copy(account)}
              accessory={<Feather name="copy" size={18} color={colors.muted} />}
            />
            <View style={local.divider} />
            <ListRow
              icon={sponsored ? "zap" : "key"}
              title={sponsored ? "Fund address (smart account)" : "Fund address (your wallet)"}
              subtitle={shortAddress(fundAddress)}
              onPress={() => copy(fundAddress)}
              accessory={<Feather name="copy" size={18} color={colors.muted} />}
            />
            <View style={local.divider} />
            <ListRow
              icon="dollar-sign"
              title={`${CARD_TOKEN.symbol} to fund`}
              accessory={<Text style={local.value}>{balances ? eur(balances.relayerToken) : "—"}</Text>}
            />
            {sponsored ? null : (
              <>
                <View style={local.divider} />
                <ListRow
                  icon="zap"
                  title="xDAI for gas"
                  accessory={
                    <Text style={local.value}>
                      {balances ? formatAmount(balances.relayerXdai, GNOSIS_CHAIN.nativeCurrency.decimals) : "—"}
                    </Text>
                  }
                />
              </>
            )}
          </Card>

          <Button title="Refresh" tone="light" icon="refresh-cw" onPress={() => run("refresh", reload)} loading={busy === "refresh"} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const local = StyleSheet.create({
  brand: { fontSize: 17, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  actions: { flexDirection: "row", gap: 12 },
  tiles: { flexDirection: "row", gap: 12 },
  note: { fontSize: 13, color: colors.muted },
  value: { fontSize: 15, fontWeight: "700", color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 54 },
  stepTag: { fontSize: 12, fontWeight: "800", color: colors.greenInk, letterSpacing: 0.5 },
  stepTitle: { fontSize: 20, fontWeight: "800", color: colors.text, letterSpacing: -0.4 },
  banner: { backgroundColor: colors.greenWash, borderWidth: 1, borderColor: colors.green },
});
