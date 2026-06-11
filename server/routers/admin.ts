import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import {
  reports, therapistAccounts, customerAccounts,
  identityVerifications, ageVerifications, auditLogs,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const adminRouter = router({
  getReports: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(reports).orderBy(desc(reports.createdAt)).limit(100);
  }),

  getAuditLogs: publicProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(input.limit);
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

  resolveReport: publicProcedure
    .input(z.object({ id: z.number(), resolution: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(reports).set({ status: "resolved", adminNote: input.resolution }).where(eq(reports.id, input.id));
      return { success: true };
    }),

  suspendAccount: publicProcedure
    .input(z.object({ role: z.enum(["therapist", "customer"]), accountId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
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
