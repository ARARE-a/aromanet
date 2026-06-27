import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { AsyncLocalStorage } from "node:async_hooks";
import type { PoolOptions } from "mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

export type DatabaseMode = "primary" | "demo";

let _db: ReturnType<typeof drizzle> | null = null;
let _demoDb: ReturnType<typeof drizzle> | null = null;
const databaseModeStorage = new AsyncLocalStorage<DatabaseMode>();

export function getCurrentDatabaseMode(): DatabaseMode {
  return databaseModeStorage.getStore() ?? "primary";
}

export function runWithDatabaseMode<T>(mode: DatabaseMode, fn: () => T): T {
  return databaseModeStorage.run(mode, fn);
}

export function hasDemoDatabase() {
  return Boolean(process.env.DEMO_DATABASE_URL);
}

function resolveMode(mode?: DatabaseMode | { demo?: boolean }): DatabaseMode {
  if (!mode) return getCurrentDatabaseMode();
  if (typeof mode === "string") return mode;
  return mode.demo ? "demo" : "primary";
}

function requiresSsl(url: string) {
  try {
    const host = new URL(url).hostname;
    return host.includes("tidbcloud.com") || process.env.DB_SSL === "true";
  } catch {
    return process.env.DB_SSL === "true";
  }
}

function createDrizzleDatabase(url: string) {
  if (!requiresSsl(url)) return drizzle(url);
  const connection: PoolOptions = {
    uri: url,
    supportBigNumbers: true,
    ssl: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    },
  };
  return drizzle({ connection });
}

function resolveDemoDatabaseUrl(url: string) {
  const demoDatabaseName = process.env.DEMO_DATABASE_NAME || "aromanet_demo";
  try {
    const parsed = new URL(url);
    const databaseName = parsed.pathname.replace(/^\/+/, "");
    if (!databaseName || databaseName === "sys" || databaseName === "mysql") {
      parsed.pathname = `/${demoDatabaseName}`;
      return parsed.toString();
    }
  } catch {
    // Keep the original URL so the connection error remains visible in logs.
  }
  return url;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb(mode?: DatabaseMode | { demo?: boolean }) {
  const resolvedMode = resolveMode(mode);
  if (resolvedMode === "demo") {
    if (!process.env.DEMO_DATABASE_URL) return null;
    if (!_demoDb) {
      try {
        _demoDb = createDrizzleDatabase(resolveDemoDatabaseUrl(process.env.DEMO_DATABASE_URL));
      } catch (error) {
        console.warn("[DemoDatabase] Failed to connect:", error);
        _demoDb = null;
      }
    }
    return _demoDb;
  }

  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = createDrizzleDatabase(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.
