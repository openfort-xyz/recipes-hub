import { OpenfortProvider } from "@openfort/react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { EnvValidationWrapper } from "../components/envValidation/EnvValidationWrapper";
import { SUPPORTED_CHAINS } from "../constants/network";
import { getEncryptionSessionFromEndpoint } from "../services/walletRecovery";
import { getFeeSponsorshipId, getPublishableKey, getShieldPublishableKey } from "../utils/config";

function Providers() {
  const publishableKey = getPublishableKey();
  const shieldPublishableKey = getShieldPublishableKey();
  const feeSponsorshipId = getFeeSponsorshipId();

  return (
    <OpenfortProvider
      publishableKey={publishableKey}
      walletConfig={{
        shieldPublishableKey,
        feeSponsorshipId,
        recoveryMethod: "automatic",
        getEncryptionSession: getEncryptionSessionFromEndpoint,
      }}
      supportedChains={SUPPORTED_CHAINS}
      verbose={__DEV__}
    >
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </OpenfortProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <EnvValidationWrapper>
        <Providers />
      </EnvValidationWrapper>
    </SafeAreaProvider>
  );
}
