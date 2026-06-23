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

const BLOCKING_RESERVATION_STATUSES = new Set([
  "pending",
  "confirmed",
  "waiting",
  "in_service",
  "change_requested",
]);

function blocksTherapistSlot(status: string | null | undefined) {
  return BLOCKING_RESERVATION_STATUSES.has(String(status));
}

const EDIT_LOCKED_RESERVATION_STATUSES = new Set(["completed", "cancelled", "no_show"]);

function assertReservationEditable(status: string | null | undefined) {
  if (EDIT_LOCKED_RESERVATION_STATUSES.has(String(status))) {
    throw new TRPCError({ code: "CONFLICT", message: "完了済み、キャンセル済み、無断キャンセル済みの予約は変更できません" });
  }
}

function maskStoreDemoReservation(row: any) {
  return {
    ...row,
    customerName: `デモ顧客#${row.id}`,
    customerPhone: "090-0000-0000",
    customerPhoneVerified: true,
    customerImage: null,
    note: row.note ? "デモ予約メモ" : row.note,
    customerNote: row.customerNote ? "デモ予約メモ" : row.customerNote,
    notes: row.notes ? "デモ予約メモ" : row.notes,
  };
}

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
  const totalPayroll = backAmount + adjustmentAmount;
  const payrollChanged = existing && Number(existing.totalPayroll ?? 0) !== totalPayroll;
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
    totalPayroll,
    isPaid: payrollChanged ? false : (existing?.isPaid ?? false),
    paidAt: payrollChanged ? null : (existing?.paidAt ?? null),
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

async function assertReservationConflicts(db: any, input: {
  reservationId: number;
  storeId: number;
  customerId: number;
  therapistId?: number | null;
  date: string;
  startTime: string;
  endTime: string;
}) {
  const customerExisting = await db.select().from(reservations).where(and(
    eq(reservations.customerId, input.customerId),
    eq(reservations.date, input.date),
  ));
  for (const r of customerExisting) {
    if (r.id === input.reservationId || !blocksTherapistSlot(r.status)) continue;
    if (r.startTime < input.endTime && r.endTime > input.startTime) {
      throw new TRPCError({ code: "CONFLICT", message: "同じ顧客の同じ時間帯に別の予約があります" });
    }
  }

  if (!input.therapistId) return;

  const therapistExisting = await db.select().from(reservations).where(and(
    eq(reservations.storeId, input.storeId),
    eq(reservations.therapistId, input.therapistId),
    eq(reservations.date, input.date),
  ));
  for (const r of therapistExisting) {
    if (r.id === input.reservationId || !blocksTherapistSlot(r.status)) continue;
    if (r.startTime < input.endTime && r.endTime > input.startTime) {
      throw new TRPCError({ code: "CONFLICT", message: "選択したセラピストの同じ時間帯に別の予約があります" });
    }
  }
}

async function removeReservationSaleAndRecalculatePayroll(db: any, reservationId: number, fallback: { storeId: number; therapistId: number | null; date: string }) {
  const existingSales = await db.select().from(sales).where(eq(sales.reservationId, reservationId));
  if (!existingSales.length) return;
  await db.delete(sales).where(eq(sales.reservationId, reservationId));
  const pairs = new Map<string, { storeId: number; therapistId: number | null; date: string }>();
  pairs.set(`${fallback.storeId}:${fallback.therapistId}:${fallback.date}`, fallback);
  for (const sale of existingSales) {
    pairs.set(`${sale.storeId}:${sale.therapistId}:${sale.date}`, {
      storeId: sale.storeId,
      therapistId: sale.therapistId,
      date: sale.date,
    });
  }
  for (const row of Array.from(pairs.values())) {
    await recalculateTherapistPayroll(db, row.storeId, row.therapistId, row.date);
  }
}

async function getReservationBackRate(db: any, storeId: number, therapistId: number | null) {
  if (!therapistId) return 0;
  const salaryRows = await db.select().from(therapistSalarySettings)
    .where(and(eq(therapistSalarySettings.therapistId, therapistId), eq(therapistSalarySettings.storeId, storeId)))
    .limit(1);
  if (salaryRows[0]) return Number(salaryRows[0].backRate ?? 50);
  const therapistRows = await db.select().from(therapists).where(and(eq(therapists.id, therapistId), eq(therapists.storeId, storeId))).limit(1);
  return Number(therapistRows[0]?.backRate ?? 50);
}

async function upsertSaleForCompletedReservation(db: any, reservationId: number) {
  const resRows = await db.select().from(reservations).where(eq(reservations.id, reservationId)).limit(1);
  const r = resRows[0];
  if (!r || r.status !== "completed") return;

  const existingSales = await db.select({ id: sales.id, totalAmount: sales.totalAmount }).from(sales).where(eq(sales.reservationId, reservationId)).limit(1);
  const backRate = await getReservationBackRate(db, r.storeId, r.therapistId);
  const therapistBack = Math.floor(Math.max(0, r.totalPrice - r.nominationFee) * backRate / 100);
  const saleData = {
    storeId: r.storeId,
    therapistId: r.therapistId,
    date: r.date,
    menuAmount: r.totalPrice - r.nominationFee - r.optionTotal + r.discountAmount,
    nominationFee: r.nominationFee,
    optionAmount: r.optionTotal,
    discountAmount: r.discountAmount,
    totalAmount: r.totalPrice,
    therapistBack,
  };

  if (!existingSales[0]) {
    await db.insert(sales).values({ reservationId, ...saleData });
    await db.update(customerProfiles).set({ totalSpent: sql`totalSpent + ${r.totalPrice}` }).where(eq(customerProfiles.accountId, r.customerId));
    await db.insert(notifications).values({
      recipientRole: "customer",
      recipientId: r.customerId,
      type: "reservation_completed",
      title: "施術が完了しました",
      body: "口コミを投稿してください",
      relatedId: reservationId,
    });
  } else {
    await db.update(sales).set(saleData).where(eq(sales.id, existingSales[0].id));
    const spentDelta = r.totalPrice - Number(existingSales[0].totalAmount ?? 0);
    if (spentDelta !== 0) {
      await db.update(customerProfiles).set({ totalSpent: sql`GREATEST(totalSpent + ${spentDelta}, 0)` }).where(eq(customerProfiles.accountId, r.customerId));
    }
  }
  await recalculateTherapistPayroll(db, r.storeId, r.therapistId, r.date);
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

      const customerExisting = await db.select().from(reservations).where(and(
        eq(reservations.customerId, session.accountId),
        eq(reservations.date, input.date),
      ));
      for (const r of customerExisting) {
        if (!blocksTherapistSlot(r.status)) continue;
        if (r.startTime < endTime && r.endTime > input.startTime) {
          throw new TRPCError({ code: "CONFLICT", message: "同じ時間帯に別の予約があります" });
        }
      }

      const existing = input.therapistId ? await db.select().from(reservations).where(and(eq(reservations.storeId, resolvedStoreId), eq(reservations.therapistId, input.therapistId), eq(reservations.date, input.date))) : [];
      for (const r of existing) {
        if (!blocksTherapistSlot(r.status)) continue;
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

  assignTherapist: publicProcedure
    .input(z.object({
      id: z.number(),
      therapistId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store" || !session.storeId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const targetRows = await db.select().from(reservations).where(eq(reservations.id, input.id)).limit(1);
      const target = targetRows[0];
      if (!target || target.storeId !== session.storeId) throw new TRPCError({ code: "NOT_FOUND" });
      if (["completed", "cancelled", "no_show"].includes(target.status)) {
        throw new TRPCError({ code: "CONFLICT", message: "完了またはキャンセル済みの予約には担当を割り当てできません" });
      }

      const therapistRows = await db.select({ id: therapists.id, storeId: therapists.storeId, displayName: therapists.displayName })
        .from(therapists)
        .innerJoin(therapistAccounts, eq(therapists.accountId, therapistAccounts.id))
        .where(and(
          eq(therapists.id, input.therapistId),
          eq(therapists.storeId, session.storeId),
          eq(therapists.isPublic, true),
          eq(therapistAccounts.status, "active"),
        ))
        .limit(1);
      const therapist = therapistRows[0];
      if (!therapist) throw new TRPCError({ code: "NOT_FOUND", message: "割り当て可能なセラピストが見つかりません" });

      await requireTherapistAvailableForReservation(db, {
        storeId: session.storeId,
        therapistId: input.therapistId,
        date: target.date,
        startTime: target.startTime,
        endTime: target.endTime,
      });

      const existing = await db.select().from(reservations).where(and(
        eq(reservations.storeId, session.storeId),
        eq(reservations.therapistId, input.therapistId),
        eq(reservations.date, target.date),
      ));
      for (const r of existing) {
        if (r.id === target.id || !blocksTherapistSlot(r.status)) continue;
        if (r.startTime < target.endTime && r.endTime > target.startTime) {
          throw new TRPCError({ code: "CONFLICT", message: "選択したセラピストはこの時間帯に別の予約があります" });
        }
      }

      await db.update(reservations).set({
        therapistId: input.therapistId,
        updatedAt: new Date(),
      }).where(eq(reservations.id, target.id));

      await db.insert(notifications).values({
        recipientRole: "therapist",
        recipientId: input.therapistId,
        type: "reservation_assigned",
        title: "予約の担当に割り当てられました",
        body: `${target.date} ${target.startTime}〜${target.endTime}`,
        relatedId: target.id,
      });
      await db.insert(notifications).values({
        recipientRole: "customer",
        recipientId: target.customerId,
        type: "reservation_assigned",
        title: "予約の担当セラピストが決まりました",
        body: therapist.displayName,
        relatedId: target.id,
      });

      return { success: true };
    }),

  updateReservation: publicProcedure
    .input(z.object({
      id: z.number(),
      date: z.string(),
      startTime: z.string(),
      menuId: z.number(),
      therapistId: z.number().nullable().optional(),
      isNomination: z.boolean().optional(),
      note: z.string().optional(),
      cancelReason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store" || !session.storeId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const targetRows = await db.select().from(reservations).where(eq(reservations.id, input.id)).limit(1);
      const target = targetRows[0];
      if (!target || target.storeId !== session.storeId) throw new TRPCError({ code: "NOT_FOUND" });
      assertReservationEditable(target.status);

      const menuRows = await db.select().from(menus).where(and(eq(menus.id, input.menuId), eq(menus.storeId, session.storeId))).limit(1);
      const menu = menuRows[0];
      if (!menu) throw new TRPCError({ code: "NOT_FOUND", message: "コースが見つかりません" });

      const nextTherapistId = input.therapistId === undefined ? target.therapistId : input.therapistId;
      let therapistName: string | null = null;
      if (nextTherapistId) {
        const therapistRows = await db.select({ id: therapists.id, displayName: therapists.displayName })
          .from(therapists)
          .innerJoin(therapistAccounts, eq(therapists.accountId, therapistAccounts.id))
          .where(and(
            eq(therapists.id, nextTherapistId),
            eq(therapists.storeId, session.storeId),
            eq(therapistAccounts.status, "active"),
          ))
          .limit(1);
        if (!therapistRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "担当セラピストが見つかりません" });
        therapistName = therapistRows[0].displayName;
      }

      const [h, m] = input.startTime.split(":").map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) throw new TRPCError({ code: "BAD_REQUEST", message: "開始時間が不正です" });
      const endMinutes = h * 60 + m + menu.durationMinutes;
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

      if (nextTherapistId) {
        await requireTherapistAvailableForReservation(db, {
          storeId: session.storeId,
          therapistId: nextTherapistId,
          date: input.date,
          startTime: input.startTime,
          endTime,
        });
      }
      await assertReservationConflicts(db, {
        reservationId: target.id,
        storeId: session.storeId,
        customerId: target.customerId,
        therapistId: nextTherapistId,
        date: input.date,
        startTime: input.startTime,
        endTime,
      });

      const isNomination = input.isNomination ?? Boolean(nextTherapistId);
      const nominationFee = isNomination && nextTherapistId ? menu.nominationFee : 0;
      const totalPrice = Math.max(0, menu.price + nominationFee + target.optionTotal - target.discountAmount);

      await db.update(reservations).set({
        menuId: input.menuId,
        therapistId: nextTherapistId,
        date: input.date,
        startTime: input.startTime,
        endTime,
        isNomination,
        nominationFee,
        totalPrice,
        note: input.note,
        cancelReason: input.cancelReason,
        updatedAt: new Date(),
      }).where(eq(reservations.id, target.id));

      await removeReservationSaleAndRecalculatePayroll(db, target.id, {
        storeId: target.storeId,
        therapistId: target.therapistId,
        date: target.date,
      });

      const changeBody = `${input.date} ${input.startTime}〜${endTime} / ${menu.name}${therapistName ? ` / ${therapistName}` : " / 指名無し"}`;
      await db.insert(notifications).values({
        recipientRole: "customer",
        recipientId: target.customerId,
        type: "reservation_updated",
        title: "予約内容が変更されました",
        body: changeBody,
        relatedId: target.id,
      });
      if (target.therapistId && target.therapistId !== nextTherapistId) {
        await db.insert(notifications).values({
          recipientRole: "therapist",
          recipientId: target.therapistId,
          type: "reservation_updated",
          title: "担当予約が変更されました",
          body: "この予約の担当から外れました",
          relatedId: target.id,
        });
      }
      if (nextTherapistId) {
        await db.insert(notifications).values({
          recipientRole: "therapist",
          recipientId: nextTherapistId,
          type: "reservation_updated",
          title: "予約内容が変更されました",
          body: changeBody,
          relatedId: target.id,
        });
      }

      return { success: true };
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
      const rows = await db.select({
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
      return session.demo ? rows.map(maskStoreDemoReservation) : rows;
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
      if (["completed", "cancelled", "no_show"].includes(target.status) && target.status !== input.status) {
        throw new TRPCError({ code: "CONFLICT", message: "完了済み、キャンセル済み、無断キャンセル済みの予約ステータスは変更できません" });
      }
      await db.update(reservations).set(data).where(eq(reservations.id, id));

      if (input.status === "completed") {
        await upsertSaleForCompletedReservation(db, id);
      }
      if (input.status === "cancelled" || input.status === "no_show") {
        await removeReservationSaleAndRecalculatePayroll(db, id, {
          storeId: target.storeId,
          therapistId: target.therapistId,
          date: target.date,
        });
        await db.insert(notifications).values({
          recipientRole: "customer",
          recipientId: target.customerId,
          type: input.status === "cancelled" ? "reservation_cancelled" : "reservation_no_show",
          title: input.status === "cancelled" ? "予約がキャンセルされました" : "予約が無断キャンセルになりました",
          body: input.cancelReason || input.note || `${target.date} ${target.startTime}〜${target.endTime}`,
          relatedId: id,
        });
        if (target.therapistId) {
          await db.insert(notifications).values({
            recipientRole: "therapist",
            recipientId: target.therapistId,
            type: input.status === "cancelled" ? "reservation_cancelled" : "reservation_no_show",
            title: input.status === "cancelled" ? "予約がキャンセルされました" : "予約が無断キャンセルになりました",
            body: input.cancelReason || input.note || `${target.date} ${target.startTime}〜${target.endTime}`,
            relatedId: id,
          });
        }
      }
      return { success: true };
    }),

  adjustFinancials: publicProcedure
    .input(z.object({
      id: z.number(),
      optionTotal: z.number().min(0),
      discountAmount: z.number().min(0).default(0),
      note: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "store" || !session.storeId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const targetRows = await db.select().from(reservations).where(eq(reservations.id, input.id)).limit(1);
      const target = targetRows[0];
      if (!target || target.storeId !== session.storeId) throw new TRPCError({ code: "NOT_FOUND" });
      if (["cancelled", "no_show"].includes(target.status)) {
        throw new TRPCError({ code: "CONFLICT", message: "キャンセル済みの予約は金額調整できません" });
      }

      const menuRows = target.menuId
        ? await db.select().from(menus).where(and(eq(menus.id, target.menuId), eq(menus.storeId, session.storeId))).limit(1)
        : [];
      const menuAmount = Number(menuRows[0]?.price ?? Math.max(0, target.totalPrice - target.nominationFee - target.optionTotal + target.discountAmount));
      const totalPrice = Math.max(0, menuAmount + target.nominationFee + input.optionTotal - input.discountAmount);

      await db.update(reservations).set({
        optionTotal: input.optionTotal,
        discountAmount: input.discountAmount,
        totalPrice,
        note: input.note ?? target.note,
        updatedAt: new Date(),
      }).where(eq(reservations.id, input.id));

      if (target.status === "completed") {
        await upsertSaleForCompletedReservation(db, input.id);
      }

      return { success: true, totalPrice };
    }),

  cancel: publicProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(ctx.req);
      if (!session || session.role !== "customer") throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(reservations).where(and(eq(reservations.id, input.id), eq(reservations.customerId, session.accountId))).limit(1);
      const target = rows[0];
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      assertReservationEditable(target.status);
      await db.update(reservations).set({ status: "cancelled", cancelReason: input.reason, updatedAt: new Date() }).where(eq(reservations.id, input.id));
      await removeReservationSaleAndRecalculatePayroll(db, input.id, {
        storeId: target.storeId,
        therapistId: target.therapistId,
        date: target.date,
      });
      await db.insert(notifications).values({
        recipientRole: "store",
        recipientId: target.storeId,
        type: "reservation_cancelled",
        title: "顧客が予約をキャンセルしました",
        body: input.reason || `${target.date} ${target.startTime}〜${target.endTime}`,
        relatedId: target.id,
      });
      if (target.therapistId) {
        await db.insert(notifications).values({
          recipientRole: "therapist",
          recipientId: target.therapistId,
          type: "reservation_cancelled",
          title: "予約がキャンセルされました",
          body: input.reason || `${target.date} ${target.startTime}〜${target.endTime}`,
          relatedId: target.id,
        });
      }
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
