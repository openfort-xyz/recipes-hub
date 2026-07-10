/**
 * Holds freshly generated API keypairs in-memory between the two legs of ChangePubKey
 * registration (build message -> app signs -> submit). The private key never leaves the
 * server process; it's only surfaced in the `/submit` HTTP response so the operator can copy it
 * into LIGHTER_API_KEY_PRIVATE_KEY. Treat that response like a one-time secret reveal.
 */

interface PendingRegistration {
  privateKey: string;
  publicKey: string;
  apiKeyIndex: number;
  nonce: number;
  txInfo: string;
  txType: number;
  createdAt: number;
}

const PENDING_TTL_MS = 15 * 60 * 1000;
const pending = new Map<number, PendingRegistration>();

export function savePendingRegistration(accountIndex: number, entry: PendingRegistration): void {
  pending.set(accountIndex, entry);
}

export function takePendingRegistration(accountIndex: number): PendingRegistration | null {
  const entry = pending.get(accountIndex);
  if (!entry) return null;
  pending.delete(accountIndex);
  if (Date.now() - entry.createdAt > PENDING_TTL_MS) {
    return null;
  }
  return entry;
}
