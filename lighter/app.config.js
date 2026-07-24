import dotenv from "dotenv";
dotenv.config();

// Function form so the static app.json config (icons, plugins, ios.bundleIdentifier,
// android.package) is merged rather than replaced — a plain object export would drop it.
export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    openfortPublishableKey: process.env.OPENFORT_PUBLISHABLE_KEY || "YOUR_PROJECT_PUBLISHABLE_KEY",
    openfortShieldPublishableKey: process.env.OPENFORT_SHIELD_PUBLISHABLE_KEY || "YOUR_SHIELD_PUBLISHABLE_KEY",
    openfortShieldRecoveryBaseUrl:
      process.env.OPENFORT_SHIELD_RECOVERY_BASE_URL || "https://your-recovery-endpoint.example.com",
    openfortEthereumProviderPolicyId: process.env.OPENFORT_ETHEREUM_PROVIDER_POLICY_ID || "YOUR_GAS_SPONSORSHIP_POLICY_ID",
    lighterServerBaseUrl: process.env.LIGHTER_SERVER_BASE_URL || "http://localhost:3008",
    lighterServerAuthToken: process.env.LIGHTER_SERVER_AUTH_TOKEN || "",
    lighterMarketSymbol: process.env.LIGHTER_MARKET_SYMBOL || "ETH",
    lighterDepositContractAddress:
      process.env.LIGHTER_DEPOSIT_CONTRACT_ADDRESS || "0x3B4D794a66304F130a4Db8F2551B0070dfCf5ca7",
    usdcContractAddress: process.env.USDC_CONTRACT_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    // Embedded wallet's L1 chain. Stays Ethereum mainnet even in Lighter-testnet mode — see
    // constants/network.ts for why (Lighter's testnet funding needs no on-chain tx at all).
    lighterL1ChainId: process.env.LIGHTER_L1_CHAIN_ID || "1",
    lighterL1ChainName: process.env.LIGHTER_L1_CHAIN_NAME || "Ethereum",
    lighterL1NativeSymbol: process.env.LIGHTER_L1_NATIVE_SYMBOL || "ETH",
    lighterL1RpcUrls: process.env.LIGHTER_L1_RPC_URLS || "https://ethereum-rpc.publicnode.com,https://eth.merkle.io",
  },
});
