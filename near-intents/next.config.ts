import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Token logos (SmolDapp token-assets CDN, redirects to GitHub raw).
      { protocol: "https", hostname: "assets.smold.app" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
  webpack(config) {
    // pino-pretty is an optional dev dep of pino (used by the WalletConnect
    // logger). It's not needed at runtime — stub it out to suppress the
    // module-not-found warning.
    config.resolve.alias["pino-pretty"] = false;
    return config;
  },
};

export default nextConfig;
