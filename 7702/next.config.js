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
      // Not used by this recipe; stub them so webpack doesn't hard-fail at build.
      accounts: false,
      porto: false,
      '@base-org/account': false,
      '@metamask/connect-evm': false,
    }

    // Ignore pino-pretty optional dependency
    config.externals.push({
      'pino-pretty': 'commonjs pino-pretty',
    })

    return config
  },
}

module.exports = nextConfig
