import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack(config) {
    // pino-pretty is an optional dev dep of pino (used by the WalletConnect
    // logger). It's not needed at runtime — stub it out to suppress the
    // module-not-found warning.
    config.resolve.alias['pino-pretty'] = false
    // Optional wagmi 3 connector peer deps, loaded via guarded import().catch().
    // Not used by this recipe; stub them so webpack doesn't hard-fail at build.
    config.resolve.alias.accounts = false
    config.resolve.alias.porto = false
    config.resolve.alias['@base-org/account'] = false
    config.resolve.alias['@metamask/connect-evm'] = false
    // @openfort/react >= 1.6 imports its Solana send path from the package
    // entry, so webpack resolves these even though this recipe is EVM-only.
    // They are optional peers — stub them rather than installing three Solana
    // packages that nothing here calls.
    config.resolve.alias['@solana/kit'] = false
    config.resolve.alias['@solana-program/token'] = false
    config.resolve.alias['@solana/kora'] = false
    config.resolve.alias['@solana-program/system'] = false
    // `@openfort/react/wagmi` re-exports its defaultConnectors module, which
    // imports the whole @wagmi/connectors barrel — so these get resolved even
    // though this recipe registers only the embedded-wallet connector.
    config.resolve.alias['@coinbase/wallet-sdk'] = false
    config.resolve.alias['@safe-global/safe-apps-provider'] = false
    config.resolve.alias['@safe-global/safe-apps-sdk'] = false
    config.resolve.alias['@walletconnect/ethereum-provider'] = false
    // `ox` builds a require path as an expression in its Tempo virtual-master
    // pool, which webpack can't statically analyse. It reaches this app through
    // viem's chain index via @openfort/openfort-node, runs server-side only,
    // and nothing here touches Tempo — so the warning is noise, not a signal.
    config.ignoreWarnings = [{ module: /ox\/_esm\/tempo/ }]
    return config
  },
}

export default nextConfig
