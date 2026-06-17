import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import { customerProfiles, favorites, postComments, postImages, posts, stores, therapists } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

let postSchemaReady: Promise<void> | null = null;

function ensurePostInteractionSchema(db: any) {
  if (!postSchemaReady) {
    postSchemaReady = (async () => {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS post_comments (
          id int AUTO_INCREMENT NOT NULL,
          postId int NOT NULL,
          customerId int NOT NULL,
          comment text NOT NULL,
          isHidden boolean NOT NULL DEFAULT false,
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT post_comments_id PRIMARY KEY(id)
        )
      `));
      await db.execute(sql.raw("CREATE INDEX idx_post_comments_post ON post_comments (postId)"));
    })().catch((error: any) => {
      if (!String(error?.message ?? "").includes("Duplicate key name")) throw error;
    });
  }
  return postSchemaReady;
}

async function ensureFavoritePostTarget(db: any) {
  try {
    await db.execute(sql.raw("ALTER TABLE favorites MODIFY COLUMN targetType enum('store','therapist','post') NOT NULL"));
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (!message.includes("already") && !message.includes("Duplicate") && !message.includes("Data truncated")) {
      // TiDB/MySQL return different messages; do not block read-only post flows.
      console.warn("[Post] favorites enum migration skipped:", message);
    }
  }
}

async function decoratePost(db: any, post: any, customerId?: number) {
  const imgRows = await db.select({ imageUrl: postImages.imageUrl }).from(postImages)
    .where(eq(postImages.postId, post.id)).orderBy(postImages.sortOrder);

  let therapistName: string | null = null;
  let therapistImage: string | null = null;
  let storeName: string | null = null;
  if (post.therapistId) {
    const tRows = await db.select({ displayName: therapists.displayName, profileImageUrl: therapists.profileImageUrl })
      .from(therapists).where(eq(therapists.id, post.therapistId)).limit(1);
    therapistName = tRows[0]?.displayName ?? null;
    therapistImage = tRows[0]?.profileImageUrl ?? null;
  }
  if (post.storeId) {
    const sRows = await db.select({ name: stores.name }).from(stores).where(eq(stores.id, post.storeId)).limit(1);
    storeName = sRows[0]?.name ?? null;
  }

  const commentRows = await db.select({ count: sql<number>`COUNT(*)` }).from(postComments)
    .where(and(eq(postComments.postId, post.id), eq(postComments.isHidden, false)));
  let savedByMe = false;
  if (customerId) {
    const saved = await db.select({ id: favorites.id }).from(favorites)
      .where(and(eq(favorites.customerId, customerId), eq(favorites.targetType, "post" as any), eq(favorites.targetId, post.id)))
      .limit(1);
    savedByMe = saved.length > 0;
  }

  return {
    ...post,
    imageUrl: imgRows[0]?.imageUrl ?? null,
    imageUrls: imgRows.map((row: any) => row.imageUrl),
    therapistName,
    therapistImage,
    storeName,
    commentCount: Number(commentRows[0]?.count ?? 0),
    savedByMe,
  };
}

export const postRouter = router({
  getFeed: publicProcedure
    .input(z.object({
      storeId: z.number().optional(),
      therapistId: z.number().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensurePostInteractionSchema(db);
      if (session?.role === "customer") await ensureFavoritePostTarget(db);
      const conditions: any[] = [eq(posts.isPublic, true)];
      if (input.storeId) conditions.push(eq(posts.storeId, input.storeId));
      if (input.therapistId) conditions.push(eq(posts.therapistId, input.therapistId));
      const postRows = await db.select().from(posts).where(and(...conditions)).orderBy(desc(posts.createdAt)).limit(input.limit).offset(input.offset);
      return Promise.all(postRows.map((post: any) => decoratePost(db, post, session?.role === "customer" ? session.accountId : undefined)));
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensurePostInteractionSchema(db);
      if (session?.role === "customer") await ensureFavoritePostTarget(db);
      const postRows = await db.select().from(posts).where(and(eq(posts.id, input.id), eq(posts.isPublic, true))).limit(1);
      if (!postRows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      return decoratePost(db, postRows[0], session?.role === "customer" ? session.accountId : undefined);
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
      const postId = (result as any)[0].insertId as number;
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
    await ensurePostInteractionSchema(db);
    const postRows = await db.select().from(posts).where(eq(posts.therapistId, session.therapistId)).orderBy(desc(posts.createdAt)).limit(50);
    return Promise.all(postRows.map((post: any) => decoratePost(db, post)));
  }),

  getComments: publicProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensurePostInteractionSchema(db);
      return db.select({
        id: postComments.id,
        postId: postComments.postId,
        customerId: postComments.customerId,
        comment: postComments.comment,
        createdAt: postComments.createdAt,
        customerName: sql<string>`COALESCE(${customerProfiles.displayName}, ${customerProfiles.nickname}, CONCAT('顧客#', ${postComments.customerId}))`,
        customerImage: customerProfiles.profileImageUrl,
      }).from(postComments)
        .leftJoin(customerProfiles, eq(postComments.customerId, customerProfiles.accountId))
        .where(and(eq(postComments.postId, input.postId), eq(postComments.isHidden, false)))
        .orderBy(postComments.createdAt)
        .limit(100);
    }),

  addComment: publicProcedure
    .input(z.object({ postId: z.number(), comment: z.string().min(1).max(500) }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensurePostInteractionSchema(db);
      await ensureFavoritePostTarget(db);
      const postRows = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, input.postId), eq(posts.isPublic, true))).limit(1);
      if (!postRows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      await db.insert(postComments).values({ postId: input.postId, customerId: session.accountId, comment: input.comment.trim() });
      return { success: true };
    }),

});
