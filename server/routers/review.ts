import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import { reviews, reservations, stores, therapists } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const reviewRouter = router({
  getStoreReviews: publicProcedure
    .input(z.object({ storeId: z.number(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(reviews).where(and(eq(reviews.storeId, input.storeId), eq(reviews.isHidden, false))).orderBy(desc(reviews.createdAt)).limit(input.limit);
    }),

  getTherapistReviews: publicProcedure
    .input(z.object({ therapistId: z.number(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(reviews).where(and(eq(reviews.therapistId, input.therapistId), eq(reviews.isHidden, false))).orderBy(desc(reviews.createdAt)).limit(input.limit);
    }),

  create: publicProcedure
    .input(z.object({ reservationId: z.number(), rating: z.number().min(1).max(5), comment: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const resRows = await db.select().from(reservations).where(and(eq(reservations.id, input.reservationId), eq(reservations.customerId, session.accountId))).limit(1);
      if (!resRows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      if (resRows[0].status !== "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "完了した予約のみ口コミを投稿できます" });
      await db.insert(reviews).values({ reservationId: input.reservationId, customerId: session.accountId, storeId: resRows[0].storeId, therapistId: resRows[0].therapistId, rating: input.rating, comment: input.comment });
      if (resRows[0].storeId) {
        const avgRows = await db.select({ avg: sql<number>`AVG(rating)`, count: sql<number>`COUNT(*)` }).from(reviews).where(eq(reviews.storeId, resRows[0].storeId));
        await db.update(stores).set({ reviewAvg: String(avgRows[0]?.avg ?? 0), reviewCount: avgRows[0]?.count ?? 0 }).where(eq(stores.id, resRows[0].storeId));
      }
      if (resRows[0].therapistId) {
        const avgRows = await db.select({ avg: sql<number>`AVG(rating)`, count: sql<number>`COUNT(*)` }).from(reviews).where(eq(reviews.therapistId, resRows[0].therapistId));
        await db.update(therapists).set({ reviewAvg: String(avgRows[0]?.avg ?? 0), reviewCount: avgRows[0]?.count ?? 0 }).where(eq(therapists.id, resRows[0].therapistId));
      }
      return { success: true };
    }),

  reply: publicProcedure
    .input(z.object({ reviewId: z.number(), reply: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(reviews).set({ storeReply: input.reply }).where(eq(reviews.id, input.reviewId));
      return { success: true };
    }),

  hide: publicProcedure
    .input(z.object({ reviewId: z.number(), hide: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(reviews).set({ isHidden: input.hide }).where(eq(reviews.id, input.reviewId));
      return { success: true };
    }),

  getMyStoreReviews: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!session.storeId) return [];
    return db.select().from(reviews).where(eq(reviews.storeId, session.storeId)).orderBy(desc(reviews.createdAt)).limit(50);
  }),
});
