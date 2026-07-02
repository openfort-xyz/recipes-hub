import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createPublicClient, http, toHex } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { toAccount } from "viem/accounts";
import { gnosis } from "viem/chains";
import { getGnosisRpcUrl, getPimlicoApiKey, getPimlicoSponsorshipPolicyId } from "./config";
import { eip1193SignTypedData, type Eip1193Provider } from "./eip1193";

/** True when a Pimlico API key is configured — on-chain actions are then gasless. */
export function isPaymasterActive(): boolean {
  return !!getPimlicoApiKey();
}

const entryPoint = { address: entryPoint07Address, version: "0.7" as const };

/**
 * A viem account bound to the embedded EOA's *known* active address. It signs via
 * the Openfort provider's `eth_signTypedData_v4` (which Openfort signs as a standard
 * EOA EIP-712 signature). Binding the address explicitly avoids permissionless's
 * `eth_requestAccounts` path, so `from` always matches Openfort's active signer.
 * A Safe smart account signs its UserOperations with typed data — not `personal_sign`,
 * which Openfort re-hashes and would corrupt the signature.
 */
function ownerAccount(provider: Eip1193Provider, owner: string) {
  const signTyped = eip1193SignTypedData(provider, owner);
  return toAccount({
    address: owner as `0x${string}`,
    async signMessage({ message }) {
      const data = typeof message === "string" ? toHex(message) : (message.raw as `0x${string}`);
      return (await provider.request({ method: "personal_sign", params: [data, owner.toLowerCase()] })) as `0x${string}`;
    },
    async signTypedData(typedData) {
      return (await signTyped(typedData as Parameters<typeof signTyped>[0])) as `0x${string}`;
    },
    async signTransaction() {
      throw new Error("Smart account owner does not sign raw transactions");
    },
  });
}

type SmartAccountClient = Awaited<ReturnType<typeof buildClient>>;
let cache: { key: string; client: SmartAccountClient } | null = null;

async function buildClient(provider: Eip1193Provider, owner: string) {
  const apiKey = getPimlicoApiKey();
  if (!apiKey) {
    throw new Error("[PIMLICO] No API key configured.");
  }
  const pimlicoUrl = `https://api.pimlico.io/v2/${gnosis.id}/rpc?apikey=${apiKey}`;

  const publicClient = createPublicClient({ chain: gnosis, transport: http(getGnosisRpcUrl()) });
  const pimlicoClient = createPimlicoClient({ transport: http(pimlicoUrl), entryPoint });

  const account = await toSafeSmartAccount({
    client: publicClient,
    owners: [ownerAccount(provider, owner)],
    version: "1.4.1",
    entryPoint,
  });

  const sponsorshipPolicyId = getPimlicoSponsorshipPolicyId();
  return createSmartAccountClient({
    account,
    chain: gnosis,
    bundlerTransport: http(pimlicoUrl),
    paymaster: pimlicoClient,
    // On mainnet the paymaster needs a sponsorship policy; pass it if provided.
    ...(sponsorshipPolicyId ? { paymasterContext: { sponsorshipPolicyId } } : {}),
    userOperation: {
      estimateFeesPerGas: async () => (await pimlicoClient.getUserOperationGasPrice()).fast,
    },
  });
}

async function getClient(provider: Eip1193Provider, owner: string): Promise<SmartAccountClient> {
  const key = owner.toLowerCase();
  if (cache?.key === key) {
    return cache.client;
  }
  const client = await buildClient(provider, owner);
  cache = { key, client };
  return client;
}

/**
 * Address of the sponsored relayer (a Pimlico Safe smart account owned by the
 * embedded EOA). It is the tx sender, the spend role-member, and where EURe is held.
 */
export async function getSmartAccountAddress(provider: Eip1193Provider, owner: string): Promise<string> {
  return (await getClient(provider, owner)).account.address;
}

/** Relay a populated transaction as a sponsored UserOperation. Returns the tx hash. */
export async function sponsoredRelay(
  provider: Eip1193Provider,
  owner: string,
  tx: { to: string; data: string; value?: bigint | number }
): Promise<string> {
  const client = await getClient(provider, owner);
  return client.sendTransaction({
    to: tx.to as `0x${string}`,
    data: tx.data as `0x${string}`,
    value: tx.value ? BigInt(tx.value) : 0n,
  });
}
