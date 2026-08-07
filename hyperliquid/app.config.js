import dotenv from "dotenv";
dotenv.config();

export default {
  expo: {
    name: "@openfort/openfort-hyperliquid",
    slug: "openfort-hyperliquid",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "openfort.hyperliquid",
    userInterfaceStyle: "automatic",
    ios: {
      usesAppleSignIn: true,
      supportsTablet: true,
      bundleIdentifier: "com.openfort.hyperliquid",
    },
    android: {
      package: "com.openfort.hyperliquid",
      scheme: "openfort.hyperliquid",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-apple-authentication",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
    ],
    experiments: { typedRoutes: true },
    extra: {
      openfortPublishableKey: process.env.OPENFORT_PUBLISHABLE_KEY || "YOUR_PROJECT_PUBLISHABLE_KEY",
      openfortShieldPublishableKey: process.env.OPENFORT_SHIELD_PUBLISHABLE_KEY || "YOUR_SHIELD_PUBLISHABLE_KEY",
      openfortShieldEncryptionShare: process.env.OPENFORT_SHIELD_ENCRYPTION_KEY || "YOUR_SHIELD_ENCRYPTION_SHARE",
      openfortShieldRecoveryBaseUrl: process.env.OPENFORT_SHIELD_RECOVERY_BASE_URL || "https://your-recovery-endpoint.example.com",
      openfortEthereumProviderPolicyId: process.env.OPENFORT_ETHEREUM_PROVIDER_POLICY_ID || "YOUR_GAS_SPONSORSHIP_POLICY_ID",
      hyperliquidWalletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS || "0x_your_hyperliquid_wallet_address",
    },
  },
};
