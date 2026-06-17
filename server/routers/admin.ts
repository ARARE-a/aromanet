import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import {
  reports, therapistAccounts, customerAccounts,
  identityVerifications, ageVerifications, auditLogs,
  reservations, reservationOptions, reviews, messages, posts, postImages,
  shifts, notifications, sales, menus, rooms, customerProfiles,
} from "../../drizzle/schema";
import { eq, and, desc, inArray, like, or, sql } from "drizzle-orm";

const SMOKE_MARKERS = ["本番動作確認", "動作確認"] as const;

function compactIds(ids: Array<number | null | undefined>) {
  return Array.from(new Set(ids.filter((id): id is number => typeof id === "number")));
}

function markerCondition(column: any) {
  return or(...SMOKE_MARKERS.map(marker => like(column, `%${marker}%`)));
}

function combineOr(conditions: any[]) {
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return or(...conditions);
}

async function collectSmokeData(db: any) {
  const smokeReservations = await db
    .select({
      id: reservations.id,
      customerId: reservations.customerId,
      storeId: reservations.storeId,
      therapistId: reservations.therapistId,
      date: reservations.date,
      totalPrice: reservations.totalPrice,
    })
    .from(reservations)
    .where(combineOr([markerCondition(reservations.customerNote), markerCondition(reservations.note)]));
  const reservationIds = compactIds(smokeReservations.map((row: any) => row.id));

  const reviewConditions = [markerCondition(reviews.comment)];
  if (reservationIds.length > 0) reviewConditions.push(inArray(reviews.reservationId, reservationIds));
  const smokeReviews = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(combineOr(reviewConditions));
  const reviewIds = compactIds(smokeReviews.map((row: any) => row.id));

  const smokeMessages = await db
    .select({ id: messages.id })
    .from(messages)
    .where(markerCondition(messages.content));
  const messageIds = compactIds(smokeMessages.map((row: any) => row.id));

  const smokePosts = await db
    .select({ id: posts.id })
    .from(posts)
    .where(markerCondition(posts.content));
  const postIds = compactIds(smokePosts.map((row: any) => row.id));

  const smokeShifts = await db
    .select({ id: shifts.id })
    .from(shifts)
    .where(markerCondition(shifts.note));
  const shiftIds = compactIds(smokeShifts.map((row: any) => row.id));

  const notificationConditions = [markerCondition(notifications.title), markerCondition(notifications.body)];
  if (reservationIds.length > 0) notificationConditions.push(inArray(notifications.relatedId, reservationIds));
  const smokeNotifications = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(combineOr(notificationConditions));
  const notificationIds = compactIds(smokeNotifications.map((row: any) => row.id));

  const smokeMenus = await db
    .select({ id: menus.id })
    .from(menus)
    .where(combineOr([markerCondition(menus.name), markerCondition(menus.description)]));
  const menuIds = compactIds(smokeMenus.map((row: any) => row.id));

  const smokeRooms = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(combineOr([markerCondition(rooms.name), markerCondition(rooms.description)]));
  const roomIds = compactIds(smokeRooms.map((row: any) => row.id));

  const impactedPayrollMonths = Array.from(new Set(
    smokeReservations
      .filter((row: any) => row.therapistId && row.storeId && row.date)
      .map((row: any) => `${row.storeId}:${row.therapistId}:${row.date.slice(0, 7)}`)
  ));

  return {
    smokeReservations,
    reservationIds,
    reviewIds,
    messageIds,
    postIds,
    shiftIds,
    notificationIds,
    menuIds,
    roomIds,
    impactedPayrollMonths,
  };
}

async function deleteByIds(db: any, table: any, column: any, ids: number[]) {
  if (ids.length === 0) return 0;
  await db.delete(table).where(inArray(column, ids));
  return ids.length;
}

export const adminRouter = router({
  getReports: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(reports).orderBy(desc(reports.createdAt)).limit(100);
  }),

  getAuditLogs: adminProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(input.limit);
    }),

  previewSmokeData: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const data = await collectSmokeData(db);
    return {
      reservations: data.reservationIds.length,
      reviews: data.reviewIds.length,
      messages: data.messageIds.length,
      posts: data.postIds.length,
      shifts: data.shiftIds.length,
      notifications: data.notificationIds.length,
      menus: data.menuIds.length,
      rooms: data.roomIds.length,
      impactedPayrollMonths: data.impactedPayrollMonths,
    };
  }),

  purgeSmokeData: adminProcedure
    .input(z.object({
      confirm: z.literal("PURGE_SMOKE_DATA"),
    }))
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const data = await collectSmokeData(db);

      const spentByCustomer = new Map<number, number>();
      for (const reservation of data.smokeReservations) {
        spentByCustomer.set(
          reservation.customerId,
          (spentByCustomer.get(reservation.customerId) ?? 0) + Number(reservation.totalPrice ?? 0)
        );
      }

      await deleteByIds(db, postImages, postImages.postId, data.postIds);
      const deletedPosts = await deleteByIds(db, posts, posts.id, data.postIds);
      const deletedMessages = await deleteByIds(db, messages, messages.id, data.messageIds);
      const deletedReviews = await deleteByIds(db, reviews, reviews.id, data.reviewIds);
      await deleteByIds(db, reservationOptions, reservationOptions.reservationId, data.reservationIds);
      await deleteByIds(db, sales, sales.reservationId, data.reservationIds);
      const deletedReservations = await deleteByIds(db, reservations, reservations.id, data.reservationIds);
      const deletedShifts = await deleteByIds(db, shifts, shifts.id, data.shiftIds);
      const deletedNotifications = await deleteByIds(db, notifications, notifications.id, data.notificationIds);
      const deletedMenus = await deleteByIds(db, menus, menus.id, data.menuIds);
      const deletedRooms = await deleteByIds(db, rooms, rooms.id, data.roomIds);

      for (const [customerId, amount] of Array.from(spentByCustomer.entries())) {
        if (amount > 0) {
          await db.update(customerProfiles)
            .set({ totalSpent: sql`GREATEST(${customerProfiles.totalSpent} - ${amount}, 0)` })
            .where(eq(customerProfiles.accountId, customerId));
        }
      }

      await db.insert(auditLogs).values({
        actorRole: "admin",
        actorId: ctx.user.id,
        action: "purge_smoke_data",
        detail: JSON.stringify({
          reservations: deletedReservations,
          reviews: deletedReviews,
          messages: deletedMessages,
          posts: deletedPosts,
          shifts: deletedShifts,
          notifications: deletedNotifications,
          menus: deletedMenus,
          rooms: deletedRooms,
        }),
        ipAddress: ctx.req.ip ?? String(ctx.req.headers["x-forwarded-for"] ?? "unknown"),
      });

      return {
        success: true,
        deleted: {
          reservations: deletedReservations,
          reviews: deletedReviews,
          messages: deletedMessages,
          posts: deletedPosts,
          shifts: deletedShifts,
          notifications: deletedNotifications,
          menus: deletedMenus,
          rooms: deletedRooms,
        },
        impactedPayrollMonths: data.impactedPayrollMonths,
        note: "給与集計は該当月で再計算してください。",
      };
    }),

  submitIdentityVerification: publicProcedure
    .input(z.object({ documentType: z.string(), documentImageUrl: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || !["store", "therapist"].includes(session.role)) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(identityVerifications).values({
        role: session.role as "store" | "therapist",
        accountId: session.accountId,
        documentType: input.documentType,
        documentImageUrl: input.documentImageUrl,
      });
      return { success: true };
    }),

  submitAgeVerification: publicProcedure
    .input(z.object({ method: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(ageVerifications).values({ customerId: session.accountId, method: input.method });
      await db.update(customerAccounts).set({ ageVerified: true, ageVerifiedAt: new Date() }).where(eq(customerAccounts.id, session.accountId));
      return { success: true };
    }),

  getVerificationStatus: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (session.role === "store" || session.role === "therapist") {
      const rows = await db.select().from(identityVerifications).where(and(eq(identityVerifications.role, session.role), eq(identityVerifications.accountId, session.accountId))).orderBy(desc(identityVerifications.submittedAt)).limit(1);
      return rows[0] ?? null;
    } else {
      const rows = await db.select().from(ageVerifications).where(eq(ageVerifications.customerId, session.accountId)).orderBy(desc(ageVerifications.createdAt)).limit(1);
      return rows[0] ?? null;
    }
  }),

  resolveReport: adminProcedure
    .input(z.object({ id: z.number(), resolution: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(reports).set({ status: "resolved", adminNote: input.resolution }).where(eq(reports.id, input.id));
      return { success: true };
    }),

  suspendAccount: adminProcedure
    .input(z.object({ role: z.enum(["therapist", "customer"]), accountId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.role === "therapist") {
        await db.update(therapistAccounts).set({ status: "suspended" }).where(eq(therapistAccounts.id, input.accountId));
      } else {
        await db.update(customerAccounts).set({ status: "suspended" }).where(eq(customerAccounts.id, input.accountId));
      }
      return { success: true };
    }),
});
