import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getSession } from "../session";
import {
  reservations, reservationOptions, menus, menuOptions,
  coupons, notifications, customerAccounts, customerProfiles, storeAccounts, therapistAccounts, therapists, stores, sales, therapistSalarySettings, therapistPayrolls, shifts,
} from "../../drizzle/schema";
import { eq, and, desc, gte, lt, or, sql } from "drizzle-orm";

function getMonthBoundsFromDate(date: string) {
  const [yearRaw, monthRaw] = date.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const start = `${yearRaw}-${monthRaw}-01`;
  const next = new Date(Date.UTC(year, month, 1));
  const end = next.toISOString().slice(0, 10);
  return { year, month, start, end };
}

async function recalculateTherapistPayroll(db: any, storeId: number, therapistId: number | null, date: string) {
  if (!therapistId) return;
  const { year, month, start, end } = getMonthBoundsFromDate(date);
  const salesRows = await db.select({
    totalSales: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
    totalBack: sql<number>`COALESCE(SUM(${sales.therapistBack}), 0)`,
    optionAmount: sql<number>`COALESCE(SUM(${sales.optionAmount}), 0)`,
    nominationCount: sql<number>`SUM(CASE WHEN ${sales.nominationFee} > 0 THEN 1 ELSE 0 END)`,
  }).from(sales).where(and(
    eq(sales.storeId, storeId),
    eq(sales.therapistId, therapistId),
    gte(sales.date, start),
    lt(sales.date, end),
  ));
  const totals = salesRows[0];
  const existingRows = await db.select().from(therapistPayrolls).where(and(
    eq(therapistPayrolls.therapistId, therapistId),
    eq(therapistPayrolls.storeId, storeId),
    eq(therapistPayrolls.year, year),
    eq(therapistPayrolls.month, month),
  )).limit(1);
  const therapistRows = await db.select().from(therapists).where(eq(therapists.id, therapistId)).limit(1);
  const existing = existingRows[0];
  const backAmount = Number(totals?.totalBack ?? 0);
  const adjustmentAmount = Number(existing?.adjustmentAmount ?? 0);
  const payrollData = {
    therapistId,
    storeId,
    year,
    month,
    nominationCount: Number(totals?.nominationCount ?? 0),
    totalSales: Number(totals?.totalSales ?? 0),
    backRate: String(therapistRows[0]?.backRate ?? existing?.backRate ?? "50.00"),
    backAmount,
    optionAmount: Number(totals?.optionAmount ?? 0),
    adjustmentAmount,
    adjustmentNote: existing?.adjustmentNote ?? null,
    totalPayroll: backAmount + adjustmentAmount,
    isPaid: existing?.isPaid ?? false,
    paidAt: existing?.paidAt ?? null,
  };
  if (existing) {
    await db.update(therapistPayrolls).set(payrollData).where(eq(therapistPayrolls.id, existing.id));
  } else {
    await db.insert(therapistPayrolls).values(payrollData);
  }
}

async function requireTherapistAvailableForReservation(db: any, input: {
  storeId: number;
  therapistId: number;
  date: string;
  startTime: string;
  endTime: string;
}) {
  const shiftRows = await db.select().from(shifts).where(and(
    eq(shifts.storeId, input.storeId),
    eq(shifts.therapistId, input.therapistId),
    eq(shifts.date, input.date),
    eq(shifts.approvalStatus, "approved"),
    or(eq(shifts.status, "scheduled"), eq(shifts.status, "working")),
  ));

  const matchingShift = shiftRows.find((shift: any) => (
    shift.startTime <= input.startTime &&
    shift.endTime >= input.endTime
  ));
  if (!matchingShift) {
    throw new TRPCError({ code: "CONFLICT", message: "選択したセラピストはこの日時に出勤予定がありません" });
  }

  const overlapsBreak = matchingShift.breakStart && matchingShift.breakEnd &&
    input.startTime < matchingShift.breakEnd &&
    input.endTime > matchingShift.breakStart;
  if (overlapsBreak) {
    throw new TRPCError({ code: "CONFLICT", message: "選択した時間は休憩時間と重なっています" });
  }
}

export const reservationRouter = router({
  create: publicProcedure
    .input(z.object({
      storeId: z.number(),
      therapistId: z.number().optional(),
      menuId: z.number(),
      date: z.string(),
      startTime: z.string(),
      isNomination: z.boolean().default(false),
      optionIds: z.array(z.number()).default([]),
      couponCode: z.string().optional(),
      customerNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const menuRows = await db.select().from(menus).where(eq(menus.id, input.menuId)).limit(1);
      if (!menuRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "メニューが見つかりません" });
      const menu = menuRows[0];
      if (!menu.isPublic) throw new TRPCError({ code: "NOT_FOUND", message: "メニューが公開されていません" });
      const resolvedStoreId = menu.storeId;

      if (input.storeId !== resolvedStoreId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "選択された店舗とメニューが一致しません" });
      }

      const activeStoreRows = await db.select({ id: stores.id }).from(stores)
        .innerJoin(storeAccounts, eq(stores.accountId, storeAccounts.id))
        .where(and(
          eq(stores.id, resolvedStoreId),
          eq(stores.isPublic, true),
          eq(storeAccounts.status, "active"),
        ))
        .limit(1);
      if (!activeStoreRows[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "店舗が公開されていません" });
      }

      if (input.therapistId) {
        const therapistRows = await db.select({
          id: therapists.id,
          storeId: therapists.storeId,
          displayName: therapists.displayName,
        }).from(therapists)
          .innerJoin(therapistAccounts, eq(therapists.accountId, therapistAccounts.id))
          .innerJoin(stores, eq(therapists.storeId, stores.id))
          .innerJoin(storeAccounts, eq(stores.accountId, storeAccounts.id))
          .where(and(
            eq(therapists.id, input.therapistId),
            eq(therapists.isPublic, true),
            eq(therapistAccounts.status, "active"),
            eq(stores.isPublic, true),
            eq(storeAccounts.status, "active"),
          ))
          .limit(1);
        if (!therapistRows[0]) {
          throw new TRPCError({ code: "NOT_FOUND", message: "セラピストが見つかりません" });
        }
        if (therapistRows[0].storeId !== resolvedStoreId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "選択されたセラピストはこの店舗に所属していません" });
        }
      }

      const [h, m] = input.startTime.split(":").map(Number);
      const endMinutes = h * 60 + m + menu.durationMinutes;
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

      if (input.therapistId) {
        await requireTherapistAvailableForReservation(db, {
          storeId: resolvedStoreId,
          therapistId: input.therapistId,
          date: input.date,
          startTime: input.startTime,
          endTime,
        });
      }

      const existing = await db.select().from(reservations).where(and(eq(reservations.storeId, resolvedStoreId), eq(reservations.date, input.date)));
      for (const r of existing) {
        if (r.status === "cancelled" || r.status === "no_show") continue;
        if (input.therapistId && r.therapistId !== input.therapistId) continue;
        if (r.startTime < endTime && r.endTime > input.startTime) {
          throw new TRPCError({ code: "CONFLICT", message: "この時間帯は既に予約が入っています" });
        }
      }

      const isNomination = Boolean(input.therapistId || input.isNomination);
      const nominationFee = isNomination ? menu.nominationFee : 0;
      let optionTotal = 0;
      const optionDetails: { optionId: number; price: number }[] = [];
      for (const optId of input.optionIds) {
        const optRows = await db.select().from(menuOptions).where(and(eq(menuOptions.id, optId), eq(menuOptions.storeId, resolvedStoreId))).limit(1);
        if (optRows[0]) {
          optionTotal += optRows[0].price;
          optionDetails.push({ optionId: optId, price: optRows[0].price });
        }
      }

      let discountAmount = 0;
      let couponId: number | undefined;
      if (input.couponCode) {
        const couponRows = await db.select().from(coupons).where(and(eq(coupons.storeId, resolvedStoreId), eq(coupons.code, input.couponCode), eq(coupons.isPublic, true))).limit(1);
        if (couponRows[0]) {
          const c = couponRows[0];
          const base = menu.price + nominationFee + optionTotal;
          if (base >= c.minAmount) {
            discountAmount = c.discountType === "fixed" ? c.discountValue : Math.floor(base * c.discountValue / 100);
            couponId = c.id;
            await db.update(coupons).set({ usedCount: c.usedCount + 1 }).where(eq(coupons.id, c.id));
          }
        }
      }

      const totalPrice = menu.price + nominationFee + optionTotal - discountAmount;
      const result = await db.insert(reservations).values({
        storeId: resolvedStoreId,
        therapistId: input.therapistId,
        customerId: session.accountId,
        menuId: input.menuId,
        date: input.date,
        startTime: input.startTime,
        endTime,
        isNomination,
        nominationFee,
        optionTotal,
        discountAmount,
        couponId,
        totalPrice,
        customerNote: input.customerNote,
        status: "pending",
      });
      const reservationId = (result as any)[0].insertId as number;

      for (const opt of optionDetails) {
        await db.insert(reservationOptions).values({ reservationId, ...opt });
      }

      await db.insert(notifications).values({
        recipientRole: "store",
        recipientId: resolvedStoreId,
        type: "new_reservation",
        title: "新しい予約が入りました",
        body: `${input.date} ${input.startTime}〜`,
        relatedId: reservationId,
      });

      if (input.therapistId) {
        await db.insert(notifications).values({
          recipientRole: "therapist",
          recipientId: input.therapistId,
          type: "new_reservation",
          title: "指名予約が入りました",
          body: `${input.date} ${input.startTime}〜`,
          relatedId: reservationId,
        });
      }

      return { success: true, reservationId };
    }),

  getStoreReservations: publicProcedure
    .input(z.object({
      date: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!session.storeId) return [];
      const conditions: any[] = [eq(reservations.storeId, session.storeId)];
      if (input.date) conditions.push(eq(reservations.date, input.date));
      if (input.status) conditions.push(eq(reservations.status, input.status as any));
      return db.select({
        id: reservations.id,
        storeId: reservations.storeId,
        therapistId: reservations.therapistId,
        customerId: reservations.customerId,
        menuId: reservations.menuId,
        date: reservations.date,
        startTime: reservations.startTime,
        endTime: reservations.endTime,
        isNomination: reservations.isNomination,
        status: reservations.status,
        totalPrice: reservations.totalPrice,
        totalAmount: reservations.totalPrice,
        nominationFee: reservations.nominationFee,
        optionTotal: reservations.optionTotal,
        discountAmount: reservations.discountAmount,
        cancelReason: reservations.cancelReason,
        cancelFee: reservations.cancelFee,
        note: reservations.note,
        customerNote: reservations.customerNote,
        notes: sql<string>`COALESCE(${reservations.note}, ${reservations.customerNote})`,
        createdAt: reservations.createdAt,
        updatedAt: reservations.updatedAt,
        customerName: sql<string>`COALESCE(${customerProfiles.displayName}, ${customerProfiles.nickname}, CONCAT('顧客#', ${reservations.customerId}))`,
        customerPhone: customerProfiles.phone,
        customerPhoneVerified: customerAccounts.phoneVerified,
        customerImage: customerProfiles.profileImageUrl,
        therapistName: therapists.displayName,
        therapistImage: therapists.profileImageUrl,
        storeName: stores.name,
        menuName: menus.name,
        menuPrice: menus.price,
        menuDuration: menus.durationMinutes,
      }).from(reservations)
        .leftJoin(customerProfiles, eq(reservations.customerId, customerProfiles.accountId))
        .leftJoin(customerAccounts, eq(reservations.customerId, customerAccounts.id))
        .leftJoin(therapists, eq(reservations.therapistId, therapists.id))
        .leftJoin(stores, eq(reservations.storeId, stores.id))
        .leftJoin(menus, eq(reservations.menuId, menus.id))
        .where(and(...conditions))
        .orderBy(desc(reservations.date), reservations.startTime)
        .limit(input.limit);
    }),

  updateStatus: publicProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "confirmed", "waiting", "in_service", "completed", "cancelled", "no_show", "change_requested"]),
      cancelReason: z.string().optional(),
      cancelFee: z.number().optional(),
      note: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || !["store", "therapist"].includes(session.role)) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      const targetRows = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
      const target = targetRows[0];
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.role === "store" && target.storeId !== session.storeId) throw new TRPCError({ code: "UNAUTHORIZED" });
      if (session.role === "therapist" && target.therapistId !== session.therapistId) throw new TRPCError({ code: "UNAUTHORIZED" });
      await db.update(reservations).set(data).where(eq(reservations.id, id));

      if (input.status === "completed") {
        const resRows = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
        if (resRows[0]) {
          const r = resRows[0];
          const existingSales = await db.select({ id: sales.id }).from(sales).where(eq(sales.reservationId, id)).limit(1);
          let backRate = 50;
          if (r.therapistId) {
            const salaryRows = await db.select().from(therapistSalarySettings)
              .where(and(eq(therapistSalarySettings.therapistId, r.therapistId), eq(therapistSalarySettings.storeId, r.storeId)))
              .limit(1);
            if (salaryRows[0]) {
              backRate = Number(salaryRows[0].backRate);
            } else {
              const tRows = await db.select().from(therapists).where(eq(therapists.id, r.therapistId)).limit(1);
              if (tRows[0]) backRate = Number(tRows[0].backRate);
            }
          }
          const therapistBack = Math.floor((r.totalPrice - r.nominationFee) * backRate / 100);
          if (!existingSales[0]) {
            await db.insert(sales).values({
              reservationId: id,
              storeId: r.storeId,
              therapistId: r.therapistId,
              date: r.date,
              menuAmount: r.totalPrice - r.nominationFee - r.optionTotal + r.discountAmount,
              nominationFee: r.nominationFee,
              optionAmount: r.optionTotal,
              discountAmount: r.discountAmount,
              totalAmount: r.totalPrice,
              therapistBack,
            });
            await db.update(customerProfiles).set({ totalSpent: sql`totalSpent + ${r.totalPrice}` }).where(eq(customerProfiles.accountId, r.customerId));
            await db.insert(notifications).values({
              recipientRole: "customer",
              recipientId: r.customerId,
              type: "reservation_completed",
              title: "施術が完了しました",
              body: "口コミを投稿してください",
              relatedId: id,
            });
          } else {
            await db.update(sales).set({
              storeId: r.storeId,
              therapistId: r.therapistId,
              date: r.date,
              menuAmount: r.totalPrice - r.nominationFee - r.optionTotal + r.discountAmount,
              nominationFee: r.nominationFee,
              optionAmount: r.optionTotal,
              discountAmount: r.discountAmount,
              totalAmount: r.totalPrice,
              therapistBack,
            }).where(eq(sales.id, existingSales[0].id));
          }
          await recalculateTherapistPayroll(db, r.storeId, r.therapistId, r.date);
        }
      }
      return { success: true };
    }),

  cancel: publicProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(reservations).where(and(eq(reservations.id, input.id), eq(reservations.customerId, session.accountId))).limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(reservations).set({ status: "cancelled", cancelReason: input.reason }).where(eq(reservations.id, input.id));
      return { success: true };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(reservations).where(eq(reservations.id, input.id)).limit(1);
      const reservation = rows[0];
      if (!reservation) return null;
      const canRead =
        (session.role === "store" && reservation.storeId === session.storeId) ||
        (session.role === "therapist" && reservation.therapistId === session.therapistId) ||
        (session.role === "customer" && reservation.customerId === session.accountId);
      if (!canRead) throw new TRPCError({ code: "NOT_FOUND" });
      return reservation;
    }),
});
