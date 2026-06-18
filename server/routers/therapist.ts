import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import {
  therapists, stores, shifts, reservations,
  posts, postImages, customerMemos, follows, favorites,
  sales, therapistPayrolls, customerProfiles, menus, notifications,
} from "../../drizzle/schema";
import { eq, and, desc, gte, lt, sql, like } from "drizzle-orm";
import { ensureRuntimeSchema } from "../runtimeMigrations";

function getMonthBounds(month: string) {
  const [yearValue, monthValue] = month.split("-").map(Number);
  const nextYear = monthValue === 12 ? yearValue + 1 : yearValue;
  const nextMonth = monthValue === 12 ? 1 : monthValue + 1;
  return {
    start: `${yearValue}-${String(monthValue).padStart(2, "0")}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

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
      prefecture: z.string().optional(),
      keyword: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions: any[] = [eq(therapists.isPublic, true)];
      if (input.storeId) conditions.push(eq(therapists.storeId, input.storeId));
      if (input.keyword) conditions.push(like(therapists.displayName, `%${input.keyword}%`));
      let results = await db.select().from(therapists).where(and(...conditions)).orderBy(desc(therapists.nominationCount)).limit(200);
      // Filter by prefecture via store
      if (input.prefecture) {
        const storeRows = await db.select({ id: stores.id }).from(stores).where(eq(stores.prefecture, input.prefecture));
        const storeIds = new Set(storeRows.map(s => s.id));
        results = results.filter(t => t.storeId != null && storeIds.has(t.storeId));
      }
      return results.slice(input.offset, input.offset + input.limit);
    }),

  getMyProfile: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(therapists).where(eq(therapists.accountId, session.accountId)).limit(1);
    const profile = rows[0];
    if (!profile) return null;
    let storeName: string | null = null;
    if (profile.storeId) {
      const storeRows = await db.select({ name: stores.name }).from(stores).where(eq(stores.id, profile.storeId)).limit(1);
      storeName = storeRows[0]?.name ?? null;
    }
    return { ...profile, storeName };
  }),

  updateProfile: publicProcedure
    .input(z.object({
      displayName: z.string().min(1).max(50).optional(),
      age: z.number().optional(),
      height: z.number().optional(),
      bio: z.string().optional(),
      specialties: z.string().optional(),
      catchphrase: z.string().max(100).optional(),
      selfIntroduction: z.string().optional(),
      bodyType: z.string().max(50).optional(),
      instagramUrl: z.string().max(255).optional(),
      twitterUrl: z.string().max(255).optional(),
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
      await ensureRuntimeSchema();
      if (!session.therapistId) return [];
      const month = input.month ?? new Date().toISOString().slice(0, 7);
      const { start, end } = getMonthBounds(month);
      return db.select().from(shifts).where(and(eq(shifts.therapistId, session.therapistId), gte(shifts.date, start), lt(shifts.date, end))).orderBy(shifts.date, shifts.startTime);
    }),

  getPublicShifts: publicProcedure
    .input(z.object({ therapistId: z.number(), month: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensureRuntimeSchema();
      const { start, end } = getMonthBounds(input.month);
      return db.select().from(shifts).where(and(
        eq(shifts.therapistId, input.therapistId),
        eq(shifts.approvalStatus, "approved"),
        gte(shifts.date, start),
        lt(shifts.date, end),
      )).orderBy(shifts.date, shifts.startTime);
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
      await ensureRuntimeSchema();
      if (!session.therapistId) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.endTime <= input.startTime) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "終了時間は開始時間より後にしてください" });
      }
      const tRows = await db.select().from(therapists).where(eq(therapists.id, session.therapistId)).limit(1);
      if (!tRows[0]?.storeId) throw new TRPCError({ code: "NOT_FOUND" });
      const storeId = tRows[0].storeId;
      const existing = await db.select({ id: shifts.id }).from(shifts)
        .where(and(eq(shifts.therapistId, session.therapistId), eq(shifts.date, input.date)))
        .limit(1);
      let shiftId = existing[0]?.id;
      if (shiftId) {
        await db.update(shifts).set({
          ...input,
          storeId,
          status: "scheduled",
          approvalStatus: "pending",
          reviewedAt: null,
          reviewedByStoreId: null,
          reviewNote: null,
        }).where(eq(shifts.id, shiftId));
      } else {
        const result = await db.insert(shifts).values({
          ...input,
          therapistId: session.therapistId,
          storeId,
          status: "scheduled",
          approvalStatus: "pending",
        });
        shiftId = (result as any)[0].insertId as number;
      }
      await db.insert(notifications).values({
        recipientRole: "store",
        recipientId: storeId,
        type: "shift_created",
        title: "出勤予定が登録されました",
        body: `${tRows[0].displayName} ${input.date} ${input.startTime}〜${input.endTime}`,
        relatedId: shiftId,
      });
      return { success: true, shiftId, storeId };
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
      await ensureRuntimeSchema();
      const { id, ...data } = input;
      const targetRows = await db.select().from(shifts).where(eq(shifts.id, id)).limit(1);
      const target = targetRows[0];
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.therapistId !== session.therapistId) throw new TRPCError({ code: "UNAUTHORIZED" });
      await db.update(shifts).set({
        ...data,
        approvalStatus: "pending",
        reviewedAt: null,
        reviewedByStoreId: null,
        reviewNote: null,
      }).where(eq(shifts.id, id));
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
      return db.select({
        id: reservations.id,
        storeId: reservations.storeId,
        therapistId: reservations.therapistId,
        customerId: reservations.customerId,
        menuId: reservations.menuId,
        date: reservations.date,
        startTime: reservations.startTime,
        endTime: reservations.endTime,
        status: reservations.status,
        totalPrice: reservations.totalPrice,
        totalAmount: reservations.totalPrice,
        customerNote: reservations.customerNote,
        note: reservations.note,
        notes: sql<string>`COALESCE(${reservations.note}, ${reservations.customerNote})`,
        customerName: sql<string>`COALESCE(${customerProfiles.displayName}, ${customerProfiles.nickname}, CONCAT('顧客#', ${reservations.customerId}))`,
        customerImage: customerProfiles.profileImageUrl,
        storeName: stores.name,
        menuName: menus.name,
      }).from(reservations)
        .leftJoin(customerProfiles, eq(reservations.customerId, customerProfiles.accountId))
        .leftJoin(stores, eq(reservations.storeId, stores.id))
        .leftJoin(menus, eq(reservations.menuId, menus.id))
        .where(and(...conditions))
        .orderBy(desc(reservations.date), reservations.startTime);
    }),

  getCustomerMemos: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!session.therapistId) return [];
    const reservationCustomers = await db.select({
      customerId: reservations.customerId,
      customerName: sql<string>`COALESCE(${customerProfiles.displayName}, ${customerProfiles.nickname}, CONCAT('顧客#', ${reservations.customerId}))`,
      customerImage: customerProfiles.profileImageUrl,
      lastVisit: sql<string>`MAX(${reservations.date})`,
      reservationCount: sql<number>`COUNT(*)`,
    }).from(reservations)
      .leftJoin(customerProfiles, eq(reservations.customerId, customerProfiles.accountId))
      .where(eq(reservations.therapistId, session.therapistId))
      .groupBy(reservations.customerId, customerProfiles.displayName, customerProfiles.nickname, customerProfiles.profileImageUrl)
      .orderBy(desc(sql`MAX(${reservations.date})`))
      .limit(100);
    const memoRows = await db.select().from(customerMemos).where(eq(customerMemos.therapistId, session.therapistId));
    const memoByCustomer = new Map(memoRows.map((memo: any) => [memo.customerId, memo]));
    const result = reservationCustomers.map((customer: any) => {
      const memo = memoByCustomer.get(customer.customerId) as any;
      return {
        ...customer,
        memoId: memo?.id ?? null,
        preferences: memo?.preferences ?? "",
        caution: memo?.caution ?? "",
        lastVisitNote: memo?.lastVisitNote ?? "",
        repeatStatus: memo?.repeatStatus ?? "",
        shareWithStore: memo?.shareWithStore ?? false,
        memo: memo?.preferences ?? memo?.lastVisitNote ?? "",
        updatedAt: memo?.updatedAt ?? null,
      };
    });
    for (const memo of memoRows as any[]) {
      if (!result.some((row: any) => row.customerId === memo.customerId)) {
        const cpRows = await db.select({
          displayName: customerProfiles.displayName,
          nickname: customerProfiles.nickname,
          profileImageUrl: customerProfiles.profileImageUrl,
        }).from(customerProfiles).where(eq(customerProfiles.accountId, memo.customerId)).limit(1);
        result.push({
          customerId: memo.customerId,
          customerName: cpRows[0]?.displayName ?? cpRows[0]?.nickname ?? `顧客#${memo.customerId}`,
          customerImage: cpRows[0]?.profileImageUrl ?? null,
          lastVisit: null,
          reservationCount: 0,
          memoId: memo.id,
          preferences: memo.preferences ?? "",
          caution: memo.caution ?? "",
          lastVisitNote: memo.lastVisitNote ?? "",
          repeatStatus: memo.repeatStatus ?? "",
          shareWithStore: memo.shareWithStore ?? false,
          memo: memo.preferences ?? memo.lastVisitNote ?? "",
          updatedAt: memo.updatedAt,
        });
      }
    }
    return result;
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
      const existing = await db.select({ id: customerMemos.id }).from(customerMemos)
        .where(and(eq(customerMemos.therapistId, session.therapistId), eq(customerMemos.customerId, input.customerId)))
        .limit(1);
      if (existing[0]) {
        await db.update(customerMemos).set(input).where(eq(customerMemos.id, existing[0].id));
      } else {
        await db.insert(customerMemos).values({ ...input, therapistId: session.therapistId });
      }
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
      const { start, end } = getMonthBounds(month);
      const rows = await db.select({
        totalSales: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        therapistBack: sql<number>`COALESCE(SUM(${sales.therapistBack}), 0)`,
        nominationCount: sql<number>`SUM(CASE WHEN ${sales.nominationFee} > 0 THEN 1 ELSE 0 END)`,
        count: sql<number>`COUNT(*)`,
      }).from(sales).where(and(eq(sales.therapistId, session.therapistId), gte(sales.date, start), lt(sales.date, end)));
      return rows[0] ?? { totalSales: 0, therapistBack: 0, count: 0 };
    }),

  getSalesDetails: publicProcedure
    .input(z.object({ month: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.therapistId) return [];
      const month = input.month ?? new Date().toISOString().slice(0, 7);
      const { start, end } = getMonthBounds(month);
      return db.select({
        id: sales.id,
        reservationId: sales.reservationId,
        date: sales.date,
        storeId: sales.storeId,
        storeName: stores.name,
        therapistId: sales.therapistId,
        customerId: reservations.customerId,
        customerName: sql<string>`COALESCE(${customerProfiles.displayName}, ${customerProfiles.nickname}, CONCAT('顧客#', ${reservations.customerId}))`,
        customerImage: customerProfiles.profileImageUrl,
        menuId: reservations.menuId,
        menuName: menus.name,
        startTime: reservations.startTime,
        endTime: reservations.endTime,
        reservationStatus: reservations.status,
        isNomination: reservations.isNomination,
        reservationNote: reservations.note,
        customerNote: reservations.customerNote,
        menuAmount: sales.menuAmount,
        nominationFee: sales.nominationFee,
        optionAmount: sales.optionAmount,
        discountAmount: sales.discountAmount,
        cancelFee: sales.cancelFee,
        totalAmount: sales.totalAmount,
        therapistBack: sales.therapistBack,
        createdAt: sales.createdAt,
      }).from(sales)
        .leftJoin(reservations, eq(sales.reservationId, reservations.id))
        .leftJoin(customerProfiles, eq(reservations.customerId, customerProfiles.accountId))
        .leftJoin(stores, eq(sales.storeId, stores.id))
        .leftJoin(menus, eq(reservations.menuId, menus.id))
        .where(and(eq(sales.therapistId, session.therapistId), gte(sales.date, start), lt(sales.date, end)))
        .orderBy(desc(sales.date), desc(sales.createdAt));
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
      const payroll = rows[0];
      if (!payroll) return null;
      const totalAmount = payroll.totalPayroll || payroll.backAmount + payroll.adjustmentAmount;
      return {
        ...payroll,
        salesAmount: payroll.totalSales,
        baseAmount: payroll.backAmount,
        totalAmount,
        paymentStatus: payroll.isPaid ? "paid" : "unpaid",
      };
    }),

  getDashboard: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!session.therapistId) return null;
    const therapistId = session.therapistId;
    const today = new Date().toISOString().split("T")[0];
    const { start: monthStart, end: monthEnd } = getMonthBounds(today.slice(0, 7));
    const [tRows, todayReservations, pendingCount, monthlySalesRows] = await Promise.all([
      db.select().from(therapists).where(eq(therapists.id, therapistId)).limit(1),
      db.select({
        id: reservations.id,
        date: reservations.date,
        startTime: reservations.startTime,
        endTime: reservations.endTime,
        status: reservations.status,
        customerName: sql<string>`COALESCE(${customerProfiles.displayName}, ${customerProfiles.nickname}, CONCAT('顧客#', ${reservations.customerId}))`,
        menuName: menus.name,
      }).from(reservations)
        .leftJoin(customerProfiles, eq(reservations.customerId, customerProfiles.accountId))
        .leftJoin(menus, eq(reservations.menuId, menus.id))
        .where(and(eq(reservations.therapistId, therapistId), eq(reservations.date, today))),
      db.select({ count: sql<number>`COUNT(*)` }).from(reservations).where(and(eq(reservations.therapistId, therapistId), eq(reservations.status, "pending"))),
      db.select({ total: sql<number>`COALESCE(SUM(${sales.therapistBack}), 0)` }).from(sales).where(and(eq(sales.therapistId, therapistId), gte(sales.date, monthStart), lt(sales.date, monthEnd))),
    ]);
    const payrollRows = await db.select({ total: sql<number>`SUM(${therapistPayrolls.totalPayroll})` }).from(therapistPayrolls).where(and(eq(therapistPayrolls.therapistId, therapistId), eq(therapistPayrolls.year, Number(today.slice(0, 4))), eq(therapistPayrolls.month, Number(today.slice(5, 7)))));
    return {
      therapist: tRows[0] ?? null,
      todayReservations,
      pendingCount: pendingCount[0]?.count ?? 0,
      monthlyBack: monthlySalesRows[0]?.total ?? 0,
      nominationCount: tRows[0]?.nominationCount ?? 0,
      totalAmount: monthlySalesRows[0]?.total ?? 0,
      payroll: payrollRows[0]?.total ?? 0,
      followerCount: tRows[0]?.followerCount ?? 0,
    };
  }),
});
