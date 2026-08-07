/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      // Optional wagmi 3 connector peers not used by this embedded-wallet recipe.
      accounts: false,
      porto: false,
      '@base-org/account': false,
      '@metamask/connect-evm': false,
    }

    config.externals.push({
      'pino-pretty': 'commonjs pino-pretty',
    })

    return config
  },
}

module.exports = nextConfig
