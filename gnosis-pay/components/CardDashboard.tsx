import { useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import { GNOSIS_CHAIN } from "@/lib/constants";
import { getSiweParams } from "@/lib/config";
import { fundSafe, gnosisPay, session, tokenFor } from "@/lib/gnosisPay";
import { personalSign, type Eip1193Provider } from "@/lib/eip1193";
import { waitForTx } from "@/lib/erc20";
import { formatAmount, parseAmount, shortAddress } from "@/lib/format";
import { useGnosisPay } from "@/hooks/useGnosisPay";
import { Button, Card, CardVisual, IconButton, ListRow, Screen, SectionLabel, colors, styles } from "@/components/ui";

type Props = { owner: string; provider: Eip1193Provider; onLogout: () => void };

function StepCard(props: { tag: string; title: string; body: string; children?: React.ReactNode }) {
  return (
    <Card style={{ gap: 12 }}>
      <Text style={local.stepTag}>{props.tag}</Text>
      <Text style={local.stepTitle}>{props.title}</Text>
      <Text style={styles.subtitle}>{props.body}</Text>
      {props.children}
    </Card>
  );
}

function Input(props: { value: string; onChangeText: (v: string) => void; placeholder: string; keyboardType?: "email-address" | "number-pad" | "phone-pad" | "decimal-pad" }) {
  return (
    <TextInput
      style={styles.input}
      autoCapitalize="none"
      placeholderTextColor={colors.muted}
      {...props}
    />
  );
}

const WAITING: Record<string, string> = {
  waiting_kyc_setup: "Gnosis Pay is preparing your identity check. Refresh in a moment.",
  kyc_manual_review: "Your identity check is in manual review at Gnosis Pay. There is nothing to do until they finish.",
  waiting_account_setup: "Gnosis Pay is deploying your Safe and provisioning the account. Refresh in a moment.",
  rejected: "Gnosis Pay rejected this onboarding. Contact Gnosis Pay support.",
};

export function CardDashboard({ owner, provider, onLogout }: Props) {
  const { phase, account, balance, cards, wallet, error, reload } = useGnosisPay(owner);
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("1");
  const [sof, setSof] = useState<Record<string, string>>({});

  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    Alert.alert("Copied", value);
  };

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
      await reload();
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      Alert.alert(
        "Action failed",
        /insufficient funds/i.test(msg)
          ? "Your wallet has no xDAI for gas. Send a little xDAI on Gnosis Chain to your wallet, then Refresh."
          : msg || "Something went wrong."
      );
    } finally {
      setBusy(null);
    }
  };

  const signOut = async () => {
    await session.signOut();
    onLogout();
  };

  if (!phase) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator color={colors.green} size="large" />
          <Text style={styles.subtitle}>Loading your account…</Text>
        </View>
      </Screen>
    );
  }

  const token = account ? tokenFor(account) : null;
  const money = (raw: bigint) => (token ? `${formatAmount(raw, token.decimals)} ${token.symbol}` : "—");
  const card = cards.find((c) => c.status !== "canceled");
  const done = phase.status === "completed" || phase.status === "action_verify_phone";

  let step: React.ReactNode = null;
  switch (phase.status) {
    case "signed-out":
      step = (
        <StepCard tag="STEP 1 · SIGN IN" title="Sign in to Gnosis Pay" body="Your wallet signs a Sign-In with Ethereum message. It becomes the only owner of your Gnosis Pay Safe, and cannot be changed later.">
          <Button
            title="Sign in with wallet"
            icon="arrow-right"
            loading={busy === "siwe"}
            onPress={() => run("siwe", () => session.signIn(owner, getSiweParams(), (m) => personalSign(provider, owner, m)))}
          />
        </StepCard>
      );
      break;
    case "register":
      step = (
        <StepCard tag="STEP 2 · REGISTER" title="Verify your email" body="Gnosis Pay sends a 6-digit code to create your profile.">
          <Input value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
          {otpSent ? <Input value={otp} onChangeText={setOtp} placeholder="6-digit code" keyboardType="number-pad" /> : null}
          <Button
            title={otpSent ? "Register" : "Send code"}
            icon="arrow-right"
            loading={busy === "register"}
            onPress={() =>
              run("register", async () => {
                if (otpSent) return gnosisPay.register(email.trim(), otp.trim());
                await gnosisPay.requestEmailOtp(email.trim());
                setOtpSent(true);
              })
            }
          />
        </StepCard>
      );
      break;
    case "action_accept_tos": {
      const pending = phase.terms.filter((t) => !t.accepted);
      step = (
        <StepCard tag="STEP 3 · TERMS" title="Accept the terms" body={pending.map((t) => t.name).join(", ")}>
          {pending.map((t) =>
            t.url ? <Button key={t.type} title={`Read ${t.name}`} tone="light" icon="external-link" onPress={() => Linking.openURL(t.url!)} /> : null
          )}
          <Button title="I agree" icon="check" loading={busy === "tos"} onPress={() => run("tos", () => gnosisPay.acceptTerms(pending))} />
        </StepCard>
      );
      break;
    }
    case "action_complete_kyc":
    case "action_kyc_resubmission_requested":
      step = (
        <StepCard tag="STEP 4 · KYC" title="Verify your identity" body="Complete the Sumsub check Gnosis Pay opened for you, then come back and refresh. In sandbox, Sumsub test documents work.">
          <Button title="Open identity check" icon="external-link" onPress={() => WebBrowser.openBrowserAsync(phase.webSdkUrl)} />
        </StepCard>
      );
      break;
    case "action_complete_sof":
      step = (
        <StepCard tag="STEP 5 · SOURCE OF FUNDS" title="A few questions" body="Gnosis Pay asks where your funds come from.">
          {phase.questions.map((q) => (
            <View key={q.id} style={{ gap: 8 }}>
              <Text style={local.question}>{q.question}</Text>
              {q.answers.map((a) => (
                <Button key={a} title={a} tone={sof[q.question] === a ? "green" : "light"} onPress={() => setSof({ ...sof, [q.question]: a })} />
              ))}
            </View>
          ))}
          <Button
            title="Submit"
            icon="arrow-right"
            disabled={phase.questions.some((q) => !sof[q.question])}
            loading={busy === "sof"}
            onPress={() => run("sof", () => gnosisPay.submitSof(Object.entries(sof).map(([question, answer]) => ({ question, answer }))))}
          />
        </StepCard>
      );
      break;
    case "action_create_account":
      step = (
        <StepCard tag="STEP 6 · ACCOUNT" title="Create your card account" body="Gnosis Pay deploys a Safe on Gnosis Chain owned by your wallet, with its Roles and Delay modules already configured.">
          <Button title="Create account" icon="arrow-right" loading={busy === "account"} onPress={() => run("account", gnosisPay.createAccount)} />
        </StepCard>
      );
      break;
    case "completed":
    case "action_verify_phone":
      break;
    default:
      step = (
        <StepCard tag="WAITING" title="Hang tight" body={WAITING[phase.status] ?? phase.status} />
      );
  }

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={local.brand}>Gnosis Pay</Text>
            <IconButton name="log-out" onPress={signOut} />
          </View>

          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

          <CardVisual
            balance={balance ? money(BigInt(balance.spendable)) : "—"}
            last4={card?.last4Digits ?? "····"}
            status={card ? card.status : done ? "No card yet" : "Onboarding"}
            active={card?.status === "active"}
          />

          {step}

          {done && !card ? (
            <StepCard tag="STEP 7 · CARD" title="Issue a virtual card" body="The first card also creates your cardholder, so Gnosis Pay needs a phone number.">
              <Input value={phone} onChangeText={setPhone} placeholder="+34600000000" keyboardType="phone-pad" />
              <Button
                title="Create virtual card"
                icon="credit-card"
                loading={busy === "card"}
                onPress={() => run("card", () => gnosisPay.createVirtualCard("Openfort card", phone.trim() || undefined))}
              />
            </StepCard>
          ) : null}

          {done && account && token ? (
            <>
              <Card>
                <Input value={amount} onChangeText={setAmount} placeholder={`Amount in ${token.symbol}`} keyboardType="decimal-pad" />
                <Button
                  title={`Fund card with ${token.symbol}`}
                  icon="plus"
                  loading={busy === "fund"}
                  onPress={() =>
                    run("fund", async () => {
                      const value = parseAmount(amount, token.decimals);
                      if (!wallet || wallet.token < value) {
                        throw new Error(`Your wallet holds ${money(wallet?.token ?? 0n)}. Send ${token.symbol} on Gnosis Chain to it first.`);
                      }
                      if (!(await waitForTx(await fundSafe(provider, owner, account, value)))) throw new Error("Funding transaction reverted.");
                    })
                  }
                />
                {balance && BigInt(balance.processingDeposits) > 0n ? (
                  <Text style={local.note}>{money(BigInt(balance.processingDeposits))} in AML screening, spendable once cleared.</Text>
                ) : null}
              </Card>

              <SectionLabel>Manage</SectionLabel>
              <Card style={{ paddingVertical: 4, gap: 0 }}>
                <ListRow
                  icon="credit-card"
                  title="Card Safe"
                  subtitle={shortAddress(account.safeAddress)}
                  onPress={() => account.safeAddress && copy(account.safeAddress)}
                  accessory={<Feather name="copy" size={18} color={colors.muted} />}
                />
                <View style={local.divider} />
                <ListRow
                  icon="key"
                  title="Your wallet (Safe owner)"
                  subtitle={shortAddress(owner)}
                  onPress={() => copy(owner)}
                  accessory={<Feather name="copy" size={18} color={colors.muted} />}
                />
                <View style={local.divider} />
                <ListRow icon="dollar-sign" title={`${token.symbol} in wallet`} accessory={<Text style={local.value}>{money(wallet?.token ?? 0n)}</Text>} />
                <View style={local.divider} />
                <ListRow
                  icon="zap"
                  title="xDAI for gas"
                  accessory={<Text style={local.value}>{wallet ? formatAmount(wallet.xdai, GNOSIS_CHAIN.nativeCurrency.decimals) : "—"}</Text>}
                />
              </Card>
            </>
          ) : null}

          <Button title="Refresh" tone="light" icon="refresh-cw" onPress={() => run("refresh", reload)} loading={busy === "refresh"} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const local = StyleSheet.create({
  brand: { fontSize: 17, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  question: { fontSize: 15, fontWeight: "700", color: colors.text },
  note: { fontSize: 13, color: colors.muted },
  value: { fontSize: 15, fontWeight: "700", color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 54 },
  stepTag: { fontSize: 12, fontWeight: "800", color: colors.greenInk, letterSpacing: 0.5 },
  stepTitle: { fontSize: 20, fontWeight: "800", color: colors.text, letterSpacing: -0.4 },
});
