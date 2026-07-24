import { decodeEventLog, type EIP1193Provider, type Log, maxUint256, parseUnits } from 'viem'
import { batcherAbi, confidentialWrapperAbi, erc20Abi, erc4626Abi } from '../contracts/abis'
import { ADDRESSES, DECIMALS } from '../contracts/addresses'
import { makeRuntime, type Runtime } from './sdk'

type Hex = `0x${string}`

/** csteakcUSDC wraps the 18-decimal clear vault share as 6 decimals → rate 10^12. */
const SHARE_RATE = 10n ** 12n

export type { Runtime }
export function makeClients(provider: EIP1193Provider, account: Hex): Runtime {
  return makeRuntime(provider, account)
}

// ── perf audit: log how long each phase takes, split by side ──────────────────
// [perf] openfort.send:* = userOp submit + paymaster sponsorship (Openfort/4337)
// [perf] chain.receipt:*  = bundler inclusion + block (chain/bundler)
// [perf] zama.*           = relayer + FHE WASM (Zama)
async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now()
  try {
    return await fn()
  } finally {
    console.log(`[perf] ${label}: ${Math.round(performance.now() - t0)}ms`)
  }
}

/** Submit a sponsored write (Openfort) and wait for inclusion (chain), each timed. */
async function exec(rt: Runtime, label: string, send: () => Promise<Hex>): Promise<Hex> {
  const hash = await timed(`openfort.send:${label}`, send)
  await timed(`chain.receipt:${label}`, () => rt.publicClient.waitForTransactionReceipt({ hash }))
  return hash
}

// ── reads ────────────────────────────────────────────────────────────────────

export function readUsdcBalance(rt: Runtime) {
  return rt.publicClient.readContract({
    address: ADDRESSES.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [rt.account],
  })
}

/** Encrypted balance handle (bytes32) from cUSDC or the share token. */
export function readEncryptedHandle(rt: Runtime, token: 'cusdc' | 'share') {
  const address = token === 'cusdc' ? ADDRESSES.cusdc : ADDRESSES.confidentialShare
  return rt.publicClient.readContract({
    address,
    abi: confidentialWrapperAbi,
    functionName: 'confidentialBalanceOf',
    args: [rt.account],
  })
}

/** Value a decrypted share balance in cUSDC via the vault's price-per-share. */
export function vaultValueUsdc(rt: Runtime, shares: bigint) {
  return rt.publicClient.readContract({
    address: ADDRESSES.morphoVault,
    abi: erc4626Abi,
    functionName: 'convertToAssets',
    args: [shares * SHARE_RATE],
  })
}

export type HandleRef = { handle: Hex; contractAddress: Hex }

/**
 * User-decrypt a set of ciphertext handles. The SDK signs an EIP-712 permit once
 * (via the Openfort wallet) and caches it; zero handles resolve to 0n without a
 * relayer round-trip.
 */
export async function decryptHandles(
  rt: Runtime,
  refs: HandleRef[]
): Promise<Record<string, bigint>> {
  const clear = (await timed('zama.decryptValues', () =>
    rt.sdk.decryption.decryptValues(
      refs.map((r) => ({ encryptedValue: r.handle, contractAddress: r.contractAddress }))
    )
  )) as Record<string, bigint | boolean | string>
  const out: Record<string, bigint> = {}
  for (const r of refs) {
    const v = clear[r.handle]
    out[r.handle.toLowerCase()] = typeof v === 'bigint' ? v : BigInt(v ?? 0)
  }
  return out
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function encrypt(rt: Runtime, contractAddress: Hex, units: bigint) {
  const { encryptedValues, inputProof } = await timed('zama.encrypt', () =>
    rt.sdk.encrypt({
      values: [{ type: 'euint64', value: units }],
      contractAddress,
      userAddress: rt.account,
    })
  )
  const handle = encryptedValues[0]
  if (!handle) throw new Error('Encryption produced no handle')
  return { handle: handle as Hex, inputProof: inputProof as Hex }
}

function findUnwrapRequestId(logs: readonly Log[]): Hex {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: confidentialWrapperAbi,
        data: log.data,
        topics: log.topics,
      })
      if (decoded.eventName === 'UnwrapRequested') {
        return (decoded.args as { unwrapRequestId: Hex }).unwrapRequestId
      }
    } catch {
      // not one of our events — skip
    }
  }
  throw new Error('UnwrapRequested event missing from the unwrap receipt')
}

/** Mint test USDC to the wallet (Sepolia USDCMock has a public `mint`). */
export function mintTestUsdc(rt: Runtime, human = '100') {
  const amount = parseUnits(human, DECIMALS)
  return exec(rt, 'mint', () =>
    rt.walletClient.writeContract({
      address: ADDRESSES.usdc,
      abi: erc20Abi,
      functionName: 'mint',
      args: [rt.account, amount],
    })
  )
}

// ── shield: USDC → cUSDC (wrap; entry amount is public) ───────────────────────

export async function shield(rt: Runtime, human: string) {
  const amount = parseUnits(human, DECIMALS)
  const allowance = await rt.publicClient.readContract({
    address: ADDRESSES.usdc,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [rt.account, ADDRESSES.cusdc],
  })
  // Approve max once so repeat shields skip the extra sponsored userOp.
  if (allowance < amount) {
    await exec(rt, 'approve', () =>
      rt.walletClient.writeContract({
        address: ADDRESSES.usdc,
        abi: erc20Abi,
        functionName: 'approve',
        args: [ADDRESSES.cusdc, maxUint256],
      })
    )
  }
  return exec(rt, 'wrap', () =>
    rt.walletClient.writeContract({
      address: ADDRESSES.cusdc,
      abi: confidentialWrapperAbi,
      functionName: 'wrap',
      args: [rt.account, amount],
    })
  )
}

// ── unshield: cUSDC → USDC (encrypt → unwrap → public-decrypt → finalize) ──────

export async function unshield(rt: Runtime, human: string) {
  const units = parseUnits(human, DECIMALS)
  const { handle, inputProof } = await encrypt(rt, ADDRESSES.cusdc, units)
  const unwrapHash = await exec(rt, 'unwrap', () =>
    rt.walletClient.writeContract({
      address: ADDRESSES.cusdc,
      abi: confidentialWrapperAbi,
      functionName: 'unwrap',
      args: [rt.account, rt.account, handle, inputProof],
    })
  )
  const receipt = await rt.publicClient.getTransactionReceipt({ hash: unwrapHash })

  const requestId = findUnwrapRequestId(receipt.logs)
  const { clearValues, decryptionProof } = await timed('zama.decryptPublic', () =>
    rt.sdk.decryption.decryptPublicValues([requestId])
  )
  const raw = (clearValues as Record<string, bigint | boolean | string>)[requestId]
  const cleartext = typeof raw === 'bigint' ? raw : BigInt(raw ?? 0)

  return exec(rt, 'finalizeUnwrap', () =>
    rt.walletClient.writeContract({
      address: ADDRESSES.cusdc,
      abi: confidentialWrapperAbi,
      functionName: 'finalizeUnwrap',
      args: [requestId, cleartext, decryptionProof as Hex],
    })
  )
}

// ── private yield: deposit / redeem via the batchers ──────────────────────────

/** Push an encrypted cUSDC amount into the deposit batcher's current batch. */
export async function vaultDeposit(rt: Runtime, human: string): Promise<bigint> {
  const units = parseUnits(human, DECIMALS)
  const { handle, inputProof } = await encrypt(rt, ADDRESSES.cusdc, units)
  await exec(rt, 'deposit', () =>
    rt.walletClient.writeContract({
      address: ADDRESSES.cusdc,
      abi: confidentialWrapperAbi,
      functionName: 'confidentialTransferAndCall',
      args: [ADDRESSES.depositBatcher, handle, inputProof, '0x'],
    })
  )
  return readContractBigint(rt, ADDRESSES.depositBatcher, 'currentBatchId')
}

/** Push encrypted shares into the redeem batcher's current batch. */
export async function vaultRedeem(rt: Runtime, human: string): Promise<bigint> {
  const units = parseUnits(human, DECIMALS)
  const { handle, inputProof } = await encrypt(rt, ADDRESSES.confidentialShare, units)
  await exec(rt, 'redeem', () =>
    rt.walletClient.writeContract({
      address: ADDRESSES.confidentialShare,
      abi: confidentialWrapperAbi,
      functionName: 'confidentialTransferAndCall',
      args: [ADDRESSES.redeemBatcher, handle, inputProof, '0x'],
    })
  )
  return readContractBigint(rt, ADDRESSES.redeemBatcher, 'currentBatchId')
}

export type BatchKind = 'deposit' | 'redeem'

export function batcherAddress(kind: BatchKind): Hex {
  return kind === 'deposit' ? ADDRESSES.depositBatcher : ADDRESSES.redeemBatcher
}

/** Your encrypted position (cUSDC in / shares in) sitting in a batch, as a handle ref. */
export async function readBatchPosition(
  rt: Runtime,
  kind: BatchKind,
  batchId: bigint
): Promise<HandleRef> {
  const contractAddress = batcherAddress(kind)
  const handle = await rt.publicClient.readContract({
    address: contractAddress,
    abi: batcherAbi,
    functionName: 'deposits',
    args: [batchId, rt.account],
  })
  return { handle: handle as Hex, contractAddress }
}

/** Claim your output once a batch is Finalized (state 2). */
export function claimBatch(rt: Runtime, kind: BatchKind, batchId: bigint) {
  return exec(rt, `claim:${kind}`, () =>
    rt.walletClient.writeContract({
      address: batcherAddress(kind),
      abi: batcherAbi,
      functionName: 'claim',
      args: [batchId, rt.account],
    })
  )
}

export type BatchInfo = { batchId: bigint; state: number }

/** 0=Open, 1=Dispatched, 2=Finalized. */
export async function batchInfo(rt: Runtime, kind: BatchKind, batchId: bigint): Promise<BatchInfo> {
  const state = await rt.publicClient.readContract({
    address: batcherAddress(kind),
    abi: batcherAbi,
    functionName: 'batchState',
    args: [batchId],
  })
  return { batchId, state: Number(state) }
}

function readContractBigint(rt: Runtime, address: Hex, functionName: 'currentBatchId') {
  return rt.publicClient.readContract({ address, abi: batcherAbi, functionName })
}
