import { mainnet, sepolia } from 'viem/chains'

/**
 * The Zama confidential vault is deployed on BOTH Ethereum Sepolia (testnet) and
 * mainnet — same product, same flow, different addresses. Pick via `VITE_NETWORK`
 * (default `sepolia`). Addresses verified against the vault integration POC
 * (github.com/enitrat/vault-integration-poc/blob/main/src/networks.ts).
 *
 * Sepolia is the default because Openfort *test* keys only work on testnets
 * (`chainId 1 is not available in test mode`). USDC, cUSDC and the share token
 * are all 6 decimals on both networks.
 */
export type NetworkName = 'sepolia' | 'mainnet'

const DEPLOYMENTS = {
  sepolia: {
    viemChain: sepolia,
    addresses: {
      usdc: '0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF',
      cusdc: '0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639',
      confidentialShare: '0x7E93d5c150A2178B1fCde0278582Acf59478eA5f',
      morphoVault: '0x6AB54988261AEC573a2CA13cF802d3B1114f864C',
      depositBatcher: '0x56E3CF41D18e58AF476C05e9B1705ac2b13862C9',
      redeemBatcher: '0xe35C25a0F49c6cDC0771C459F1b0548D1E741774',
    },
  },
  mainnet: {
    viemChain: mainnet,
    addresses: {
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      cusdc: '0xe978F22157048E5DB8E5d07971376e86671672B2',
      confidentialShare: '0x66Bf74E96900D1a19c7070D939D124f2F565C458',
      morphoVault: '0xbEEF00A59B577423653A1526c7009bdE103F542B',
      depositBatcher: '0x324EA89FD3784036673BfE6Ffee2334A088F40Cc',
      redeemBatcher: '0x96Cd3Faa7483783Ac2Eb715f6333361500F1eec9',
    },
  },
} as const satisfies Record<
  NetworkName,
  { viemChain: unknown; addresses: Record<string, `0x${string}`> }
>

export const NETWORK: NetworkName =
  import.meta.env.VITE_NETWORK === 'mainnet' ? 'mainnet' : 'sepolia'

const ACTIVE = DEPLOYMENTS[NETWORK]
export const CHAIN = ACTIVE.viemChain
export const CHAIN_ID = ACTIVE.viemChain.id
export const ADDRESSES = ACTIVE.addresses
export const DECIMALS = 6
/** Circle's testnet USDC faucet (Sepolia); harmless on mainnet. */
export const FAUCET_URL = 'https://faucet.circle.com'
