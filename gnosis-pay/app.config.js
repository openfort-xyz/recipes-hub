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
    pimlicoApiKey: process.env.PIMLICO_API_KEY || "",
    pimlicoSponsorshipPolicyId: process.env.PIMLICO_SPONSORSHIP_POLICY_ID || "",
    gnosisRpcUrl: process.env.GNOSIS_RPC_URL || "https://rpc.gnosischain.com",
  },
});
