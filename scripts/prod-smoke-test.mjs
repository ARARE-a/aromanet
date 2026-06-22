import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import superjson from "superjson";

const DEFAULT_BASE_URL = "https://aromanet.club";
const baseUrl = (process.env.AROMANET_SMOKE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
const stamp = Date.now();
const password = `SmokePass${stamp}!`;
const month = new Date().toISOString().slice(0, 7);
const year = Number(month.slice(0, 4));
const monthNum = Number(month.slice(5, 7));

function isoDatePlusDays(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const targetDate = isoDatePlusDays(3);

function readSetCookies(headers) {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}

function mergeCookies(current, setCookies) {
  const jar = new Map();
  for (const part of current.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf("=");
    if (idx > 0) jar.set(trimmed.slice(0, idx), trimmed.slice(idx + 1));
  }
  for (const setCookie of setCookies) {
    const first = setCookie.split(";")[0]?.trim();
    const idx = first?.indexOf("=") ?? -1;
    if (idx > 0) jar.set(first.slice(0, idx), first.slice(idx + 1));
  }
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

function makeClient(label) {
  let cookie = "";
  const client = createTRPCProxyClient({
    links: [
      httpBatchLink({
        url: `${baseUrl}/api/trpc`,
        transformer: superjson,
        fetch: async (url, options = {}) => {
          const headers = new Headers(options.headers || {});
          if (cookie) headers.set("cookie", cookie);
          const res = await fetch(url, { ...options, headers });
          cookie = mergeCookies(cookie, readSetCookies(res.headers));
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`${label} HTTP ${res.status}: ${body}`);
          }
          return res;
        },
      }),
    ],
  });
  return {
    client,
    getCookie: () => cookie,
  };
}

function assert(condition, message, detail) {
  if (!condition) {
    const suffix = detail ? ` ${JSON.stringify(detail)}` : "";
    throw new Error(`${message}${suffix}`);
  }
}

async function step(name, fn) {
  process.stdout.write(`- ${name} ... `);
  try {
    const result = await fn();
    process.stdout.write("OK\n");
    return result;
  } catch (error) {
    process.stdout.write("NG\n");
    error.message = `[${name}] ${error.message}`;
    throw error;
  }
}

async function uploadTinyPng(cookie) {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  );
  const res = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    headers: {
      "content-type": "image/png",
      ...(cookie ? { cookie } : {}),
    },
    body: png,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`upload failed: ${res.status} ${JSON.stringify(json)}`);
  assert(json.url, "upload did not return url", json);
  return json.url;
}

async function expectUnauthenticatedUploadRejected() {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  );
  const res = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    headers: { "content-type": "image/png" },
    body: png,
  });
  const json = await res.json().catch(() => ({}));
  assert(res.status === 401, "unauthenticated upload was not rejected", { status: res.status, body: json });
}

const store = makeClient("store");
const therapist = makeClient("therapist");
const therapist2 = makeClient("therapist2");
const customer = makeClient("customer");

const ids = {};
const emails = {
  store: `qa-smoke-store-${stamp}@example.com`,
  therapist: `qa-smoke-therapist-${stamp}@example.com`,
  therapist2: `qa-smoke-therapist2-${stamp}@example.com`,
  customer: `qa-smoke-customer-${stamp}@example.com`,
};
const phones = {
  customer: process.env.AROMANET_SMOKE_CUSTOMER_PHONE || `090${String(stamp).slice(-8)}`,
};

async function getSmokeSmsCode() {
  if (process.env.AROMANET_SMOKE_SMS_CODE) return process.env.AROMANET_SMOKE_SMS_CODE.trim();
  if (!process.env.AROMANET_SMOKE_CUSTOMER_PHONE) {
    throw new Error("SMS認証後の本番スモークには、SMSを受信できる電話番号を AROMANET_SMOKE_CUSTOMER_PHONE に設定してください。");
  }
  const rl = createInterface({ input, output });
  try {
    return (await rl.question("SMSに届いた認証コードを入力してください: ")).trim();
  } finally {
    rl.close();
  }
}

try {
  console.log(JSON.stringify({ baseUrl, targetDate, emails, phones }, null, 2));

  await step("未ログインのアップロードが拒否される", expectUnauthenticatedUploadRejected);

  await step("店舗を新規登録する", async () => {
    const res = await store.client.aroAuth.storeRegister.mutate({
      email: emails.store,
      password,
      storeName: `QA確認店舗${stamp}`,
    });
    ids.storeAccountId = res.accountId;
    ids.storeId = res.storeId;
    assert(res.success && ids.storeId, "store register failed", res);
  });

  await step("店舗プロフィールとメニューを作る", async () => {
    await store.client.store.updateProfile.mutate({
      name: `QA確認店舗${stamp}`,
      prefecture: "東京都",
      city: "新宿区",
      address: "東京都新宿区テスト1-1-1",
      description: "本番スモークテスト用の店舗です。",
      isPublic: true,
    });
    await store.client.store.createMenu.mutate({
      name: `QA60分${stamp}`,
      description: "本番確認用コース",
      durationMinutes: 60,
      price: 10000,
      nominationFee: 2000,
      isPublic: true,
    });
    const menus = await store.client.store.getMenus.query();
    const menu = menus.find((row) => row.name === `QA60分${stamp}`);
    assert(menu, "created menu not found", menus);
    ids.menuId = menu.id;
  });

  await step("店舗が招待URLを発行し、セラピストを所属登録する", async () => {
    const invite = await store.client.affiliation.createInviteLink.mutate({
      label: "QA確認招待",
      maxUses: 3,
      expiresInDays: 7,
    });
    assert(invite.token, "invite token missing", invite);
    ids.inviteToken = invite.token;
    const res = await therapist.client.aroAuth.therapistRegister.mutate({
      email: emails.therapist,
      password,
      displayName: `QAセラピスト${stamp}`,
      inviteToken: invite.token,
    });
    ids.therapistAccountId = res.accountId;
    ids.therapistId = res.therapistId;
    assert(res.success && res.storeId === ids.storeId, "therapist invite registration did not link store", res);
    const res2 = await therapist2.client.aroAuth.therapistRegister.mutate({
      email: emails.therapist2,
      password,
      displayName: `QAセラピスト2${stamp}`,
      inviteToken: invite.token,
    });
    ids.therapist2AccountId = res2.accountId;
    ids.therapist2Id = res2.therapistId;
    assert(res2.success && res2.storeId === ids.storeId, "second therapist invite registration did not link store", res2);
    const therapists = await store.client.store.getTherapists.query();
    assert(therapists.some((row) => row.id === ids.therapistId), "store cannot see invited therapist", therapists);
    assert(therapists.some((row) => row.id === ids.therapist2Id), "store cannot see second invited therapist", therapists);
  });

  await step("店舗が給与設定を変更できる", async () => {
    await store.client.affiliation.updateSalarySettings.mutate({
      therapistId: ids.therapistId,
      backRate: 70,
      nominationFee: 2000,
      adjustmentNote: "QAバック率設定",
    });
    ids.expectedBackRate = 70;
  });

  await step("セラピストがシフト申請し、店舗が承認できる", async () => {
    const created = await therapist.client.therapist.createShift.mutate({
      date: targetDate,
      startTime: "11:00",
      endTime: "20:00",
      note: "QAシフト申請",
    });
    ids.shiftId = created.shiftId;
    const shifts = await store.client.store.getShifts.query({ month });
    const shift = shifts.find((row) => row.id === ids.shiftId);
    assert(shift && shift.approvalStatus === "pending", "store cannot see pending shift", shifts);
    await store.client.store.reviewShift.mutate({
      shiftId: ids.shiftId,
      action: "approved",
      reviewNote: "QA承認",
    });
    const created2 = await therapist2.client.therapist.createShift.mutate({
      date: targetDate,
      startTime: "11:00",
      endTime: "20:00",
      note: "QA second shift",
    });
    ids.shift2Id = created2.shiftId;
    await store.client.store.reviewShift.mutate({
      shiftId: ids.shift2Id,
      action: "approved",
      reviewNote: "QA second approval",
    });
    const therapistShifts = await therapist.client.therapist.getShifts.query({ month });
    const approved = therapistShifts.find((row) => row.id === ids.shiftId);
    assert(approved?.approvalStatus === "approved", "therapist cannot see approved shift", therapistShifts);
    const therapist2Shifts = await therapist2.client.therapist.getShifts.query({ month });
    const approved2 = therapist2Shifts.find((row) => row.id === ids.shift2Id);
    assert(approved2?.approvalStatus === "approved", "second therapist cannot see approved shift", therapist2Shifts);
  });

  await step("顧客を登録し、予約が3アカウントに反映される", async () => {
    await customer.client.aroAuth.startCustomerPhoneVerification.mutate({
      phoneNumber: phones.customer,
    });
    const verificationCode = await getSmokeSmsCode();
    const res = await customer.client.aroAuth.customerRegister.mutate({
      phoneNumber: phones.customer,
      verificationCode,
      password,
      displayName: `QA顧客${stamp}`,
    });
    ids.customerAccountId = res.accountId;
    assert(res.success && ids.customerAccountId, "customer register failed", res);
    let outsideShiftBlocked = false;
    try {
      await customer.client.reservation.create.mutate({
        storeId: ids.storeId,
        therapistId: ids.therapistId,
        menuId: ids.menuId,
        date: targetDate,
        startTime: "09:00",
        isNomination: true,
        optionIds: [],
        customerNote: "QA outside shift should fail",
      });
    } catch (error) {
      outsideShiftBlocked = String(error?.message ?? "").includes("出勤予定");
    }
    assert(outsideShiftBlocked, "therapist nomination outside approved shift was not blocked");
    const reservation = await customer.client.reservation.create.mutate({
      storeId: ids.storeId,
      therapistId: ids.therapistId,
      menuId: ids.menuId,
      date: targetDate,
      startTime: "12:00",
      isNomination: true,
      optionIds: [],
      customerNote: "QA予約メモ",
    });
    ids.reservationId = reservation.reservationId;
    let sameCustomerBlocked = false;
    try {
      await customer.client.reservation.create.mutate({
        storeId: ids.storeId,
        therapistId: ids.therapist2Id,
        menuId: ids.menuId,
        date: targetDate,
        startTime: "12:00",
        isNomination: true,
        optionIds: [],
        customerNote: "QA same customer same slot should fail",
      });
    } catch {
      sameCustomerBlocked = true;
    }
    assert(sameCustomerBlocked, "same customer same time reservation was not blocked");
    const storeReservations = await store.client.reservation.getStoreReservations.query({ status: "pending", limit: 100 });
    assert(storeReservations.some((row) => row.id === ids.reservationId), "store cannot see customer reservation", storeReservations);
    const therapistReservations = await therapist.client.therapist.getReservations.query({ date: targetDate });
    assert(therapistReservations.some((row) => row.id === ids.reservationId), "therapist cannot see customer reservation", therapistReservations);
    const customerReservations = await customer.client.customer.getReservations.query();
    assert(customerReservations.some((row) => row.id === ids.reservationId), "customer cannot see own reservation", customerReservations);

    const freeReservation = await customer.client.reservation.create.mutate({
      storeId: ids.storeId,
      menuId: ids.menuId,
      date: targetDate,
      startTime: "13:30",
      isNomination: false,
      optionIds: [],
      customerNote: "QA free booking assignment",
    });
    ids.freeReservationId = freeReservation.reservationId;
    const beforeAssign = await therapist.client.therapist.getReservations.query({ date: targetDate });
    assert(!beforeAssign.some((row) => row.id === ids.freeReservationId), "unassigned free booking appeared on therapist reservations", beforeAssign);
    await store.client.reservation.assignTherapist.mutate({
      id: ids.freeReservationId,
      therapistId: ids.therapistId,
    });
    const afterAssignStore = await store.client.reservation.getStoreReservations.query({ status: "pending", limit: 100 });
    const assignedStoreRow = afterAssignStore.find((row) => row.id === ids.freeReservationId);
    assert(assignedStoreRow?.therapistId === ids.therapistId, "store cannot assign therapist to free booking", assignedStoreRow);
    const afterAssignTherapist = await therapist.client.therapist.getReservations.query({ date: targetDate });
    assert(afterAssignTherapist.some((row) => row.id === ids.freeReservationId), "assigned free booking did not appear on therapist reservations", afterAssignTherapist);
    const afterAssignCustomer = await customer.client.customer.getReservations.query();
    const assignedCustomerRow = afterAssignCustomer.find((row) => row.id === ids.freeReservationId);
    assert(assignedCustomerRow?.therapistId === ids.therapistId, "assigned therapist did not appear on customer reservation", assignedCustomerRow);
  });

  await step("顧客メモがセラピスト画面に反映される", async () => {
    await therapist.client.therapist.upsertCustomerMemo.mutate({
      customerId: ids.customerAccountId,
      preferences: "QA好み",
      caution: "QA注意",
      lastVisitNote: "QA前回来店メモ",
      repeatStatus: "repeat",
      shareWithStore: true,
    });
    const memos = await therapist.client.therapist.getCustomerMemos.query();
    const memo = memos.find((row) => row.customerId === ids.customerAccountId);
    assert(memo?.preferences === "QA好み", "therapist memo not found", memos);
  });

  await step("メッセージ未読・既読・削除が動く", async () => {
    const thread = await customer.client.message.getOrCreateThread.mutate({
      threadType: "therapist_customer",
      therapistId: ids.therapistId,
    });
    ids.threadId = thread.id;
    await customer.client.message.send.mutate({ threadId: ids.threadId, content: `QAメッセージ${stamp}` });
    const unreadThreads = await therapist.client.message.getThreads.query();
    const unreadThread = unreadThreads.find((row) => row.id === ids.threadId);
    assert(unreadThread?.unreadCount > 0, "therapist unread count did not increase", unreadThreads);
    await therapist.client.message.getMessages.query({ threadId: ids.threadId });
    const readThreads = await therapist.client.message.getThreads.query();
    assert((readThreads.find((row) => row.id === ids.threadId)?.unreadCount ?? -1) === 0, "therapist unread count did not clear", readThreads);

    await therapist.client.message.send.mutate({ threadId: ids.threadId, content: `QA返信${stamp}` });
    const customerUnread = await customer.client.message.getThreads.query();
    assert((customerUnread.find((row) => row.id === ids.threadId)?.unreadCount ?? 0) > 0, "customer unread count did not increase", customerUnread);
    const customerMessages = await customer.client.message.getMessages.query({ threadId: ids.threadId });
    assert(customerMessages.some((row) => row.content === `QA返信${stamp}`), "customer cannot read therapist reply", customerMessages);

    await customer.client.message.send.mutate({ threadId: ids.threadId, content: `QA全員削除${stamp}` });
    const beforeDelete = await customer.client.message.getMessages.query({ threadId: ids.threadId });
    const deleteTarget = [...beforeDelete].reverse().find((row) => row.content === `QA全員削除${stamp}`);
    assert(deleteTarget, "message to delete for everyone not found", beforeDelete);
    await customer.client.message.deleteMessage.mutate({ messageId: deleteTarget.id, mode: "everyone" });
    const afterDelete = await therapist.client.message.getMessages.query({ threadId: ids.threadId });
    assert(!afterDelete.some((row) => row.content === `QA全員削除${stamp}`), "message deleted for everyone is still visible", afterDelete);
  });

  await step("セラピスト投稿・画像アップロード・顧客コメント・保存が動く", async () => {
    const imageUrl = await uploadTinyPng(therapist.getCookie());
    const created = await therapist.client.post.create.mutate({
      postType: "diary",
      content: `QA投稿${stamp}`,
      imageUrls: [imageUrl],
      isPublic: true,
    });
    ids.postId = created.postId;
    const feed = await customer.client.post.getFeed.query({ limit: 50 });
    assert(feed.some((row) => row.id === ids.postId), "customer feed cannot see therapist post", feed);
    await customer.client.customer.toggleFavorite.mutate({ targetType: "post", targetId: ids.postId });
    const favorites = await customer.client.customer.getFavorites.query();
    assert(favorites.some((row) => row.targetType === "post" && row.targetId === ids.postId), "post favorite not saved", favorites);
    await customer.client.post.addComment.mutate({ postId: ids.postId, comment: `QAコメント${stamp}` });
    const comments = await customer.client.post.getComments.query({ postId: ids.postId });
    assert(comments.some((row) => row.comment === `QAコメント${stamp}`), "post comment not saved", comments);
  });

  await step("予約完了後、売上と給与が反映される", async () => {
    await store.client.reservation.updateStatus.mutate({ id: ids.reservationId, status: "confirmed" });
    await store.client.reservation.updateStatus.mutate({ id: ids.reservationId, status: "in_service" });
    await store.client.reservation.updateStatus.mutate({ id: ids.reservationId, status: "completed" });
    const autoStorePayrolls = await store.client.sales.getTherapistPayrolls.query({ year, month: monthNum });
    assert(
      autoStorePayrolls.some((row) => row.therapistId === ids.therapistId && Number(row.totalAmount ?? 0) >= 7000),
      "store payroll list did not update automatically after reservation completion",
      autoStorePayrolls,
    );
    await store.client.sales.calculatePayroll.mutate({ year, month: monthNum });
    await store.client.affiliation.sendSalaryNotification.mutate({
      therapistId: ids.therapistId,
      amount: 2000,
      message: "QA女子給調整",
    });
    const summary = await therapist.client.therapist.getSalesSummary.query({ month });
    assert(Number(summary?.count ?? 0) >= 1, "therapist sales count did not update", summary);
    const details = await therapist.client.therapist.getSalesDetails.query({ month });
    assert(details.some((row) => row.reservationId === ids.reservationId), "therapist sales details missing reservation", details);
    const detail = details.find((row) => row.reservationId === ids.reservationId);
    assert(Number(detail?.therapistBack ?? 0) === 7000, "therapist back amount did not use store salary settings", detail);
    const payroll = await therapist.client.therapist.getPayroll.query({ year, month: monthNum });
    assert(Number(payroll?.totalAmount ?? 0) >= 9000, "therapist payroll did not include calculated back amount and salary notification", payroll);
    const storePayrolls = await store.client.sales.getTherapistPayrolls.query({ year, month: monthNum });
    assert(storePayrolls.some((row) => row.therapistId === ids.therapistId && Number(row.totalAmount ?? 0) >= 9000), "store payroll list missing therapist payroll", storePayrolls);
  });

  console.log(JSON.stringify({ ok: true, baseUrl, ids, emails, password: "[hidden]" }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, baseUrl, ids, emails, error: error.message }, null, 2));
  process.exitCode = 1;
}
