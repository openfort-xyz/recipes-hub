import {
  predictAccountAddress,
  predictAddresses,
  populateAccountCreation,
  populateAccountSetup,
  accountQuery,
  AccountIntegrityStatus,
  type SetupConfig,
  type AccountQueryResult,
} from "@gnosispay/account-kit";
import { Contract, Interface, keccak256, toUtf8Bytes } from "ethers";
import { CARD_TOKEN, GNOSIS_CHAIN_ID, SETUP_ALLOWANCE, SETUP_DELAY } from "./constants";
import { getRpcProvider } from "./rpc";
import { eip1193SignTypedData, eip1193SendTransaction, type Eip1193Provider } from "./eip1193";
import { getSmartAccountAddress, isPaymasterActive, sponsoredRelay } from "./pimlico";

export { AccountIntegrityStatus, isPaymasterActive };
export type { AccountQueryResult };

type Tx = { to: string; value?: bigint | number; data: string };

/**
 * Send a populated transaction. With a Pimlico key configured it goes out as a
 * sponsored UserOperation from the relayer smart account (gasless); otherwise the
 * embedded EOA sends it and pays xDAI gas.
 */
async function relay(provider: Eip1193Provider, owner: string, tx: Tx): Promise<string> {
  return isPaymasterActive() ? sponsoredRelay(provider, owner, tx) : eip1193SendTransaction(provider, owner, tx);
}

/**
 * The address that sends transactions, holds the EURe to fund/spend, and is the
 * spend role-member: the Pimlico smart account when sponsored, else the EOA.
 */
export async function getRelayer(provider: Eip1193Provider, owner: string): Promise<string> {
  return isPaymasterActive() ? getSmartAccountAddress(provider, owner) : owner;
}

/** Deterministic Safe address for this owner's Gnosis Pay account (CREATE2). */
export function predictCardAccount(owner: string): string {
  return predictAccountAddress({ owner });
}

/** Step 1 — deploy the bare 1/1 Safe that will become the card account. */
export async function createCardAccount(provider: Eip1193Provider, owner: string): Promise<string> {
  return relay(provider, owner, populateAccountCreation({ owner }));
}

/**
 * Setup config mirrors a real Gnosis Pay account: a spending allowance gated by
 * the Roles module and a cooldown enforced by the Delay module. In production
 * `spender`/`receiver` are Gnosis Pay's Spender/Settlement Safes; here the relayer
 * is the spender (the spend role-member) and the owner is the receiver, so the
 * sandbox account is self-contained and self-custodial.
 */
export function buildSetupConfig(owner: string, relayer: string): SetupConfig {
  return {
    spender: relayer,
    receiver: owner,
    token: CARD_TOKEN.address,
    allowance: { period: SETUP_ALLOWANCE.period, refill: SETUP_ALLOWANCE.refill },
    delay: { cooldown: SETUP_DELAY.cooldown, expiration: SETUP_DELAY.expiration },
  };
}

async function readSafeNonce(account: string): Promise<number> {
  try {
    const safe = new Contract(account, ["function nonce() view returns (uint256)"], getRpcProvider());
    return Number((await safe.nonce()) as bigint);
  } catch {
    return 0;
  }
}

/** Step 2 — upgrade the Safe into a Gnosis Pay account (Roles + Delay + allowance). */
export async function setupCardAccount(
  provider: Eip1193Provider,
  owner: string,
  account: string
): Promise<string> {
  const [nonce, relayer] = await Promise.all([readSafeNonce(account), getRelayer(provider, owner)]);
  const sign = eip1193SignTypedData(provider, owner);
  const tx = await populateAccountSetup(
    { account, owner, chainId: GNOSIS_CHAIN_ID, nonce },
    buildSetupConfig(owner, relayer),
    sign
  );
  return relay(provider, owner, tx);
}

/** Read the account's integrity status and accrued spending allowance. */
export async function queryCardAccount(account: string): Promise<AccountQueryResult> {
  return accountQuery({ account, cooldown: SETUP_DELAY.cooldown }, (request) =>
    getRpcProvider().call({ to: request.to, data: request.data })
  );
}

export type CardStage = "not-created" | "needs-setup" | "active";

/**
 * Lifecycle stage of the card account. accountQuery alone can't distinguish a
 * never-deployed account (its calls to an empty address "succeed" with no data),
 * so we check on-chain code first and only query integrity once the Safe exists.
 */
export async function getCardStage(
  account: string
): Promise<{ stage: CardStage; allowance: AccountQueryResult["allowance"] | null }> {
  const code = await getRpcProvider().getCode(account);
  if (code === "0x") return { stage: "not-created", allowance: null };

  const query = await queryCardAccount(account);
  const active =
    query.status === AccountIntegrityStatus.Ok || query.status === AccountIntegrityStatus.DelayQueueNotEmpty;
  return { stage: active ? "active" : "needs-setup", allowance: query.allowance };
}

const STAGE_LABELS: Record<CardStage, string> = {
  "not-created": "Not created yet",
  "needs-setup": "Created — needs setup",
  active: "Active",
};

export function stageLabel(stage: CardStage): string {
  return STAGE_LABELS[stage];
}

// Key that account-kit's setup assigns the spending role + allowance under.
const SPENDING_ROLE_KEY = keccak256(toUtf8Bytes("SPENDING_ROLE"));

const rolesInterface = new Interface([
  "function execTransactionWithRole(address to, uint256 value, bytes data, uint8 operation, bytes32 roleKey, bool shouldRevert) returns (bool)",
]);
const transferInterface = new Interface(["function transfer(address to, uint256 amount) returns (bool)"]);

/** Fund the card: move `amount` of the card token from the relayer into the account Safe. */
export async function fundCard(
  provider: Eip1193Provider,
  owner: string,
  account: string,
  amount: bigint
): Promise<string> {
  const data = transferInterface.encodeFunctionData("transfer", [account, amount]);
  return relay(provider, owner, { to: CARD_TOKEN.address, data });
}

/**
 * Spend from the card — no second Safe needed. setup() assigned the relayer the
 * spending role on the account's Roles module, so the relayer calls it directly:
 * it transfers `amount` of the card token to the configured receiver (the owner),
 * but only up to the remaining allowance (the tx reverts otherwise).
 */
export async function spendFromCard(
  provider: Eip1193Provider,
  owner: string,
  account: string,
  amount: bigint
): Promise<string> {
  const roles = predictAddresses(account).roles;
  const transferData = transferInterface.encodeFunctionData("transfer", [owner, amount]);
  const data = rolesInterface.encodeFunctionData("execTransactionWithRole", [
    CARD_TOKEN.address,
    0,
    transferData,
    0, // OperationType.Call
    SPENDING_ROLE_KEY,
    true, // revert if the spend exceeds the allowance
  ]);
  return relay(provider, owner, { to: roles, data });
}
