import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import { sales, therapistPayrolls, therapists } from "../../drizzle/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";

export const salesRouter = router({
  getStoreSales: publicProcedure
    .input(z.object({ month: z.string().optional(), limit: z.number().default(100) }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) return [];
      const month = input.month ?? new Date().toISOString().slice(0, 7);
      return db.select().from(sales).where(and(eq(sales.storeId, session.storeId), gte(sales.date, month + "-01"))).orderBy(desc(sales.date)).limit(input.limit);
    }),

  getStoreSummary: publicProcedure
    .input(z.object({ month: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) return null;
      const month = input.month ?? new Date().toISOString().slice(0, 7);
      const rows = await db.select({
        totalAmount: sql<number>`SUM(totalAmount)`,
        menuAmount: sql<number>`SUM(menuAmount)`,
        nominationFee: sql<number>`SUM(nominationFee)`,
        optionAmount: sql<number>`SUM(optionAmount)`,
        discountAmount: sql<number>`SUM(discountAmount)`,
        therapistBack: sql<number>`SUM(therapistBack)`,
        count: sql<number>`COUNT(*)`,
      }).from(sales).where(and(eq(sales.storeId, session.storeId), gte(sales.date, month + "-01")));
      return rows[0] ?? null;
    }),

  getDailySales: publicProcedure
    .input(z.object({ month: z.string() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) return [];
      return db.select({
        date: sales.date,
        totalAmount: sql<number>`SUM(totalAmount)`,
        count: sql<number>`COUNT(*)`,
      }).from(sales).where(and(eq(sales.storeId, session.storeId), gte(sales.date, input.month + "-01"))).groupBy(sales.date).orderBy(sales.date);
    }),

  getTherapistPayrolls: publicProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) return [];
      return db.select().from(therapistPayrolls).where(and(eq(therapistPayrolls.storeId, session.storeId), eq(therapistPayrolls.year, input.year), eq(therapistPayrolls.month, input.month)));
    }),

  calculatePayroll: publicProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) throw new TRPCError({ code: "NOT_FOUND" });
      const monthStr = `${input.year}-${String(input.month).padStart(2, "0")}`;
      const therapistRows = await db.select().from(therapists).where(eq(therapists.storeId, session.storeId));
      for (const t of therapistRows) {
        const salesRows = await db.select({
          totalBack: sql<number>`SUM(therapistBack)`,
          nominationCount: sql<number>`COUNT(CASE WHEN nominationFee > 0 THEN 1 END)`,
          count: sql<number>`COUNT(*)`,
        }).from(sales).where(and(eq(sales.therapistId, t.id), gte(sales.date, monthStr + "-01")));
        const s = salesRows[0];
        const existing = await db.select().from(therapistPayrolls).where(and(eq(therapistPayrolls.therapistId, t.id), eq(therapistPayrolls.year, input.year), eq(therapistPayrolls.month, input.month))).limit(1);
        const payrollData = {
          storeId: session.storeId,
          therapistId: t.id,
          year: input.year,
          month: input.month,
          nominationCount: s?.nominationCount ?? 0,
          totalSales: s?.totalBack ?? 0,
          backAmount: s?.totalBack ?? 0,
          adjustmentAmount: 0,
          finalAmount: s?.totalBack ?? 0,
          isPaid: false,
        };
        if (existing.length > 0) {
          await db.update(therapistPayrolls).set(payrollData).where(eq(therapistPayrolls.id, existing[0].id));
        } else {
          await db.insert(therapistPayrolls).values(payrollData);
        }
      }
      return { success: true };
    }),

  updatePayroll: publicProcedure
    .input(z.object({
      id: z.number(),
      adjustmentAmount: z.number().optional(),
      adjustmentNote: z.string().optional(),
      isPaid: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.isPaid) updateData.paidAt = new Date();
      await db.update(therapistPayrolls).set(updateData).where(eq(therapistPayrolls.id, id));
      return { success: true };
    }),

  updateBackRate: publicProcedure
    .input(z.object({ therapistId: z.number(), backRate: z.number().min(0).max(100) }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(therapists).set({ backRate: String(input.backRate) }).where(eq(therapists.id, input.therapistId));
      return { success: true };
    }),
});
