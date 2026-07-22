import { readFile, writeFile } from "node:fs/promises";

const ENV_LOCAL_FILE = ".env.local";

const ENV_LINE_KEY = /^([A-Za-z_][A-Za-z0-9_]*)\s*=/;

/**
 * Upserts `updates` into `existingContent` as `KEY=value` lines: a key already present is
 * replaced in place, at its existing position, leaving every other line — comments, blank lines,
 * and keys not being updated — byte-for-byte untouched; a key that isn't present yet is appended.
 * Pure so the merge logic can be regression-tested without touching the filesystem — see
 * envFile.test.ts, including the explicit byte-for-byte preservation check for the Shield secrets
 * that live in the same file.
 */
export function mergeEnvFile(existingContent: string, updates: Readonly<Record<string, string>>): string {
  const remaining = new Map(Object.entries(updates));
  // split("\n") on content ending in "\n" produces a trailing "" artifact representing "nothing
  // after the last newline" — drop it before processing and restore the same trailing newline
  // (or lack of one) on the way out, so a file that had none doesn't gain one and vice versa.
  const hadTrailingNewline = existingContent.endsWith("\n");
  const lines = existingContent === "" ? [] : existingContent.split("\n");
  if (hadTrailingNewline) {
    lines.pop();
  }

  const merged = lines.map((line) => {
    const key = ENV_LINE_KEY.exec(line)?.[1];
    const value = key === undefined ? undefined : remaining.get(key);
    if (key === undefined || value === undefined) {
      return line;
    }
    remaining.delete(key);
    return `${key}=${value}`;
  });

  for (const [key, value] of remaining) {
    merged.push(`${key}=${value}`);
  }

  return merged.join("\n") + (hadTrailingNewline ? "\n" : "");
}

/**
 * Reads, merges, and rewrites server/.env.local with fresh Lighter credentials so a restart
 * survives without re-running onboarding. Writing key material to a plain file (rather than only
 * holding it in the running process) is a deliberate, recipe-appropriate scope call, not an
 * oversight: this is a single-operator dev tool, the file is already gitignored, and it sits in
 * the exact same trust domain as the Openfort Shield secrets that already live in it — anyone who
 * can read one can already read the other.
 *
 * `filePath` defaults to the real .env.local and is only overridden by tests.
 */
export async function updateEnvLocal(
  updates: Readonly<Record<string, string>>,
  filePath: string = ENV_LOCAL_FILE,
): Promise<void> {
  let existing: string;
  try {
    existing = await readFile(filePath, "utf8");
  } catch (err) {
    throw new Error(`Cannot adopt new Lighter credentials: ${filePath} does not exist or is unreadable.`, {
      cause: err,
    });
  }
  await writeFile(filePath, mergeEnvFile(existing, updates), "utf8");
}
