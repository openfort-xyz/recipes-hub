// app.config.js
import dotenv from "dotenv";
dotenv.config();

export default {
  expo: {
    name: "openfort-sample",
    slug: "openfort-sample",
    version: "1.0.0",
    platforms: ["ios", "android"],
    extra: {
      openfortPublishableKey: process.env.OPENFORT_PUBLISHABLE_KEY || "YOUR_PROJECT_PUBLISHABLE_KEY",
      openfortShieldPublishableKey: process.env.OPENFORT_SHIELD_PUBLISHABLE_KEY || "YOUR_SHIELD_PUBLISHABLE_KEY",
      openfortShieldRecoveryBaseUrl: process.env.OPENFORT_SHIELD_RECOVERY_BASE_URL || "https://your-recovery-endpoint.example.com",
      openfortEthereumProviderPolicyId: process.env.OPENFORT_ETHEREUM_PROVIDER_POLICY_ID || "YOUR_GAS_SPONSORSHIP_POLICY_ID",
    },
  },
};
