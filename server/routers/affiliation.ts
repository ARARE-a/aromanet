import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { affiliationRequests, therapists, stores, therapistSalarySettings, notifications, messageThreads, messages, therapistPayrolls } from "../../drizzle/schema";
import { getDb } from "../db";
import { getSession } from "../session";
import { publicProcedure, router } from "../_core/trpc";

function getTokyoYearMonth() {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

export const affiliationRouter = router({
  // Therapist sends affiliation request to a store
  sendRequest: publicProcedure
    .input(z.object({
      storeId: z.number(),
      message: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Get therapist record
      const therapistRows = await db.select().from(therapists).where(eq(therapists.accountId, session.accountId)).limit(1);
      if (!therapistRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "セラピスト情報が見つかりません" });
      const therapist = therapistRows[0];
      // Check for existing pending request
      const existing = await db.select().from(affiliationRequests)
        .where(and(eq(affiliationRequests.therapistId, therapist.id), eq(affiliationRequests.storeId, input.storeId), eq(affiliationRequests.status, "pending")))
        .limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "既に申請中です" });
      await db.insert(affiliationRequests).values({
        therapistId: therapist.id,
        storeId: input.storeId,
        message: input.message,
        status: "pending",
      });
      // Notify store
      await db.insert(notifications).values({
        recipientRole: "store",
        recipientId: input.storeId,
        type: "system",
        title: "所属申請が届きました",
        body: `${therapist.displayName}さんから所属申請が届きました`,
        isRead: false,
      });
      return { success: true };
    }),

  // Get therapist's own requests
  getMyRequests: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const therapistRows = await db.select().from(therapists).where(eq(therapists.accountId, session.accountId)).limit(1);
    if (!therapistRows[0]) return [];
    const reqs = await db.select().from(affiliationRequests)
      .where(eq(affiliationRequests.therapistId, therapistRows[0].id))
      .orderBy(desc(affiliationRequests.createdAt));
    // Attach store info
    const result = [];
    for (const req of reqs) {
      const storeRows = await db.select({ id: stores.id, name: stores.name, prefecture: stores.prefecture }).from(stores).where(eq(stores.id, req.storeId)).limit(1);
      result.push({ ...req, store: storeRows[0] ?? null });
    }
    return result;
  }),

  // Get store's pending requests
  getStoreRequests: publicProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) throw new TRPCError({ code: "BAD_REQUEST" });
      const conditions: any[] = [eq(affiliationRequests.storeId, session.storeId)];
      if (input.status) conditions.push(eq(affiliationRequests.status, input.status));
      const reqs = await db.select().from(affiliationRequests).where(and(...conditions)).orderBy(desc(affiliationRequests.createdAt));
      const result = [];
      for (const req of reqs) {
        const therapistRows = await db.select({ id: therapists.id, displayName: therapists.displayName, profileImageUrl: therapists.profileImageUrl }).from(therapists).where(eq(therapists.id, req.therapistId)).limit(1);
        const t = therapistRows[0];
        result.push({
          ...req,
          therapist: t ?? null,
          therapistName: t?.displayName ?? null,
          therapistImage: t?.profileImageUrl ?? null,
        });
      }
      return result;
    }),

  // Store approves/rejects request
  respond: publicProcedure
    .input(z.object({
      requestId: z.number(),
      action: z.enum(["approved", "rejected"]),
      responseNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const reqRows = await db.select().from(affiliationRequests).where(and(eq(affiliationRequests.id, input.requestId), eq(affiliationRequests.storeId, session.storeId!))).limit(1);
      if (!reqRows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const req = reqRows[0];
      await db.update(affiliationRequests).set({ status: input.action, responseNote: input.responseNote }).where(eq(affiliationRequests.id, input.requestId));
      if (input.action === "approved") {
        // Update therapist storeId
        await db.update(therapists).set({ storeId: session.storeId, affiliationStatus: "approved" }).where(eq(therapists.id, req.therapistId));
        // Create default salary settings
        const existing = await db.select().from(therapistSalarySettings).where(and(eq(therapistSalarySettings.therapistId, req.therapistId), eq(therapistSalarySettings.storeId, session.storeId!))).limit(1);
        if (!existing[0]) {
          await db.insert(therapistSalarySettings).values({ therapistId: req.therapistId, storeId: session.storeId!, backRate: "50.00", nominationFee: 0 });
        }
        // Notify therapist
        await db.insert(notifications).values({
          recipientRole: "therapist",
          recipientId: req.therapistId,
          type: "system",
          title: "所属申請が承認されました",
          body: "店舗への所属が承認されました。おめでとうございます！",
          isRead: false,
        });
      } else {
        await db.insert(notifications).values({
          recipientRole: "therapist",
          recipientId: req.therapistId,
          type: "system",
          title: "所属申請が却下されました",
          body: input.responseNote ? `理由: ${input.responseNote}` : "所属申請が却下されました",
          isRead: false,
        });
      }
      return { success: true };
    }),

  // Therapist cancels request
  cancel: publicProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const therapistRows = await db.select().from(therapists).where(eq(therapists.accountId, session.accountId)).limit(1);
      if (!therapistRows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(affiliationRequests).set({ status: "cancelled" }).where(and(eq(affiliationRequests.id, input.requestId), eq(affiliationRequests.therapistId, therapistRows[0].id)));
      return { success: true };
    }),

  // Get salary settings for a therapist (store view)
  getSalarySettings: publicProcedure
    .input(z.object({ therapistId: z.number() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(therapistSalarySettings)
        .where(and(eq(therapistSalarySettings.therapistId, input.therapistId), eq(therapistSalarySettings.storeId, session.storeId!)))
        .limit(1);
      return rows[0] ?? null;
    }),

  // Update salary settings
  updateSalarySettings: publicProcedure
    .input(z.object({
      therapistId: z.number(),
      backRate: z.number().min(0).max(100),
      nominationFee: z.number().min(0).optional(),
      adjustmentNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select().from(therapistSalarySettings)
        .where(and(eq(therapistSalarySettings.therapistId, input.therapistId), eq(therapistSalarySettings.storeId, session.storeId!)))
        .limit(1);
      if (existing[0]) {
        await db.update(therapistSalarySettings).set({
          backRate: String(input.backRate),
          nominationFee: input.nominationFee,
          adjustmentNote: input.adjustmentNote,
        }).where(eq(therapistSalarySettings.id, existing[0].id));
      } else {
        await db.insert(therapistSalarySettings).values({
          therapistId: input.therapistId,
          storeId: session.storeId!,
          backRate: String(input.backRate),
          nominationFee: input.nominationFee ?? 0,
          adjustmentNote: input.adjustmentNote,
        });
      }
      return { success: true };
    }),

  // Send today's salary notification to therapist
  sendSalaryNotification: publicProcedure
    .input(z.object({
      therapistId: z.number(),
      amount: z.number(),
      message: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
      const body = input.message?.trim() || `${today}の女子給は ¥${input.amount.toLocaleString()} です。`;
      await db.insert(notifications).values({
        recipientRole: "therapist",
        recipientId: input.therapistId,
        type: "system",
        title: `本日の女子給: ¥${input.amount.toLocaleString()}`,
        body,
        isRead: false,
      });
      const { year, month } = getTokyoYearMonth();
      const payrollRows = await db.select().from(therapistPayrolls)
        .where(and(
          eq(therapistPayrolls.therapistId, input.therapistId),
          eq(therapistPayrolls.storeId, session.storeId!),
          eq(therapistPayrolls.year, year),
          eq(therapistPayrolls.month, month),
        ))
        .limit(1);
      const adjustmentNote = body.length > 0 ? body : `女子給送信 ¥${input.amount.toLocaleString()}`;
      if (payrollRows[0]) {
        const payroll = payrollRows[0];
        const adjustmentAmount = Number(payroll.adjustmentAmount ?? 0) + input.amount;
        const backAmount = Number(payroll.backAmount ?? 0);
        const noteParts = [payroll.adjustmentNote, adjustmentNote].filter(Boolean);
        await db.update(therapistPayrolls).set({
          adjustmentAmount,
          adjustmentNote: noteParts.join("\n"),
          totalPayroll: backAmount + adjustmentAmount,
        }).where(eq(therapistPayrolls.id, payroll.id));
      } else {
        await db.insert(therapistPayrolls).values({
          therapistId: input.therapistId,
          storeId: session.storeId!,
          year,
          month,
          adjustmentAmount: input.amount,
          adjustmentNote,
          totalPayroll: input.amount,
        });
      }
      const threadRows = await db.select().from(messageThreads)
        .where(and(
          eq(messageThreads.threadType, "store_therapist"),
          eq(messageThreads.storeId, session.storeId!),
          eq(messageThreads.therapistId, input.therapistId),
        ))
        .limit(1);
      let threadId = threadRows[0]?.id;
      if (!threadId) {
        const result = await db.insert(messageThreads).values({
          threadType: "store_therapist",
          storeId: session.storeId!,
          therapistId: input.therapistId,
        });
        threadId = (result as any)[0].insertId as number;
      }
      const content = `本日の女子給: ¥${input.amount.toLocaleString()}\n${body}`;
      await db.insert(messages).values({
        threadId,
        senderRole: "store",
        senderId: session.storeId!,
        content,
      });
      await db.update(messageThreads).set({
        lastMessageAt: new Date(),
        therapistUnread: sql`${messageThreads.therapistUnread} + 1`,
      }).where(eq(messageThreads.id, threadId));
      return { success: true };
    }),
});
