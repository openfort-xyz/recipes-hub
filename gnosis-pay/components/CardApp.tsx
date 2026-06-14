import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountTypeEnum, useEmbeddedEthereumWallet, useSignOut } from "@openfort/react-native";
import { DEMO_RECOVERY_PASSWORD, GNOSIS_CHAIN_ID } from "@/lib/constants";
import { Button, Screen, colors, styles } from "@/components/ui";
import { CardDashboard } from "@/components/CardDashboard";

export function CardApp() {
  const ethereum = useEmbeddedEthereumWallet();
  const { signOut } = useSignOut();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  // Auto-create (or restore) the embedded EOA wallet once we know the wallet list.
  useEffect(() => {
    if (started.current) return;
    const idle = ethereum.status === "disconnected" || ethereum.status === "error";
    if (!idle) return;
    started.current = true;
    (async () => {
      try {
        if (ethereum.wallets.length > 0) {
          await ethereum.setActive({
            address: ethereum.wallets[0].address as `0x${string}`,
            chainId: GNOSIS_CHAIN_ID,
            recoveryMethod: "password",
            recoveryPassword: DEMO_RECOVERY_PASSWORD,
          });
        } else {
          // create() already connects the wallet (provider ready), so no setActive.
          await ethereum.create({
            chainId: GNOSIS_CHAIN_ID,
            accountType: AccountTypeEnum.EOA,
            recoveryMethod: "password",
            recoveryPassword: DEMO_RECOVERY_PASSWORD,
          });
        }
      } catch (e: any) {
        setError(e?.message ?? "Could not set up your wallet.");
        started.current = false;
      }
    })();
  }, [ethereum]);

  if (ethereum.status === "connected") {
    return <CardDashboard owner={ethereum.activeWallet.address} provider={ethereum.provider} onLogout={signOut} />;
  }

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.content, { flexGrow: 1, justifyContent: "center", alignItems: "center", gap: 16 }]}>
          {error ? (
            <>
              <Text style={[styles.title, { textAlign: "center" }]}>Wallet setup failed</Text>
              <Text style={[styles.subtitle, { textAlign: "center" }]}>{error}</Text>
              <Button
                title="Try again"
                onPress={() => {
                  setError(null);
                }}
              />
            </>
          ) : (
            <>
              <ActivityIndicator color={colors.green} size="large" />
              <Text style={[styles.subtitle, { textAlign: "center" }]}>Setting up your self-custodial wallet…</Text>
            </>
          )}
          <Button title="Log out" tone="light" onPress={signOut} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
