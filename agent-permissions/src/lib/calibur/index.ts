import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type LocalAccount,
    type PrivateKeyAccount,
    type Transport,
    type Prettify,
    encodeAbiParameters,
    encodeFunctionData,
    getAddress,
    keccak256,
    numberToHex,
    parseAbiParameters,
} from "viem";
import {
    type SmartAccount,
    type SmartAccountImplementation,
    entryPoint08Abi,
    entryPoint08Address,
    getUserOperationTypedData,
    toSmartAccount,
} from "viem/account-abstraction";
import { getChainId, readContract } from "viem/actions";
import { getAction, parseAbi } from "viem/utils";

// =============================================================================
// Constants
// =============================================================================

// Calibur v0.8 implementation
const CALIBUR_ADDRESS = "0x000000009b1d0af20d8c6d0a44e162d11f9b8f00" as Address;

// Root key hash (owner EOA sentinel)
const ROOT_KEY = "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

// Stub signature for gas estimation
const STUB_SIG = "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c" as Hex;

// Calibur key management ABI (register/update/revoke are onlyThis self-calls)
const caliburAbi = parseAbi([
  'function register((uint8 keyType, bytes publicKey) key)',
  'function update(bytes32 keyHash, uint256 settings)',
  'function revoke(bytes32 keyHash)',
  'function getKey(bytes32 keyHash) view returns ((uint8 keyType, bytes publicKey))',
  'function getKeySettings(bytes32 keyHash) view returns (uint256)',
  'function keyCount() view returns (uint256)',
  'function keyAt(uint256 i) view returns ((uint8 keyType, bytes publicKey))',
  'function isRegistered(bytes32 keyHash) view returns (bool)',
])

// =============================================================================
// Types
// =============================================================================

export const KeyType = {
  P256: 0,
  WebAuthnP256: 1,
  Secp256k1: 2,
} as const

export type CaliburKey = {
  keyType: (typeof KeyType)[keyof typeof KeyType]
  publicKey: Hex
}

export type KeySettings = {
  isAdmin: boolean
  expiration: number
  hook: Address
}

export type SelfCall = {
  to: Address
  value: bigint
  data: Hex
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CaliburAccountConfig = {
    client: Client<Transport, Chain | undefined, any>;
    owner: LocalAccount;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CaliburSessionConfig = {
    client: Client<Transport, Chain | undefined, any>;
    signer: LocalAccount;
    accountAddress: Address;
    keyHash: Hex;
};

export type CaliburSmartAccountImplementation = SmartAccountImplementation<
    typeof entryPoint08Abi,
    "0.8",
    { owner: PrivateKeyAccount },
    true // EIP-7702
>;

export type CaliburSmartAccountReturnType = Prettify<
    SmartAccount<CaliburSmartAccountImplementation>
>;

// =============================================================================
// Main Function
// =============================================================================

/**
 * Create a Calibur Smart Account (v0.8)
 *
 * @example
 * ```ts
 * const account = await createCaliburAccount({
 *     client,
 *     owner: privateKeyToAccount(privateKey),
 * });
 * ```
 */
export async function createCaliburAccount(config: CaliburAccountConfig): Promise<CaliburSmartAccountReturnType> {
    const { client, owner } = config;
    const localOwner = owner as PrivateKeyAccount;

    const entryPoint = {
        address: entryPoint08Address,
        abi: entryPoint08Abi,
        version: "0.8" as const,
    };

    let chainId: number;
    const getChainIdCached = async () => {
        if (chainId) return chainId;
        chainId = client.chain?.id ?? await getAction(client, getChainId, "getChainId")({});
        return chainId;
    };

    return toSmartAccount({
        client,
        entryPoint,
        authorization: { address: CALIBUR_ADDRESS, account: localOwner },
        getFactoryArgs: async () => ({ factory: "0x7702" as Address, factoryData: "0x" as Hex }),

        async getAddress() {
            return localOwner.address;
        },

        async encodeCalls(calls) {
            const callTuples = calls.map(c => [c.to, c.value ?? BigInt(0), c.data ?? "0x"] as const);
            const encoded = encodeAbiParameters(
                parseAbiParameters("((address,uint256,bytes)[],bool)"),
                [[callTuples, true]],
            );
            return `0x8dd7712f${encoded.slice(2)}` as Hex; // executeUserOp selector
        },

        async getNonce({ key = BigInt(0) } = {}) {
            return readContract(client, {
                abi: parseAbi(["function getNonce(address, uint192) pure returns (uint256)"]),
                address: entryPoint.address,
                functionName: "getNonce",
                args: [localOwner.address, key],
            });
        },

        async getStubSignature() {
            return encodeAbiParameters(
                parseAbiParameters("bytes32,bytes,bytes"),
                [ROOT_KEY, STUB_SIG, "0x"],
            );
        },

        async sign({ hash }) {
            return localOwner.signMessage({ message: hash });
        },

        async signMessage({ message }) {
            return localOwner.signMessage({ message });
        },

        async signTypedData(params) {
            return localOwner.signTypedData(params as Parameters<typeof localOwner.signTypedData>[0]);
        },

        async signUserOperation(params) {
            const chainIdValue = params.chainId ?? await getChainIdCached();

            const typedData = getUserOperationTypedData({
                chainId: chainIdValue,
                entryPointAddress: entryPoint.address,
                userOperation: { ...params, sender: localOwner.address, signature: "0x" },
            });

            const sig = await localOwner.signTypedData(typedData);

            return encodeAbiParameters(
                parseAbiParameters("bytes32,bytes,bytes"),
                [ROOT_KEY, sig, "0x"],
            );
        },
    }) as unknown as Promise<CaliburSmartAccountReturnType>;
}

/**
 * Create a Calibur session account — a registered key executing on behalf of another account.
 * Used by backend wallets to send sponsored UserOperations through the user's Calibur account.
 */
export async function createCaliburSessionAccount(config: CaliburSessionConfig): Promise<CaliburSmartAccountReturnType> {
    const { client, signer, accountAddress, keyHash } = config;
    const localSigner = signer as PrivateKeyAccount;

    const entryPoint = {
        address: entryPoint08Address,
        abi: entryPoint08Abi,
        version: "0.8" as const,
    };

    let chainId: number;
    const getChainIdCached = async () => {
        if (chainId) return chainId;
        chainId = client.chain?.id ?? await getAction(client, getChainId, "getChainId")({});
        return chainId;
    };

    return toSmartAccount({
        client,
        entryPoint,
        getFactoryArgs: async () => ({ factory: "0x7702" as Address, factoryData: "0x" as Hex }),

        async getAddress() {
            return accountAddress;
        },

        async encodeCalls(calls) {
            const callTuples = calls.map(c => [c.to, c.value ?? BigInt(0), c.data ?? "0x"] as const);
            const encoded = encodeAbiParameters(
                parseAbiParameters("((address,uint256,bytes)[],bool)"),
                [[callTuples, true]],
            );
            return `0x8dd7712f${encoded.slice(2)}` as Hex; // executeUserOp selector
        },

        async getNonce({ key = BigInt(0) } = {}) {
            return readContract(client, {
                abi: parseAbi(["function getNonce(address, uint192) pure returns (uint256)"]),
                address: entryPoint.address,
                functionName: "getNonce",
                args: [accountAddress, key],
            });
        },

        async getStubSignature() {
            return encodeAbiParameters(
                parseAbiParameters("bytes32,bytes,bytes"),
                [keyHash, STUB_SIG, "0x"],
            );
        },

        async sign({ hash }) {
            return localSigner.signMessage({ message: hash });
        },

        async signMessage({ message }) {
            return localSigner.signMessage({ message });
        },

        async signTypedData(params) {
            return localSigner.signTypedData(params as Parameters<typeof localSigner.signTypedData>[0]);
        },

        async signUserOperation(params) {
            const chainIdValue = params.chainId ?? await getChainIdCached();

            const typedData = getUserOperationTypedData({
                chainId: chainIdValue,
                entryPointAddress: entryPoint.address,
                userOperation: { ...params, sender: accountAddress, signature: "0x" },
            });

            const sig = normalizeSignature(await localSigner.signTypedData(typedData));

            return encodeAbiParameters(
                parseAbiParameters("bytes32,bytes,bytes"),
                [keyHash, sig, "0x"],
            );
        },
    }) as unknown as Promise<CaliburSmartAccountReturnType>;
}

// =============================================================================
// Key Helpers
// =============================================================================

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address

/**
 * Normalize an ECDSA signature so v is 27 or 28.
 * Some signers return v as 0 or 1 (compact form).
 */
function normalizeSignature(sig: Hex): Hex {
    if (sig.length !== 132) return sig // not 65 bytes
    const v = parseInt(sig.slice(130, 132), 16)
    if (v < 27) {
        return `${sig.slice(0, 130)}${(v + 27).toString(16).padStart(2, "0")}` as Hex
    }
    return sig
}

/**
 * Hash a CaliburKey the same way `KeyLib.hash()` does onchain:
 * `keccak256(abi.encode(keyType, keccak256(publicKey)))`
 */
export function hashKey(key: CaliburKey): Hex {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("uint8, bytes32"),
      [key.keyType, keccak256(key.publicKey)],
    ),
  )
}

/**
 * Pack `KeySettings` into the uint256 bit layout used onchain:
 * `(isAdmin << 200) | (expiration << 160) | hook`
 */
export function packSettings(settings: KeySettings): bigint {
  const admin = settings.isAdmin ? BigInt(1) : BigInt(0)
  const exp = BigInt(settings.expiration)
  const hook = BigInt(getAddress(settings.hook))
  return (admin << BigInt(200)) | (exp << BigInt(160)) | hook
}

/**
 * Unpack a uint256 settings value into its three fields.
 */
export function unpackSettings(packed: bigint): KeySettings {
  const hookMask = (BigInt(1) << BigInt(160)) - BigInt(1)
  const hook = getAddress(numberToHex(packed & hookMask, { size: 20 }))
  const expiration = Number((packed >> BigInt(160)) & ((BigInt(1) << BigInt(40)) - BigInt(1)))
  const isAdmin = ((packed >> BigInt(200)) & BigInt(1)) === BigInt(1)
  return { isAdmin, expiration, hook }
}

// =============================================================================
// Self-call encoders (for BatchedCall / UserOperation)
// =============================================================================

/**
 * Encode a `register(key)` self-call.
 */
export function encodeRegisterKey(key: CaliburKey): SelfCall {
  return {
    to: ZERO_ADDRESS,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: caliburAbi,
      functionName: "register",
      args: [{ keyType: key.keyType, publicKey: key.publicKey }],
    }),
  }
}

/**
 * Encode an `update(keyHash, settings)` self-call.
 */
export function encodeUpdateKeySettings(keyHash: Hex, settings: KeySettings): SelfCall {
  return {
    to: ZERO_ADDRESS,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: caliburAbi,
      functionName: "update",
      args: [keyHash, packSettings(settings)],
    }),
  }
}

/**
 * Encode a `revoke(keyHash)` self-call.
 */
export function encodeRevokeKey(keyHash: Hex): SelfCall {
  return {
    to: ZERO_ADDRESS,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: caliburAbi,
      functionName: "revoke",
      args: [keyHash],
    }),
  }
}

// =============================================================================
// Read functions
// =============================================================================

/**
 * Read a registered key by its hash.
 */
export async function getCaliburKey(
  client: Client<Transport, Chain | undefined>,
  account: Address,
  keyHash: Hex,
): Promise<CaliburKey> {
  const result = await readContract(client, {
    abi: caliburAbi,
    address: account,
    functionName: "getKey",
    args: [keyHash],
  })
  return { keyType: result.keyType as CaliburKey["keyType"], publicKey: result.publicKey }
}

/**
 * Read the settings for a registered key.
 */
export async function getCaliburKeySettings(
  client: Client<Transport, Chain | undefined>,
  account: Address,
  keyHash: Hex,
): Promise<KeySettings> {
  const packed = await readContract(client, {
    abi: caliburAbi,
    address: account,
    functionName: "getKeySettings",
    args: [keyHash],
  })
  return unpackSettings(packed)
}

/**
 * Enumerate all registered keys on a Calibur account.
 */
export async function getRegisteredKeys(
  client: Client<Transport, Chain | undefined>,
  account: Address,
): Promise<Array<{ key: CaliburKey; keyHash: Hex }>> {
  const count = await readContract(client, {
    abi: caliburAbi,
    address: account,
    functionName: "keyCount",
  })

  const results: Array<{ key: CaliburKey; keyHash: Hex }> = []
  for (let i = BigInt(0); i < count; i = i + BigInt(1)) {
    const result = await readContract(client, {
      abi: caliburAbi,
      address: account,
      functionName: "keyAt",
      args: [i],
    })
    const key: CaliburKey = { keyType: result.keyType as CaliburKey["keyType"], publicKey: result.publicKey }
    results.push({ key, keyHash: hashKey(key) })
  }
  return results
}

/**
 * Check if a key is registered on a Calibur account.
 */
export async function isCaliburKeyRegistered(
  client: Client<Transport, Chain | undefined>,
  account: Address,
  keyHash: Hex,
): Promise<boolean> {
  return readContract(client, {
    abi: caliburAbi,
    address: account,
    functionName: "isRegistered",
    args: [keyHash],
  })
}

// =============================================================================
// Execute encoder
// =============================================================================

const executeAbi = parseAbi([
  'function execute(((address to, uint256 value, bytes data)[] calls, bool revertOnFailure) batchedCall)',
])

/**
 * Encode a direct `execute(BatchedCall)` call for the Calibur account.
 * The returned `data` can be sent as a transaction to the user's own address.
 */
export function encodeExecute(calls: SelfCall[], revertOnFailure = true): Hex {
  return encodeFunctionData({
    abi: executeAbi,
    functionName: 'execute',
    args: [{ calls, revertOnFailure }],
  })
}

// =============================================================================
// Re-exports
// =============================================================================

export { CALIBUR_ADDRESS };
