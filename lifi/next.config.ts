import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    // pino-pretty is an optional dev dep of pino (used by WalletConnect logger).
    // It's not needed at runtime — stub it out to suppress the module-not-found warning.
    config.resolve.alias["pino-pretty"] = false;
    // Optional wagmi 3 connector peer deps, loaded via guarded import().catch().
    // Not used by this recipe; stub them so webpack neither fails nor warns at build.
    config.resolve.alias["accounts"] = false;
    config.resolve.alias["porto"] = false;
    config.resolve.alias["@base-org/account"] = false;
    config.resolve.alias["@metamask/connect-evm"] = false;
    config.resolve.alias["@coinbase/wallet-sdk"] = false;
    config.resolve.alias["@safe-global/safe-apps-sdk"] = false;
    config.resolve.alias["@safe-global/safe-apps-provider"] = false;
    config.resolve.alias["@walletconnect/ethereum-provider"] = false;
    return config;
  },
};

export default nextConfig;
