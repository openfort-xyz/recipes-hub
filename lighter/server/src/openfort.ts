import { Openfort } from "@openfort/openfort-node";
import type { Config } from "./config.js";

export function createOpenfortClient(config: Config): Openfort | null {
  if (!config.openfort.secretKey) {
    return null;
  }
  return new Openfort(config.openfort.secretKey);
}

export async function createEncryptionSession(
  openfortClient: Openfort,
  shield: Config["openfort"]["shield"],
): Promise<string> {
  return openfortClient.createEncryptionSession(
    shield.publishableKey,
    shield.secretKey,
    shield.encryptionShare,
  );
}
