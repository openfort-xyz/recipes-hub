import { JsonRpcProvider } from "ethers";
import { GNOSIS_CHAIN_ID } from "./constants";
import { getGnosisRpcUrl } from "./config";

let cached: JsonRpcProvider | null = null;

/** Read-only Gnosis Chain provider used for balances, eth_call and receipts. */
export function getRpcProvider(): JsonRpcProvider {
  if (!cached) {
    cached = new JsonRpcProvider(getGnosisRpcUrl(), GNOSIS_CHAIN_ID, {
      staticNetwork: true,
    });
  }
  return cached;
}
