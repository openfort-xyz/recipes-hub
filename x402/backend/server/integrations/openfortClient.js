import { Openfort } from "@openfort/openfort-node";

export function createOpenfortClient(secretKey) {
  if (!secretKey) {
    console.warn("⚠️  OPENFORT_SECRET_KEY missing. Shield session route will respond with an error.");
    return null;
  }
  return new Openfort(secretKey);
}
