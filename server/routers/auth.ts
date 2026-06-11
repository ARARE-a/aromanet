import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  storeAccounts, therapistAccounts, customerAccounts,
  stores, therapists, customerProfiles, auditLogs,
  reservations, reviews, posts, postImages, messageThreads, messages,
  shifts, sales, therapistPayrolls, follows, favorites, customerMemos,
  ngCustomers, notifications,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const JWT_SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "aromanet-secret-key");
const SESSION_COOKIE = "aromanet_session";

async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET_KEY);
}

async function verifyToken(token: string): Promise<JWTPayload & Record<string, any>> {
  const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
  return payload as JWTPayload & Record<string, any>;
}

async function setSessionCookie(res: any, payload: Record<string, unknown>) {
  const token = await signToken(payload);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  return token;
}

function clearSessionCookie(res: any) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });
}

async function logAudit(db: any, role: string, accountId: number, action: string, detail?: string, req?: any) {
  try {
    await db.insert(auditLogs).values({
      role,
      accountId,
      action,
      detail,
      ipAddress: req?.ip ?? req?.headers?.["x-forwarded-for"] ?? "unknown",
    });
  } catch {}
}

export const authRouter = router({
  // Get current session info
  getSession: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.req.cookies?.[SESSION_COOKIE];
    if (!token) return null;
    try {
      return await verifyToken(token);
    } catch {
      return null;
    }
  }),

  // Store: register
  storeRegister: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      storeName: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select().from(storeAccounts).where(eq(storeAccounts.email, input.email)).limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "このメールアドレスは既に登録されています" });
      const passwordHash = await bcrypt.hash(input.password, 12);
      const result = await db.insert(storeAccounts).values({ email: input.email, passwordHash });
      const accountId = (result as any)[0].insertId as number;
      const storeResult = await db.insert(stores).values({ accountId, name: input.storeName });
      const storeId = (storeResult as any)[0].insertId as number;
      const token = setSessionCookie(ctx.res, { role: "store", accountId, storeId, email: input.email });
      await logAudit(db, "store", accountId, "register", input.email, ctx.req);
      return { success: true, role: "store", accountId, storeId };
    }),

  // Store: login
  storeLogin: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(storeAccounts).where(eq(storeAccounts.email, input.email)).limit(1);
      if (!rows[0]) throw new TRPCError({ code: "UNAUTHORIZED", message: "メールアドレスまたはパスワードが違います" });
      const acc = rows[0];

      // Check crash password first
      if (acc.crashPasswordHash) {
        const isCrash = await bcrypt.compare(input.password, acc.crashPasswordHash);
        if (isCrash) {
          // Execute crash: delete all data and clear session
          await executeCrash(db, "store", acc.id);
          clearSessionCookie(ctx.res);
          throw new TRPCError({ code: "NOT_FOUND", message: "アカウントが存在しません" });
        }
      }

      const isValid = await bcrypt.compare(input.password, acc.passwordHash);
      if (!isValid) throw new TRPCError({ code: "UNAUTHORIZED", message: "メールアドレスまたはパスワードが違います" });
      if (acc.status === "suspended" || acc.status === "deleted") throw new TRPCError({ code: "FORBIDDEN", message: "このアカウントは利用停止中です" });

      const storeRows = await db.select().from(stores).where(eq(stores.accountId, acc.id)).limit(1);
      const storeId = storeRows[0]?.id;
      setSessionCookie(ctx.res, { role: "store", accountId: acc.id, storeId, email: acc.email });
      await db.update(storeAccounts).set({ updatedAt: new Date() }).where(eq(storeAccounts.id, acc.id));
      await logAudit(db, "store", acc.id, "login", acc.email, ctx.req);
      return { success: true, role: "store", accountId: acc.id, storeId };
    }),

  // Therapist: register
  therapistRegister: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      displayName: z.string().min(1),
      skipEmailVerify: z.boolean().optional(), // kept for backward compat (store-added therapists)
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select().from(therapistAccounts).where(eq(therapistAccounts.email, input.email)).limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "このメールアドレスは既に登録されています" });
      const passwordHash = await bcrypt.hash(input.password, 12);
      const result = await db.insert(therapistAccounts).values({ email: input.email, passwordHash });
      const accountId = (result as any)[0].insertId as number;
      const tResult = await db.insert(therapists).values({ accountId, displayName: input.displayName });
      const therapistId = (tResult as any)[0].insertId as number;
      setSessionCookie(ctx.res, { role: "therapist", accountId, therapistId, email: input.email });
      await logAudit(db, "therapist", accountId, "register", input.email, ctx.req);
      return { success: true, role: "therapist", accountId, therapistId };
    }),

  // Therapist: login
  therapistLogin: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(therapistAccounts).where(eq(therapistAccounts.email, input.email)).limit(1);
      if (!rows[0]) throw new TRPCError({ code: "UNAUTHORIZED", message: "メールアドレスまたはパスワードが違います" });
      const acc = rows[0];

      if (acc.crashPasswordHash) {
        const isCrash = await bcrypt.compare(input.password, acc.crashPasswordHash);
        if (isCrash) {
          await executeCrash(db, "therapist", acc.id);
          clearSessionCookie(ctx.res);
          throw new TRPCError({ code: "NOT_FOUND", message: "アカウントが存在しません" });
        }
      }

      const isValid = await bcrypt.compare(input.password, acc.passwordHash);
      if (!isValid) throw new TRPCError({ code: "UNAUTHORIZED", message: "メールアドレスまたはパスワードが違います" });
      if (acc.status === "suspended" || acc.status === "deleted") throw new TRPCError({ code: "FORBIDDEN", message: "このアカウントは利用停止中です" });

      const tRows = await db.select().from(therapists).where(eq(therapists.accountId, acc.id)).limit(1);
      const therapistId = tRows[0]?.id;
      setSessionCookie(ctx.res, { role: "therapist", accountId: acc.id, therapistId, email: acc.email });
      await db.update(therapistAccounts).set({ updatedAt: new Date() }).where(eq(therapistAccounts.id, acc.id));
      await logAudit(db, "therapist", acc.id, "login", acc.email, ctx.req);
      return { success: true, role: "therapist", accountId: acc.id, therapistId };
    }),

  // Customer: register
  customerRegister: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      displayName: z.string().min(1),
      ageConfirmed: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!input.ageConfirmed) throw new TRPCError({ code: "BAD_REQUEST", message: "年齢確認が必要です" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select().from(customerAccounts).where(eq(customerAccounts.email, input.email)).limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "このメールアドレスは既に登録されています" });
      const passwordHash = await bcrypt.hash(input.password, 12);
      const result = await db.insert(customerAccounts).values({ email: input.email, passwordHash, ageVerified: true });
      const accountId = (result as any)[0].insertId as number;
      await db.insert(customerProfiles).values({ accountId, displayName: input.displayName });
      setSessionCookie(ctx.res, { role: "customer", accountId, email: input.email });
      await logAudit(db, "customer", accountId, "register", input.email, ctx.req);
      return { success: true, role: "customer", accountId };
    }),

  // Customer: login
  customerLogin: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(customerAccounts).where(eq(customerAccounts.email, input.email)).limit(1);
      if (!rows[0]) throw new TRPCError({ code: "UNAUTHORIZED", message: "メールアドレスまたはパスワードが違います" });
      const acc = rows[0];

      if (acc.crashPasswordHash) {
        const isCrash = await bcrypt.compare(input.password, acc.crashPasswordHash);
        if (isCrash) {
          await executeCrash(db, "customer", acc.id);
          clearSessionCookie(ctx.res);
          throw new TRPCError({ code: "NOT_FOUND", message: "アカウントが存在しません" });
        }
      }

      const isValid = await bcrypt.compare(input.password, acc.passwordHash);
      if (!isValid) throw new TRPCError({ code: "UNAUTHORIZED", message: "メールアドレスまたはパスワードが違います" });
      if (acc.status === "suspended" || acc.status === "deleted") throw new TRPCError({ code: "FORBIDDEN", message: "このアカウントは利用停止中です" });

      setSessionCookie(ctx.res, { role: "customer", accountId: acc.id, email: acc.email });
      await db.update(customerAccounts).set({ updatedAt: new Date() }).where(eq(customerAccounts.id, acc.id));
      await logAudit(db, "customer", acc.id, "login", acc.email, ctx.req);
      return { success: true, role: "customer", accountId: acc.id };
    }),

  // Set crash password
  setCrashPassword: publicProcedure
    .input(z.object({ crashPassword: z.string().min(8) }))
    .mutation(async ({ input, ctx }) => {
      const token = ctx.req.cookies?.[SESSION_COOKIE];
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED" });
      const session = await verifyToken(token);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const crashPasswordHash = await bcrypt.hash(input.crashPassword, 12);
      if (session.role === "store") {
        await db.update(storeAccounts).set({ crashPasswordHash }).where(eq(storeAccounts.id, session.accountId));
      } else if (session.role === "therapist") {
        await db.update(therapistAccounts).set({ crashPasswordHash }).where(eq(therapistAccounts.id, session.accountId));
      } else {
        await db.update(customerAccounts).set({ crashPasswordHash }).where(eq(customerAccounts.id, session.accountId));
      }
      return { success: true };
    }),

  // Logout
  aroLogout: publicProcedure.mutation(({ ctx }) => {
    clearSessionCookie(ctx.res);
    return { success: true };
  }),
});

// Execute crash: delete all account data
async function executeCrash(db: any, role: string, accountId: number) {
  try {
    if (role === "store") {
      const storeRows = await db.select().from(stores).where(eq(stores.accountId, accountId));
      for (const s of storeRows) {
        await db.delete(reservations).where(eq(reservations.storeId, s.id));
        await db.delete(reviews).where(eq(reviews.storeId, s.id));
        await db.delete(posts).where(eq(posts.storeId, s.id));
        await db.delete(shifts).where(eq(shifts.storeId, s.id));
        await db.delete(sales).where(eq(sales.storeId, s.id));
        await db.delete(notifications).where(and(eq(notifications.recipientRole, "store"), eq(notifications.recipientId, s.id)));
        await db.delete(stores).where(eq(stores.id, s.id));
      }
      await db.delete(storeAccounts).where(eq(storeAccounts.id, accountId));
    } else if (role === "therapist") {
      const tRows = await db.select().from(therapists).where(eq(therapists.accountId, accountId));
      for (const t of tRows) {
        await db.delete(reservations).where(eq(reservations.therapistId, t.id));
        await db.delete(reviews).where(eq(reviews.therapistId, t.id));
        await db.delete(posts).where(eq(posts.therapistId, t.id));
        await db.delete(shifts).where(eq(shifts.therapistId, t.id));
        await db.delete(sales).where(eq(sales.therapistId, t.id));
        await db.delete(therapistPayrolls).where(eq(therapistPayrolls.therapistId, t.id));
        await db.delete(customerMemos).where(eq(customerMemos.therapistId, t.id));
        await db.delete(therapists).where(eq(therapists.id, t.id));
      }
      await db.delete(therapistAccounts).where(eq(therapistAccounts.id, accountId));
    } else {
      await db.delete(reservations).where(eq(reservations.customerId, accountId));
      await db.delete(reviews).where(eq(reviews.customerId, accountId));
      await db.delete(follows).where(eq(follows.customerId, accountId));
      await db.delete(favorites).where(eq(favorites.customerId, accountId));
      await db.delete(notifications).where(and(eq(notifications.recipientRole, "customer"), eq(notifications.recipientId, accountId)));
      await db.delete(customerProfiles).where(eq(customerProfiles.accountId, accountId));
      await db.delete(customerAccounts).where(eq(customerAccounts.id, accountId));
    }
  } catch (e) {
    console.error("Crash execution error:", e);
  }
}
