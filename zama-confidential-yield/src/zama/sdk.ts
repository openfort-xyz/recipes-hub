import {
  type FheChain,
  indexedDBStorage,
  ZamaSDK,
  mainnet as zamaMainnet,
  sepolia as zamaSepolia,
} from '@zama-fhe/sdk'
import { createConfig } from '@zama-fhe/sdk/viem'
import { web } from '@zama-fhe/sdk/web'
import { createPublicClient, createWalletClient, custom, type EIP1193Provider, http } from 'viem'
import { CHAIN, NETWORK } from '../contracts/addresses'

type Hex = `0x${string}`

/** Precise inferred client types (chain + account bound) so `writeContract` needs no extra args. */
export type Runtime = ReturnType<typeof makeRuntime>

/**
 * Wire the Zama SDK to viem clients backed by the Openfort embedded wallet, for
 * the active network (Sepolia by default, mainnet when `VITE_NETWORK=mainnet`).
 *
 * The same EIP-1193 `provider` drives both on-chain writes (walletClient) and
 * the EIP-712 decryption permit `sdk.decryption.decryptValues` asks for — so the
 * Openfort wallet is the single signer. `web()` runs the FHE WASM in a Web
 * Worker; `indexedDBStorage` persists the decryption permit across reloads.
 */
export function makeRuntime(provider: EIP1193Provider, account: Hex) {
  const rpc = import.meta.env.VITE_RPC_URL
  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: rpc ? http(rpc) : custom(provider),
  })
  const walletClient = createWalletClient({
    account,
    chain: CHAIN,
    transport: custom(provider),
  })

  const preset = NETWORK === 'mainnet' ? zamaMainnet : zamaSepolia
  const fheChain: FheChain = rpc ? { ...preset, network: rpc } : preset
  const config = createConfig({
    chains: [fheChain],
    relayers: { [fheChain.id]: web() },
    publicClient,
    walletClient,
    storage: indexedDBStorage,
  })

  return { account, sdk: new ZamaSDK(config), publicClient, walletClient }
}
