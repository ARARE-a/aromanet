import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  storeAccounts, therapistAccounts, customerAccounts,
  stores, therapists, customerProfiles, auditLogs,
  reservations, reviews, posts, postImages, messageThreads, messages,
  reservationOptions, menus, menuOptions, coupons,
  shifts, sales, therapistPayrolls, follows, favorites, customerMemos,
  ngCustomers, notifications, blocks, reports, identityVerifications,
  ageVerifications, rooms, affiliationRequests, therapistSalarySettings,
  storyPosts, therapistInviteLinks,
} from "../../drizzle/schema";
import { eq, and, inArray, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { ensureTherapistInviteLinksTable, getInviteInvalidReason } from "../therapistInvites";
import { getJwtSecretKey } from "../jwtSecret";
import { getSession as getAromaSession } from "../session";

const SESSION_COOKIE = "aromanet_session";
const PHONE_EMAIL_DOMAIN = "phone.aromanet.local";

function normalizeCustomerPhone(phone: string) {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+81")) {
    return `0${trimmed.slice(3).replace(/\D/g, "")}`;
  }
  return trimmed.replace(/\D/g, "");
}

function customerPhoneEmail(phone: string) {
  return `phone-${phone}@${PHONE_EMAIL_DOMAIN}`;
}

function looksLikeEmail(value: string) {
  return value.includes("@");
}

async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(getJwtSecretKey());
}

async function verifyToken(token: string): Promise<JWTPayload & Record<string, any>> {
  const { payload } = await jwtVerify(token, getJwtSecretKey());
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

async function readSession(req: any) {
  return getAromaSession(req);
}

async function logAudit(db: any, role: string, accountId: number, action: string, detail?: string, req?: any) {
  try {
    await db.insert(auditLogs).values({
      actorRole: role,
      actorId: accountId,
      action,
      detail,
      ipAddress: req?.ip ?? req?.headers?.["x-forwarded-for"] ?? "unknown",
    });
  } catch {}
}

export const authRouter = router({
  // Get current session info
  getSession: publicProcedure.query(async ({ ctx }) => {
    return getAromaSession(ctx.req);
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
      await setSessionCookie(ctx.res, { role: "store", accountId, storeId, email: input.email });
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
      await setSessionCookie(ctx.res, { role: "store", accountId: acc.id, storeId, email: acc.email });
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
      inviteToken: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const currentSession = await readSession(ctx.req);
      let linkedStoreId: number | null = null;
      let inviteId: number | null = null;

      if (input.inviteToken) {
        await ensureTherapistInviteLinksTable(db);
        const inviteRows = await db.select().from(therapistInviteLinks)
          .where(eq(therapistInviteLinks.token, input.inviteToken))
          .limit(1);
        const invite = inviteRows[0];
        const invalidReason = getInviteInvalidReason(invite);
        if (invalidReason) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "この招待URLは無効です。店舗に新しいURLの発行を依頼してください。",
          });
        }
        linkedStoreId = invite.storeId;
        inviteId = invite.id;
      } else if (currentSession?.role === "store" && currentSession.storeId) {
        linkedStoreId = Number(currentSession.storeId);
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "セラピスト登録には店舗から発行された招待URLが必要です。",
        });
      }

      const existing = await db.select().from(therapistAccounts).where(eq(therapistAccounts.email, input.email)).limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "このメールアドレスは既に登録されています" });
      const passwordHash = await bcrypt.hash(input.password, 12);
      const result = await db.insert(therapistAccounts).values({ email: input.email, passwordHash });
      const accountId = (result as any)[0].insertId as number;
      const tResult = await db.insert(therapists).values({
        accountId,
        displayName: input.displayName,
        storeId: linkedStoreId,
        affiliationStatus: "approved",
      });
      const therapistId = (tResult as any)[0].insertId as number;

      await db.insert(therapistSalarySettings).values({
        therapistId,
        storeId: linkedStoreId,
        backRate: "50.00",
        nominationFee: 0,
      });
      await db.insert(affiliationRequests).values({
        therapistId,
        storeId: linkedStoreId,
        status: "approved",
        message: inviteId ? "招待URL経由で登録" : "店舗管理画面から追加",
        responseNote: "自動承認",
      });
      if (inviteId) {
        await db.update(therapistInviteLinks).set({
          usedCount: sql`${therapistInviteLinks.usedCount} + 1`,
          lastUsedAt: new Date(),
        }).where(eq(therapistInviteLinks.id, inviteId));
        await db.insert(notifications).values({
          recipientRole: "store",
          recipientId: linkedStoreId,
          type: "system",
          title: "招待URLから登録されました",
          body: `${input.displayName}さんが招待URLから登録しました`,
          isRead: false,
        });
      }

      if (!(currentSession?.role === "store" && currentSession.storeId && !inviteId)) {
        await setSessionCookie(ctx.res, { role: "therapist", accountId, therapistId, email: input.email });
      }
      await logAudit(db, "therapist", accountId, "register", input.email, ctx.req);
      return { success: true, role: "therapist", accountId, therapistId, storeId: linkedStoreId, addedByStore: !inviteId && currentSession?.role === "store" };
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
      await setSessionCookie(ctx.res, { role: "therapist", accountId: acc.id, therapistId, email: acc.email });
      await db.update(therapistAccounts).set({ updatedAt: new Date() }).where(eq(therapistAccounts.id, acc.id));
      await logAudit(db, "therapist", acc.id, "login", acc.email, ctx.req);
      return { success: true, role: "therapist", accountId: acc.id, therapistId };
    }),

  // Customer: register
  customerRegister: publicProcedure
    .input(z.object({
      phoneNumber: z.string().min(10).optional(),
      email: z.string().email().optional(),
      password: z.string().min(8),
      displayName: z.string().min(1),
      ageConfirmed: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const normalizedPhone = normalizeCustomerPhone(input.phoneNumber ?? "");
      if (normalizedPhone.length < 10) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "電話番号を入力してください" });
      }
      const email = input.email?.trim().toLowerCase() || customerPhoneEmail(normalizedPhone);
      const displayName = input.displayName.trim();
      const existing = await db.select({ account: customerAccounts })
        .from(customerAccounts)
        .leftJoin(customerProfiles, eq(customerProfiles.accountId, customerAccounts.id))
        .where(or(eq(customerAccounts.email, email), eq(customerProfiles.phone, normalizedPhone)))
        .limit(1);
      if (existing.length > 0) {
        const acc = existing[0].account;
        if (acc.status === "suspended" || acc.status === "deleted") {
          throw new TRPCError({ code: "FORBIDDEN", message: "このアカウントは利用停止中です" });
        }
        const isSamePassword = await bcrypt.compare(input.password, acc.passwordHash);
        if (!isSamePassword) {
          throw new TRPCError({ code: "CONFLICT", message: "この電話番号は既に登録されています。ログインしてください" });
        }
        await setSessionCookie(ctx.res, { role: "customer", accountId: acc.id, email: acc.email });
        await db.update(customerAccounts).set({ updatedAt: new Date() }).where(eq(customerAccounts.id, acc.id));
        await logAudit(db, "customer", acc.id, "register_existing_login", acc.email, ctx.req);
        return { success: true, role: "customer", accountId: acc.id };
      }
      const passwordHash = await bcrypt.hash(input.password, 12);
      const result = await db.insert(customerAccounts).values({ email, passwordHash, ageVerified: false });
      const accountId = (result as any)[0].insertId as number;
      await db.insert(customerProfiles).values({ accountId, displayName, phone: normalizedPhone });
      await setSessionCookie(ctx.res, { role: "customer", accountId, email });
      await logAudit(db, "customer", accountId, "register", email, ctx.req);
      return { success: true, role: "customer", accountId };
    }),

  // Customer: login
  customerLogin: publicProcedure
    .input(z.object({
      email: z.string().optional(),
      identifier: z.string().optional(),
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const identifier = (input.identifier ?? input.email ?? "").trim();
      if (!identifier) throw new TRPCError({ code: "BAD_REQUEST", message: "電話番号を入力してください" });
      const normalizedPhone = normalizeCustomerPhone(identifier);
      const email = looksLikeEmail(identifier) ? identifier.toLowerCase() : customerPhoneEmail(normalizedPhone);
      const rows = await db.select({ account: customerAccounts })
        .from(customerAccounts)
        .leftJoin(customerProfiles, eq(customerProfiles.accountId, customerAccounts.id))
        .where(looksLikeEmail(identifier)
          ? eq(customerAccounts.email, email)
          : or(eq(customerAccounts.email, email), eq(customerProfiles.phone, normalizedPhone)))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "UNAUTHORIZED", message: "電話番号またはパスワードが違います" });
      const acc = rows[0].account;

      if (acc.crashPasswordHash) {
        const isCrash = await bcrypt.compare(input.password, acc.crashPasswordHash);
        if (isCrash) {
          await executeCrash(db, "customer", acc.id);
          clearSessionCookie(ctx.res);
          throw new TRPCError({ code: "NOT_FOUND", message: "アカウントが存在しません" });
        }
      }

      const isValid = await bcrypt.compare(input.password, acc.passwordHash);
      if (!isValid) throw new TRPCError({ code: "UNAUTHORIZED", message: "電話番号またはパスワードが違います" });
      if (acc.status === "suspended" || acc.status === "deleted") throw new TRPCError({ code: "FORBIDDEN", message: "このアカウントは利用停止中です" });

      await setSessionCookie(ctx.res, { role: "customer", accountId: acc.id, email: acc.email });
      await db.update(customerAccounts).set({ updatedAt: new Date() }).where(eq(customerAccounts.id, acc.id));
      await logAudit(db, "customer", acc.id, "login", acc.email, ctx.req);
      return { success: true, role: "customer", accountId: acc.id };
    }),

  // Change password
  changePassword: publicProcedure
    .input(z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }))
    .mutation(async ({ input, ctx }) => {
      const session = await readSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let currentHash: string | null = null;
      let crashHash: string | null = null;
      if (session.role === "store") {
        const rows = await db.select().from(storeAccounts).where(eq(storeAccounts.id, session.accountId)).limit(1);
        currentHash = rows[0]?.passwordHash ?? null;
        crashHash = rows[0]?.crashPasswordHash ?? null;
      } else if (session.role === "therapist") {
        const rows = await db.select().from(therapistAccounts).where(eq(therapistAccounts.id, session.accountId)).limit(1);
        currentHash = rows[0]?.passwordHash ?? null;
        crashHash = rows[0]?.crashPasswordHash ?? null;
      } else {
        const rows = await db.select().from(customerAccounts).where(eq(customerAccounts.id, session.accountId)).limit(1);
        currentHash = rows[0]?.passwordHash ?? null;
        crashHash = rows[0]?.crashPasswordHash ?? null;
      }
      if (!currentHash) throw new TRPCError({ code: "NOT_FOUND" });
      const isValid = await bcrypt.compare(input.currentPassword, currentHash);
      if (!isValid) throw new TRPCError({ code: "UNAUTHORIZED", message: "現在のパスワードが正しくありません" });
      if (crashHash && await bcrypt.compare(input.newPassword, crashHash)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "クラッシュパスワードと同じ通常パスワードは設定できません" });
      }
      const newHash = await bcrypt.hash(input.newPassword, 12);
      if (session.role === "store") {
        await db.update(storeAccounts).set({ passwordHash: newHash }).where(eq(storeAccounts.id, session.accountId));
      } else if (session.role === "therapist") {
        await db.update(therapistAccounts).set({ passwordHash: newHash }).where(eq(therapistAccounts.id, session.accountId));
      } else {
        await db.update(customerAccounts).set({ passwordHash: newHash }).where(eq(customerAccounts.id, session.accountId));
      }
      return { success: true };
    }),

  // Set crash password
  setCrashPassword: publicProcedure
    .input(z.object({ crashPassword: z.string().min(8) }))
    .mutation(async ({ input, ctx }) => {
      const session = await readSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let passwordHash: string | null = null;
      if (session.role === "store") {
        const rows = await db.select().from(storeAccounts).where(eq(storeAccounts.id, session.accountId)).limit(1);
        passwordHash = rows[0]?.passwordHash ?? null;
      } else if (session.role === "therapist") {
        const rows = await db.select().from(therapistAccounts).where(eq(therapistAccounts.id, session.accountId)).limit(1);
        passwordHash = rows[0]?.passwordHash ?? null;
      } else {
        const rows = await db.select().from(customerAccounts).where(eq(customerAccounts.id, session.accountId)).limit(1);
        passwordHash = rows[0]?.passwordHash ?? null;
      }
      if (!passwordHash) throw new TRPCError({ code: "NOT_FOUND" });
      const sameAsPassword = await bcrypt.compare(input.crashPassword, passwordHash);
      if (sameAsPassword) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "通常パスワードと同じクラッシュパスワードは設定できません" });
      }

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

type EntityRole = "store" | "therapist" | "customer";

function compactIds(ids: Array<number | null | undefined>) {
  return Array.from(new Set(ids.filter((id): id is number => typeof id === "number")));
}

async function deleteByIds(db: any, table: any, column: any, ids: number[]) {
  if (ids.length === 0) return;
  await db.delete(table).where(inArray(column, ids));
}

async function deleteReportsForTargets(db: any, targetType: string, targetIds: number[]) {
  if (targetIds.length === 0) return;
  await db.delete(reports).where(and(eq(reports.targetType, targetType as any), inArray(reports.targetId, targetIds)));
}

async function deleteActorSafetyRows(db: any, role: EntityRole, id: number) {
  await db.delete(blocks).where(or(
    and(eq(blocks.blockerRole, role), eq(blocks.blockerId, id)),
    and(eq(blocks.blockedRole, role), eq(blocks.blockedId, id)),
  ));
  await db.delete(reports).where(or(
    and(eq(reports.reporterRole, role), eq(reports.reporterId, id)),
    and(eq(reports.targetType, role), eq(reports.targetId, id)),
  ));
}

async function deleteMessageThreadsWhere(db: any, condition: any) {
  const threadRows = await db.select({ id: messageThreads.id }).from(messageThreads).where(condition);
  const threadIds = compactIds(threadRows.map((row: { id: number }) => row.id));
  if (threadIds.length === 0) return;
  const messageRows = await db.select({ id: messages.id }).from(messages).where(inArray(messages.threadId, threadIds));
  const messageIds = compactIds(messageRows.map((row: { id: number }) => row.id));
  await deleteReportsForTargets(db, "message", messageIds);
  await deleteByIds(db, messages, messages.id, messageIds);
  await deleteByIds(db, messageThreads, messageThreads.id, threadIds);
}

async function deletePostsWhere(db: any, condition: any) {
  const postRows = await db.select({ id: posts.id }).from(posts).where(condition);
  const postIds = compactIds(postRows.map((row: { id: number }) => row.id));
  if (postIds.length === 0) return;
  await deleteReportsForTargets(db, "post", postIds);
  await deleteByIds(db, postImages, postImages.postId, postIds);
  await deleteByIds(db, posts, posts.id, postIds);
}

async function deleteReviewsWhere(db: any, condition: any) {
  const reviewRows = await db.select({ id: reviews.id }).from(reviews).where(condition);
  const reviewIds = compactIds(reviewRows.map((row: { id: number }) => row.id));
  if (reviewIds.length === 0) return;
  await deleteReportsForTargets(db, "review", reviewIds);
  await deleteByIds(db, reviews, reviews.id, reviewIds);
}

async function deleteReservationsWhere(db: any, condition: any) {
  const reservationRows = await db.select({ id: reservations.id }).from(reservations).where(condition);
  const reservationIds = compactIds(reservationRows.map((row: { id: number }) => row.id));
  if (reservationIds.length === 0) return;
  await deleteByIds(db, sales, sales.reservationId, reservationIds);
  await deleteReviewsWhere(db, inArray(reviews.reservationId, reservationIds));
  await deleteByIds(db, reservationOptions, reservationOptions.reservationId, reservationIds);
  await deleteByIds(db, reservations, reservations.id, reservationIds);
}

async function deleteFollowsAndFavoritesForTarget(db: any, targetType: "store" | "therapist", targetId: number) {
  await db.delete(follows).where(and(eq(follows.targetType, targetType), eq(follows.targetId, targetId)));
  await db.delete(favorites).where(and(eq(favorites.targetType, targetType), eq(favorites.targetId, targetId)));
}

async function deleteTherapistScope(db: any, therapistId: number, accountId?: number | null, deleteAccount = true) {
  await deleteMessageThreadsWhere(db, eq(messageThreads.therapistId, therapistId));
  await deleteReservationsWhere(db, eq(reservations.therapistId, therapistId));
  await deletePostsWhere(db, eq(posts.therapistId, therapistId));
  await db.delete(storyPosts).where(eq(storyPosts.therapistId, therapistId));
  await db.delete(shifts).where(eq(shifts.therapistId, therapistId));
  await db.delete(sales).where(eq(sales.therapistId, therapistId));
  await db.delete(therapistPayrolls).where(eq(therapistPayrolls.therapistId, therapistId));
  await db.delete(therapistSalarySettings).where(eq(therapistSalarySettings.therapistId, therapistId));
  await db.delete(customerMemos).where(eq(customerMemos.therapistId, therapistId));
  await db.delete(ngCustomers).where(eq(ngCustomers.therapistId, therapistId));
  await db.delete(affiliationRequests).where(eq(affiliationRequests.therapistId, therapistId));
  await deleteFollowsAndFavoritesForTarget(db, "therapist", therapistId);
  await db.delete(notifications).where(and(eq(notifications.recipientRole, "therapist"), eq(notifications.recipientId, therapistId)));
  await deleteActorSafetyRows(db, "therapist", therapistId);
  await db.delete(therapists).where(eq(therapists.id, therapistId));

  if (deleteAccount && accountId) {
    await db.delete(identityVerifications).where(and(eq(identityVerifications.role, "therapist"), eq(identityVerifications.accountId, accountId)));
    await db.delete(auditLogs).where(and(eq(auditLogs.actorRole, "therapist"), eq(auditLogs.actorId, accountId)));
    await db.delete(therapistAccounts).where(eq(therapistAccounts.id, accountId));
  }
}

async function deleteStoreScope(db: any, storeId: number, accountId?: number | null) {
  const therapistRows = await db.select({ id: therapists.id, accountId: therapists.accountId })
    .from(therapists)
    .where(eq(therapists.storeId, storeId));
  for (const therapist of therapistRows) {
    await deleteTherapistScope(db, therapist.id, therapist.accountId, true);
  }

  await deleteMessageThreadsWhere(db, eq(messageThreads.storeId, storeId));
  await deleteReservationsWhere(db, eq(reservations.storeId, storeId));
  await deletePostsWhere(db, eq(posts.storeId, storeId));
  await db.delete(storyPosts).where(eq(storyPosts.storeId, storeId));
  await deleteReviewsWhere(db, eq(reviews.storeId, storeId));
  await db.delete(shifts).where(eq(shifts.storeId, storeId));
  await db.delete(sales).where(eq(sales.storeId, storeId));
  await db.delete(therapistPayrolls).where(eq(therapistPayrolls.storeId, storeId));
  await db.delete(therapistSalarySettings).where(eq(therapistSalarySettings.storeId, storeId));
  await db.delete(ngCustomers).where(eq(ngCustomers.storeId, storeId));
  await db.delete(affiliationRequests).where(eq(affiliationRequests.storeId, storeId));
  await db.delete(rooms).where(eq(rooms.storeId, storeId));
  await db.delete(menuOptions).where(eq(menuOptions.storeId, storeId));
  await db.delete(coupons).where(eq(coupons.storeId, storeId));
  await db.delete(menus).where(eq(menus.storeId, storeId));
  await deleteFollowsAndFavoritesForTarget(db, "store", storeId);
  await db.delete(notifications).where(and(eq(notifications.recipientRole, "store"), eq(notifications.recipientId, storeId)));
  await deleteActorSafetyRows(db, "store", storeId);
  await db.delete(stores).where(eq(stores.id, storeId));

  if (accountId) {
    await db.delete(identityVerifications).where(and(eq(identityVerifications.role, "store"), eq(identityVerifications.accountId, accountId)));
    await db.delete(auditLogs).where(and(eq(auditLogs.actorRole, "store"), eq(auditLogs.actorId, accountId)));
    await db.delete(storeAccounts).where(eq(storeAccounts.id, accountId));
  }
}

async function deleteCustomerScope(db: any, accountId: number) {
  await deleteMessageThreadsWhere(db, eq(messageThreads.customerId, accountId));
  await deleteReservationsWhere(db, eq(reservations.customerId, accountId));
  await deleteReviewsWhere(db, eq(reviews.customerId, accountId));
  await db.delete(customerMemos).where(eq(customerMemos.customerId, accountId));
  await db.delete(ngCustomers).where(eq(ngCustomers.customerId, accountId));
  await db.delete(follows).where(eq(follows.customerId, accountId));
  await db.delete(favorites).where(eq(favorites.customerId, accountId));
  await db.delete(ageVerifications).where(eq(ageVerifications.customerId, accountId));
  await db.delete(notifications).where(and(eq(notifications.recipientRole, "customer"), eq(notifications.recipientId, accountId)));
  await deleteActorSafetyRows(db, "customer", accountId);
  await db.delete(auditLogs).where(and(eq(auditLogs.actorRole, "customer"), eq(auditLogs.actorId, accountId)));
  await db.delete(customerProfiles).where(eq(customerProfiles.accountId, accountId));
  await db.delete(customerAccounts).where(eq(customerAccounts.id, accountId));
}

// Execute crash: delete all account data
async function executeCrash(db: any, role: string, accountId: number) {
  if (role === "store") {
    const storeRows = await db.select({ id: stores.id }).from(stores).where(eq(stores.accountId, accountId));
    for (const store of storeRows) {
      await deleteStoreScope(db, store.id, accountId);
    }
    if (storeRows.length === 0) {
      await db.delete(storeAccounts).where(eq(storeAccounts.id, accountId));
    }
  } else if (role === "therapist") {
    const therapistRows = await db.select({ id: therapists.id, accountId: therapists.accountId }).from(therapists).where(eq(therapists.accountId, accountId));
    for (const therapist of therapistRows) {
      await deleteTherapistScope(db, therapist.id, therapist.accountId, true);
    }
    if (therapistRows.length === 0) {
      await db.delete(therapistAccounts).where(eq(therapistAccounts.id, accountId));
    }
  } else {
    await deleteCustomerScope(db, accountId);
  }
}
