import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mergeEnvFile, updateEnvLocal } from "./envFile.js";

const REAL_ENV_LOCAL = `PORT=3008
CORS_ORIGINS=

OPENFORT_SECRET_KEY=sk_test_db4791a5-148d-5860-9d2a-9dd9111b10f7

OPENFORT_SHIELD_PUBLISHABLE_KEY=83fa815d-7bc9-4d62-bc82-4328aa42fb1b
OPENFORT_SHIELD_SECRET_KEY=dde8c522e863c2dded7be60e5d242d177729336d665c86319f76f0e2e2e72535
OPENFORT_SHIELD_ENCRYPTION_KEY=AmDu8ycYutbpJ1ATjy60hmLIQVqyq8z63rLLSZmpoDVI

LIGHTER_API_BASE_URL=https://testnet.zklighter.elliot.ai
LIGHTER_CHAIN_ID=300

LIGHTER_MARKET_INDEX=0
LIGHTER_MARKET_SYMBOL=ETH

LIGHTER_ACCOUNT_INDEX=0
LIGHTER_API_KEY_PRIVATE_KEY=0xd42694aa374092600ac8986115ff5135370aff97e01b3bf08e2b47f910f4aa0b2b15a539a6781166
LIGHTER_API_KEY_INDEX=2
`;

describe("mergeEnvFile", () => {
  it("replaces an existing key in place, leaving surrounding lines untouched", () => {
    const result = mergeEnvFile("A=1\nB=2\nC=3\n", { B: "9" });
    expect(result).toBe("A=1\nB=9\nC=3\n");
  });

  it("preserves comments and blank lines exactly", () => {
    const input = "# a comment\n\nKEY=old\n\n# trailing comment\n";
    const result = mergeEnvFile(input, { KEY: "new" });
    expect(result).toBe("# a comment\n\nKEY=new\n\n# trailing comment\n");
  });

  it("appends a key that isn't present yet, preserving the file's trailing newline", () => {
    const result = mergeEnvFile("A=1\n", { B: "2" });
    expect(result).toBe("A=1\nB=2\n");
  });

  it("appends onto an empty file with no leading blank line", () => {
    const result = mergeEnvFile("", { A: "1" });
    expect(result).toBe("A=1");
  });

  it("updates every matching key when several are provided, in one pass", () => {
    const input = "A=1\nB=2\nC=3\n";
    const result = mergeEnvFile(input, { A: "10", C: "30" });
    expect(result).toBe("A=10\nB=2\nC=30\n");
  });

  it("does not touch a key whose name only partially matches (prefix collision)", () => {
    const result = mergeEnvFile("LIGHTER_ACCOUNT_INDEX_OLD=5\n", { LIGHTER_ACCOUNT_INDEX: "9" });
    expect(result).toBe("LIGHTER_ACCOUNT_INDEX_OLD=5\nLIGHTER_ACCOUNT_INDEX=9\n");
  });

  it("preserves the Shield secrets byte-for-byte when only the three Lighter keys are updated", () => {
    const result = mergeEnvFile(REAL_ENV_LOCAL, {
      LIGHTER_ACCOUNT_INDEX: "179",
      LIGHTER_API_KEY_INDEX: "2",
      LIGHTER_API_KEY_PRIVATE_KEY: "0xbrandnewkeymaterial",
    });

    expect(result).toContain("OPENFORT_SECRET_KEY=sk_test_db4791a5-148d-5860-9d2a-9dd9111b10f7");
    expect(result).toContain("OPENFORT_SHIELD_PUBLISHABLE_KEY=83fa815d-7bc9-4d62-bc82-4328aa42fb1b");
    expect(result).toContain(
      "OPENFORT_SHIELD_SECRET_KEY=dde8c522e863c2dded7be60e5d242d177729336d665c86319f76f0e2e2e72535",
    );
    expect(result).toContain("OPENFORT_SHIELD_ENCRYPTION_KEY=AmDu8ycYutbpJ1ATjy60hmLIQVqyq8z63rLLSZmpoDVI");
    expect(result).toContain("LIGHTER_ACCOUNT_INDEX=179");
    expect(result).toContain("LIGHTER_API_KEY_PRIVATE_KEY=0xbrandnewkeymaterial");

    // Every line untouched by the update must survive verbatim, in the same order.
    const untouchedLines = REAL_ENV_LOCAL.split("\n").filter(
      (line) => !line.startsWith("LIGHTER_ACCOUNT_INDEX=") && !line.startsWith("LIGHTER_API_KEY_PRIVATE_KEY="),
    );
    for (const line of untouchedLines) {
      expect(result).toContain(line);
    }
  });
});

describe("updateEnvLocal", () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "lighter-envfile-test-"));
    filePath = join(dir, ".env.local");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("reads, merges and rewrites the target file", async () => {
    await writeFile(filePath, REAL_ENV_LOCAL, "utf8");
    await updateEnvLocal(
      {
        LIGHTER_ACCOUNT_INDEX: "179",
        LIGHTER_API_KEY_INDEX: "3",
        LIGHTER_API_KEY_PRIVATE_KEY: "0xfreshprivatekey",
      },
      filePath,
    );
    const written = await readFile(filePath, "utf8");
    expect(written).toContain("LIGHTER_ACCOUNT_INDEX=179");
    expect(written).toContain("LIGHTER_API_KEY_INDEX=3");
    expect(written).toContain("LIGHTER_API_KEY_PRIVATE_KEY=0xfreshprivatekey");
    expect(written).toContain("OPENFORT_SHIELD_ENCRYPTION_KEY=AmDu8ycYutbpJ1ATjy60hmLIQVqyq8z63rLLSZmpoDVI");
  });

  it("throws a clear error instead of silently creating the file when it doesn't exist", async () => {
    const missingPath = join(dir, "does-not-exist.env.local");
    await expect(updateEnvLocal({ A: "1" }, missingPath)).rejects.toThrow(/does not exist or is unreadable/);
  });
});
