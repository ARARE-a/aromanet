import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import { storyPosts, therapists, stores } from "../../drizzle/schema";
import { eq, and, gt, desc, inArray } from "drizzle-orm";

export const storyRouter = router({
  // Create a story (therapist or store)
  create: publicProcedure
    .input(z.object({
      mediaUrl: z.string().min(1), // accepts both absolute URLs and /manus-storage/... paths
      mediaType: z.enum(["image", "video"]).default("image"),
      caption: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || (session.role !== "therapist" && session.role !== "store")) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      if (session.role === "therapist") {
        const tRows = await db.select({ id: therapists.id })
          .from(therapists)
          .where(eq(therapists.accountId, session.accountId))
          .limit(1);
        if (!tRows[0]) throw new TRPCError({ code: "NOT_FOUND" });
        await db.insert(storyPosts).values({
          therapistId: tRows[0].id,
          authorRole: "therapist",
          mediaUrl: input.mediaUrl,
          mediaType: input.mediaType,
          caption: input.caption,
          expiresAt,
        });
      } else {
        const sRows = await db.select({ id: stores.id })
          .from(stores)
          .where(eq(stores.accountId, session.accountId))
          .limit(1);
        if (!sRows[0]) throw new TRPCError({ code: "NOT_FOUND" });
        await db.insert(storyPosts).values({
          storeId: sRows[0].id,
          authorRole: "store",
          mediaUrl: input.mediaUrl,
          mediaType: input.mediaType,
          caption: input.caption,
          expiresAt,
        });
      }
      return { success: true };
    }),

  // Get my active stories
  getMyStories: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || (session.role !== "therapist" && session.role !== "store")) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const now = new Date();

    if (session.role === "therapist") {
      const tRows = await db.select({ id: therapists.id })
        .from(therapists)
        .where(eq(therapists.accountId, session.accountId))
        .limit(1);
      if (!tRows[0]) return [];
      return db.select().from(storyPosts)
        .where(and(eq(storyPosts.therapistId, tRows[0].id), gt(storyPosts.expiresAt, now)))
        .orderBy(desc(storyPosts.createdAt));
    } else {
      const sRows = await db.select({ id: stores.id })
        .from(stores)
        .where(eq(stores.accountId, session.accountId))
        .limit(1);
      if (!sRows[0]) return [];
      return db.select().from(storyPosts)
        .where(and(eq(storyPosts.storeId, sRows[0].id), gt(storyPosts.expiresAt, now)))
        .orderBy(desc(storyPosts.createdAt));
    }
  }),

  // Get stories by therapist ID (for customer viewing)
  getByTherapistId: publicProcedure
    .input(z.object({ therapistId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date();
      return db.select().from(storyPosts)
        .where(and(eq(storyPosts.therapistId, input.therapistId), gt(storyPosts.expiresAt, now)))
        .orderBy(desc(storyPosts.createdAt));
    }),

  // Get stories by store ID (for customer viewing)
  getByStoreId: publicProcedure
    .input(z.object({ storeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date();
      return db.select().from(storyPosts)
        .where(and(eq(storyPosts.storeId, input.storeId), gt(storyPosts.expiresAt, now)))
        .orderBy(desc(storyPosts.createdAt));
    }),

  // Check which therapist IDs have active stories (for story ring indicator)
  getActiveTherapistIds: publicProcedure
    .input(z.object({ therapistIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      if (!input.therapistIds.length) return [];
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date();
      const rows = await db
        .selectDistinct({ therapistId: storyPosts.therapistId })
        .from(storyPosts)
        .where(
          and(
            inArray(storyPosts.therapistId, input.therapistIds),
            gt(storyPosts.expiresAt, now)
          )
        );
      return rows.map(r => r.therapistId).filter(Boolean) as number[];
    }),

  // Check which store IDs have active stories
  getActiveStoreIds: publicProcedure
    .input(z.object({ storeIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      if (!input.storeIds.length) return [];
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date();
      const rows = await db
        .selectDistinct({ storeId: storyPosts.storeId })
        .from(storyPosts)
        .where(
          and(
            inArray(storyPosts.storeId, input.storeIds),
            gt(storyPosts.expiresAt, now)
          )
        );
      return rows.map(r => r.storeId).filter(Boolean) as number[];
    }),

  // Increment view count
  markViewed: publicProcedure
    .input(z.object({ storyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select({ viewCount: storyPosts.viewCount }).from(storyPosts).where(eq(storyPosts.id, input.storyId)).limit(1);
      if (rows[0]) {
        await db.update(storyPosts).set({ viewCount: (rows[0].viewCount ?? 0) + 1 }).where(eq(storyPosts.id, input.storyId));
      }
      return { success: true };
    }),

  // Delete a story (own only)
  delete: publicProcedure
    .input(z.object({ storyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db.select().from(storyPosts).where(eq(storyPosts.id, input.storyId)).limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });

      if (session.role === "therapist") {
        const tRows = await db.select({ id: therapists.id })
          .from(therapists).where(eq(therapists.accountId, session.accountId)).limit(1);
        if (!tRows[0] || rows[0].therapistId !== tRows[0].id) throw new TRPCError({ code: "FORBIDDEN" });
      } else if (session.role === "store") {
        const sRows = await db.select({ id: stores.id })
          .from(stores).where(eq(stores.accountId, session.accountId)).limit(1);
        if (!sRows[0] || rows[0].storeId !== sRows[0].id) throw new TRPCError({ code: "FORBIDDEN" });
      } else {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.delete(storyPosts).where(eq(storyPosts.id, input.storyId));
      return { success: true };
    }),
});
