import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import bcrypt from "bcryptjs";
import {
  storeAccounts, therapistAccounts, customerAccounts,
  stores, therapists, customerProfiles, menus, menuOptions,
  coupons, shifts, reservations, reviews, posts, postImages,
  sales, customerLevels,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const seedRouter = router({
  // Seed mock data (only in dev or if DB is empty)
  seedAll: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Check if already seeded
    const existingStores = await db.select().from(storeAccounts).limit(1);
    if (existingStores.length > 0) return { success: true, message: "Already seeded" };

    const hash = await bcrypt.hash("password123", 12);
    const crashHash = await bcrypt.hash("crash123", 12);

    // Seed customer levels
    const levels = [
      { level: 1, name: "ブロンズ", minAmount: 0, badgeColor: "#CD7F32", benefits: "基本サービス" },
      { level: 2, name: "シルバー", minAmount: 30000, badgeColor: "#C0C0C0", benefits: "5%割引" },
      { level: 3, name: "ゴールド", minAmount: 80000, badgeColor: "#FFD700", benefits: "10%割引 + 優先予約" },
      { level: 4, name: "プラチナ", minAmount: 150000, badgeColor: "#E5E4E2", benefits: "15%割引 + 専属担当" },
      { level: 5, name: "ダイヤモンド", minAmount: 300000, badgeColor: "#B9F2FF", benefits: "20%割引 + VIPルーム" },
      { level: 6, name: "ブラック", minAmount: 500000, badgeColor: "#1a1a1a", benefits: "25%割引 + 送迎サービス" },
      { level: 7, name: "ロイヤル", minAmount: 800000, badgeColor: "#8B0000", benefits: "30%割引 + プライベートルーム" },
      { level: 8, name: "エメラルド", minAmount: 1200000, badgeColor: "#50C878", benefits: "35%割引 + 専属セラピスト" },
      { level: 9, name: "サファイア", minAmount: 2000000, badgeColor: "#0F52BA", benefits: "40%割引 + 全特典" },
      { level: 10, name: "レジェンド", minAmount: 5000000, badgeColor: "#9400D3", benefits: "50%割引 + 全特典 + 特別待遇" },
    ];
    for (const l of levels) {
      await db.insert(customerLevels).values(l).onDuplicateKeyUpdate({ set: l });
    }

    // Store 1
    const storeAccResult = await db.insert(storeAccounts).values({ email: "store1@example.com", passwordHash: hash, crashPasswordHash: crashHash });
    const storeAccId = (storeAccResult as any).insertId as number;
    const storeResult = await db.insert(stores).values({
      accountId: storeAccId,
      name: "アロマサロン LUXE",
      description: "高級感あふれる完全個室のメンズエステサロンです。熟練のセラピストが心身ともにリフレッシュさせます。",
      address: "東京都渋谷区道玄坂1-2-3 LUXEビル5F",
      prefecture: "東京都",
      city: "渋谷区",
      phone: "03-1234-5678",
      access: "渋谷駅徒歩5分",
      openHours: "11:00",
      closeHours: "23:00",
      regularHoliday: "不定休",
      isPublic: true,
      reviewAvg: "4.80",
      reviewCount: 42,
    });
    const storeId = (storeResult as any).insertId as number;

    // Store 2
    const storeAccResult2 = await db.insert(storeAccounts).values({ email: "store2@example.com", passwordHash: hash });
    const storeAccId2 = (storeAccResult2 as any).insertId as number;
    const storeResult2 = await db.insert(stores).values({
      accountId: storeAccId2,
      name: "プレミアムエステ BLANC",
      description: "白を基調とした清潔感あるサロン。初めての方も安心してご利用いただけます。",
      address: "東京都新宿区歌舞伎町2-3-4 BLANCビル3F",
      prefecture: "東京都",
      city: "新宿区",
      phone: "03-9876-5432",
      access: "新宿駅東口徒歩7分",
      openHours: "12:00",
      closeHours: "24:00",
      regularHoliday: "月曜定休",
      isPublic: true,
      reviewAvg: "4.60",
      reviewCount: 28,
    });
    const storeId2 = (storeResult2 as any).insertId as number;

    // Therapist 1
    const tAccResult = await db.insert(therapistAccounts).values({ email: "therapist1@example.com", passwordHash: hash, crashPasswordHash: crashHash });
    const tAccId = (tAccResult as any).insertId as number;
    const tResult = await db.insert(therapists).values({
      accountId: tAccId,
      storeId,
      displayName: "さくら",
      age: 24,
      height: 160,
      bio: "丁寧なケアで心身ともにリフレッシュさせます。リラクゼーションが得意です。",
      specialties: "アロマオイルマッサージ, ヘッドスパ",
      isPublic: true,
      affiliationStatus: "approved",
      nominationCount: 156,
      reviewAvg: "4.90",
      reviewCount: 38,
      backRate: "55.00",
    });
    const therapistId = (tResult as any).insertId as number;

    // Therapist 2
    const tAccResult2 = await db.insert(therapistAccounts).values({ email: "therapist2@example.com", passwordHash: hash });
    const tAccId2 = (tAccResult2 as any).insertId as number;
    const tResult2 = await db.insert(therapists).values({
      accountId: tAccId2,
      storeId,
      displayName: "みゆき",
      age: 26,
      height: 163,
      bio: "お客様の疲れを癒すことが私の喜びです。ゆったりとした施術が好評です。",
      specialties: "ボディケア, フットリフレクソロジー",
      isPublic: true,
      affiliationStatus: "approved",
      nominationCount: 89,
      reviewAvg: "4.70",
      reviewCount: 22,
      backRate: "50.00",
    });
    const therapistId2 = (tResult2 as any).insertId as number;

    // Therapist 3 (store 2)
    const tAccResult3 = await db.insert(therapistAccounts).values({ email: "therapist3@example.com", passwordHash: hash });
    const tAccId3 = (tAccResult3 as any).insertId as number;
    await db.insert(therapists).values({
      accountId: tAccId3,
      storeId: storeId2,
      displayName: "あかね",
      age: 22,
      height: 158,
      bio: "笑顔でお迎えします。初めての方でも安心してお任せください。",
      specialties: "スウェーディッシュマッサージ",
      isPublic: true,
      affiliationStatus: "approved",
      nominationCount: 45,
      reviewAvg: "4.50",
      reviewCount: 15,
      backRate: "50.00",
    });

    // Menus for store 1
    const menuResult = await db.insert(menus).values({ storeId, name: "60分コース", description: "全身アロマオイルマッサージ", durationMinutes: 60, price: 8000, nominationFee: 1000, isPublic: true });
    const menuId = (menuResult as any).insertId as number;
    const menuResult2 = await db.insert(menus).values({ storeId, name: "90分コース", description: "全身アロマ + ヘッドスパ", durationMinutes: 90, price: 12000, nominationFee: 1500, isPublic: true });
    const menuId2 = (menuResult2 as any).insertId as number;
    await db.insert(menus).values({ storeId, name: "120分プレミアムコース", description: "全身アロマ + ヘッドスパ + フット", durationMinutes: 120, price: 16000, nominationFee: 2000, isPublic: true });

    // Menu options
    await db.insert(menuOptions).values({ storeId, name: "アロマオイルアップグレード", price: 500 });
    await db.insert(menuOptions).values({ storeId, name: "ホットストーン", price: 1000 });
    await db.insert(menuOptions).values({ storeId, name: "フットバス", price: 500 });

    // Coupons
    await db.insert(coupons).values({ storeId, code: "FIRST10", name: "初回10%OFF", discountType: "percent", discountValue: 10, isPublic: true });
    await db.insert(coupons).values({ storeId, code: "SUMMER500", name: "夏季500円OFF", discountType: "fixed", discountValue: 500, minAmount: 8000, isPublic: true });

    // Customer 1
    const cAccResult = await db.insert(customerAccounts).values({ email: "customer1@example.com", passwordHash: hash, crashPasswordHash: crashHash, ageVerified: true });
    const cAccId = (cAccResult as any).insertId as number;
    await db.insert(customerProfiles).values({ accountId: cAccId, displayName: "田中 太郎", nickname: "タナカ", totalSpent: 85000, memberLevel: 3 });

    // Customer 2
    const cAccResult2 = await db.insert(customerAccounts).values({ email: "customer2@example.com", passwordHash: hash, ageVerified: true });
    const cAccId2 = (cAccResult2 as any).insertId as number;
    await db.insert(customerProfiles).values({ accountId: cAccId2, displayName: "鈴木 一郎", nickname: "スズキ", totalSpent: 320000, memberLevel: 5 });

    // Shifts
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      await db.insert(shifts).values({ therapistId, storeId, date: dateStr, startTime: "11:00", endTime: "21:00", status: "scheduled" });
      if (i < 5) {
        await db.insert(shifts).values({ therapistId: therapistId2, storeId, date: dateStr, startTime: "12:00", endTime: "22:00", status: "scheduled" });
      }
    }

    // Reservations
    const todayStr = today.toISOString().split("T")[0];
    const res1Result = await db.insert(reservations).values({
      storeId, therapistId, customerId: cAccId, menuId,
      date: todayStr, startTime: "14:00", endTime: "15:00",
      isNomination: true, nominationFee: 1000, totalPrice: 9000,
      status: "confirmed",
    });
    const res1Id = (res1Result as any).insertId as number;

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const res2Result = await db.insert(reservations).values({
      storeId, therapistId, customerId: cAccId2, menuId: menuId2,
      date: yesterdayStr, startTime: "16:00", endTime: "17:30",
      isNomination: true, nominationFee: 1500, totalPrice: 13500,
      status: "completed",
    });
    const res2Id = (res2Result as any).insertId as number;

    // Sales
    await db.insert(sales).values({
      reservationId: res2Id, storeId, therapistId,
      date: yesterdayStr, menuAmount: 12000, nominationFee: 1500,
      totalAmount: 13500, therapistBack: 7425,
    });

    // Reviews
    await db.insert(reviews).values({
      reservationId: res2Id, customerId: cAccId2, storeId, therapistId,
      rating: 5, comment: "みゆきさんの施術は最高でした！また必ず来ます。",
    });

    // Posts
    const postResult = await db.insert(posts).values({
      authorRole: "therapist", therapistId, storeId,
      postType: "attendance",
      content: "本日も出勤しています！14時から空きがあります。お気軽にご予約ください🌸",
      isPublic: true,
    });
    const postId = (postResult as any).insertId as number;

    await db.insert(posts).values({
      authorRole: "store", storeId,
      postType: "campaign",
      content: "【夏季キャンペーン開催中】7月末まで全コース10%OFF！クーポンコード「SUMMER500」をご利用ください。",
      isPublic: true,
    });

    return { success: true, message: "Seeded successfully" };
  }),
});
