import { Contract } from "ethers";
import { getRpcProvider } from "./rpc";

const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];

/** ERC-20 balance (raw units) of `owner`, read from the Gnosis RPC. */
export async function getTokenBalance(token: string, owner: string): Promise<bigint> {
  const contract = new Contract(token, ERC20_ABI, getRpcProvider());
  return (await contract.balanceOf(owner)) as bigint;
}

/** Native xDAI balance (raw units) of `owner`. */
export async function getNativeBalance(owner: string): Promise<bigint> {
  return getRpcProvider().getBalance(owner);
}

/** Wait for a relayed transaction to be mined. Returns true on success. */
export async function waitForTx(hash: string): Promise<boolean> {
  const receipt = await getRpcProvider().waitForTransaction(hash, 1, 60_000);
  return receipt?.status === 1;
}
