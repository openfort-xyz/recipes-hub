import dotenv from "dotenv";
dotenv.config();

export default {
  expo: {
    name: "@openfort/openfort-hyperliquid",
    slug: "openfort-hyperliquid",
    version: "1.0.0",
    extra: {
      openfortPublishableKey: process.env.OPENFORT_PROJECT_PUBLISHABLE_KEY || "YOUR_PROJECT_PUBLISHABLE_KEY",
      openfortShieldPublishableKey: process.env.OPENFORT_SHIELD_PUBLISHABLE_KEY || "YOUR_SHIELD_PUBLISHABLE_KEY",
      openfortShieldEncryptionShare: process.env.OPENFORT_SHIELD_ENCRYPTION_SHARE || "YOUR_SHIELD_ENCRYPTION_SHARE",
      openfortShieldRecoveryBaseUrl: process.env.OPENFORT_SHIELD_RECOVERY_BASE_URL || "https://your-recovery-endpoint.example.com",
      openfortEthereumProviderPolicyId: process.env.OPENFORT_ETHEREUM_PROVIDER_POLICY_ID || "YOUR_GAS_SPONSORSHIP_POLICY_ID",
      hyperliquidWalletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS || "0x_your_hyperliquid_wallet_address",
    },
  },
};
