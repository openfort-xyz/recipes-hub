import { OpenfortProvider } from "@openfort/react-native";
import { getEncryptionSessionFromEndpoint } from "../services/walletRecovery";

import { getPublishableKey, getShieldPublishableKey, getEthereumProviderPolicyId } from "../utils/config";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
 
export default function RootLayout() {
  const publishableKey = getPublishableKey();
  const shieldPublishableKey = getShieldPublishableKey();
  const ethereumProviderPolicyId = getEthereumProviderPolicyId();
  return (
    <SafeAreaProvider>
      <OpenfortProvider
        publishableKey={publishableKey}
        walletConfig={{
          ethereumProviderPolicyId,
          shieldPublishableKey,
          getEncryptionSession: getEncryptionSessionFromEndpoint,
        }}
        verbose={true}
        supportedChains={[
          {
            id: 84532,
            name: 'Base Sepolia',
            nativeCurrency: {
              name: 'Base Sepolia Ether',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: {
              default: {
                http: [
                  'https://sepolia.base.org',
                ]
              }
            },
          },
          {
            id: 11155111,
            name: 'Sepolia',
            nativeCurrency: {
              name: 'Sepolia Ether',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: {
              default: {
                http: [
                  'https://ethereum-sepolia-rpc.publicnode.com'
                ]
              }
            },
          },
        ]}
      >
        <Stack>
          <Stack.Screen
            name="index"
            options={{ headerShown: false }}
          />
        </Stack>
      </OpenfortProvider>
    </SafeAreaProvider>
  );
}
