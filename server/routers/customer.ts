import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import {
  customerProfiles, reservations, reviews, follows, favorites, notifications,
  stores, therapists, menus,
} from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const LEVEL_THRESHOLDS = [
  { level: 1, name: "ブロンズ", minAmount: 0, badgeColor: "#CD7F32" },
  { level: 2, name: "シルバー", minAmount: 30000, badgeColor: "#C0C0C0" },
  { level: 3, name: "ゴールド", minAmount: 80000, badgeColor: "#FFD700" },
  { level: 4, name: "プラチナ", minAmount: 150000, badgeColor: "#E5E4E2" },
  { level: 5, name: "ダイヤモンド", minAmount: 300000, badgeColor: "#B9F2FF" },
  { level: 6, name: "ブラック", minAmount: 500000, badgeColor: "#1a1a1a" },
  { level: 7, name: "ロイヤル", minAmount: 800000, badgeColor: "#8B0000" },
  { level: 8, name: "エメラルド", minAmount: 1200000, badgeColor: "#50C878" },
  { level: 9, name: "サファイア", minAmount: 2000000, badgeColor: "#0F52BA" },
  { level: 10, name: "レジェンド", minAmount: 5000000, badgeColor: "#9400D3" },
];

function calcLevel(totalSpent: number) {
  let level = 1;
  for (const t of LEVEL_THRESHOLDS) {
    if (totalSpent >= t.minAmount) level = t.level;
  }
  return level;
}

export const customerRouter = router({
  getMyProfile: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(customerProfiles).where(eq(customerProfiles.accountId, session.accountId)).limit(1);
    return rows[0] ?? null;
  }),

  updateProfile: publicProcedure
    .input(z.object({
      displayName: z.string().min(1).max(50).optional(),
      nickname: z.string().max(50).optional(),
      phone: z.string().optional(),
      profileImageUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(customerProfiles).set(input).where(eq(customerProfiles.accountId, session.accountId));
      return { success: true };
    }),

  getReservations: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db
      .select({
        id: reservations.id,
        date: reservations.date,
        startTime: reservations.startTime,
        endTime: reservations.endTime,
        status: reservations.status,
        totalAmount: reservations.totalPrice,
        customerNote: reservations.customerNote,
        createdAt: reservations.createdAt,
        storeName: stores.name,
        therapistName: therapists.displayName,
        menuName: menus.name,
        menuPrice: menus.price,
        menuDuration: menus.durationMinutes,
      })
      .from(reservations)
      .leftJoin(stores, eq(reservations.storeId, stores.id))
      .leftJoin(therapists, eq(reservations.therapistId, therapists.id))
      .leftJoin(menus, eq(reservations.menuId, menus.id))
      .where(eq(reservations.customerId, session.accountId))
      .orderBy(desc(reservations.date), desc(reservations.startTime))
      .limit(50);
    return rows;
  }),

  getFavorites: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(favorites).where(eq(favorites.customerId, session.accountId)).orderBy(desc(favorites.createdAt));
  }),

  toggleFavorite: publicProcedure
    .input(z.object({ targetType: z.enum(["store", "therapist"]), targetId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select().from(favorites).where(and(eq(favorites.customerId, session.accountId), eq(favorites.targetType, input.targetType), eq(favorites.targetId, input.targetId))).limit(1);
      if (existing.length > 0) {
        await db.delete(favorites).where(eq(favorites.id, existing[0].id));
        return { favorited: false };
      }
      await db.insert(favorites).values({ customerId: session.accountId, ...input });
      return { favorited: true };
    }),

  toggleFollow: publicProcedure
    .input(z.object({ targetType: z.enum(["store", "therapist"]), targetId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select().from(follows).where(and(eq(follows.customerId, session.accountId), eq(follows.targetType, input.targetType), eq(follows.targetId, input.targetId))).limit(1);
      if (existing.length > 0) {
        await db.delete(follows).where(eq(follows.id, existing[0].id));
        return { following: false };
      }
      await db.insert(follows).values({ customerId: session.accountId, ...input });
      return { following: true };
    }),

  getLevelInfo: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(customerProfiles).where(eq(customerProfiles.accountId, session.accountId)).limit(1);
    if (!rows[0]) return null;
    const profile = rows[0];
    const level = calcLevel(profile.totalSpent);
    const currentThreshold = LEVEL_THRESHOLDS[level - 1];
    const nextThreshold = LEVEL_THRESHOLDS[level] ?? null;
    const progress = nextThreshold
      ? Math.min(100, ((profile.totalSpent - currentThreshold.minAmount) / (nextThreshold.minAmount - currentThreshold.minAmount)) * 100)
      : 100;
    return { profile, level, currentThreshold, nextThreshold, progress, thresholds: LEVEL_THRESHOLDS };
  }),

  getNotifications: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(notifications).where(and(eq(notifications.recipientRole, "customer"), eq(notifications.recipientId, session.accountId))).orderBy(desc(notifications.createdAt)).limit(50);
  }),

  markNotificationRead: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, input.id));
      return { success: true };
    }),

  getLevelThresholds: publicProcedure.query(() => LEVEL_THRESHOLDS),
});
