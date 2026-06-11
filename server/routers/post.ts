import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import { posts, postImages } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const postRouter = router({
  getFeed: publicProcedure
    .input(z.object({
      storeId: z.number().optional(),
      therapistId: z.number().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions: any[] = [eq(posts.isPublic, true)];
      if (input.storeId) conditions.push(eq(posts.storeId, input.storeId));
      if (input.therapistId) conditions.push(eq(posts.therapistId, input.therapistId));
      return db.select().from(posts).where(and(...conditions)).orderBy(desc(posts.createdAt)).limit(input.limit).offset(input.offset);
    }),

  create: publicProcedure
    .input(z.object({
      postType: z.enum(["normal", "attendance", "diary", "campaign", "news"]).default("diary"),
      content: z.string().min(1),
      imageUrls: z.array(z.string()).default([]),
      isPublic: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { imageUrls, ...postData } = input;
      const result = await db.insert(posts).values({ ...postData, authorRole: "therapist", therapistId: session.therapistId });
      const postId = (result as any).insertId as number;
      for (let i = 0; i < imageUrls.length; i++) {
        await db.insert(postImages).values({ postId, imageUrl: imageUrls[i], sortOrder: i });
      }
      return { success: true, postId };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posts).set({ isPublic: false }).where(and(eq(posts.id, input.id), eq(posts.therapistId, session.therapistId!)));
      return { success: true };
    }),

  getMyPosts: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "therapist") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!session.therapistId) return [];
    return db.select().from(posts).where(eq(posts.therapistId, session.therapistId)).orderBy(desc(posts.createdAt)).limit(50);
  }),

});
