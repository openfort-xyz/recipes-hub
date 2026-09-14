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

    // `@openfort/react/wagmi` re-exports its defaultConnectors module, which
    // imports the whole @wagmi/connectors barrel — so these resolve even though
    // this recipe registers only the embedded-wallet connector.
    config.resolve.alias['@coinbase/wallet-sdk'] = false
    config.resolve.alias['@safe-global/safe-apps-provider'] = false
    config.resolve.alias['@safe-global/safe-apps-sdk'] = false
    config.resolve.alias['@walletconnect/ethereum-provider'] = false

    // @openfort/react reaches its Solana send path from the package entry, so
    // webpack resolves these in an EVM-only app too. All four are optional
    // peers — stub them rather than installing Solana packages nothing calls.
    // Still required as of 2.1.1; re-check on the next major.
    config.resolve.alias['@solana/kit'] = false
    config.resolve.alias['@solana/kora'] = false
    config.resolve.alias['@solana-program/token'] = false
    config.resolve.alias['@solana-program/system'] = false

    // `ox` builds a require path as an expression in its Tempo virtual-master
    // pool, which webpack can't statically analyse. It reaches this app through
    // viem's chain index via @openfort/openfort-node, runs server-side only,
    // and nothing here touches Tempo — so the warning is noise, not a signal.
    config.ignoreWarnings = [{ module: /ox\/_esm\/tempo/ }]

    return config
  },
}

export default nextConfig
