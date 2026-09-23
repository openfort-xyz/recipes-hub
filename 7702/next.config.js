/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      '@react-native-async-storage/async-storage': false,
      // Optional wagmi 3 connector peer deps, loaded via guarded import().catch().
      // Not used by this recipe (embedded wallet only); stub them so webpack doesn't
      // fail or warn at build.
      accounts: false,
      porto: false,
      '@base-org/account': false,
      '@metamask/connect-evm': false,
      '@walletconnect/ethereum-provider': false,
      '@coinbase/wallet-sdk': false,
      '@safe-global/safe-apps-provider': false,
      '@safe-global/safe-apps-sdk': false,
    }

    // Ignore pino-pretty optional dependency
    config.externals.push({
      'pino-pretty': 'commonjs pino-pretty',
    })

    return config
  },
}

module.exports = nextConfig
