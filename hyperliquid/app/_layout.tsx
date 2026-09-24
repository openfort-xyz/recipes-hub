import { OpenfortProvider } from "@openfort/react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { EnvValidationWrapper } from "../components/envValidation/EnvValidationWrapper";
import { SUPPORTED_CHAINS } from "../constants/network";
import {
  getFeeSponsorshipId,
  getPublishableKey,
  getShieldPublishableKey,
} from "../utils/config";
import { getEncryptionSessionFromEndpoint } from "../services/walletRecovery";

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
        getEncryptionSession: getEncryptionSessionFromEndpoint,
        debug: false,
      }}
      supportedChains={SUPPORTED_CHAINS}
      verbose={true}
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
