import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { rooms, reservations, sales } from "../../drizzle/schema";
import { getDb } from "../db";
import { getSession } from "../session";
import { publicProcedure, router } from "../_core/trpc";

export const roomRouter = router({
  // Get rooms for a store
  getByStore: publicProcedure
    .input(z.object({ storeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(rooms).where(eq(rooms.storeId, input.storeId)).orderBy(rooms.name);
    }),

  // Get my store rooms (store auth)
  getMyRooms: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession(ctx.req);
    if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!session.storeId) throw new TRPCError({ code: "BAD_REQUEST", message: "店舗IDが見つかりません" });
    return db.select().from(rooms).where(eq(rooms.storeId, session.storeId)).orderBy(rooms.name);
  }),

  // Create room
  create: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(50),
      description: z.string().optional(),
      capacity: z.number().default(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) throw new TRPCError({ code: "BAD_REQUEST" });
      await db.insert(rooms).values({
        storeId: session.storeId,
        name: input.name,
        description: input.description,
        capacity: input.capacity,
        isAvailable: true,
      });
      return { success: true };
    }),

  // Update room
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(50).optional(),
      description: z.string().optional(),
      capacity: z.number().optional(),
      isAvailable: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...updates } = input;
      const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
      await db.update(rooms).set(filtered).where(and(eq(rooms.id, id), eq(rooms.storeId, session.storeId!)));
      return { success: true };
    }),

  // Delete room
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(rooms).where(and(eq(rooms.id, input.id), eq(rooms.storeId, session.storeId!)));
      return { success: true };
    }),

  // Get room availability for a date
  getAvailability: publicProcedure
    .input(z.object({ storeId: z.number(), date: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const storeRooms = await db.select().from(rooms).where(eq(rooms.storeId, input.storeId));
      // Get reservations for that date
      const dateStart = new Date(input.date + "T00:00:00");
      const dateEnd = new Date(input.date + "T23:59:59");
      const dayReservations = await db.select().from(reservations)
        .where(and(
          eq(reservations.storeId, input.storeId),
        ));
      return storeRooms.map(room => ({
        ...room,
        reservationsToday: dayReservations.filter(r => (r as any).roomId === room.id).length,
      }));
    }),

  // Get room sales summary
  getRoomSales: publicProcedure
    .input(z.object({ month: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) throw new TRPCError({ code: "BAD_REQUEST" });
      const storeRooms = await db.select().from(rooms).where(eq(rooms.storeId, session.storeId));
      const storeSales = await db.select().from(sales).where(eq(sales.storeId, session.storeId));
      return storeRooms.map(room => ({
        ...room,
        totalSales: storeSales.filter(s => (s as any).roomId === room.id).reduce((sum, s) => sum + Number(s.totalAmount), 0),
        sessionCount: storeSales.filter(s => (s as any).roomId === room.id).length,
      }));
    }),
});
