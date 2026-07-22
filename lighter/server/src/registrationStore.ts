/**
 * Holds freshly generated API keypairs in-memory between the two legs of ChangePubKey
 * registration (build message -> app signs -> submit). The private key never leaves the server
 * process at all — on a successful submit it's adopted directly as the server's live trading key
 * and persisted to server/.env.local (see orders.ts's adoptServerKey), never sent back in the
 * HTTP response.
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
