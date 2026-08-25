import {
  type FheChain,
  indexedDBStorage,
  ZamaSDK,
  mainnet as zamaMainnet,
  sepolia as zamaSepolia,
} from '@zama-fhe/sdk'
import { createConfig } from '@zama-fhe/sdk/viem'
import { web } from '@zama-fhe/sdk/web'
import type { Account, Chain, PublicClient, Transport, WalletClient } from 'viem'
import { NETWORK, RPC_URL } from '../contracts/addresses'

/** The account-bound wallet client wagmi hands back for the embedded wallet. */
export type EmbeddedWalletClient = WalletClient<Transport, Chain, Account>

export type Runtime = ReturnType<typeof makeRuntime>

/**
 * Wire the Zama SDK to the viem clients wagmi already owns.
 *
 * `usePublicClient()` and `useWalletClient()` come from the same wagmi config
 * the Openfort embedded connector is registered in, so the wallet client signs
 * with the embedded wallet without this app ever touching an EIP-1193 provider:
 * on-chain writes and the EIP-712 decryption permit `sdk.decryption.decryptValues`
 * asks for both go through it. `web()` runs the FHE WASM in a Web Worker;
 * `indexedDBStorage` persists the decryption permit across reloads.
 */
export function makeRuntime(publicClient: PublicClient, walletClient: EmbeddedWalletClient) {
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
  }
}
