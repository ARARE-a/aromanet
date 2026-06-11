import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import {
  stores, therapists, menus, menuOptions,
  coupons, reservations, reviews, posts,
  notifications, ngCustomers, sales,
} from "../../drizzle/schema";
import { eq, and, desc, like, gte, sql } from "drizzle-orm";

export const storeRouter = router({
  getById: publicProcedure
    .input(z.object({ storeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(stores).where(eq(stores.id, input.storeId)).limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      return rows[0];
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
      return db.select().from(stores).where(and(...conditions)).orderBy(desc(stores.reviewAvg)).limit(input.limit).offset(input.offset);
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
      await db.update(menus).set(data).where(eq(menus.id, id));
      return { success: true };
    }),

  deleteMenu: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(menus).where(eq(menus.id, input.id));
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
        profileImageUrl: customerProfiles.profileImageUrl,
        memberLevel: customerProfiles.memberLevel,
        totalSpent: customerProfiles.totalSpent,
      }).from(customerProfiles).where(eq(customerProfiles.accountId, row.customerId)).limit(1);
      const cp = cpRows[0];
      result.push({
        ...row,
        displayName: cp?.displayName ?? cp?.nickname ?? `顧客#${row.customerId}`,
        profileImageUrl: cp?.profileImageUrl ?? null,
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
      todayReservations,
      pendingCount: pendingCount[0]?.count ?? 0,
      monthlySales: totalSalesRows[0]?.total ?? 0,
      therapistCount: therapistCount[0]?.count ?? 0,
    };
  }),

  getShifts: publicProcedure
    .input(z.object({ date: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) return [];
      const { shifts } = await import("../../drizzle/schema");
      const conditions: any[] = [eq(shifts.storeId, session.storeId)];
      if (input.date) conditions.push(eq(shifts.date, input.date));
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
});
