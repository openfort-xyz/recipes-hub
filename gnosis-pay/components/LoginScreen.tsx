import { useState } from "react";
import type { ComponentProps } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGuestAuth } from "@openfort/react-native";
import { Button, Card, Screen, colors, styles } from "@/components/ui";

type FeatherName = ComponentProps<typeof Feather>["name"];

const STEPS: { icon: FeatherName; title: string; body: string }[] = [
  { icon: "shield", title: "Create a self-custodial wallet", body: "One tap — your keys, secured by Openfort. No seed phrase, no backend." },
  { icon: "user-check", title: "Onboard to Gnosis Pay", body: "Sign in with your wallet, verify your email, accept the terms and pass KYC." },
  { icon: "credit-card", title: "Get a Safe and a virtual card", body: "Gnosis Pay deploys a Safe your wallet owns on Gnosis Chain and issues a Visa card." },
  { icon: "zap", title: "Fund it and spend", body: "Top the Safe up with EURe from your wallet; the card spends from it." },
];

export function LoginScreen() {
  const { signUpGuest } = useGuestAuth();
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setLoading(true);
    try {
      await signUpGuest();
    } catch (error: any) {
      Alert.alert("Login failed", error?.message ?? "Could not start a guest session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.content, { flexGrow: 1 }]}>
          <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
            <View style={local.badge}>
              <Feather name="credit-card" size={26} color="#062012" />
            </View>
            <Text style={styles.title}>Run a Gnosis Pay{"\n"}card, end to end</Text>
            <Text style={styles.subtitle}>
              A Gnosis Pay card is a Visa attached to a self-custodial Safe. Here your Openfort wallet signs in to Gnosis
              Pay and owns that Safe, with no backend of your own.
            </Text>
            <Card style={{ gap: 18, marginTop: 8 }}>
              {STEPS.map((step) => (
                <View key={step.title} style={local.step}>
                  <Feather name={step.icon} size={20} color={colors.text} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={local.stepTitle}>{step.title}</Text>
                    <Text style={local.stepBody}>{step.body}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
          <Button title="Continue as guest" onPress={onLogin} loading={loading} icon="arrow-right" />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const local = StyleSheet.create({
  badge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  step: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  stepTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  stepBody: { fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 2 },
});
