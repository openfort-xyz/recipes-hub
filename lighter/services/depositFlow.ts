import { encodeFunctionData, erc20Abi, parseUnits } from "viem";

import { getLighterDepositContractAddress, getUsdcContractAddress } from "../utils/config";

/**
 * Lighter's L1 deposit contract ABI, reconstructed from the verified implementation source
 * (proxy 0x3B4D794a66304F130a4Db8F2551B0070dfCf5ca7 -> impl
 * 0x831EF69BaB8AF8B1037a4961B8d0674b124E7008 on Ethereum mainnet, via Blockscout) since
 * apidocs.lighter.xyz only documents the function selector and a prose parameter description,
 * not an ABI. Independently confirmed by matching keccak256("deposit(address,uint16,uint8,uint256)")
 * against the documented 0x8a857083 selector.
 */
const DEPOSIT_ABI = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [
      { name: "_to", type: "address" },
      { name: "_assetIndex", type: "uint16" },
      { name: "_routeType", type: "uint8" },
      { name: "_amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

// Verified on-chain via eth_call: USDC_ASSET_INDEX() (selector 0x7de213eb) and
// tokenToAssetIndex(USDC_CONTRACT_ADDRESS) (selector 0x899cfa29) both return 3.
const USDC_ASSET_INDEX = 3;
// _routeType: 0 = perps margin (USDC-only), 1 = spot. This recipe only trades the ETH perp market.
const ROUTE_TYPE_PERPS = 0;
const USDC_DECIMALS = 6;
const USDC_MIN_DEPOSIT = "1"; // apidocs.lighter.xyz: "1 USDC, or equivalent, minimum" for direct L1 deposits

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
}

async function sendTransaction(
  provider: Eip1193Provider,
  from: `0x${string}`,
  to: `0x${string}`,
  data: `0x${string}`,
  value = "0x0",
): Promise<string> {
  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [{ from, to, data, value }],
  });
  return txHash as string;
}

export function validateDepositAmount(amount: string): string | null {
  const parsed = Number.parseFloat(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "Enter a positive USDC amount.";
  }
  if (parsed < Number.parseFloat(USDC_MIN_DEPOSIT)) {
    return `Minimum deposit is ${USDC_MIN_DEPOSIT} USDC.`;
  }
  return null;
}

export async function getUsdcAllowance(
  provider: Eip1193Provider,
  ownerAddress: `0x${string}`,
): Promise<bigint> {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "allowance",
    args: [ownerAddress, getLighterDepositContractAddress()],
  });
  const result = await provider.request({
    method: "eth_call",
    params: [{ to: getUsdcContractAddress(), data }, "latest"],
  });
  return BigInt(result as string);
}

/** Approves the exact deposit amount (not unlimited) — this is a recipe, prefer least-privilege. */
export async function approveUsdc(
  provider: Eip1193Provider,
  ownerAddress: `0x${string}`,
  amountHuman: string,
): Promise<string> {
  const amount = parseUnits(amountHuman, USDC_DECIMALS);
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [getLighterDepositContractAddress(), amount],
  });
  return sendTransaction(provider, ownerAddress, getUsdcContractAddress(), data);
}

export async function depositUsdc(
  provider: Eip1193Provider,
  ownerAddress: `0x${string}`,
  amountHuman: string,
): Promise<string> {
  const amount = parseUnits(amountHuman, USDC_DECIMALS);
  const data = encodeFunctionData({
    abi: DEPOSIT_ABI,
    functionName: "deposit",
    args: [ownerAddress, USDC_ASSET_INDEX, ROUTE_TYPE_PERPS, amount],
  });
  return sendTransaction(provider, ownerAddress, getLighterDepositContractAddress(), data);
}
