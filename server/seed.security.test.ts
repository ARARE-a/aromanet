import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("seed.seedAll security", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled in production even when the seed flag is enabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AROMANET_ENABLE_SEED", "1");
    const caller = appRouter.createCaller(createContext());

    await expect(caller.seed.seedAll()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Seed operations are disabled in production.",
    });
  });

  it("requires an explicit development seed flag outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AROMANET_ENABLE_SEED", "");
    const caller = appRouter.createCaller(createContext());

    await expect(caller.seed.seedAll()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Seed operations require AROMANET_ENABLE_SEED=1.",
    });
  });
});
