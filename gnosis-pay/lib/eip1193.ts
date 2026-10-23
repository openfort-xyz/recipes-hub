import { hexlify, toBeHex, toUtf8Bytes } from "ethers";

export type Eip1193Provider = {
  request: (args: { method: string; params?: readonly unknown[] | object }) => Promise<unknown>;
};

/** EIP-191 personal_sign, used for the Gnosis Pay SIWE message. */
export async function personalSign(provider: Eip1193Provider, from: string, message: string): Promise<string> {
  return (await provider.request({ method: "personal_sign", params: [hexlify(toUtf8Bytes(message)), from] })) as string;
}

/** Send a transaction from the embedded EOA. Returns the tx hash. */
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
