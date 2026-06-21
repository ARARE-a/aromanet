import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import { validateSessionPayload } from "./session";

const mockedGetDb = vi.mocked(getDb);

function createDbReturning(rows: unknown[]) {
  const chain = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(async () => rows),
  };
  return {
    select: vi.fn(() => chain),
    chain,
  };
}

describe("Aroma session validation", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects sessions when the account is suspended", async () => {
    const db = createDbReturning([
      { id: 1, email: "store@example.com", status: "suspended", storeId: 10 },
    ]);
    mockedGetDb.mockResolvedValue(db as never);

    await expect(validateSessionPayload({ role: "store", accountId: 1 })).resolves.toBeNull();
  });

  it("refreshes and returns active store session data from the database", async () => {
    const db = createDbReturning([
      { id: 1, email: "store@example.com", status: "active", storeId: 10 },
    ]);
    mockedGetDb.mockResolvedValue(db as never);

    await expect(validateSessionPayload({ role: "store", accountId: 1, storeId: 999 })).resolves.toEqual({
      role: "store",
      accountId: 1,
      storeId: 10,
      email: "store@example.com",
    });
  });

  it("allows active customer sessions", async () => {
    const db = createDbReturning([
      { id: 3, email: "customer@example.com", status: "active" },
    ]);
    mockedGetDb.mockResolvedValue(db as never);

    await expect(validateSessionPayload({ role: "customer", accountId: 3 })).resolves.toEqual({
      role: "customer",
      accountId: 3,
      email: "customer@example.com",
    });
  });
});
