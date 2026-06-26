import { jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { customerAccounts, storeAccounts, stores, therapistAccounts, therapists } from "../drizzle/schema";
import { getDb } from "./db";
import { getJwtSecretKey } from "./jwtSecret";

export const SESSION_COOKIE = "aromanet_session";
const DEMO_EMAILS = {
  store: process.env.DEMO_STORE_EMAIL || "showcase-store@aromanet.club",
  therapist: process.env.DEMO_THERAPIST_EMAIL || "showcase-therapist@aromanet.club",
  customer: process.env.DEMO_CUSTOMER_EMAIL || "showcase-customer@aromanet.club",
} as const;

export interface AromaSession {
  role: "store" | "therapist" | "customer";
  accountId: number;
  storeId?: number;
  therapistId?: number;
  email?: string;
  demo?: boolean;
}

export async function getSession(req: any): Promise<AromaSession | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return validateSessionPayload(payload as unknown as AromaSession);
  } catch {
    return null;
  }
}

export async function getSessionDatabaseMode(req: any): Promise<"primary" | "demo"> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return "primary";
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload.demo ? "demo" : "primary";
  } catch {
    return "primary";
  }
}

function isDemoSession(role: AromaSession["role"], email?: string | null) {
  return Boolean(email && email === DEMO_EMAILS[role]);
}

export async function validateSessionPayload(payload: AromaSession): Promise<AromaSession | null> {
  if (!payload || !payload.role || typeof payload.accountId !== "number") return null;

  const db = await getDb(payload.demo ? "demo" : "primary");
  if (!db) return null;

  if (payload.role === "store") {
    const rows = await db
      .select({
        id: storeAccounts.id,
        email: storeAccounts.email,
        status: storeAccounts.status,
        storeId: stores.id,
      })
      .from(storeAccounts)
      .innerJoin(stores, eq(stores.accountId, storeAccounts.id))
      .where(eq(storeAccounts.id, payload.accountId))
      .limit(1);
    const account = rows[0];
    if (!account || account.status !== "active") return null;
    const session: AromaSession = {
      role: "store",
      accountId: account.id,
      storeId: account.storeId,
      email: account.email,
    };
    if (payload.demo && isDemoSession("store", account.email)) {
      session.demo = true;
    }
    return session;
  }

  if (payload.role === "therapist") {
    const rows = await db
      .select({
        id: therapistAccounts.id,
        email: therapistAccounts.email,
        status: therapistAccounts.status,
        therapistId: therapists.id,
      })
      .from(therapistAccounts)
      .innerJoin(therapists, eq(therapists.accountId, therapistAccounts.id))
      .where(eq(therapistAccounts.id, payload.accountId))
      .limit(1);
    const account = rows[0];
    if (!account || account.status !== "active") return null;
    const session: AromaSession = {
      role: "therapist",
      accountId: account.id,
      therapistId: account.therapistId,
      email: account.email,
    };
    if (payload.demo && isDemoSession("therapist", account.email)) {
      session.demo = true;
    }
    return session;
  }

  if (payload.role === "customer") {
    const rows = await db
      .select({
        id: customerAccounts.id,
        email: customerAccounts.email,
        status: customerAccounts.status,
      })
      .from(customerAccounts)
      .where(eq(customerAccounts.id, payload.accountId))
      .limit(1);
    const account = rows[0];
    if (!account || account.status !== "active") return null;
    const session: AromaSession = {
      role: "customer",
      accountId: account.id,
      email: account.email,
    };
    if (payload.demo && isDemoSession("customer", account.email)) {
      session.demo = true;
    }
    return session;
  }

  return null;
}
