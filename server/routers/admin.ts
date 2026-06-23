import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import {
  reports, storeAccounts, therapistAccounts, customerAccounts,
  identityVerifications, ageVerifications, auditLogs,
  reservations, reservationOptions, reviews, messages, posts, postImages,
  shifts, notifications, sales, menus, rooms, customerProfiles,
} from "../../drizzle/schema";
import { eq, and, desc, inArray, like, or, sql } from "drizzle-orm";

const SMOKE_MARKERS = ["本番動作確認", "動作確認"] as const;
let ageVerificationColumnsReady = false;

function isPrivateVerificationUrl(value: string): boolean {
  return value.startsWith("/uploads/private/verifications/")
    || value.startsWith("/manus-storage/private/verifications/");
}

function isDuplicateColumnError(error: any): boolean {
  const seen = new Set<any>();
  const stack = [error];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    const message = String(current?.message ?? "");
    const code = String(current?.code ?? "");
    const errno = String(current?.errno ?? "");
    if (
      code === "ER_DUP_FIELDNAME" ||
      errno === "1060" ||
      message.includes("Duplicate column") ||
      message.includes("Duplicate column name") ||
      message.includes("ER_DUP_FIELDNAME")
    ) {
      return true;
    }
    if (current?.cause) stack.push(current.cause);
    if (current?.error) stack.push(current.error);
  }
  return false;
}

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

async function ensureAgeVerificationDocumentColumns(db: any) {
  if (ageVerificationColumnsReady) return;

  const statements = [
    "ALTER TABLE `age_verifications` ADD COLUMN `documentType` varchar(50)",
    "ALTER TABLE `age_verifications` ADD COLUMN `documentImageUrl` text",
    "ALTER TABLE `age_verifications` ADD COLUMN `adminNote` text",
  ];

  for (const statement of statements) {
    try {
      await db.execute(sql.raw(statement));
    } catch (error: any) {
      if (!isDuplicateColumnError(error)) {
        throw error;
      }
    }
  }

  ageVerificationColumnsReady = true;
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
    .input(z.object({
      documentType: z.string(),
      documentImageUrl: z.string().min(1).refine(
        isPrivateVerificationUrl,
        "Verification image must be uploaded privately",
      ),
    }))
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
    .input(z.object({
      method: z.string().default("document_upload"),
      documentType: z.string().min(1),
      documentImageUrl: z.string().min(1).refine(
        isPrivateVerificationUrl,
        "Verification image must be uploaded privately",
      ),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensureAgeVerificationDocumentColumns(db);
      await db.insert(ageVerifications).values({
        customerId: session.accountId,
        method: input.method,
        documentType: input.documentType,
        documentImageUrl: input.documentImageUrl,
      });
      return { success: true };
    }),

  getVerificationStatus: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (session.role === "store" || session.role === "therapist") {
      const rows = await db.select().from(identityVerifications).where(and(eq(identityVerifications.role, session.role), eq(identityVerifications.accountId, session.accountId))).orderBy(desc(identityVerifications.submittedAt)).limit(1);
      const latest = rows[0];
      if (!latest) return null;
      const { documentImageUrl, ...safeVerification } = latest as typeof latest & { documentImageUrl?: string | null };
      return { ...safeVerification, hasDocumentImage: Boolean(documentImageUrl) };
    } else {
      await ensureAgeVerificationDocumentColumns(db);
      const rows = await db.select().from(ageVerifications).where(eq(ageVerifications.customerId, session.accountId)).orderBy(desc(ageVerifications.createdAt)).limit(1);
      const latest = rows[0];
      if (!latest) return null;
      const { documentImageUrl, ...safeVerification } = latest as typeof latest & { documentImageUrl?: string | null };
      return { ...safeVerification, hasDocumentImage: Boolean(documentImageUrl) };
    }
  }),

  reviewIdentityVerification: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
      adminNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(identityVerifications).where(eq(identityVerifications.id, input.id)).limit(1);
      const request = rows[0];
      if (!request) throw new TRPCError({ code: "NOT_FOUND" });

      const approved = input.status === "approved";
      await db.update(identityVerifications).set({
        status: input.status,
        adminNote: input.adminNote,
        reviewedAt: new Date(),
      }).where(eq(identityVerifications.id, input.id));

      if (request.role === "store") {
        await db.update(storeAccounts).set({
          identityVerified: approved,
          identityVerifiedAt: approved ? new Date() : null,
        }).where(eq(storeAccounts.id, request.accountId));
      } else {
        await db.update(therapistAccounts).set({
          identityVerified: approved,
          identityVerifiedAt: approved ? new Date() : null,
        }).where(eq(therapistAccounts.id, request.accountId));
      }

      await db.insert(auditLogs).values({
        actorRole: "admin",
        actorId: ctx.user.id,
        action: "review_identity_verification",
        targetType: request.role,
        targetId: request.accountId,
        detail: JSON.stringify({ verificationId: input.id, status: input.status }),
        ipAddress: ctx.req.ip ?? String(ctx.req.headers["x-forwarded-for"] ?? "unknown"),
      });
      return { success: true };
    }),

  reviewAgeVerification: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
      adminNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(ageVerifications).where(eq(ageVerifications.id, input.id)).limit(1);
      const request = rows[0];
      if (!request) throw new TRPCError({ code: "NOT_FOUND" });

      const approved = input.status === "approved";
      await ensureAgeVerificationDocumentColumns(db);
      await db.update(ageVerifications).set({
        status: input.status,
        adminNote: input.adminNote,
        verifiedAt: approved ? new Date() : null,
      }).where(eq(ageVerifications.id, input.id));
      await db.update(customerAccounts).set({
        ageVerified: approved,
        ageVerifiedAt: approved ? new Date() : null,
      }).where(eq(customerAccounts.id, request.customerId));

      await db.insert(auditLogs).values({
        actorRole: "admin",
        actorId: ctx.user.id,
        action: "review_age_verification",
        targetType: "customer",
        targetId: request.customerId,
        detail: JSON.stringify({ verificationId: input.id, status: input.status, adminNote: input.adminNote }),
        ipAddress: ctx.req.ip ?? String(ctx.req.headers["x-forwarded-for"] ?? "unknown"),
      });
      return { success: true };
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
