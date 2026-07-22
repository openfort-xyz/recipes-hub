import { describe, expect, it } from "vitest";
import { deriveAuthScreen } from "./authGate";

describe("deriveAuthScreen", () => {
  it("stays loading before the SDK reports ready, regardless of user", () => {
    expect(deriveAuthScreen({ isReady: false, hasUser: false, staleSessionCleared: false })).toBe("loading");
    expect(deriveAuthScreen({ isReady: false, hasUser: true, staleSessionCleared: false })).toBe("loading");
    expect(deriveAuthScreen({ isReady: false, hasUser: true, staleSessionCleared: true })).toBe("loading");
  });

  it("stays loading once ready but before the stale-session check has completed", () => {
    expect(deriveAuthScreen({ isReady: true, hasUser: false, staleSessionCleared: false })).toBe("loading");
    // Especially this case: a session WAS restored by the SDK — must never render "app" here,
    // that's exactly the silent-auto-login this gate exists to prevent.
    expect(deriveAuthScreen({ isReady: true, hasUser: true, staleSessionCleared: false })).toBe("loading");
  });

  it("goes to login once the stale-session check is done and there's no user", () => {
    expect(deriveAuthScreen({ isReady: true, hasUser: false, staleSessionCleared: true })).toBe("login");
  });

  it("goes to app only once ready, checked, AND a user is present", () => {
    expect(deriveAuthScreen({ isReady: true, hasUser: true, staleSessionCleared: true })).toBe("app");
  });
});
