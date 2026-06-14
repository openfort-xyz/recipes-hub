import { toBeHex } from "ethers";
import type { SignTypedDataCallback } from "@gnosispay/account-kit";

export type Eip1193Provider = {
  request: (args: { method: string; params?: readonly unknown[] | object }) => Promise<unknown>;
};

// Canonical EIP-712 domain field order. eth_signTypedData_v4 needs an explicit
// EIP712Domain type, while account-kit (ethers-style) omits it — we re-add only
// the fields present, in canonical order, so the digest matches the contract.
const DOMAIN_FIELDS = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
  { name: "salt", type: "bytes32" },
] as const;

function domainTypes(domain: Record<string, unknown>) {
  return DOMAIN_FIELDS.filter((field) => domain[field.name] !== undefined);
}

function jsonReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

/**
 * Adapt an Openfort EIP-1193 provider into the account-kit signing callback.
 * The embedded wallet must be an EOA so the signature is plain ECDSA.
 */
export function eip1193SignTypedData(provider: Eip1193Provider, owner: string): SignTypedDataCallback {
  return async ({ domain, primaryType, types, message }) => {
    const payload = JSON.stringify(
      {
        domain,
        primaryType,
        types: { EIP712Domain: domainTypes(domain as Record<string, unknown>), ...types },
        message,
      },
      jsonReplacer
    );

    const signature = await provider.request({
      method: "eth_signTypedData_v4",
      params: [owner.toLowerCase(), payload],
    });
    return signature as string;
  };
}

/** Relay a populated account-kit transaction from the owner EOA. Returns the tx hash. */
export async function eip1193SendTransaction(
  provider: Eip1193Provider,
  from: string,
  tx: { to: string; value?: bigint | number; data: string }
): Promise<string> {
  const value = tx.value ? toBeHex(BigInt(tx.value)) : "0x0";
  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [{ from, to: tx.to, value, data: tx.data }],
  });
  return hash as string;
}
