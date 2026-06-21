import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function importFreshJwtSecret() {
  vi.resetModules();
  return import("./jwtSecret");
}

describe("JWT secret configuration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("throws in production when JWT_SECRET is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "");
    const { getJwtSecretKey } = await importFreshJwtSecret();

    expect(() => getJwtSecretKey()).toThrow("JWT_SECRET is required in production.");
  });

  it("throws in production when JWT_SECRET is too short", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "short-secret");
    const { getJwtSecretKey } = await importFreshJwtSecret();

    expect(() => getJwtSecretKey()).toThrow("JWT_SECRET must be at least 32 characters in production.");
  });

  it("allows a development-only fallback outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("JWT_SECRET", "");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getJwtSecretKey } = await importFreshJwtSecret();

    expect(getJwtSecretKey()).toBeInstanceOf(Uint8Array);
    expect(warnSpy).toHaveBeenCalledWith("[Auth] JWT_SECRET is not set. Using a development-only session secret.");
  });
});
