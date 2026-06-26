import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");
const rotatePasswords = process.argv.includes("--rotate-passwords");
const baseUrl = (process.env.AROMANET_PUBLIC_URL || "https://aromanet.club").replace(/\/+$/, "");

const accounts = {
  store: {
    email: process.env.AROMANET_SHOWCASE_STORE_EMAIL || "showcase-store@aromanet.club",
    name: "AromaNet Showcase 銀座",
  },
  therapist: {
    email: process.env.AROMANET_SHOWCASE_THERAPIST_EMAIL || "showcase-therapist@aromanet.club",
    name: "美咲",
  },
  customer: {
    email: process.env.AROMANET_SHOWCASE_CUSTOMER_EMAIL || "showcase-customer@aromanet.club",
    name: "佐藤",
  },
};

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function connectionOptions(databaseUrl) {
  const url = new URL(databaseUrl);
  const needsSsl = url.hostname.includes("tidbcloud.com") || process.env.DB_SSL === "true";
  return needsSsl
    ? { uri: databaseUrl, ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } }
    : databaseUrl;
}

function datePlusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthParts(date = new Date()) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    monthKey: date.toISOString().slice(0, 7),
  };
}

function svgDataUrl(title, colorA, colorB) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${colorA}"/>
          <stop offset="1" stop-color="${colorB}"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#g)"/>
      <circle cx="930" cy="170" r="170" fill="rgba(255,255,255,.18)"/>
      <circle cx="230" cy="760" r="230" fill="rgba(255,255,255,.12)"/>
      <text x="90" y="500" font-family="Georgia, serif" font-size="76" fill="#fff">${title}</text>
      <text x="96" y="570" font-family="Arial, sans-serif" font-size="28" fill="rgba(255,255,255,.78)">AromaNet showcase</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

function showcasePostVisualDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#005f5b"/>
          <stop offset="0.58" stop-color="#7fbab0"/>
          <stop offset="1" stop-color="#eadcae"/>
        </linearGradient>
        <radialGradient id="light" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="rgba(255,255,255,.42)"/>
          <stop offset="1" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>
      <rect width="1080" height="1080" fill="url(#bg)"/>
      <circle cx="850" cy="210" r="220" fill="url(#light)"/>
      <circle cx="150" cy="860" r="250" fill="rgba(255,255,255,.14)"/>
      <circle cx="890" cy="880" r="150" fill="rgba(0,80,76,.16)"/>
      <path d="M210 270 C390 178, 690 178, 870 270" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="3"/>
      <text x="540" y="445" text-anchor="middle" font-family="Georgia, serif" font-size="74" fill="#fff" letter-spacing="6">AromaNet</text>
      <text x="540" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="rgba(255,255,255,.82)" letter-spacing="4">SHOWCASE</text>
      <text x="540" y="770" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#fff">ON SHIFT</text>
      <text x="540" y="828" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="rgba(255,255,255,.78)">available from open slots</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

function showcaseStoryVisualDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#005f5b"/>
          <stop offset="0.58" stop-color="#7fbab0"/>
          <stop offset="1" stop-color="#eadcae"/>
        </linearGradient>
        <radialGradient id="light" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="rgba(255,255,255,.42)"/>
          <stop offset="1" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#bg)"/>
      <circle cx="880" cy="250" r="260" fill="url(#light)"/>
      <circle cx="150" cy="1380" r="360" fill="rgba(255,255,255,.14)"/>
      <circle cx="920" cy="1500" r="210" fill="rgba(0,80,76,.16)"/>
      <path d="M150 560 C390 430, 690 430, 930 560" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="4"/>
      <text x="540" y="820" text-anchor="middle" font-family="Georgia, serif" font-size="88" fill="#fff" letter-spacing="7">AromaNet</text>
      <text x="540" y="910" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="rgba(255,255,255,.82)" letter-spacing="5">SHOWCASE</text>
      <text x="540" y="1300" text-anchor="middle" font-family="Arial, sans-serif" font-size="68" font-weight="700" fill="#fff">ON SHIFT</text>
      <text x="540" y="1375" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="rgba(255,255,255,.78)">available from open slots</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

const assets = {
  storeCover: svgDataUrl("GINZA LUMINA", "#005f5b", "#d6b46c"),
  storeLogo: svgDataUrl("A", "#004f4b", "#86d7ce"),
  therapistProfile: svgDataUrl("Misaki", "#006861", "#f3c978"),
  therapistCover: svgDataUrl("Therapist", "#1f5d59", "#d7b66a"),
  postImage: showcasePostVisualDataUrl(),
  storyImage: showcaseStoryVisualDataUrl(),
};

function getPassword() {
  const password = process.env.AROMANET_SHOWCASE_PASSWORD;
  if (password && password.length < 12) throw new Error("AROMANET_SHOWCASE_PASSWORD must be at least 12 characters");
  return password || crypto.randomBytes(18).toString("base64url");
}

async function query(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows;
}

async function getOne(conn, sql, params = []) {
  const rows = await query(conn, sql, params);
  return rows[0] ?? null;
}

async function execute(conn, sql, params = []) {
  const [result] = await conn.execute(sql, params);
  return result;
}

async function ensureAccount(conn, table, email, passwordHash, verifiedFields) {
  const existing = await getOne(conn, `select id from ${table} where email = ? limit 1`, [email]);
  if (existing) {
    if (rotatePasswords) {
      await execute(conn, `update ${table} set passwordHash = ?, crashPasswordHash = null, status = 'active', ${verifiedFields} where id = ?`, [passwordHash, existing.id]);
    } else {
      await execute(conn, `update ${table} set crashPasswordHash = null, status = 'active', ${verifiedFields} where id = ?`, [existing.id]);
    }
    return existing.id;
  }
  const [fields, placeholders, values] = table === "store_accounts"
    ? ["email, passwordHash, status, identityVerified, identityVerifiedAt", "?, ?, 'active', 1, ?", [email, passwordHash, new Date()]]
    : table === "therapist_accounts"
      ? ["email, passwordHash, status, identityVerified, identityVerifiedAt, ageVerified", "?, ?, 'active', 1, ?, 1", [email, passwordHash, new Date()]]
      : ["email, passwordHash, status, ageVerified, ageVerifiedAt", "?, ?, 'active', 1, ?", [email, passwordHash, new Date()]];
  const [result] = await conn.execute(`insert into ${table} (${fields}) values (${placeholders})`, values);
  return result.insertId;
}

async function ensureStore(conn, accountId) {
  const existing = await getOne(conn, "select id from stores where accountId = ? limit 1", [accountId]);
  const values = [
    accounts.store.name,
    "銀座エリアの上質なサロン体験を想定したAromaNetデモ店舗です。予約、出勤、メッセージ、給与管理まで一連の流れを確認できます。",
    "東京都中央区銀座1-1-1",
    "東京都",
    "中央区",
    "03-0000-0000",
    "銀座駅徒歩3分",
    "11:00",
    "23:00",
    "不定休",
    assets.storeCover,
    assets.storeLogo,
    "予約時間の5分前を目安にお越しください。",
    "体調不良時は来店をお控えください。無断キャンセルは次回予約を制限する場合があります。",
  ];
  if (existing) {
    await execute(
      conn,
      `update stores set
        name = ?, description = ?, address = ?, prefecture = ?, city = ?, phone = ?, access = ?,
        openHours = ?, closeHours = ?, regularHoliday = ?, coverImageUrl = ?, logoUrl = ?,
        termsOfService = ?, cautionNote = ?, isPublic = 1, reviewAvg = '4.80', reviewCount = 12
       where id = ?`,
      [...values, existing.id],
    );
    return existing.id;
  }
  const result = await execute(
    conn,
    `insert into stores
      (accountId, name, description, address, prefecture, city, phone, access, openHours, closeHours, regularHoliday, coverImageUrl, logoUrl, termsOfService, cautionNote, isPublic, reviewAvg, reviewCount)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, '4.80', 12)`,
    [accountId, ...values],
  );
  return result.insertId;
}

async function ensureTherapist(conn, accountId, storeId) {
  const existing = await getOne(conn, "select id from therapists where accountId = ? limit 1", [accountId]);
  const values = [
    accounts.therapist.name,
    26,
    160,
    "丁寧なカウンセリングと落ち着いた接客が得意です。初めての方にも分かりやすくご案内します。",
    "リンパケア、肩まわり、リラックス",
    "本日ご案内できます",
    "AromaNetのデモ配信用プロフィールです。投稿、ストーリー、予約、メッセージ、売上確認の流れを確認できます。",
    "ナチュラル",
    assets.therapistProfile,
    assets.therapistCover,
  ];
  if (existing) {
    await execute(
      conn,
      `update therapists set
        displayName = ?, age = ?, height = ?, bio = ?, specialties = ?, catchphrase = ?,
        selfIntroduction = ?, bodyType = ?, profileImageUrl = ?, coverImageUrl = ?,
        storeId = ?, isPublic = 1, affiliationStatus = 'approved',
        followerCount = 128, nominationCount = 32, reviewAvg = '4.90', reviewCount = 18, backRate = '60.00'
       where id = ?`,
      [...values, storeId, existing.id],
    );
    return existing.id;
  }
  const result = await execute(
    conn,
    `insert into therapists
      (accountId, displayName, age, height, bio, specialties, catchphrase, selfIntroduction, bodyType, profileImageUrl, coverImageUrl, storeId, isPublic, affiliationStatus, followerCount, nominationCount, reviewAvg, reviewCount, backRate)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'approved', 128, 32, '4.90', 18, '60.00')`,
    [accountId, ...values, storeId],
  );
  return result.insertId;
}

async function ensureCustomer(conn, accountId) {
  const existing = await getOne(conn, "select id from customer_profiles where accountId = ? limit 1", [accountId]);
  const values = [accounts.customer.name, "さとう", "09000000000", 82000, 3, 820];
  if (existing) {
    await execute(
      conn,
      "update customer_profiles set displayName = ?, nickname = ?, phone = ?, totalSpent = ?, memberLevel = ?, memberPoints = ? where id = ?",
      [...values, existing.id],
    );
    return;
  }
  await execute(
    conn,
    "insert into customer_profiles (accountId, displayName, nickname, phone, totalSpent, memberLevel, memberPoints) values (?, ?, ?, ?, ?, ?, ?)",
    [accountId, ...values],
  );
}

async function ensureMenu(conn, storeId, name, durationMinutes, price, nominationFee, sortOrder) {
  const existing = await getOne(conn, "select id from menus where storeId = ? and name = ? limit 1", [storeId, name]);
  if (existing) {
    await execute(
      conn,
      "update menus set description = ?, durationMinutes = ?, price = ?, nominationFee = ?, isPublic = 1, sortOrder = ? where id = ?",
      ["デモ配信用コース", durationMinutes, price, nominationFee, sortOrder, existing.id],
    );
    return existing.id;
  }
  const result = await execute(
    conn,
    "insert into menus (storeId, name, description, durationMinutes, price, nominationFee, isPublic, sortOrder) values (?, ?, ?, ?, ?, ?, 1, ?)",
    [storeId, name, "デモ配信用コース", durationMinutes, price, nominationFee, sortOrder],
  );
  return result.insertId;
}

async function ensureOption(conn, storeId, name, price, sortOrder) {
  const existing = await getOne(conn, "select id from menu_options where storeId = ? and name = ? limit 1", [storeId, name]);
  if (existing) {
    await execute(conn, "update menu_options set price = ?, isPublic = 1, sortOrder = ? where id = ?", [price, sortOrder, existing.id]);
    return existing.id;
  }
  const result = await execute(
    conn,
    "insert into menu_options (storeId, name, price, isPublic, sortOrder) values (?, ?, ?, 1, ?)",
    [storeId, name, price, sortOrder],
  );
  return result.insertId;
}

async function ensureShift(conn, therapistId, storeId, date, startTime, endTime) {
  const existing = await getOne(conn, "select id from shifts where therapistId = ? and date = ? and startTime = ? limit 1", [therapistId, date, startTime]);
  if (existing) {
    await execute(
      conn,
      "update shifts set storeId = ?, endTime = ?, status = 'scheduled', approvalStatus = 'approved', reviewedAt = ?, reviewedByStoreId = ?, note = ? where id = ?",
      [storeId, endTime, new Date(), storeId, "デモ用承認済みシフト", existing.id],
    );
    return existing.id;
  }
  const result = await execute(
    conn,
    "insert into shifts (therapistId, storeId, date, startTime, endTime, status, approvalStatus, reviewedAt, reviewedByStoreId, note) values (?, ?, ?, ?, ?, 'scheduled', 'approved', ?, ?, ?)",
    [therapistId, storeId, date, startTime, endTime, new Date(), storeId, "デモ用承認済みシフト"],
  );
  return result.insertId;
}

async function ensureReservation(conn, storeId, therapistId, customerId, menuId, date, startTime, endTime, status, totalPrice) {
  const existing = await getOne(
    conn,
    "select id from reservations where storeId = ? and therapistId = ? and customerId = ? and date = ? and startTime = ? limit 1",
    [storeId, therapistId, customerId, date, startTime],
  );
  const values = [menuId, endTime, status, 1, totalPrice, 2000, "デモ予約メモ", "事前質問あり"];
  if (existing) {
    await execute(
      conn,
      "update reservations set menuId = ?, endTime = ?, status = ?, isNomination = ?, totalPrice = ?, nominationFee = ?, note = ?, customerNote = ? where id = ?",
      [...values, existing.id],
    );
    return existing.id;
  }
  const result = await execute(
    conn,
    `insert into reservations
      (storeId, therapistId, customerId, menuId, date, startTime, endTime, status, isNomination, totalPrice, nominationFee, note, customerNote)
     values (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 2000, ?, ?)`,
    [storeId, therapistId, customerId, menuId, date, startTime, endTime, status, totalPrice, "デモ予約メモ", "事前質問あり"],
  );
  return result.insertId;
}

async function ensureSaleAndPayroll(conn, reservationId, storeId, therapistId, date, totalAmount) {
  const therapistBack = Math.round(totalAmount * 0.6);
  const existingSale = await getOne(conn, "select id from sales where reservationId = ? limit 1", [reservationId]);
  if (existingSale) {
    await execute(
      conn,
      "update sales set storeId = ?, therapistId = ?, date = ?, menuAmount = ?, nominationFee = 2000, totalAmount = ?, therapistBack = ? where id = ?",
      [storeId, therapistId, date, totalAmount - 2000, totalAmount, therapistBack, existingSale.id],
    );
  } else {
    await execute(
      conn,
      "insert into sales (reservationId, storeId, therapistId, date, menuAmount, nominationFee, totalAmount, therapistBack) values (?, ?, ?, ?, ?, 2000, ?, ?)",
      [reservationId, storeId, therapistId, date, totalAmount - 2000, totalAmount, therapistBack],
    );
  }
  const { year, month } = monthParts(new Date(`${date}T00:00:00`));
  const existingPayroll = await getOne(conn, "select id from therapist_payrolls where therapistId = ? and storeId = ? and year = ? and month = ? limit 1", [therapistId, storeId, year, month]);
  if (existingPayroll) {
    await execute(
      conn,
      "update therapist_payrolls set nominationCount = 1, totalSales = ?, backRate = '60.00', backAmount = ?, adjustmentAmount = 2000, adjustmentNote = ?, totalPayroll = ?, isPaid = 0 where id = ?",
      [totalAmount, therapistBack, "デモ女子給調整", therapistBack + 2000, existingPayroll.id],
    );
    return;
  }
  await execute(
    conn,
    "insert into therapist_payrolls (therapistId, storeId, year, month, nominationCount, totalSales, backRate, backAmount, adjustmentAmount, adjustmentNote, totalPayroll, isPaid) values (?, ?, ?, ?, 1, ?, '60.00', ?, 2000, ?, ?, 0)",
    [therapistId, storeId, year, month, totalAmount, therapistBack, "デモ女子給調整", therapistBack + 2000],
  );
}

async function ensureThread(conn, threadType, storeId, therapistId, customerId, reservationId) {
  const existing = await getOne(
    conn,
    "select id from message_threads where threadType = ? and ifnull(storeId, 0) = ifnull(?, 0) and ifnull(therapistId, 0) = ifnull(?, 0) and ifnull(customerId, 0) = ifnull(?, 0) limit 1",
    [threadType, storeId, therapistId, customerId],
  );
  if (existing) {
    await execute(
      conn,
      "update message_threads set reservationId = ?, lastMessageAt = ?, storeUnread = 1, therapistUnread = 0, customerUnread = 1 where id = ?",
      [reservationId, new Date(), existing.id],
    );
    return existing.id;
  }
  const result = await execute(
    conn,
    "insert into message_threads (threadType, storeId, therapistId, customerId, reservationId, lastMessageAt, storeUnread, therapistUnread, customerUnread) values (?, ?, ?, ?, ?, ?, 1, 0, 1)",
    [threadType, storeId, therapistId, customerId, reservationId, new Date()],
  );
  return result.insertId;
}

async function ensureMessage(conn, threadId, senderRole, senderId, content) {
  const existing = await getOne(conn, "select id from messages where threadId = ? and senderRole = ? and senderId = ? and content = ? limit 1", [threadId, senderRole, senderId, content]);
  if (existing) return existing.id;
  const result = await execute(
    conn,
    "insert into messages (threadId, senderRole, senderId, content, isRead) values (?, ?, ?, ?, 0)",
    [threadId, senderRole, senderId, content],
  );
  return result.insertId;
}

async function ensurePost(conn, therapistId, storeId) {
  const content = "本日出勤しています。空き枠からそのまま予約できます。";
  const existing = await getOne(conn, "select id from posts where therapistId = ? and content = ? limit 1", [therapistId, content]);
  let postId;
  if (existing) {
    postId = existing.id;
    await execute(conn, "update posts set authorRole = 'therapist', storeId = ?, postType = 'attendance', isPublic = 1 where id = ?", [storeId, postId]);
  } else {
    const result = await execute(
      conn,
      "insert into posts (authorRole, storeId, therapistId, postType, content, isPublic, likeCount) values ('therapist', ?, ?, 'attendance', ?, 1, 24)",
      [storeId, therapistId, content],
    );
    postId = result.insertId;
  }
  await execute(conn, "delete from post_images where postId = ?", [postId]);
  await execute(conn, "insert into post_images (postId, imageUrl, sortOrder) values (?, ?, 0)", [postId, assets.postImage]);
  return postId;
}

async function ensureStory(conn, therapistId) {
  await execute(conn, "delete from story_posts where therapistId = ? and caption = ?", [therapistId, "本日出勤"]);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const result = await execute(
    conn,
    "insert into story_posts (therapistId, authorRole, mediaUrl, mediaType, caption, expiresAt) values (?, 'therapist', ?, 'image', ?, ?)",
    [therapistId, assets.storyImage, "本日出勤", expiresAt],
  );
  return result.insertId;
}

async function main() {
  if (!apply) {
    console.log(JSON.stringify({
      mode: "dry-run",
      accounts,
      urls: {
        entry: `${baseUrl}/roles`,
        storeLogin: `${baseUrl}/store/login`,
        therapistLogin: `${baseUrl}/therapist/login`,
        customerLogin: `${baseUrl}/customer/login`,
      },
      note: "Pass --apply to create or update the showcase data. DATABASE_URL is only required when applying.",
    }, null, 2));
    return;
  }

  const password = getPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const conn = await mysql.createConnection(connectionOptions(required("DATABASE_URL")));
  const today = datePlusDays(0);
  const tomorrow = datePlusDays(1);
  const yesterday = datePlusDays(-1);

  try {
    await execute(conn, "ALTER TABLE favorites MODIFY COLUMN targetType enum('store','therapist','post') NOT NULL");
    await execute(conn, "ALTER TABLE customer_accounts ADD COLUMN phoneVerified boolean NOT NULL DEFAULT false").catch(() => {});
    await execute(conn, "ALTER TABLE customer_accounts ADD COLUMN phoneVerifiedAt timestamp NULL").catch(() => {});
    await conn.beginTransaction();

    const storeAccountId = await ensureAccount(conn, "store_accounts", accounts.store.email, passwordHash, "identityVerified = 1, identityVerifiedAt = current_timestamp()");
    const therapistAccountId = await ensureAccount(conn, "therapist_accounts", accounts.therapist.email, passwordHash, "identityVerified = 1, identityVerifiedAt = current_timestamp(), ageVerified = 1");
    const customerAccountId = await ensureAccount(conn, "customer_accounts", accounts.customer.email, passwordHash, "ageVerified = 1, ageVerifiedAt = current_timestamp(), phoneVerified = 1, phoneVerifiedAt = current_timestamp()");

    const storeId = await ensureStore(conn, storeAccountId);
    const therapistId = await ensureTherapist(conn, therapistAccountId, storeId);
    await ensureCustomer(conn, customerAccountId);

    const menu60Id = await ensureMenu(conn, storeId, "スタンダード 60分", 60, 10000, 2000, 1);
    const menu90Id = await ensureMenu(conn, storeId, "リラックス 90分", 90, 15000, 2000, 2);
    await ensureOption(conn, storeId, "延長 30分", 5000, 1);
    await ensureOption(conn, storeId, "アロマオイル変更", 1000, 2);

    await ensureShift(conn, therapistId, storeId, today, "11:00", "20:00");
    await ensureShift(conn, therapistId, storeId, tomorrow, "12:00", "21:00");

    const pendingReservationId = await ensureReservation(conn, storeId, therapistId, customerAccountId, menu60Id, tomorrow, "14:00", "15:00", "pending", 12000);
    const confirmedReservationId = await ensureReservation(conn, storeId, therapistId, customerAccountId, menu90Id, today, "18:00", "19:30", "confirmed", 17000);
    const completedReservationId = await ensureReservation(conn, storeId, therapistId, customerAccountId, menu60Id, yesterday, "16:00", "17:00", "completed", 12000);
    await ensureSaleAndPayroll(conn, completedReservationId, storeId, therapistId, yesterday, 12000);

    const therapistThreadId = await ensureThread(conn, "therapist_customer", storeId, therapistId, customerAccountId, pendingReservationId);
    await ensureMessage(conn, therapistThreadId, "customer", customerAccountId, "明日の予約について質問です。");
    await ensureMessage(conn, therapistThreadId, "therapist", therapistId, "ありがとうございます。ご来店前に気になる点があればお知らせください。");

    const storeThreadId = await ensureThread(conn, "store_customer", storeId, null, customerAccountId, pendingReservationId);
    await ensureMessage(conn, storeThreadId, "store", storeId, "ご予約ありがとうございます。確認後に確定連絡をお送りします。");

    await execute(
      conn,
      "insert ignore into follows (customerId, targetType, targetId) values (?, 'store', ?), (?, 'therapist', ?)",
      [customerAccountId, storeId, customerAccountId, therapistId],
    );
    await execute(
      conn,
      "insert ignore into favorites (customerId, targetType, targetId) values (?, 'store', ?), (?, 'therapist', ?)",
      [customerAccountId, storeId, customerAccountId, therapistId],
    );
    const existingMemo = await getOne(conn, "select id from customer_memos where therapistId = ? and customerId = ? limit 1", [therapistId, customerAccountId]);
    if (existingMemo) {
      await execute(conn, "update customer_memos set preferences = ?, caution = ?, lastVisitNote = ?, repeatStatus = ?, shareWithStore = 1 where id = ?", ["静かな案内を希望", "初回は説明を丁寧に", "前回は肩まわり中心", "repeat", existingMemo.id]);
    } else {
      await execute(conn, "insert into customer_memos (therapistId, customerId, preferences, caution, lastVisitNote, repeatStatus, shareWithStore) values (?, ?, ?, ?, ?, ?, 1)", [therapistId, customerAccountId, "静かな案内を希望", "初回は説明を丁寧に", "前回は肩まわり中心", "repeat"]);
    }

    const postId = await ensurePost(conn, therapistId, storeId);
    await ensureStory(conn, therapistId);
    await execute(
      conn,
      "insert ignore into favorites (customerId, targetType, targetId) values (?, 'post', ?)",
      [customerAccountId, postId],
    );

    const existingReview = await getOne(conn, "select id from reviews where reservationId = ? limit 1", [completedReservationId]);
    if (existingReview) {
      await execute(conn, "update reviews set rating = 5, comment = ?, storeReply = ?, isHidden = 0 where id = ?", ["落ち着いた雰囲気で使いやすかったです。", "ご利用ありがとうございます。またのご予約をお待ちしています。", existingReview.id]);
    } else {
      await execute(
        conn,
        "insert into reviews (reservationId, customerId, storeId, therapistId, rating, comment, storeReply, isHidden) values (?, ?, ?, ?, 5, ?, ?, 0)",
        [completedReservationId, customerAccountId, storeId, therapistId, "落ち着いた雰囲気で使いやすかったです。", "ご利用ありがとうございます。またのご予約をお待ちしています。"],
      );
    }

    await conn.commit();

    console.log(JSON.stringify({
      mode: "applied",
      accounts: {
        store: { email: accounts.store.email, password },
        therapist: { email: accounts.therapist.email, password },
        customer: { email: accounts.customer.email, password },
      },
      ids: {
        storeAccountId,
        therapistAccountId,
        customerAccountId,
        storeId,
        therapistId,
        menu60Id,
        menu90Id,
        pendingReservationId,
        confirmedReservationId,
        completedReservationId,
        postId,
      },
      urls: {
        entry: `${baseUrl}/roles`,
        storeLogin: `${baseUrl}/store/login`,
        storeDashboard: `${baseUrl}/store/dashboard`,
        therapistLogin: `${baseUrl}/therapist/login`,
        therapistDashboard: `${baseUrl}/therapist/dashboard`,
        customerLogin: `${baseUrl}/customer/login`,
        customerHome: `${baseUrl}/home`,
        search: `${baseUrl}/search`,
      },
      note: process.env.AROMANET_SHOWCASE_PASSWORD
        ? "Showcase data is ready. The configured password was applied."
        : "Showcase data is ready. Save the generated password shown above.",
    }, null, 2));
  } catch (error) {
    if (apply) await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
