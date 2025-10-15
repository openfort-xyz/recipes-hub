/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    webpack: (config, { isServer }) => {
        config.resolve.fallback = {
            fs: false,
            net: false,
            tls: false,
            crypto: require.resolve("crypto-browserify"),
            stream: require.resolve("stream-browserify"),
            http: require.resolve("stream-http"),
            https: require.resolve("https-browserify"),
            os: require.resolve("os-browserify/browser"),
            zlib: require.resolve("browserify-zlib"),
            "@react-native-async-storage/async-storage": false
        }
        
        // Ignore pino-pretty optional dependency
        config.externals.push({
            'pino-pretty': 'commonjs pino-pretty'
        })
        
        return config
    }
}

module.exports = nextConfig
