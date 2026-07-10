import { describe, expect, it } from "vitest";
import { classifySelfTestOutcome, INVALID_SIGNATURE_CODE } from "./keySelfTest.js";
import { LighterApiError } from "./lighterApi.js";

describe("classifySelfTestOutcome", () => {
  it("classifies the exact stale-key signature as invalid", () => {
    const error = new LighterApiError("invalid signature", INVALID_SIGNATURE_CODE, 400);
    expect(classifySelfTestOutcome(error)).toBe("invalid");
  });

  it("does not classify a generic Lighter error as invalid — only the specific signature code counts", () => {
    // e.g. the generic 29500 "internal server error" this recipe has seen for unrelated failure
    // classes (see FRICTION_LOG.md's sendTx error code entry) — a false positive here would send
    // an operator chasing a key rotation that never happened.
    const error = new LighterApiError("internal server error", 29500, 400);
    expect(classifySelfTestOutcome(error)).toBe("valid");
  });

  it("does not classify a network error as invalid — a blip shouldn't false-alarm the operator", () => {
    expect(classifySelfTestOutcome(new TypeError("fetch failed"))).toBe("valid");
  });

  it("does not classify success (no error) as invalid", () => {
    expect(classifySelfTestOutcome(undefined)).toBe("valid");
  });

  it("does not classify a LighterApiError with no code as invalid", () => {
    expect(classifySelfTestOutcome(new LighterApiError("unknown"))).toBe("valid");
  });
});
