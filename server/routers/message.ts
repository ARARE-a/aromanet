import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import {
  ageVerifications,
  customerAccounts,
  customerProfiles,
  messageThreads,
  messages,
  reports,
  reservations,
  storeAccounts,
  stores,
  therapistAccounts,
  therapists,
} from "../../drizzle/schema";
import { eq, and, desc, or, sql } from "drizzle-orm";
import { ensureRuntimeSchema } from "../runtimeMigrations";

const BANNED_WORDS = ["LINE", "ライン", "連絡先", "個人連絡", "個人情報", "電話番号"];
function containsBannedWord(text: string) {
  return BANNED_WORDS.some(w => text.includes(w));
}

function customerDisplayName(row: { displayName?: string | null; nickname?: string | null } | undefined, customerId: number | null) {
  return row?.displayName ?? row?.nickname ?? (customerId ? `顧客#${customerId}` : null);
}

function canAccessThread(session: any, thread: any) {
  if (session.role === "store") return thread.storeId === session.storeId;
  if (session.role === "therapist") return thread.therapistId === session.therapistId;
  return thread.customerId === session.accountId;
}

function actorIdForSession(session: any) {
  if (session.role === "store") return session.storeId!;
  if (session.role === "therapist") return session.therapistId!;
  return session.accountId;
}

function visibleMessageCondition(role: "store" | "therapist" | "customer") {
  if (role === "store") return and(eq(messages.isDeleted, false), eq(messages.deletedForStore, false));
  if (role === "therapist") return and(eq(messages.isDeleted, false), eq(messages.deletedForTherapist, false));
  return and(eq(messages.isDeleted, false), eq(messages.deletedForCustomer, false));
}

function deleteFlagForRole(role: "store" | "therapist" | "customer") {
  if (role === "store") return "deletedForStore";
  if (role === "therapist") return "deletedForTherapist";
  return "deletedForCustomer";
}

async function requireActiveCustomer(db: any, customerId: number) {
  const rows = await db.select({
      id: customerAccounts.id,
      ageVerified: customerAccounts.ageVerified,
      status: customerAccounts.status,
    })
    .from(customerAccounts)
    .where(and(eq(customerAccounts.id, customerId), eq(customerAccounts.status, "active")))
    .limit(1);
  if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
  return rows[0];
}

async function requireCustomerMessagingAllowed(db: any, customerId: number) {
  const customer = await requireActiveCustomer(db, customerId);
  if (customer.ageVerified) return;

  const verificationRows = await db.select({ id: ageVerifications.id })
    .from(ageVerifications)
    .where(and(
      eq(ageVerifications.customerId, customerId),
      or(eq(ageVerifications.status, "pending"), eq(ageVerifications.status, "approved")),
    ))
    .limit(1);
  if (!verificationRows[0]) {
    throw new TRPCError({ code: "FORBIDDEN", message: "年齢確認の提出後にメッセージを利用できます" });
  }
}

async function requireActiveStore(db: any, storeId: number, publicOnly = false) {
  const conditions: any[] = [
    eq(stores.id, storeId),
    eq(storeAccounts.status, "active"),
  ];
  if (publicOnly) conditions.push(eq(stores.isPublic, true));
  const rows = await db.select({ id: stores.id })
    .from(stores)
    .innerJoin(storeAccounts, eq(stores.accountId, storeAccounts.id))
    .where(and(...conditions))
    .limit(1);
  if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
  return rows[0];
}

async function requireActiveTherapist(db: any, therapistId: number, publicOnly = false, storeId?: number) {
  const conditions: any[] = [
    eq(therapists.id, therapistId),
    eq(therapistAccounts.status, "active"),
  ];
  if (publicOnly) conditions.push(eq(therapists.isPublic, true));
  if (storeId) conditions.push(eq(therapists.storeId, storeId));
  const rows = await db.select({ id: therapists.id, storeId: therapists.storeId })
    .from(therapists)
    .innerJoin(therapistAccounts, eq(therapists.accountId, therapistAccounts.id))
    .where(and(...conditions))
    .limit(1);
  if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
  return rows[0];
}

async function requireTherapistCustomerRelation(db: any, therapistId: number, customerId: number) {
  const rows = await db.select({ id: reservations.id })
    .from(reservations)
    .where(and(eq(reservations.therapistId, therapistId), eq(reservations.customerId, customerId)))
    .limit(1);
  if (!rows[0]) throw new TRPCError({ code: "FORBIDDEN" });
}

async function buildThreadData(db: any, input: any, session: any) {
  if (input.threadType === "store_customer") {
    if (session.role === "customer") {
      if (!input.storeId) throw new TRPCError({ code: "BAD_REQUEST" });
      await requireCustomerMessagingAllowed(db, session.accountId);
      await requireActiveStore(db, input.storeId, true);
      return { threadType: input.threadType, storeId: input.storeId, customerId: session.accountId };
    }
    if (session.role === "store") {
      if (!input.customerId || !session.storeId) throw new TRPCError({ code: "BAD_REQUEST" });
      await requireActiveStore(db, session.storeId);
      await requireActiveCustomer(db, input.customerId);
      return { threadType: input.threadType, storeId: session.storeId, customerId: input.customerId };
    }
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  if (input.threadType === "therapist_customer") {
    if (session.role === "customer") {
      if (!input.therapistId) throw new TRPCError({ code: "BAD_REQUEST" });
      await requireCustomerMessagingAllowed(db, session.accountId);
      await requireActiveTherapist(db, input.therapistId, true);
      return { threadType: input.threadType, therapistId: input.therapistId, customerId: session.accountId };
    }
    if (session.role === "therapist") {
      if (!input.customerId || !session.therapistId) throw new TRPCError({ code: "BAD_REQUEST" });
      await requireActiveTherapist(db, session.therapistId);
      await requireActiveCustomer(db, input.customerId);
      await requireTherapistCustomerRelation(db, session.therapistId, input.customerId);
      return { threadType: input.threadType, therapistId: session.therapistId, customerId: input.customerId };
    }
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  if (input.threadType === "store_therapist") {
    if (session.role === "store") {
      if (!input.therapistId || !session.storeId) throw new TRPCError({ code: "BAD_REQUEST" });
      await requireActiveStore(db, session.storeId);
      await requireActiveTherapist(db, input.therapistId, false, session.storeId);
      return { threadType: input.threadType, storeId: session.storeId, therapistId: input.therapistId };
    }
    if (session.role === "therapist") {
      if (!session.therapistId) throw new TRPCError({ code: "BAD_REQUEST" });
      const therapist = await requireActiveTherapist(db, session.therapistId);
      if (!therapist.storeId) throw new TRPCError({ code: "FORBIDDEN" });
      if (input.storeId && input.storeId !== therapist.storeId) throw new TRPCError({ code: "FORBIDDEN" });
      await requireActiveStore(db, therapist.storeId);
      return { threadType: input.threadType, storeId: therapist.storeId, therapistId: session.therapistId };
    }
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  throw new TRPCError({ code: "BAD_REQUEST" });
}

async function requireUsableThreadParticipants(db: any, thread: any) {
  if (thread.threadType === "store_customer") {
    if (!thread.storeId || !thread.customerId) throw new TRPCError({ code: "NOT_FOUND" });
    await requireActiveStore(db, thread.storeId);
    await requireActiveCustomer(db, thread.customerId);
    return;
  }
  if (thread.threadType === "therapist_customer") {
    if (!thread.therapistId || !thread.customerId) throw new TRPCError({ code: "NOT_FOUND" });
    await requireActiveTherapist(db, thread.therapistId);
    await requireActiveCustomer(db, thread.customerId);
    return;
  }
  if (thread.threadType === "store_therapist") {
    if (!thread.storeId || !thread.therapistId) throw new TRPCError({ code: "NOT_FOUND" });
    await requireActiveStore(db, thread.storeId);
    await requireActiveTherapist(db, thread.therapistId, false, thread.storeId);
  }
}

async function markThreadRead(db: any, threadId: number, thread: any, role: "store" | "therapist" | "customer") {
  const updateSet: any = {};
  if (role === "store") updateSet.storeUnread = 0;
  if (role === "therapist") updateSet.therapistUnread = 0;
  if (role === "customer") updateSet.customerUnread = 0;
  if (!thread.storeId) updateSet.storeUnread = 0;
  if (!thread.therapistId) updateSet.therapistUnread = 0;
  if (!thread.customerId) updateSet.customerUnread = 0;

  await db.update(messageThreads).set(updateSet).where(eq(messageThreads.id, threadId));
  await db.update(messages).set({ isRead: true })
    .where(and(
      eq(messages.threadId, threadId),
      visibleMessageCondition(role),
      sql`${messages.senderRole} <> ${role}`,
    ));
}

export const messageRouter = router({
  getThreads: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await ensureRuntimeSchema();
    const conditions: any[] = [];
    if (session.role === "store") conditions.push(eq(messageThreads.storeId, session.storeId!));
    else if (session.role === "therapist") conditions.push(eq(messageThreads.therapistId, session.therapistId!));
    else conditions.push(eq(messageThreads.customerId, session.accountId));
    const threadRows = await db.select().from(messageThreads).where(and(...conditions)).orderBy(desc(messageThreads.lastMessageAt)).limit(50);
    // Attach last message and other participant info
    const result = [];
    for (const thread of threadRows) {
      const lastMsgRows = await db.select({ content: messages.content, createdAt: messages.createdAt })
        .from(messages).where(and(eq(messages.threadId, thread.id), visibleMessageCondition(session.role)))
        .orderBy(desc(messages.createdAt)).limit(1);
      let otherName: string | null = null;
      let otherAvatar: string | null = null;
      let otherRole: string | null = null;
      let contextLabel: string | null = null;
      let unreadCount = 0;
      if (session.role === "store") {
        unreadCount = thread.storeUnread;
        if (thread.therapistId && thread.threadType === "store_therapist") {
          const tRows = await db.select({ displayName: therapists.displayName, profileImageUrl: therapists.profileImageUrl }).from(therapists).where(eq(therapists.id, thread.therapistId)).limit(1);
          otherName = tRows[0]?.displayName ?? null; otherAvatar = tRows[0]?.profileImageUrl ?? null; otherRole = "セラピスト";
          contextLabel = "業務DM";
        } else if (thread.therapistId && thread.customerId && thread.threadType === "therapist_customer") {
          const tRows = await db.select({ displayName: therapists.displayName }).from(therapists).where(eq(therapists.id, thread.therapistId)).limit(1);
          const cpRows = await db.select({ displayName: customerProfiles.displayName, nickname: customerProfiles.nickname, profileImageUrl: customerProfiles.profileImageUrl }).from(customerProfiles).where(eq(customerProfiles.accountId, thread.customerId)).limit(1);
          otherName = customerDisplayName(cpRows[0], thread.customerId); otherAvatar = cpRows[0]?.profileImageUrl ?? null; otherRole = "お客様";
          contextLabel = `${tRows[0]?.displayName ?? "セラピスト"}とのDM`;
        } else if (thread.customerId) {
          const cpRows = await db.select({ displayName: customerProfiles.displayName, nickname: customerProfiles.nickname, profileImageUrl: customerProfiles.profileImageUrl }).from(customerProfiles).where(eq(customerProfiles.accountId, thread.customerId)).limit(1);
          otherName = customerDisplayName(cpRows[0], thread.customerId); otherAvatar = cpRows[0]?.profileImageUrl ?? null; otherRole = "お客様";
          contextLabel = "店舗DM";
        }
      } else if (session.role === "therapist") {
        unreadCount = thread.therapistUnread;
        if (thread.storeId && thread.threadType === "store_therapist") {
          const sRows = await db.select({ name: stores.name, logoUrl: stores.logoUrl }).from(stores).where(eq(stores.id, thread.storeId)).limit(1);
          otherName = sRows[0]?.name ?? null; otherAvatar = sRows[0]?.logoUrl ?? null; otherRole = "店舗";
          contextLabel = "業務DM";
        } else if (thread.customerId) {
          const cpRows = await db.select({ displayName: customerProfiles.displayName, nickname: customerProfiles.nickname, profileImageUrl: customerProfiles.profileImageUrl }).from(customerProfiles).where(eq(customerProfiles.accountId, thread.customerId)).limit(1);
          otherName = customerDisplayName(cpRows[0], thread.customerId); otherAvatar = cpRows[0]?.profileImageUrl ?? null; otherRole = "お客様";
          contextLabel = "顧客DM";
        }
      } else {
        // customer
        unreadCount = thread.customerUnread;
        if (thread.therapistId) {
          const tRows = await db.select({ displayName: therapists.displayName, profileImageUrl: therapists.profileImageUrl }).from(therapists).where(eq(therapists.id, thread.therapistId)).limit(1);
          otherName = tRows[0]?.displayName ?? null; otherAvatar = tRows[0]?.profileImageUrl ?? null; otherRole = "セラピスト";
          contextLabel = "セラピストDM";
        } else if (thread.storeId) {
          const sRows = await db.select({ name: stores.name, logoUrl: stores.logoUrl }).from(stores).where(eq(stores.id, thread.storeId)).limit(1);
          otherName = sRows[0]?.name ?? null; otherAvatar = sRows[0]?.logoUrl ?? null; otherRole = "店舗";
          contextLabel = "店舗DM";
        }
      }
      result.push({ ...thread, otherName, otherAvatar, otherRole, contextLabel, unreadCount, lastMessage: lastMsgRows[0]?.content ?? null });
    }
    return result;
  }),

  getOrCreateThread: publicProcedure
    .input(z.object({
      threadType: z.enum(["store_customer", "therapist_customer", "store_therapist"]),
      storeId: z.number().optional(),
      therapistId: z.number().optional(),
      customerId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensureRuntimeSchema();
      const threadData = await buildThreadData(db, input, session);
      const conditions: any[] = [eq(messageThreads.threadType, threadData.threadType)];
      if (threadData.storeId) conditions.push(eq(messageThreads.storeId, threadData.storeId));
      if (threadData.therapistId) conditions.push(eq(messageThreads.therapistId, threadData.therapistId));
      if (threadData.customerId) conditions.push(eq(messageThreads.customerId, threadData.customerId));
      const existing = await db.select().from(messageThreads).where(and(...conditions)).limit(1);
      if (existing[0]) return existing[0];
      const result = await db.insert(messageThreads).values(threadData);
      const threadId = (result as any)[0].insertId as number;
      const rows = await db.select().from(messageThreads).where(eq(messageThreads.id, threadId)).limit(1);
      return rows[0];
    }),

  getMessages: publicProcedure
    .input(z.object({ threadId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensureRuntimeSchema();
      const threadRows = await db.select().from(messageThreads).where(eq(messageThreads.id, input.threadId)).limit(1);
      if (!threadRows[0] || !canAccessThread(session, threadRows[0])) throw new TRPCError({ code: "NOT_FOUND" });
      await markThreadRead(db, input.threadId, threadRows[0], session.role);
      return db.select().from(messages).where(and(eq(messages.threadId, input.threadId), visibleMessageCondition(session.role))).orderBy(messages.createdAt).limit(input.limit);
    }),

  send: publicProcedure
    .input(z.object({
      threadId: z.number(),
      content: z.string().optional(),
      imageUrl: z.string().optional(),
      isTemplate: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensureRuntimeSchema();
      const threadRows = await db.select().from(messageThreads).where(eq(messageThreads.id, input.threadId)).limit(1);
      if (!threadRows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const thread = threadRows[0];
      if (!canAccessThread(session, thread)) throw new TRPCError({ code: "NOT_FOUND" });
      await requireUsableThreadParticipants(db, thread);
      if (session.role === "customer") await requireCustomerMessagingAllowed(db, session.accountId);
      if (thread.isBlocked) throw new TRPCError({ code: "FORBIDDEN", message: "このスレッドはブロックされています" });
      if (input.content && containsBannedWord(input.content)) throw new TRPCError({ code: "BAD_REQUEST", message: "禁止ワードが含まれています" });
      await markThreadRead(db, input.threadId, thread, session.role);
      const senderId = session.role === "store" ? session.storeId! : session.role === "therapist" ? session.therapistId! : session.accountId;
      await db.insert(messages).values({ threadId: input.threadId, senderRole: session.role, senderId, content: input.content, imageUrl: input.imageUrl, isTemplate: input.isTemplate });
      const updateSet: any = { lastMessageAt: new Date() };
      if (thread.storeId && session.role !== "store") updateSet.storeUnread = sql`${messageThreads.storeUnread} + 1`;
      if (thread.therapistId && session.role !== "therapist") updateSet.therapistUnread = sql`${messageThreads.therapistUnread} + 1`;
      if (thread.customerId && session.role !== "customer") updateSet.customerUnread = sql`${messageThreads.customerUnread} + 1`;
      await db.update(messageThreads).set(updateSet).where(eq(messageThreads.id, input.threadId));
      return { success: true };
    }),

  deleteMessage: publicProcedure
    .input(z.object({
      messageId: z.number(),
      mode: z.enum(["me", "everyone"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensureRuntimeSchema();

      const messageRows = await db.select().from(messages).where(eq(messages.id, input.messageId)).limit(1);
      const message = messageRows[0];
      if (!message) throw new TRPCError({ code: "NOT_FOUND" });
      const threadRows = await db.select().from(messageThreads).where(eq(messageThreads.id, message.threadId)).limit(1);
      const thread = threadRows[0];
      if (!thread || !canAccessThread(session, thread)) throw new TRPCError({ code: "NOT_FOUND" });

      const actorId = actorIdForSession(session);
      if (input.mode === "everyone") {
        if (message.senderRole !== session.role || message.senderId !== actorId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "全員から削除できるのは自分が送信したメッセージだけです" });
        }
        await db.update(messages).set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedByRole: session.role,
          deletedById: actorId,
        }).where(eq(messages.id, input.messageId));
      } else {
        const updateSet: any = {
          deletedAt: new Date(),
          deletedByRole: session.role,
          deletedById: actorId,
        };
        updateSet[deleteFlagForRole(session.role)] = true;
        await db.update(messages).set(updateSet).where(eq(messages.id, input.messageId));
      }

      return { success: true };
    }),

  reportMessage: publicProcedure
    .input(z.object({ messageId: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const messageRows = await db.select().from(messages).where(eq(messages.id, input.messageId)).limit(1);
      const message = messageRows[0];
      if (!message) throw new TRPCError({ code: "NOT_FOUND" });
      const threadRows = await db.select().from(messageThreads).where(eq(messageThreads.id, message.threadId)).limit(1);
      const thread = threadRows[0];
      if (!thread || !canAccessThread(session, thread)) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(messages).set({ isReported: true }).where(eq(messages.id, input.messageId));
      const reporterId = session.role === "store" ? session.storeId! : session.role === "therapist" ? session.therapistId! : session.accountId;
      await db.insert(reports).values({ reporterRole: session.role, reporterId, targetType: "message", targetId: input.messageId, reason: input.reason });
      return { success: true };
    }),

  blockThread: publicProcedure
    .input(z.object({ threadId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const threadRows = await db.select().from(messageThreads).where(eq(messageThreads.id, input.threadId)).limit(1);
      if (!threadRows[0] || !canAccessThread(session, threadRows[0])) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(messageThreads).set({ isBlocked: true }).where(eq(messageThreads.id, input.threadId));
      return { success: true };
    }),

  reportUser: publicProcedure
    .input(z.object({ targetType: z.enum(["store", "therapist", "customer"]), targetId: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const reporterId = session.role === "store" ? session.storeId! : session.role === "therapist" ? session.therapistId! : session.accountId;
      await db.insert(reports).values({ reporterRole: session.role, reporterId, ...input });
      return { success: true };
    }),
});
