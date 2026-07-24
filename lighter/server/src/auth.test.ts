import { describe, expect, it } from "vitest";
import { isAuthorized } from "./auth.js";

describe("isAuthorized", () => {
  it("allows everything when no token is configured", () => {
    expect(isAuthorized("", undefined)).toBe(true);
    expect(isAuthorized("", "Bearer anything")).toBe(true);
  });

  it("requires the exact bearer token when configured", () => {
    expect(isAuthorized("s3cret", "Bearer s3cret")).toBe(true);
  });

  it("rejects a missing header when a token is configured", () => {
    expect(isAuthorized("s3cret", undefined)).toBe(false);
  });

  it("rejects a wrong token", () => {
    expect(isAuthorized("s3cret", "Bearer nope")).toBe(false);
  });

  it("rejects a malformed header (no Bearer prefix)", () => {
    expect(isAuthorized("s3cret", "s3cret")).toBe(false);
  });
});
