import { writeFile } from "node:fs/promises";
import type { Config } from "./config.js";
import { getNextNonce, sendTx } from "./lighterApi.js";
import { savePendingRegistration, takePendingRegistration } from "./registrationStore.js";
import { createSigningClient, generateApiKey, loadSigner, signChangePubKey } from "../signer/signer.js";

const PENDING_ENV_FILE = ".env.pending";

/**
 * A ChangePubKey submit is a one-time secret reveal — the printed value is the only copy of
 * this key that will ever exist. Console output alone isn't durable enough: a discarded
 * terminal, a lost SSH session, or simply scrolling past it loses the key permanently, and
 * ChangePubKey has no "show me the current key again" — the only recovery is signing a NEW one,
 * which rotates the on-chain key and invalidates whatever the server was already holding (see
 * FRICTION_LOG.md's key-rotation entry). Writing to a git-ignored local file survives all of
 * that; it's still local-only and never touches log aggregators the way stdout can.
 */
async function persistPendingCredentials(result: {
  accountIndex: number;
  apiKeyIndex: number;
  apiKeyPrivateKey: string;
}): Promise<void> {
  const contents =
    `# Generated ${new Date().toISOString()} after a successful ChangePubKey registration for\n` +
    `# account ${result.accountIndex} (apiKeyIndex ${result.apiKeyIndex}). Merge these three lines into\n` +
    "# .env.local and restart the server. This file is overwritten by the next registration —\n" +
    "# copy the values out before signing again.\n" +
    `LIGHTER_ACCOUNT_INDEX=${result.accountIndex}\n` +
    `LIGHTER_API_KEY_INDEX=${result.apiKeyIndex}\n` +
    `LIGHTER_API_KEY_PRIVATE_KEY=${result.apiKeyPrivateKey}\n`;
  try {
    await writeFile(PENDING_ENV_FILE, contents, "utf8");
  } catch (err) {
    // Best-effort — the app still shows the values on screen even if this write fails, so don't
    // fail the whole registration over a filesystem error.
    console.error(`Failed to write ${PENDING_ENV_FILE}:`, err instanceof Error ? err.message : err);
  }
}

/**
 * Builds the ChangePubKey registration message for the L1 (Openfort embedded) wallet to
 * personal_sign, self-signed by a freshly generated API keypair.
 *
 * The Poseidon-Schnorr (L2) signature only covers chain id / tx type / nonce / expiry /
 * account+key indices / pubkey — never L1Sig (see docs/lighter-signing-notes.md) — so the
 * returned txInfo always carries an empty L1Sig that gets spliced in after the wallet signs
 * `messageToSign`, with no need to re-sign anything server-side. The private key is held
 * in-memory (registrationStore) and never sent to the app.
 */
export async function buildChangePubKeyRegistration(config: Config, accountIndex: number) {
  await loadSigner();
  const { privateKey, publicKey } = generateApiKey();
  const apiKeyIndex = config.lighter.apiKeyIndex;
  const nonce = await getNextNonce(config, accountIndex, apiKeyIndex);
  // SignChangePubKey is self-signed by the very key being registered (see
  // docs/lighter-signing-notes.md), so the signing client for this call must be created from
  // the freshly generated key, not the server's existing (if any) trading key.
  createSigningClient(config.lighter.apiBaseUrl, privateKey, config.lighter.chainId, apiKeyIndex, accountIndex);
  const signed = signChangePubKey({
    pubKeyHex: publicKey,
    nonce,
    apiKeyIndex,
    accountIndex,
  });
  savePendingRegistration(accountIndex, {
    privateKey,
    publicKey,
    apiKeyIndex,
    nonce,
    txInfo: signed.txInfo,
    txType: signed.txType,
    createdAt: Date.now(),
  });
  return {
    apiKeyIndex,
    accountIndex,
    nonce,
    messageToSign: signed.messageToSign ?? "",
  };
}

export class NoPendingRegistrationError extends Error {
  constructor() {
    super("No pending ChangePubKey registration found for this account (or it expired — request a new message).");
    this.name = "NoPendingRegistrationError";
  }
}

/**
 * Splices the L1 wallet's personal_sign signature into the pending txInfo and submits it.
 * Returns the freshly generated private key ONCE so the operator can persist it into
 * LIGHTER_API_KEY_PRIVATE_KEY — treat this response like a one-time secret reveal.
 */
export async function submitChangePubKeyRegistration(config: Config, accountIndex: number, l1Sig: string) {
  const pending = takePendingRegistration(accountIndex);
  if (!pending) {
    throw new NoPendingRegistrationError();
  }
  const txInfo = JSON.parse(pending.txInfo) as Record<string, unknown>;
  txInfo["L1Sig"] = l1Sig;
  const result = await sendTx(config, pending.txType, JSON.stringify(txInfo));
  const registration = {
    txHash: result.tx_hash,
    apiKeyIndex: pending.apiKeyIndex,
    accountIndex,
    apiKeyPrivateKey: pending.privateKey,
    apiKeyPublicKey: pending.publicKey,
  };
  await persistPendingCredentials(registration);
  return registration;
}
