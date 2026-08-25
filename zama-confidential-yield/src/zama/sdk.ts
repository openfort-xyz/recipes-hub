import {
  type FheChain,
  indexedDBStorage,
  ZamaSDK,
  mainnet as zamaMainnet,
  sepolia as zamaSepolia,
} from '@zama-fhe/sdk'
import { createConfig } from '@zama-fhe/sdk/viem'
import { web } from '@zama-fhe/sdk/web'
import type { Account, Chain, Hex, PublicClient, Transport, WalletClient } from 'viem'
import { NETWORK, RPC_URL } from '../contracts/addresses'
import { type Call, toCall } from '../openfort/calibur'

/** The account-bound wallet client wagmi hands back for the embedded wallet. */
export type EmbeddedWalletClient = WalletClient<Transport, Chain, Account>

export type Runtime = ReturnType<typeof makeRuntime>

/** Submits a batch of calls as one sponsored UserOperation, resolving the tx hash. */
export type SendCalls = (calls: Call[]) => Promise<Hex>

/**
 * Wire the Zama SDK to the viem clients wagmi already owns.
 *
 * `usePublicClient()` and `useWalletClient()` come from the same wagmi config
 * the Openfort embedded connector is registered in, so the wallet client signs
 * with the embedded wallet without this app ever touching an EIP-1193 provider:
 * on-chain writes and the EIP-712 decryption permit `sdk.decryption.decryptValues`
 * asks for both go through it. `web()` runs the FHE WASM in a Web Worker;
 * `indexedDBStorage` persists the decryption permit across reloads.
 *
 * Writes do NOT go through the wallet client: they are submitted as sponsored
 * UserOperations by `sendCalls`. See `openfort/calibur.ts` for why.
 */
export function makeRuntime(
  publicClient: PublicClient,
  walletClient: EmbeddedWalletClient,
  sendCalls: SendCalls
) {
  const preset = NETWORK === 'mainnet' ? zamaMainnet : zamaSepolia
  const fheChain: FheChain = { ...preset, network: RPC_URL }
  const config = createConfig({
    chains: [fheChain],
    relayers: { [fheChain.id]: web() },
    publicClient,
    walletClient,
    storage: indexedDBStorage,
  })

  return {
    account: walletClient.account.address,
    sdk: new ZamaSDK(config),
    publicClient,
    walletClient,
    /** One contract call, one sponsored UserOperation. */
    write: (call: Parameters<typeof toCall>[0]) => sendCalls([toCall(call)]),
    /** Several calls atomically in a single sponsored UserOperation. */
    writeBatch: (calls: Parameters<typeof toCall>[0][]) => sendCalls(calls.map(toCall)),
  }
}
