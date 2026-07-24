import type { Config } from "./config.js";
import { getNextNonce, sendTx } from "./lighterApi.js";
import { adoptServerKey } from "./orders.js";
import { savePendingRegistration, takePendingRegistration } from "./registrationStore.js";
import { createSigningClient, generateApiKey, loadSigner, signChangePubKey } from "../signer/signer.js";

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
 * Splices the L1 wallet's personal_sign signature into the pending txInfo, submits it, and — once
 * Lighter confirms the registration — has the server adopt the fresh key as its own live trading
 * key (see orders.ts's adoptServerKey): no operator step, no restart, no printed secret to copy.
 * The private key itself never leaves this function; the response only carries information that's
 * safe to show on screen (see routes.ts's handleChangePubKeySubmit).
 */
export async function submitChangePubKeyRegistration(config: Config, accountIndex: number, l1Sig: string) {
  const pending = takePendingRegistration(accountIndex);
  if (!pending) {
    throw new NoPendingRegistrationError();
  }
  const txInfo = JSON.parse(pending.txInfo) as Record<string, unknown>;
  txInfo["L1Sig"] = l1Sig;
  const result = await sendTx(config, pending.txType, JSON.stringify(txInfo));
  await adoptServerKey(config, {
    accountIndex,
    apiKeyIndex: pending.apiKeyIndex,
    apiKeyPrivateKey: pending.privateKey,
  });
  return {
    txHash: result.tx_hash,
    apiKeyIndex: pending.apiKeyIndex,
    accountIndex,
    apiKeyPublicKey: pending.publicKey,
  };
}
