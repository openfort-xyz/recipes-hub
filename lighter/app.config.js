import dotenv from "dotenv";
dotenv.config();

export default {
  expo: {
    name: "@openfort/openfort-lighter",
    slug: "openfort-lighter",
    version: "1.0.0",
    extra: {
      openfortPublishableKey: process.env.OPENFORT_PUBLISHABLE_KEY || "YOUR_PROJECT_PUBLISHABLE_KEY",
      openfortShieldPublishableKey: process.env.OPENFORT_SHIELD_PUBLISHABLE_KEY || "YOUR_SHIELD_PUBLISHABLE_KEY",
      openfortShieldRecoveryBaseUrl:
        process.env.OPENFORT_SHIELD_RECOVERY_BASE_URL || "https://your-recovery-endpoint.example.com",
      openfortEthereumProviderPolicyId: process.env.OPENFORT_ETHEREUM_PROVIDER_POLICY_ID || "YOUR_GAS_SPONSORSHIP_POLICY_ID",
      lighterServerBaseUrl: process.env.LIGHTER_SERVER_BASE_URL || "http://localhost:3008",
      lighterMarketSymbol: process.env.LIGHTER_MARKET_SYMBOL || "ETH",
      lighterDepositContractAddress:
        process.env.LIGHTER_DEPOSIT_CONTRACT_ADDRESS || "0x3B4D794a66304F130a4Db8F2551B0070dfCf5ca7",
      usdcContractAddress: process.env.USDC_CONTRACT_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    },
  },
};
