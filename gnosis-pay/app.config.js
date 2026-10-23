// app.config.js — merges app.json (via `config`) and injects env-driven `extra`.
import dotenv from "dotenv";
dotenv.config();

export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    openfortPublishableKey: process.env.OPENFORT_PROJECT_PUBLISHABLE_KEY || "YOUR_PROJECT_PUBLISHABLE_KEY",
    openfortShieldPublishableKey: process.env.OPENFORT_SHIELD_PUBLISHABLE_KEY || "YOUR_SHIELD_PUBLISHABLE_KEY",
    openfortFeeSponsorshipId: process.env.OPENFORT_FEE_SPONSORSHIP_ID || "",
    gnosisPayEnv: process.env.GNOSIS_PAY_ENV || "sandbox",
    gnosisPaySiweDomain: process.env.GNOSIS_PAY_SIWE_DOMAIN || "",
    gnosisPaySiweUri: process.env.GNOSIS_PAY_SIWE_URI || "",
    gnosisPayAppName: process.env.GNOSIS_PAY_APP_NAME || "",
    gnosisRpcUrl: process.env.GNOSIS_RPC_URL || "https://rpc.gnosischain.com",
  },
});
