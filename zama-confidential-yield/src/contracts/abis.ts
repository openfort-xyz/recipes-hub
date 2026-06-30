import type { Abi } from 'viem'

/**
 * Minimal, verified ABIs — only the functions/events the shield + vault flows
 * touch. Ported from the Zama vault integration POC
 * (github.com/enitrat/vault-integration-poc/blob/main/src/abis.ts).
 *
 * Encrypted amounts (`externalEuint64`) and balance handles (`euint64`) are
 * `bytes32` on the wire — handles into ciphertext held by the FHE coprocessor.
 * `inputProof` / decryption proofs are `bytes`. Both come out of the Zama SDK.
 */

/** ERC-7984 confidential wrapper — same interface for cUSDC and the share token. */
export const confidentialWrapperAbi = [
  // shield: pull plain ERC-20 in, mint confidential balance (no client encryption)
  {
    type: 'function',
    name: 'wrap',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  // the core deposit/redeem call: push an encrypted amount to a reacting contract
  {
    type: 'function',
    name: 'confidentialTransferAndCall',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'encryptedAmount', type: 'bytes32' },
      { name: 'inputProof', type: 'bytes' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [{ name: 'transferred', type: 'bytes32' }],
  },
  // unshield step 1: burn confidential balance, open an async public decryption
  {
    type: 'function',
    name: 'unwrap',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'encryptedAmount', type: 'bytes32' },
      { name: 'inputProof', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  // unshield step 2: settle with the decrypted cleartext + its proof
  {
    type: 'function',
    name: 'finalizeUnwrap',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'unwrapRequestId', type: 'bytes32' },
      { name: 'unwrapAmountCleartext', type: 'uint64' },
      { name: 'decryptionProof', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'confidentialBalanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'event',
    name: 'UnwrapRequested',
    inputs: [
      { name: 'receiver', type: 'address', indexed: true },
      { name: 'unwrapRequestId', type: 'bytes32', indexed: true },
      { name: 'amount', type: 'bytes32', indexed: false },
    ],
  },
] as const satisfies Abi

/** Deposit / redeem batcher. Users push encrypted amounts in, then `claim` after settle. */
export const batcherAbi = [
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'batchId', type: 'uint256' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'currentBatchId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'batchState',
    stateMutability: 'view',
    inputs: [{ name: 'batchId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }], // 0=Open 1=Dispatched 2=Finalized
  },
  {
    type: 'function',
    name: 'deposits',
    stateMutability: 'view',
    inputs: [
      { name: 'batchId', type: 'uint256' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bytes32' }], // your encrypted position in that batch
  },
] as const satisfies Abi

export const erc20Abi = [
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Public on the Sepolia USDCMock — used by the "Get test USDC" button.
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const satisfies Abi

export const erc4626Abi = [
  {
    type: 'function',
    name: 'redeem',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
  // Price-per-share: value the vault position in cUSDC (grows as yield accrues).
  {
    type: 'function',
    name: 'convertToAssets',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
] as const satisfies Abi
