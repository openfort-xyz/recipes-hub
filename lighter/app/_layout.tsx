import { OpenfortProvider } from "@openfort/react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { EnvValidationWrapper } from "../components/envValidation/EnvValidationWrapper";
import { SUPPORTED_CHAINS } from "../constants/network";
import { getEncryptionSessionFromEndpoint } from "../services/walletRecovery";
import { getEthereumProviderPolicyId, getPublishableKey, getShieldPublishableKey } from "../utils/config";

function Providers() {
  const publishableKey = getPublishableKey();
  const shieldPublishableKey = getShieldPublishableKey();
  const ethereumProviderPolicyId = getEthereumProviderPolicyId();

  return (
    <OpenfortProvider
      publishableKey={publishableKey}
      walletConfig={{
        shieldPublishableKey,
        // @openfort/react-native's walletConfig field is `feeSponsorshipId` (renamed from
        // `ethereumProviderPolicyId`) — same OPENFORT_ETHEREUM_PROVIDER_POLICY_ID value, new field name.
        feeSponsorshipId: ethereumProviderPolicyId,
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
