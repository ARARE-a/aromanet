import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import { messageThreads, messages, reports, therapists, stores, customerProfiles } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const BANNED_WORDS = ["LINE", "ライン", "連絡先", "個人連絡", "個人情報", "電話番号"];
function containsBannedWord(text: string) {
  return BANNED_WORDS.some(w => text.includes(w));
}

export const messageRouter = router({
  getThreads: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conditions: any[] = [];
    if (session.role === "store") conditions.push(eq(messageThreads.storeId, session.storeId!));
    else if (session.role === "therapist") conditions.push(eq(messageThreads.therapistId, session.therapistId!));
    else conditions.push(eq(messageThreads.customerId, session.accountId));
    const threadRows = await db.select().from(messageThreads).where(and(...conditions)).orderBy(desc(messageThreads.lastMessageAt)).limit(50);
    // Attach last message and other participant info
    const result = [];
    for (const thread of threadRows) {
      const lastMsgRows = await db.select({ content: messages.content, createdAt: messages.createdAt })
        .from(messages).where(and(eq(messages.threadId, thread.id), eq(messages.isDeleted, false)))
        .orderBy(desc(messages.createdAt)).limit(1);
      let otherName: string | null = null;
      let otherAvatar: string | null = null;
      let otherRole: string | null = null;
      let unreadCount = 0;
      if (session.role === "store") {
        unreadCount = thread.storeUnread;
        if (thread.therapistId && thread.threadType === "store_therapist") {
          const tRows = await db.select({ displayName: therapists.displayName, profileImageUrl: therapists.profileImageUrl }).from(therapists).where(eq(therapists.id, thread.therapistId)).limit(1);
          otherName = tRows[0]?.displayName ?? null; otherAvatar = tRows[0]?.profileImageUrl ?? null; otherRole = "セラピスト";
        } else if (thread.customerId) {
          const cpRows = await db.select({ displayName: customerProfiles.displayName, profileImageUrl: customerProfiles.profileImageUrl }).from(customerProfiles).where(eq(customerProfiles.accountId, thread.customerId)).limit(1);
          otherName = cpRows[0]?.displayName ?? `顧客#${thread.customerId}`; otherAvatar = cpRows[0]?.profileImageUrl ?? null; otherRole = "お客様";
        }
      } else if (session.role === "therapist") {
        unreadCount = thread.therapistUnread;
        if (thread.storeId && thread.threadType === "store_therapist") {
          const sRows = await db.select({ name: stores.name, logoUrl: stores.logoUrl }).from(stores).where(eq(stores.id, thread.storeId)).limit(1);
          otherName = sRows[0]?.name ?? null; otherAvatar = sRows[0]?.logoUrl ?? null; otherRole = "店舗";
        } else if (thread.customerId) {
          const cpRows = await db.select({ displayName: customerProfiles.displayName, profileImageUrl: customerProfiles.profileImageUrl }).from(customerProfiles).where(eq(customerProfiles.accountId, thread.customerId)).limit(1);
          otherName = cpRows[0]?.displayName ?? `顧客#${thread.customerId}`; otherAvatar = cpRows[0]?.profileImageUrl ?? null; otherRole = "お客様";
        }
      } else {
        // customer
        unreadCount = thread.customerUnread;
        if (thread.therapistId) {
          const tRows = await db.select({ displayName: therapists.displayName, profileImageUrl: therapists.profileImageUrl }).from(therapists).where(eq(therapists.id, thread.therapistId)).limit(1);
          otherName = tRows[0]?.displayName ?? null; otherAvatar = tRows[0]?.profileImageUrl ?? null; otherRole = "セラピスト";
        } else if (thread.storeId) {
          const sRows = await db.select({ name: stores.name, logoUrl: stores.logoUrl }).from(stores).where(eq(stores.id, thread.storeId)).limit(1);
          otherName = sRows[0]?.name ?? null; otherAvatar = sRows[0]?.logoUrl ?? null; otherRole = "店舗";
        }
      }
      result.push({ ...thread, otherName, otherAvatar, otherRole, unreadCount, lastMessage: lastMsgRows[0]?.content ?? null });
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
      const conditions: any[] = [eq(messageThreads.threadType, input.threadType)];
      if (input.storeId) conditions.push(eq(messageThreads.storeId, input.storeId));
      if (input.therapistId) conditions.push(eq(messageThreads.therapistId, input.therapistId));
      if (input.customerId) conditions.push(eq(messageThreads.customerId, input.customerId));
      const existing = await db.select().from(messageThreads).where(and(...conditions)).limit(1);
      if (existing[0]) return existing[0];
      const result = await db.insert(messageThreads).values(input);
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
      const updateSet: any = {};
      if (session.role === "store") updateSet.storeUnread = 0;
      else if (session.role === "therapist") updateSet.therapistUnread = 0;
      else updateSet.customerUnread = 0;
      await db.update(messageThreads).set(updateSet).where(eq(messageThreads.id, input.threadId));
      return db.select().from(messages).where(and(eq(messages.threadId, input.threadId), eq(messages.isDeleted, false))).orderBy(messages.createdAt).limit(input.limit);
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
      const threadRows = await db.select().from(messageThreads).where(eq(messageThreads.id, input.threadId)).limit(1);
      if (!threadRows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      if (threadRows[0].isBlocked) throw new TRPCError({ code: "FORBIDDEN", message: "このスレッドはブロックされています" });
      if (input.content && containsBannedWord(input.content)) throw new TRPCError({ code: "BAD_REQUEST", message: "禁止ワードが含まれています" });
      const senderId = session.role === "store" ? session.storeId! : session.role === "therapist" ? session.therapistId! : session.accountId;
      await db.insert(messages).values({ threadId: input.threadId, senderRole: session.role, senderId, content: input.content, imageUrl: input.imageUrl, isTemplate: input.isTemplate });
      const updateSet: any = { lastMessageAt: new Date() };
      if (session.role === "store") { updateSet.therapistUnread = sql`therapistUnread + 1`; updateSet.customerUnread = sql`customerUnread + 1`; }
      else if (session.role === "therapist") { updateSet.storeUnread = sql`storeUnread + 1`; updateSet.customerUnread = sql`customerUnread + 1`; }
      else { updateSet.storeUnread = sql`storeUnread + 1`; updateSet.therapistUnread = sql`therapistUnread + 1`; }
      await db.update(messageThreads).set(updateSet).where(eq(messageThreads.id, input.threadId));
      return { success: true };
    }),

  reportMessage: publicProcedure
    .input(z.object({ messageId: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
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
