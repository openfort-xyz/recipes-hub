import { Mppx, solana } from '@solana/mpp/server'
import { config } from './config.js'

/**
 * The MPP instance. A single Solana `charge` method advertises that the
 * protected route costs `priceBaseUnits` of `currency`, payable to `payTo`.
 * The client default (`broadcast: false`) hands us signed transaction bytes,
 * which this server broadcasts and verifies on-chain via `rpcUrl` — no
 * facilitator middleware required.
 */
export const mpp = Mppx.create({
  secretKey: config.mppSecretKey,
  methods: [
    solana.charge({
      recipient: config.payTo,
      currency: config.currency,
      decimals: config.decimals,
      network: config.network,
      rpcUrl: config.rpcUrl,
    }),
  ],
})
