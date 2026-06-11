import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import {
  therapists, stores, shifts, reservations,
  posts, postImages, customerMemos, follows, favorites,
  sales, therapistPayrolls,
} from "../../drizzle/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";

export const therapistRouter = router({
  getById: publicProcedure
    .input(z.object({ therapistId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(therapists).where(eq(therapists.id, input.therapistId)).limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      return rows[0];
    }),

  getByStore: publicProcedure
    .input(z.object({ storeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(therapists)
        .where(and(eq(therapists.storeId, input.storeId), eq(therapists.isPublic, true)))
        .orderBy(desc(therapists.nominationCount));
    }),

  search: publicProcedure
    .input(z.object({
      storeId: z.number().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions: any[] = [eq(therapists.isPublic, true)];
      if (input.storeId) conditions.push(eq(therapists.storeId, input.storeId));
      return db.select().from(therapists).where(and(...conditions)).orderBy(desc(therapists.nominationCount)).limit(input.limit).offset(input.offset);
    }),

  getMyProfile: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(therapists).where(eq(therapists.accountId, session.accountId)).limit(1);
    return rows[0] ?? null;
  }),

  updateProfile: publicProcedure
    .input(z.object({
      displayName: z.string().min(1).max(50).optional(),
      age: z.number().optional(),
      height: z.number().optional(),
      bio: z.string().optional(),
      specialties: z.string().optional(),
      profileImageUrl: z.string().optional(),
      coverImageUrl: z.string().optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(therapists).set(input).where(eq(therapists.accountId, session.accountId));
      return { success: true };
    }),

  getShifts: publicProcedure
    .input(z.object({ month: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.therapistId) return [];
      const month = input.month ?? new Date().toISOString().slice(0, 7);
      return db.select().from(shifts).where(and(eq(shifts.therapistId, session.therapistId), gte(shifts.date, month + "-01"))).orderBy(shifts.date);
    }),

  getPublicShifts: publicProcedure
    .input(z.object({ therapistId: z.number(), month: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(shifts).where(and(eq(shifts.therapistId, input.therapistId), gte(shifts.date, input.month + "-01"))).orderBy(shifts.date);
    }),

  createShift: publicProcedure
    .input(z.object({
      date: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      breakStart: z.string().optional(),
      breakEnd: z.string().optional(),
      note: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.therapistId) throw new TRPCError({ code: "NOT_FOUND" });
      const tRows = await db.select().from(therapists).where(eq(therapists.id, session.therapistId)).limit(1);
      if (!tRows[0]?.storeId) throw new TRPCError({ code: "NOT_FOUND" });
      await db.insert(shifts).values({ ...input, therapistId: session.therapistId, storeId: tRows[0].storeId });
      return { success: true };
    }),

  updateShift: publicProcedure
    .input(z.object({
      id: z.number(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      status: z.enum(["scheduled", "working", "off", "holiday"]).optional(),
      note: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(shifts).set(data).where(eq(shifts.id, id));
      return { success: true };
    }),

  getReservations: publicProcedure
    .input(z.object({ date: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.therapistId) return [];
      const conditions: any[] = [eq(reservations.therapistId, session.therapistId)];
      if (input.date) conditions.push(eq(reservations.date, input.date));
      return db.select().from(reservations).where(and(...conditions)).orderBy(desc(reservations.date), reservations.startTime);
    }),

  getCustomerMemos: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!session.therapistId) return [];
    return db.select().from(customerMemos).where(eq(customerMemos.therapistId, session.therapistId)).orderBy(desc(customerMemos.updatedAt));
  }),

  upsertCustomerMemo: publicProcedure
    .input(z.object({
      customerId: z.number(),
      preferences: z.string().optional(),
      caution: z.string().optional(),
      lastVisitNote: z.string().optional(),
      repeatStatus: z.string().optional(),
      shareWithStore: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.therapistId) throw new TRPCError({ code: "NOT_FOUND" });
      await db.insert(customerMemos).values({ ...input, therapistId: session.therapistId }).onDuplicateKeyUpdate({ set: input });
      return { success: true };
    }),

  getSalesSummary: publicProcedure
    .input(z.object({ month: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.therapistId) return null;
      const month = input.month ?? new Date().toISOString().slice(0, 7);
      const rows = await db.select({
        totalSales: sql<number>`SUM(totalAmount)`,
        therapistBack: sql<number>`SUM(therapistBack)`,
        count: sql<number>`COUNT(*)`,
      }).from(sales).where(and(eq(sales.therapistId, session.therapistId), gte(sales.date, month + "-01")));
      return rows[0] ?? { totalSales: 0, therapistBack: 0, count: 0 };
    }),

  getPayroll: publicProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.therapistId) return null;
      const rows = await db.select().from(therapistPayrolls).where(and(eq(therapistPayrolls.therapistId, session.therapistId), eq(therapistPayrolls.year, input.year), eq(therapistPayrolls.month, input.month))).limit(1);
      return rows[0] ?? null;
    }),

  getDashboard: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!session.therapistId) return null;
    const therapistId = session.therapistId;
    const today = new Date().toISOString().split("T")[0];
    const [tRows, todayReservations, pendingCount, monthlySalesRows] = await Promise.all([
      db.select().from(therapists).where(eq(therapists.id, therapistId)).limit(1),
      db.select().from(reservations).where(and(eq(reservations.therapistId, therapistId), eq(reservations.date, today))),
      db.select({ count: sql<number>`COUNT(*)` }).from(reservations).where(and(eq(reservations.therapistId, therapistId), eq(reservations.status, "pending"))),
      db.select({ total: sql<number>`SUM(therapistBack)` }).from(sales).where(and(eq(sales.therapistId, therapistId), gte(sales.date, today.slice(0, 7) + "-01"))),
    ]);
    return {
      therapist: tRows[0] ?? null,
      todayReservations,
      pendingCount: pendingCount[0]?.count ?? 0,
      monthlyBack: monthlySalesRows[0]?.total ?? 0,
    };
  }),
});
