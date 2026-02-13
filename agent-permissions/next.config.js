/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    }

    config.externals.push({
      'pino-pretty': 'commonjs pino-pretty',
    })

    return config
  },
}

module.exports = nextConfig
