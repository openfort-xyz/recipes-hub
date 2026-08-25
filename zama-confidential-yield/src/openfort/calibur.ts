import {
  type Address,
  concatHex,
  encodeAbiParameters,
  encodeFunctionData,
  type Hex,
  http,
  type PublicClient,
} from 'viem'
import {
  createBundlerClient,
  createPaymasterClient,
  entryPoint09Abi,
  entryPoint09Address,
  getUserOperationHash,
  type SmartAccount,
  toSmartAccount,
} from 'viem/account-abstraction'
import { CHAIN, CHAIN_ID } from '../contracts/addresses'

/**
 * Send the recipe's writes as sponsored UserOperations through Openfort's
 * bundler + paymaster, instead of `POST /v1/transaction_intents`.
 *
 * Why: a Delegated Account's first write has to carry an EIP-7702 authorization,
 * and building that server-side takes ~30s while the edge cuts the request at
 * 15s — so the account never delegates and every sponsored write dies as
 * "Transaction creation failed … Network Error". Building the UserOperation here
 * takes ~1.4s, and the delegation rides along in the same operation.
 *
 * We delegate to Calibur, the implementation Openfort uses natively, so once the
 * first operation lands the SDK's own `isDelegatedToImplementation` check passes
 * and its normal path works too.
 */

/** One call inside a batched UserOperation. */
export type Call = { to: Address; value?: bigint; data?: Hex }

/** Calibur implementation per chain. Openfort registers it as "CaliburV9". */
const CALIBUR_IMPLEMENTATION: Record<number, Address> = {
  11155111: '0x0909bABe99b0A5f8C1fbfcD5E2510E6c15082c53',
}

export function caliburImplementation(): Address {
  const address =
    (import.meta.env.VITE_CALIBUR_IMPLEMENTATION as Address | undefined) ||
    CALIBUR_IMPLEMENTATION[CHAIN_ID]
  if (!address) {
    throw new Error(
      `No Calibur implementation known for chain ${CHAIN_ID}. Look it up at ` +
        `https://www.openfort.io/docs/configuration/addresses and set VITE_CALIBUR_IMPLEMENTATION.`
    )
  }
  return address
}

/** `executeUserOp(PackedUserOperation,bytes32)` — Calibur reads its calls from the tail. */
const EXECUTE_USER_OP_SELECTOR = '0x8dd7712f'

/** BatchedCall { Call[] calls; bool revertOnFailure; }, Call { address to; uint256 value; bytes data; } */
const BATCHED_CALL = [
  {
    type: 'tuple',
    components: [
      {
        name: 'calls',
        type: 'tuple[]',
        components: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
      },
      { name: 'revertOnFailure', type: 'bool' },
    ],
  },
] as const

/**
 * Calibur expects `abi.encode(keyHash, signature, hookData)`. `bytes32(0)` is
 * `ROOT_KEY_HASH`, the account's own key. Openfort's build rejects a bare
 * 65-byte signature with `SliceOutOfBounds()`, unlike upstream Calibur.
 */
const ROOT_KEY_HASH = `0x${'00'.repeat(32)}` as Hex

function wrapSignature(signature: Hex): Hex {
  return encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'bytes' }, { type: 'bytes' }],
    [ROOT_KEY_HASH, signature, '0x']
  )
}

/** A structurally valid secp256k1 signature, so gas estimation recovers a wrong
 *  address instead of reverting inside Calibur's ECDSA check. */
const STUB_SIGNATURE = wrapSignature(`0x${'11'.repeat(32)}${'22'.repeat(32)}1b` as Hex)

/** Signs a 32-byte hash with no EIP-191 prefix — what Calibur's root key verifies. */
export type RawHashSigner = (hash: Hex) => Promise<Hex>

export async function toCaliburSmartAccount({
  client,
  address,
  signHash,
}: {
  client: PublicClient
  address: Address
  signHash: RawHashSigner
}): Promise<SmartAccount> {
  return toSmartAccount({
    client,
    entryPoint: { abi: entryPoint09Abi, address: entryPoint09Address, version: '0.9' },
    async getAddress() {
      return address
    },
    // EIP-7702: the delegation puts the code there, no factory deploys anything.
    async getFactoryArgs() {
      return { factory: '0x7702', factoryData: '0x' }
    },
    async encodeCalls(calls: readonly Call[]) {
      return concatHex([
        EXECUTE_USER_OP_SELECTOR,
        encodeAbiParameters(BATCHED_CALL, [
          {
            calls: calls.map((call) => ({
              to: call.to,
              value: call.value ?? 0n,
              data: call.data ?? '0x',
            })),
            revertOnFailure: true,
          },
        ]),
      ])
    },
    async getNonce({ key = 0n } = {}) {
      return client.readContract({
        address: entryPoint09Address,
        abi: entryPoint09Abi,
        functionName: 'getNonce',
        args: [address, key],
      })
    },
    async getStubSignature() {
      return STUB_SIGNATURE
    },
    async signUserOperation({ chainId = CHAIN_ID, ...userOperation }) {
      const hash = getUserOperationHash({
        chainId,
        entryPointAddress: entryPoint09Address,
        entryPointVersion: '0.9',
        userOperation: { ...userOperation, sender: address } as Parameters<
          typeof getUserOperationHash
        >[0]['userOperation'],
      })
      return wrapSignature(await signHash(hash))
    },
    async signMessage() {
      throw new Error('Sign messages with the wallet client, not the smart account.')
    },
    async signTypedData() {
      throw new Error('Sign typed data with the wallet client, not the smart account.')
    },
  })
}

export type SponsoredSender = ReturnType<typeof createSponsoredSender>

export function createSponsoredSender({
  account,
  client,
  publishableKey,
  feeSponsorshipId,
}: {
  account: SmartAccount
  client: PublicClient
  publishableKey: string
  feeSponsorshipId: string
}) {
  const transport = http(`https://api.openfort.io/rpc/${CHAIN_ID}`, {
    fetchOptions: { headers: { Authorization: `Bearer ${publishableKey}` } },
    timeout: 60_000,
  })

  const bundlerClient = createBundlerClient({
    account,
    chain: CHAIN,
    client,
    paymaster: createPaymasterClient({ transport }),
    paymasterContext: { policyId: feeSponsorshipId },
    transport,
  })

  return {
    account,
    /**
     * Send one or more calls as a single sponsored UserOperation, attaching the
     * EIP-7702 authorization the first time (before that the account has no code).
     */
    async send(calls: Call[], authorization?: unknown): Promise<Hex> {
      // The bundler's floor sits above the chain's own suggestion, and the
      // `pimlico_getUserOperationGasPrice` it points at isn't proxied. Overshoot.
      const fees = await client.estimateFeesPerGas()
      const maxPriorityFeePerGas = fees.maxPriorityFeePerGas * 20n
      const maxFeePerGas = fees.maxFeePerGas * 2n + maxPriorityFeePerGas

      const hash = await bundlerClient.sendUserOperation({
        calls,
        maxFeePerGas,
        maxPriorityFeePerGas,
        ...(authorization ? { authorization } : {}),
      } as Parameters<typeof bundlerClient.sendUserOperation>[0])

      const receipt = await bundlerClient.waitForUserOperationReceipt({ hash })
      if (!receipt.success) throw new Error(`UserOperation reverted: ${hash}`)
      return receipt.receipt.transactionHash
    },
  }
}

/** Encode a contract call into the `{ to, data }` shape `send` batches. */
export function toCall({
  address,
  abi,
  functionName,
  args,
}: {
  address: Address
  // biome-ignore lint/suspicious/noExplicitAny: viem's ABI generics don't survive this indirection
  abi: any
  functionName: string
  // biome-ignore lint/suspicious/noExplicitAny: same
  args?: any
}): Call {
  return { to: address, value: 0n, data: encodeFunctionData({ abi, functionName, args }) }
}
