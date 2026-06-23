import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import {
  customerProfiles, reservations, reviews, follows, favorites, notifications,
  stores, therapists, menus, customerAccounts, ageVerifications,
  storeAccounts, therapistAccounts, posts,
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

let favoriteSchemaReady: Promise<void> | null = null;

function ensureFavoritePostTarget(db: any) {
  if (!favoriteSchemaReady) {
    favoriteSchemaReady = db.execute(sql.raw("ALTER TABLE favorites MODIFY COLUMN targetType enum('store','therapist','post') NOT NULL"))
      .catch((error: any) => {
        const message = String(error?.message ?? "");
        if (!message.includes("already") && !message.includes("Duplicate")) {
          console.warn("[Customer] favorites enum migration skipped:", message);
        }
      });
  }
  return favoriteSchemaReady;
}

async function requirePublicStoreTarget(db: any, storeId: number) {
  const rows = await db.select({ id: stores.id })
    .from(stores)
    .innerJoin(storeAccounts, eq(stores.accountId, storeAccounts.id))
    .where(and(
      eq(stores.id, storeId),
      eq(stores.isPublic, true),
      eq(storeAccounts.status, "active"),
    ))
    .limit(1);
  if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
}

async function requirePublicTherapistTarget(db: any, therapistId: number) {
  const rows = await db.select({ id: therapists.id })
    .from(therapists)
    .innerJoin(therapistAccounts, eq(therapists.accountId, therapistAccounts.id))
    .where(and(
      eq(therapists.id, therapistId),
      eq(therapists.isPublic, true),
      eq(therapistAccounts.status, "active"),
    ))
    .limit(1);
  if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
}

async function requirePublicPostTarget(db: any, postId: number) {
  const postRows = await db.select({
    id: posts.id,
    storeId: posts.storeId,
    therapistId: posts.therapistId,
  }).from(posts).where(and(eq(posts.id, postId), eq(posts.isPublic, true))).limit(1);
  const post = postRows[0];
  if (!post) throw new TRPCError({ code: "NOT_FOUND" });
  if (post.storeId) await requirePublicStoreTarget(db, post.storeId);
  if (post.therapistId) await requirePublicTherapistTarget(db, post.therapistId);
}

async function requireFavoriteOrFollowTarget(db: any, targetType: "store" | "therapist" | "post", targetId: number) {
  if (targetType === "store") return requirePublicStoreTarget(db, targetId);
  if (targetType === "therapist") return requirePublicTherapistTarget(db, targetId);
  return requirePublicPostTarget(db, targetId);
}

export const customerRouter = router({
  getMyProfile: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [rows, accountRows, verificationRows] = await Promise.all([
      db.select().from(customerProfiles).where(eq(customerProfiles.accountId, session.accountId)).limit(1),
      db.select({
        ageVerified: customerAccounts.ageVerified,
        ageVerifiedAt: customerAccounts.ageVerifiedAt,
        phoneVerified: customerAccounts.phoneVerified,
        phoneVerifiedAt: customerAccounts.phoneVerifiedAt,
      }).from(customerAccounts).where(eq(customerAccounts.id, session.accountId)).limit(1),
      db.select({
        status: ageVerifications.status,
        createdAt: ageVerifications.createdAt,
        verifiedAt: ageVerifications.verifiedAt,
      }).from(ageVerifications)
        .where(eq(ageVerifications.customerId, session.accountId))
        .orderBy(desc(ageVerifications.createdAt))
        .limit(1),
    ]);
    const profile = rows[0];
    if (!profile) return null;
    const [reservationCountRows, favoriteCountRows] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(reservations).where(eq(reservations.customerId, session.accountId)),
      db.select({ count: sql<number>`COUNT(*)` }).from(favorites).where(eq(favorites.customerId, session.accountId)),
    ]);
    return {
      ...profile,
      isVerified: Boolean(accountRows[0]?.ageVerified),
      ageVerified: Boolean(accountRows[0]?.ageVerified),
      ageVerifiedAt: accountRows[0]?.ageVerifiedAt ?? null,
      phoneVerified: Boolean(accountRows[0]?.phoneVerified),
      phoneVerifiedAt: accountRows[0]?.phoneVerifiedAt ?? null,
      verificationStatus: verificationRows[0]?.status ?? "not_submitted",
      reservationCount: Number(reservationCountRows[0]?.count ?? 0),
      favoriteCount: Number(favoriteCountRows[0]?.count ?? 0),
    };
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
        storeId: reservations.storeId,
        therapistId: reservations.therapistId,
        menuId: reservations.menuId,
        date: reservations.date,
        startTime: reservations.startTime,
        endTime: reservations.endTime,
        status: reservations.status,
        totalAmount: reservations.totalPrice,
        customerNote: reservations.customerNote,
        note: reservations.note,
        cancelReason: reservations.cancelReason,
        cancelFee: reservations.cancelFee,
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
    .input(z.object({ targetType: z.enum(["store", "therapist", "post"]), targetId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.targetType === "post") await ensureFavoritePostTarget(db);
      await requireFavoriteOrFollowTarget(db, input.targetType, input.targetId);
      const existing = await db.select().from(favorites).where(and(eq(favorites.customerId, session.accountId), eq(favorites.targetType, input.targetType), eq(favorites.targetId, input.targetId))).limit(1);
      if (existing.length > 0) {
        await db.delete(favorites).where(eq(favorites.id, existing[0].id));
        return { favorited: false };
      }
      await db.insert(favorites).values({ customerId: session.accountId, ...input });
      return { favorited: true };
    }),

  getFollowStatus: publicProcedure
    .input(z.object({ targetType: z.enum(["store", "therapist"]), targetId: z.number() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "customer") return { following: false };
      const db = await getDb();
      if (!db) return { following: false };
      const existing = await db.select().from(follows).where(and(eq(follows.customerId, session.accountId), eq(follows.targetType, input.targetType), eq(follows.targetId, input.targetId))).limit(1);
      return { following: existing.length > 0 };
    }),
  toggleFollow: publicProcedure
    .input(z.object({ targetType: z.enum(["store", "therapist"]), targetId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await requireFavoriteOrFollowTarget(db, input.targetType, input.targetId);
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
