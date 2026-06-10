import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    // @mysten/dapp-kit@1.0.3 (transitive via @lifi/wallet-management) imports
    // getJsonRpcFullnodeUrl from @mysten/sui/jsonRpc which no longer exists.
    // The app doesn't use Sui — stub it out.
    config.resolve.alias["@mysten/sui/jsonRpc"] = path.resolve(
      "./src/lib/sui-stub.js"
    );
    // pino-pretty is an optional dev dep of pino (used by WalletConnect logger).
    // It's not needed at runtime — stub it out to suppress the module-not-found warning.
    config.resolve.alias["pino-pretty"] = false;
    // Optional wagmi 3 connector peer deps, loaded via guarded import().catch().
    // Not used by this recipe; stub them so webpack doesn't hard-fail at build.
    config.resolve.alias["accounts"] = false;
    config.resolve.alias["porto"] = false;
    config.resolve.alias["@base-org/account"] = false;
    config.resolve.alias["@metamask/connect-evm"] = false;
    return config;
  },
};

export default nextConfig;
