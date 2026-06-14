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
  { icon: "credit-card", title: "Deploy your Gnosis Pay account", body: "A Safe on Gnosis Chain that you fully own and control." },
  { icon: "zap", title: "Set a limit, fund it, and spend", body: "Configure a spending allowance, top it up with EURe, and draw within it." },
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
              A Gnosis Pay card is a Visa attached to a self-custodial Safe. Here your Openfort wallet owns and runs it —
              on Gnosis Chain, no backend.
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
