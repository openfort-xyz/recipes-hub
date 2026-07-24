import { describe, expect, it } from "vitest";
import { checkAccountMatch } from "./routes.js";

describe("checkAccountMatch", () => {
  it("returns null (no error) when the request account matches the server's configured account", () => {
    expect(checkAccountMatch(175, 175)).toBeNull();
  });

  it("returns a clear error when the request account differs from the server's — the split-brain case", () => {
    const error = checkAccountMatch(171, 175);
    expect(error).toContain("account 171");
    expect(error).toContain("account 175");
    expect(error).toContain(".env.local");
  });

  it("returns an error when the server has no account configured at all", () => {
    const error = checkAccountMatch(null, 175);
    expect(error).toContain("account none");
    expect(error).toContain("account 175");
  });
});
