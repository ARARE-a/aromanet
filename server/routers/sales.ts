import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import { sales, therapistPayrolls, therapists, therapistSalarySettings } from "../../drizzle/schema";
import { eq, and, desc, gte, lt, sql } from "drizzle-orm";

function getMonthBounds(month: string) {
  const [yearValue, monthValue] = month.split("-").map(Number);
  const nextYear = monthValue === 12 ? yearValue + 1 : yearValue;
  const nextMonth = monthValue === 12 ? 1 : monthValue + 1;
  return {
    start: `${yearValue}-${String(monthValue).padStart(2, "0")}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

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
      const { start, end } = getMonthBounds(month);
      return db.select().from(sales).where(and(eq(sales.storeId, session.storeId), gte(sales.date, start), lt(sales.date, end))).orderBy(desc(sales.date)).limit(input.limit);
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
      const { start, end } = getMonthBounds(month);
      const rows = await db.select({
        totalAmount: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        menuAmount: sql<number>`COALESCE(SUM(${sales.menuAmount}), 0)`,
        nominationFee: sql<number>`COALESCE(SUM(${sales.nominationFee}), 0)`,
        optionAmount: sql<number>`COALESCE(SUM(${sales.optionAmount}), 0)`,
        discountAmount: sql<number>`COALESCE(SUM(${sales.discountAmount}), 0)`,
        therapistBack: sql<number>`COALESCE(SUM(${sales.therapistBack}), 0)`,
        count: sql<number>`COUNT(*)`,
      }).from(sales).where(and(eq(sales.storeId, session.storeId), gte(sales.date, start), lt(sales.date, end)));
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
      const { start, end } = getMonthBounds(input.month);
      return db.select({
        date: sales.date,
        totalAmount: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        count: sql<number>`COUNT(*)`,
      }).from(sales).where(and(eq(sales.storeId, session.storeId), gte(sales.date, start), lt(sales.date, end))).groupBy(sales.date).orderBy(sales.date);
    }),

  getTherapistPayrolls: publicProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) return [];
      const rows = await db.select({
        id: therapistPayrolls.id,
        therapistId: therapistPayrolls.therapistId,
        storeId: therapistPayrolls.storeId,
        year: therapistPayrolls.year,
        month: therapistPayrolls.month,
        nominationCount: therapistPayrolls.nominationCount,
        salesAmount: therapistPayrolls.totalSales,
        totalSales: therapistPayrolls.totalSales,
        backRate: therapistPayrolls.backRate,
        baseAmount: therapistPayrolls.backAmount,
        backAmount: therapistPayrolls.backAmount,
        optionAmount: therapistPayrolls.optionAmount,
        adjustmentAmount: therapistPayrolls.adjustmentAmount,
        adjustmentNote: therapistPayrolls.adjustmentNote,
        totalPayroll: therapistPayrolls.totalPayroll,
        totalAmount: sql<number>`CASE WHEN ${therapistPayrolls.totalPayroll} <> 0 THEN ${therapistPayrolls.totalPayroll} ELSE ${therapistPayrolls.backAmount} + ${therapistPayrolls.adjustmentAmount} END`,
        paymentStatus: sql<string>`CASE WHEN ${therapistPayrolls.isPaid} THEN 'paid' ELSE 'unpaid' END`,
        isPaid: therapistPayrolls.isPaid,
        paidAt: therapistPayrolls.paidAt,
        therapistName: therapists.displayName,
        therapistImage: therapists.profileImageUrl,
        createdAt: therapistPayrolls.createdAt,
        updatedAt: therapistPayrolls.updatedAt,
      }).from(therapistPayrolls)
        .leftJoin(therapists, eq(therapistPayrolls.therapistId, therapists.id))
        .where(and(eq(therapistPayrolls.storeId, session.storeId), eq(therapistPayrolls.year, input.year), eq(therapistPayrolls.month, input.month)));
      return rows;
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
      const { start, end } = getMonthBounds(monthStr);
      const therapistRows = await db.select().from(therapists).where(eq(therapists.storeId, session.storeId));
      for (const t of therapistRows) {
        const salaryRows = await db.select().from(therapistSalarySettings)
          .where(and(eq(therapistSalarySettings.therapistId, t.id), eq(therapistSalarySettings.storeId, session.storeId)))
          .limit(1);
        const effectiveBackRate = Number(salaryRows[0]?.backRate ?? t.backRate ?? 50);
        const saleRowsForRate = await db.select({
          id: sales.id,
          totalAmount: sales.totalAmount,
          nominationFee: sales.nominationFee,
        }).from(sales).where(and(
          eq(sales.storeId, session.storeId),
          eq(sales.therapistId, t.id),
          gte(sales.date, start),
          lt(sales.date, end),
        ));
        for (const sale of saleRowsForRate) {
          const therapistBack = Math.floor(Math.max(0, Number(sale.totalAmount ?? 0) - Number(sale.nominationFee ?? 0)) * effectiveBackRate / 100);
          await db.update(sales).set({ therapistBack }).where(eq(sales.id, sale.id));
        }
        const salesRows = await db.select({
          totalSales: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
          totalBack: sql<number>`COALESCE(SUM(${sales.therapistBack}), 0)`,
          optionAmount: sql<number>`COALESCE(SUM(${sales.optionAmount}), 0)`,
          nominationCount: sql<number>`SUM(CASE WHEN ${sales.nominationFee} > 0 THEN 1 ELSE 0 END)`,
          count: sql<number>`COUNT(*)`,
        }).from(sales).where(and(
          eq(sales.storeId, session.storeId),
          eq(sales.therapistId, t.id),
          gte(sales.date, start),
          lt(sales.date, end),
        ));
        const s = salesRows[0];
        const existing = await db.select().from(therapistPayrolls).where(and(
          eq(therapistPayrolls.therapistId, t.id),
          eq(therapistPayrolls.storeId, session.storeId),
          eq(therapistPayrolls.year, input.year),
          eq(therapistPayrolls.month, input.month),
        )).limit(1);
        const existingPayroll = existing[0];
        const backAmount = Number(s?.totalBack ?? 0);
        const adjustmentAmount = existingPayroll?.adjustmentAmount ?? 0;
        const totalPayroll = backAmount + adjustmentAmount;
        const payrollChanged = existingPayroll && Number(existingPayroll.totalPayroll ?? 0) !== totalPayroll;
        const payrollData = {
          storeId: session.storeId,
          therapistId: t.id,
          year: input.year,
          month: input.month,
          nominationCount: s?.nominationCount ?? 0,
          totalSales: Number(s?.totalSales ?? 0),
          backRate: String(effectiveBackRate.toFixed(2)),
          backAmount,
          optionAmount: Number(s?.optionAmount ?? 0),
          adjustmentAmount,
          totalPayroll,
          isPaid: payrollChanged ? false : (existingPayroll?.isPaid ?? false),
          paidAt: payrollChanged ? null : (existingPayroll?.paidAt ?? null),
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
      if (!session.storeId) throw new TRPCError({ code: "NOT_FOUND" });
      const { id, ...data } = input;
      const updateData: any = { ...data };
      const rows = await db.select().from(therapistPayrolls)
        .where(and(eq(therapistPayrolls.id, id), eq(therapistPayrolls.storeId, session.storeId)))
        .limit(1);
      const payroll = rows[0];
      if (!payroll) throw new TRPCError({ code: "NOT_FOUND" });
      if (data.adjustmentAmount !== undefined) {
        const totalPayroll = payroll.backAmount + data.adjustmentAmount;
        updateData.totalPayroll = totalPayroll;
        if (!data.isPaid && Number(payroll.totalPayroll ?? 0) !== totalPayroll) {
          updateData.isPaid = false;
          updateData.paidAt = null;
        }
      }
      if (data.isPaid) updateData.paidAt = new Date();
      await db.update(therapistPayrolls).set(updateData)
        .where(and(eq(therapistPayrolls.id, id), eq(therapistPayrolls.storeId, session.storeId)));
      return { success: true };
    }),

  updateBackRate: publicProcedure
    .input(z.object({ therapistId: z.number(), backRate: z.number().min(0).max(100) }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) throw new TRPCError({ code: "NOT_FOUND" });
      const rows = await db.select({ id: therapists.id }).from(therapists)
        .where(and(eq(therapists.id, input.therapistId), eq(therapists.storeId, session.storeId)))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(therapists).set({ backRate: String(input.backRate) })
        .where(and(eq(therapists.id, input.therapistId), eq(therapists.storeId, session.storeId)));
      return { success: true };
    }),
});
