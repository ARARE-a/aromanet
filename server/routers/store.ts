import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import {
  stores, storeAccounts, customerAccounts, therapists, menus, menuOptions,
  coupons, reservations, reviews, posts,
  notifications, ngCustomers, sales, shifts,
} from "../../drizzle/schema";
import { eq, and, desc, like, gte, lt, lte, sql } from "drizzle-orm";
import { ensureRuntimeSchema } from "../runtimeMigrations";
import { excludeQaAccountEmails } from "../publicFilters";

export const storeRouter = router({
  getById: publicProcedure
    .input(z.object({ storeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select({ store: stores }).from(stores)
        .innerJoin(storeAccounts, eq(stores.accountId, storeAccounts.id))
        .where(and(
          eq(stores.id, input.storeId),
          eq(stores.isPublic, true),
          eq(storeAccounts.status, "active"),
          ...excludeQaAccountEmails(storeAccounts),
        ))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      return rows[0].store;
    }),

  search: publicProcedure
    .input(z.object({
      keyword: z.string().optional(),
      prefecture: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions: any[] = [eq(stores.isPublic, true)];
      if (input.prefecture) conditions.push(eq(stores.prefecture, input.prefecture));
      if (input.keyword) conditions.push(like(stores.name, `%${input.keyword}%`));
      const rows = await db.select({ store: stores }).from(stores)
        .innerJoin(storeAccounts, eq(stores.accountId, storeAccounts.id))
        .where(and(...conditions, eq(storeAccounts.status, "active"), ...excludeQaAccountEmails(storeAccounts)))
        .orderBy(desc(stores.reviewAvg))
        .limit(input.limit)
        .offset(input.offset);
      return rows.map(row => row.store);
    }),

  getMyStore: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(stores).where(eq(stores.accountId, session.accountId)).limit(1);
    return rows[0] ?? null;
  }),

  updateProfile: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      address: z.string().optional(),
      prefecture: z.string().optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      access: z.string().optional(),
      openHours: z.string().optional(),
      closeHours: z.string().optional(),
      regularHoliday: z.string().optional(),
      coverImageUrl: z.string().optional(),
      logoUrl: z.string().optional(),
      termsOfService: z.string().optional(),
      cautionNote: z.string().optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(stores).set(input).where(eq(stores.accountId, session.accountId));
      return { success: true };
    }),

  getTherapists: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!session.storeId) return [];
    return db.select().from(therapists).where(eq(therapists.storeId, session.storeId)).orderBy(desc(therapists.nominationCount));
  }),

  getMenus: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!session.storeId) return [];
    return db.select().from(menus).where(eq(menus.storeId, session.storeId)).orderBy(menus.sortOrder);
  }),

  getPublicMenus: publicProcedure
    .input(z.object({ storeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const activeStoreRows = await db.select({ id: stores.id }).from(stores)
        .innerJoin(storeAccounts, eq(stores.accountId, storeAccounts.id))
        .where(and(
          eq(stores.id, input.storeId),
          eq(stores.isPublic, true),
          eq(storeAccounts.status, "active"),
          ...excludeQaAccountEmails(storeAccounts),
        ))
        .limit(1);
      if (!activeStoreRows[0]) return [];
      return db.select().from(menus).where(and(eq(menus.storeId, input.storeId), eq(menus.isPublic, true))).orderBy(menus.sortOrder);
    }),

  createMenu: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      durationMinutes: z.number().min(1),
      price: z.number().min(0),
      nominationFee: z.number().min(0).default(0),
      isPublic: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) throw new TRPCError({ code: "NOT_FOUND" });
      await db.insert(menus).values({ ...input, storeId: session.storeId });
      return { success: true };
    }),

  updateMenu: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      durationMinutes: z.number().min(1).optional(),
      price: z.number().min(0).optional(),
      nominationFee: z.number().min(0).optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      if (!session.storeId) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(menus).set(data).where(and(eq(menus.id, id), eq(menus.storeId, session.storeId)));
      return { success: true };
    }),

  deleteMenu: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) throw new TRPCError({ code: "NOT_FOUND" });
      await db.delete(menus).where(and(eq(menus.id, input.id), eq(menus.storeId, session.storeId)));
      return { success: true };
    }),

  getMenuOptions: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!session.storeId) return [];
    return db.select().from(menuOptions).where(eq(menuOptions.storeId, session.storeId));
  }),

  createMenuOption: publicProcedure
    .input(z.object({ name: z.string().min(1), price: z.number().min(0) }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) throw new TRPCError({ code: "NOT_FOUND" });
      await db.insert(menuOptions).values({ ...input, storeId: session.storeId });
      return { success: true };
    }),

  getCoupons: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!session.storeId) return [];
    return db.select().from(coupons).where(eq(coupons.storeId, session.storeId)).orderBy(desc(coupons.createdAt));
  }),

  createCoupon: publicProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      discountType: z.enum(["fixed", "percent"]),
      discountValue: z.number().min(1),
      minAmount: z.number().min(0).default(0),
      maxUses: z.number().optional(),
      expiresAt: z.string().optional(),
      isPublic: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) throw new TRPCError({ code: "NOT_FOUND" });
      await db.insert(coupons).values({
        ...input,
        storeId: session.storeId,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      });
      return { success: true };
    }),

  getCustomers: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!session.storeId) return [];
    const { customerProfiles } = await import("../../drizzle/schema");
    const agg = await db.select({
      customerId: reservations.customerId,
      lastVisit: sql<string>`MAX(${reservations.date})`,
      visitCount: sql<number>`COUNT(*)`,
    }).from(reservations)
      .where(and(eq(reservations.storeId, session.storeId), eq(reservations.status, "completed")))
      .groupBy(reservations.customerId)
      .orderBy(desc(sql`MAX(${reservations.date})`))
      .limit(100);
    // Attach customer profile info
    const result = [];
    for (const row of agg) {
      const cpRows = await db.select({
        displayName: customerProfiles.displayName,
        nickname: customerProfiles.nickname,
        phone: customerProfiles.phone,
        phoneVerified: customerAccounts.phoneVerified,
        profileImageUrl: customerProfiles.profileImageUrl,
        memberLevel: customerProfiles.memberLevel,
        totalSpent: customerProfiles.totalSpent,
      }).from(customerProfiles)
        .leftJoin(customerAccounts, eq(customerProfiles.accountId, customerAccounts.id))
        .where(eq(customerProfiles.accountId, row.customerId))
        .limit(1);
      const cp = cpRows[0];
      result.push({
        ...row,
        displayName: session.demo ? `デモ顧客#${row.customerId}` : (cp?.displayName ?? cp?.nickname ?? `顧客#${row.customerId}`),
        phone: session.demo ? "090-0000-0000" : (cp?.phone ?? null),
        phoneVerified: session.demo ? true : Boolean(cp?.phoneVerified),
        profileImageUrl: session.demo ? null : (cp?.profileImageUrl ?? null),
        level: cp?.memberLevel ?? 1,
        totalSpent: cp?.totalSpent ?? 0,
      });
    }
    return result;
  }),

  getNgCustomers: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!session.storeId) return [];
    return db.select().from(ngCustomers).where(eq(ngCustomers.storeId, session.storeId)).orderBy(desc(ngCustomers.createdAt));
  }),

  addNgCustomer: publicProcedure
    .input(z.object({ customerId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) throw new TRPCError({ code: "NOT_FOUND" });
      await db.insert(ngCustomers).values({ storeId: session.storeId, customerId: input.customerId, reason: input.reason });
      return { success: true };
    }),

  getDashboard: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!session.storeId) return null;
    const storeId = session.storeId;
    const today = new Date().toISOString().split("T")[0];
    const [storeRows, todayReservations, pendingCount, totalSalesRows, therapistCount] = await Promise.all([
      db.select().from(stores).where(eq(stores.id, storeId)).limit(1),
      db.select().from(reservations).where(and(eq(reservations.storeId, storeId), eq(reservations.date, today))).limit(50),
      db.select({ count: sql<number>`COUNT(*)` }).from(reservations).where(and(eq(reservations.storeId, storeId), eq(reservations.status, "pending"))),
      db.select({ total: sql<number>`SUM(totalAmount)` }).from(sales).where(and(eq(sales.storeId, storeId), gte(sales.date, today.slice(0, 7) + "-01"))),
      db.select({ count: sql<number>`COUNT(*)` }).from(therapists).where(eq(therapists.storeId, storeId)),
    ]);
    return {
      store: storeRows[0] ?? null,
      todayReservations: session.demo
        ? todayReservations.map((reservation) => ({
            ...reservation,
            note: reservation.note ? "デモ予約メモ" : reservation.note,
            customerNote: reservation.customerNote ? "デモ予約メモ" : reservation.customerNote,
          }))
        : todayReservations,
      pendingCount: pendingCount[0]?.count ?? 0,
      monthlySales: totalSalesRows[0]?.total ?? 0,
      therapistCount: therapistCount[0]?.count ?? 0,
    };
  }),

  getShifts: publicProcedure
    .input(z.object({
      date: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      month: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensureRuntimeSchema();
      if (!session.storeId) return [];
      const conditions: any[] = [eq(shifts.storeId, session.storeId)];
      if (input.date) conditions.push(eq(shifts.date, input.date));
      if (!input.date && input.month) {
        const [yearValue, monthValue] = input.month.split("-").map(Number);
        const nextYear = monthValue === 12 ? yearValue + 1 : yearValue;
        const nextMonth = monthValue === 12 ? 1 : monthValue + 1;
        conditions.push(gte(shifts.date, `${yearValue}-${String(monthValue).padStart(2, "0")}-01`));
        conditions.push(lt(shifts.date, `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`));
      }
      if (!input.date && input.startDate) conditions.push(gte(shifts.date, input.startDate));
      if (!input.date && input.endDate) conditions.push(lte(shifts.date, input.endDate));
      const rows = await db.select().from(shifts).where(and(...conditions)).orderBy(shifts.date, shifts.startTime);
      // Attach therapist name and image
      const result = [];
      for (const shift of rows) {
        const tRows = await db.select({ displayName: therapists.displayName, profileImageUrl: therapists.profileImageUrl })
          .from(therapists).where(eq(therapists.id, shift.therapistId)).limit(1);
        result.push({ ...shift, therapistName: tRows[0]?.displayName ?? null, therapistImage: tRows[0]?.profileImageUrl ?? null });
      }
      return result;
    }),

  reviewShift: publicProcedure
    .input(z.object({
      shiftId: z.number(),
      action: z.enum(["approved", "rejected"]),
      reviewNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store" || !session.storeId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensureRuntimeSchema();

      const shiftRows = await db.select().from(shifts)
        .where(and(eq(shifts.id, input.shiftId), eq(shifts.storeId, session.storeId)))
        .limit(1);
      const shift = shiftRows[0];
      if (!shift) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(shifts).set({
        approvalStatus: input.action,
        reviewedAt: new Date(),
        reviewedByStoreId: session.storeId,
        reviewNote: input.reviewNote?.trim() || null,
      }).where(eq(shifts.id, input.shiftId));

      await db.insert(notifications).values({
        recipientRole: "therapist",
        recipientId: shift.therapistId,
        type: "shift_reviewed",
        title: input.action === "approved" ? "出勤申請が承認されました" : "出勤申請が却下されました",
        body: `${shift.date} ${shift.startTime}〜${shift.endTime}${input.reviewNote ? `\n${input.reviewNote}` : ""}`,
        relatedId: shift.id,
      });

      return { success: true };
    }),
});
