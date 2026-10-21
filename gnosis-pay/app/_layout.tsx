import { AccountTypeEnum, OpenfortProvider } from "@openfort/react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getFeeSponsorshipId, getPublishableKey, getShieldPublishableKey } from "@/lib/config";
import { GNOSIS_CHAIN } from "@/lib/constants";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <OpenfortProvider
        publishableKey={getPublishableKey()}
        supportedChains={[GNOSIS_CHAIN]}
        walletConfig={{
          shieldPublishableKey: getShieldPublishableKey(),
          // Password recovery keeps the key client-side encrypted — no Shield backend.
          recoveryMethod: "password",
          // The Safe owner and SIWE signer must be a plain ECDSA key, so the wallet is an EOA.
          accountType: AccountTypeEnum.EOA,
          feeSponsorshipId: getFeeSponsorshipId(),
        }}
        verbose={true}
      >
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </OpenfortProvider>
    </SafeAreaProvider>
  );
}
