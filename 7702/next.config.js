/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      '@react-native-async-storage/async-storage': false,
    }

    // Ignore pino-pretty optional dependency
    config.externals.push({
      'pino-pretty': 'commonjs pino-pretty',
    })

    return config
  },
}

module.exports = nextConfig
