import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ─── Core Auth ───────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// ─── Store Accounts ───────────────────────────────────────────────────────────

export const storeAccounts = mysqlTable("store_accounts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  crashPasswordHash: varchar("crashPasswordHash", { length: 255 }),
  twoFactorSecret: varchar("twoFactorSecret", { length: 64 }),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
  identityVerified: boolean("identityVerified").default(false).notNull(),
  identityVerifiedAt: timestamp("identityVerifiedAt"),
  status: mysqlEnum("status", ["active", "suspended", "deleted"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Therapist Accounts ───────────────────────────────────────────────────────

export const therapistAccounts = mysqlTable("therapist_accounts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  crashPasswordHash: varchar("crashPasswordHash", { length: 255 }),
  twoFactorSecret: varchar("twoFactorSecret", { length: 64 }),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
  identityVerified: boolean("identityVerified").default(false).notNull(),
  identityVerifiedAt: timestamp("identityVerifiedAt"),
  ageVerified: boolean("ageVerified").default(false).notNull(),
  status: mysqlEnum("status", ["active", "suspended", "deleted"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Customer Accounts ────────────────────────────────────────────────────────

export const customerAccounts = mysqlTable("customer_accounts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  crashPasswordHash: varchar("crashPasswordHash", { length: 255 }),
  twoFactorSecret: varchar("twoFactorSecret", { length: 64 }),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
  ageVerified: boolean("ageVerified").default(false).notNull(),
  ageVerifiedAt: timestamp("ageVerifiedAt"),
  status: mysqlEnum("status", ["active", "suspended", "deleted"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Store Profiles ───────────────────────────────────────────────────────────

export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull().references(() => storeAccounts.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  address: varchar("address", { length: 255 }),
  prefecture: varchar("prefecture", { length: 20 }),
  city: varchar("city", { length: 50 }),
  phone: varchar("phone", { length: 20 }),
  access: text("access"),
  openHours: varchar("openHours", { length: 100 }),
  closeHours: varchar("closeHours", { length: 100 }),
  regularHoliday: varchar("regularHoliday", { length: 100 }),
  coverImageUrl: text("coverImageUrl"),
  logoUrl: text("logoUrl"),
  termsOfService: text("termsOfService"),
  cautionNote: text("cautionNote"),
  isPublic: boolean("isPublic").default(true).notNull(),
  followerCount: int("followerCount").default(0).notNull(),
  reviewAvg: decimal("reviewAvg", { precision: 3, scale: 2 }).default("0.00"),
  reviewCount: int("reviewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Therapist Profiles ───────────────────────────────────────────────────────

export const therapists = mysqlTable("therapists", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull().references(() => therapistAccounts.id),
  storeId: int("storeId").references(() => stores.id),
  displayName: varchar("displayName", { length: 50 }).notNull(),
  age: int("age"),
  height: int("height"),
  bio: text("bio"),
  specialties: text("specialties"),
  catchphrase: varchar("catchphrase", { length: 100 }),
  selfIntroduction: text("selfIntroduction"),
  bodyType: varchar("bodyType", { length: 50 }),
  instagramUrl: varchar("instagramUrl", { length: 255 }),
  twitterUrl: varchar("twitterUrl", { length: 255 }),
  profileImageUrl: text("profileImageUrl"),
  coverImageUrl: text("coverImageUrl"),
  isPublic: boolean("isPublic").default(true).notNull(),
  affiliationStatus: mysqlEnum("affiliationStatus", ["pending", "approved", "rejected", "left"]).default("pending"),
  followerCount: int("followerCount").default(0).notNull(),
  nominationCount: int("nominationCount").default(0).notNull(),
  reviewAvg: decimal("reviewAvg", { precision: 3, scale: 2 }).default("0.00"),
  reviewCount: int("reviewCount").default(0).notNull(),
  backRate: decimal("backRate", { precision: 5, scale: 2 }).default("50.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Customer Profiles ────────────────────────────────────────────────────────

export const customerProfiles = mysqlTable("customer_profiles", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull().references(() => customerAccounts.id),
  displayName: varchar("displayName", { length: 50 }),
  nickname: varchar("nickname", { length: 50 }),
  phone: varchar("phone", { length: 20 }),
  profileImageUrl: text("profileImageUrl"),
  totalSpent: int("totalSpent").default(0).notNull(),
  memberLevel: int("memberLevel").default(1).notNull(),
  memberPoints: int("memberPoints").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Menus / Courses ──────────────────────────────────────────────────────────

export const menus = mysqlTable("menus", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull().references(() => stores.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  durationMinutes: int("durationMinutes").notNull(),
  price: int("price").notNull(),
  nominationFee: int("nominationFee").default(0).notNull(),
  isPublic: boolean("isPublic").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const menuOptions = mysqlTable("menu_options", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull().references(() => stores.id),
  name: varchar("name", { length: 100 }).notNull(),
  price: int("price").notNull(),
  isPublic: boolean("isPublic").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Coupons ──────────────────────────────────────────────────────────────────

export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull().references(() => stores.id),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  discountType: mysqlEnum("discountType", ["fixed", "percent"]).notNull(),
  discountValue: int("discountValue").notNull(),
  minAmount: int("minAmount").default(0).notNull(),
  maxUses: int("maxUses"),
  usedCount: int("usedCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt"),
  isPublic: boolean("isPublic").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Shifts ───────────────────────────────────────────────────────────────────

export const shifts = mysqlTable("shifts", {
  id: int("id").autoincrement().primaryKey(),
  therapistId: int("therapistId").notNull().references(() => therapists.id),
  storeId: int("storeId").notNull().references(() => stores.id),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:MM
  endTime: varchar("endTime", { length: 5 }).notNull(),
  breakStart: varchar("breakStart", { length: 5 }),
  breakEnd: varchar("breakEnd", { length: 5 }),
  status: mysqlEnum("status", ["scheduled", "working", "off", "holiday"]).default("scheduled").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_shifts_therapist_date").on(t.therapistId, t.date),
]);

// ─── Reservations ─────────────────────────────────────────────────────────────

export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull().references(() => stores.id),
  therapistId: int("therapistId").references(() => therapists.id),
  customerId: int("customerId").notNull().references(() => customerAccounts.id),
  menuId: int("menuId").references(() => menus.id),
  date: varchar("date", { length: 10 }).notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  isNomination: boolean("isNomination").default(false).notNull(),
  status: mysqlEnum("status", [
    "pending", "confirmed", "waiting", "in_service", "completed", "cancelled", "no_show", "change_requested"
  ]).default("pending").notNull(),
  totalPrice: int("totalPrice").default(0).notNull(),
  nominationFee: int("nominationFee").default(0).notNull(),
  optionTotal: int("optionTotal").default(0).notNull(),
  discountAmount: int("discountAmount").default(0).notNull(),
  couponId: int("couponId").references(() => coupons.id),
  cancelReason: text("cancelReason"),
  cancelFee: int("cancelFee").default(0).notNull(),
  note: text("note"),
  customerNote: text("customerNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_reservations_store_date").on(t.storeId, t.date),
  index("idx_reservations_therapist_date").on(t.therapistId, t.date),
  index("idx_reservations_customer").on(t.customerId),
]);

export const reservationOptions = mysqlTable("reservation_options", {
  id: int("id").autoincrement().primaryKey(),
  reservationId: int("reservationId").notNull().references(() => reservations.id),
  optionId: int("optionId").notNull().references(() => menuOptions.id),
  price: int("price").notNull(),
});

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messageThreads = mysqlTable("message_threads", {
  id: int("id").autoincrement().primaryKey(),
  threadType: mysqlEnum("threadType", ["store_customer", "therapist_customer", "store_therapist"]).notNull(),
  storeId: int("storeId").references(() => stores.id),
  therapistId: int("therapistId").references(() => therapists.id),
  customerId: int("customerId").references(() => customerAccounts.id),
  reservationId: int("reservationId").references(() => reservations.id),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  storeUnread: int("storeUnread").default(0).notNull(),
  therapistUnread: int("therapistUnread").default(0).notNull(),
  customerUnread: int("customerUnread").default(0).notNull(),
  isBlocked: boolean("isBlocked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull().references(() => messageThreads.id),
  senderRole: mysqlEnum("senderRole", ["store", "therapist", "customer"]).notNull(),
  senderId: int("senderId").notNull(),
  content: text("content"),
  imageUrl: text("imageUrl"),
  isTemplate: boolean("isTemplate").default(false).notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  isReported: boolean("isReported").default(false).notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_messages_thread").on(t.threadId),
]);

// ─── Posts ────────────────────────────────────────────────────────────────────

export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  authorRole: mysqlEnum("authorRole", ["store", "therapist"]).notNull(),
  storeId: int("storeId").references(() => stores.id),
  therapistId: int("therapistId").references(() => therapists.id),
  postType: mysqlEnum("postType", ["normal", "attendance", "diary", "campaign", "news"]).default("normal").notNull(),
  content: text("content"),
  isPublic: boolean("isPublic").default(true).notNull(),
  scheduledAt: timestamp("scheduledAt"),
  likeCount: int("likeCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const postImages = mysqlTable("post_images", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull().references(() => posts.id),
  imageUrl: text("imageUrl").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
});

// ─── Follows / Favorites ──────────────────────────────────────────────────────

export const follows = mysqlTable("follows", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull().references(() => customerAccounts.id),
  targetType: mysqlEnum("targetType", ["store", "therapist"]).notNull(),
  targetId: int("targetId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("idx_follows_unique").on(t.customerId, t.targetType, t.targetId),
]);

export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull().references(() => customerAccounts.id),
  targetType: mysqlEnum("targetType", ["store", "therapist"]).notNull(),
  targetId: int("targetId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("idx_favorites_unique").on(t.customerId, t.targetType, t.targetId),
]);

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  reservationId: int("reservationId").notNull().references(() => reservations.id),
  customerId: int("customerId").notNull().references(() => customerAccounts.id),
  storeId: int("storeId").references(() => stores.id),
  therapistId: int("therapistId").references(() => therapists.id),
  rating: int("rating").notNull(),
  comment: text("comment"),
  storeReply: text("storeReply"),
  isHidden: boolean("isHidden").default(false).notNull(),
  isReported: boolean("isReported").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientRole: mysqlEnum("recipientRole", ["store", "therapist", "customer"]).notNull(),
  recipientId: int("recipientId").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  body: text("body"),
  relatedId: int("relatedId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_notifications_recipient").on(t.recipientRole, t.recipientId),
]);

// ─── Customer Memos ───────────────────────────────────────────────────────────

export const customerMemos = mysqlTable("customer_memos", {
  id: int("id").autoincrement().primaryKey(),
  therapistId: int("therapistId").notNull().references(() => therapists.id),
  customerId: int("customerId").notNull().references(() => customerAccounts.id),
  preferences: text("preferences"),
  caution: text("caution"),
  lastVisitNote: text("lastVisitNote"),
  repeatStatus: varchar("repeatStatus", { length: 50 }),
  shareWithStore: boolean("shareWithStore").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── NG Customers ─────────────────────────────────────────────────────────────

export const ngCustomers = mysqlTable("ng_customers", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").references(() => stores.id),
  therapistId: int("therapistId").references(() => therapists.id),
  customerId: int("customerId").notNull().references(() => customerAccounts.id),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Blocks ───────────────────────────────────────────────────────────────────

export const blocks = mysqlTable("blocks", {
  id: int("id").autoincrement().primaryKey(),
  blockerRole: mysqlEnum("blockerRole", ["store", "therapist", "customer"]).notNull(),
  blockerId: int("blockerId").notNull(),
  blockedRole: mysqlEnum("blockedRole", ["store", "therapist", "customer"]).notNull(),
  blockedId: int("blockedId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  reporterRole: mysqlEnum("reporterRole", ["store", "therapist", "customer"]).notNull(),
  reporterId: int("reporterId").notNull(),
  targetType: mysqlEnum("targetType", ["store", "therapist", "customer", "message", "review", "post"]).notNull(),
  targetId: int("targetId").notNull(),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["pending", "reviewed", "resolved", "dismissed"]).default("pending").notNull(),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Sales ────────────────────────────────────────────────────────────────────

export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  reservationId: int("reservationId").notNull().references(() => reservations.id),
  storeId: int("storeId").notNull().references(() => stores.id),
  therapistId: int("therapistId").references(() => therapists.id),
  date: varchar("date", { length: 10 }).notNull(),
  menuAmount: int("menuAmount").default(0).notNull(),
  nominationFee: int("nominationFee").default(0).notNull(),
  optionAmount: int("optionAmount").default(0).notNull(),
  discountAmount: int("discountAmount").default(0).notNull(),
  cancelFee: int("cancelFee").default(0).notNull(),
  totalAmount: int("totalAmount").default(0).notNull(),
  therapistBack: int("therapistBack").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Therapist Payrolls ───────────────────────────────────────────────────────

export const therapistPayrolls = mysqlTable("therapist_payrolls", {
  id: int("id").autoincrement().primaryKey(),
  therapistId: int("therapistId").notNull().references(() => therapists.id),
  storeId: int("storeId").notNull().references(() => stores.id),
  year: int("year").notNull(),
  month: int("month").notNull(),
  nominationCount: int("nominationCount").default(0).notNull(),
  totalSales: int("totalSales").default(0).notNull(),
  backRate: decimal("backRate", { precision: 5, scale: 2 }).default("50.00"),
  backAmount: int("backAmount").default(0).notNull(),
  optionAmount: int("optionAmount").default(0).notNull(),
  adjustmentAmount: int("adjustmentAmount").default(0).notNull(),
  adjustmentNote: text("adjustmentNote"),
  totalPayroll: int("totalPayroll").default(0).notNull(),
  isPaid: boolean("isPaid").default(false).notNull(),
  paidAt: timestamp("paidAt"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Customer Levels ──────────────────────────────────────────────────────────

export const customerLevels = mysqlTable("customer_levels", {
  id: int("id").autoincrement().primaryKey(),
  level: int("level").notNull().unique(),
  name: varchar("name", { length: 50 }).notNull(),
  minAmount: int("minAmount").notNull(),
  badgeColor: varchar("badgeColor", { length: 20 }).notNull(),
  benefits: text("benefits"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Identity / Age Verifications ─────────────────────────────────────────────

export const identityVerifications = mysqlTable("identity_verifications", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["store", "therapist"]).notNull(),
  accountId: int("accountId").notNull(),
  documentType: varchar("documentType", { length: 50 }),
  documentImageUrl: text("documentImageUrl"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  adminNote: text("adminNote"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export const ageVerifications = mysqlTable("age_verifications", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull().references(() => customerAccounts.id),
  method: varchar("method", { length: 50 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorRole: mysqlEnum("actorRole", ["store", "therapist", "customer", "admin"]).notNull(),
  actorId: int("actorId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("targetType", { length: 50 }),
  targetId: int("targetId"),
  detail: text("detail"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_audit_logs_actor").on(t.actorRole, t.actorId),
]);

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StoreAccount = typeof storeAccounts.$inferSelect;
export type TherapistAccount = typeof therapistAccounts.$inferSelect;
export type CustomerAccount = typeof customerAccounts.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type Therapist = typeof therapists.$inferSelect;
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type Menu = typeof menus.$inferSelect;
export type MenuOption = typeof menuOptions.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type MessageThread = typeof messageThreads.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type TherapistPayroll = typeof therapistPayrolls.$inferSelect;

// ─── Rooms ────────────────────────────────────────────────────────────────────

export const rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull().references(() => stores.id),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  capacity: int("capacity").default(1).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Affiliation Requests ─────────────────────────────────────────────────────

export const affiliationRequests = mysqlTable("affiliation_requests", {
  id: int("id").autoincrement().primaryKey(),
  therapistId: int("therapistId").notNull().references(() => therapists.id),
  storeId: int("storeId").notNull().references(() => stores.id),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  message: text("message"),
  responseNote: text("responseNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_affiliation_therapist").on(t.therapistId),
  index("idx_affiliation_store").on(t.storeId),
]);

// ─── Therapist Salary Settings ────────────────────────────────────────────────

export const therapistSalarySettings = mysqlTable("therapist_salary_settings", {
  id: int("id").autoincrement().primaryKey(),
  therapistId: int("therapistId").notNull().references(() => therapists.id),
  storeId: int("storeId").notNull().references(() => stores.id),
  backRate: decimal("backRate", { precision: 5, scale: 2 }).default("50.00").notNull(),
  nominationFee: int("nominationFee").default(0).notNull(),
  adjustmentNote: text("adjustmentNote"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  uniqueIndex("idx_salary_settings_unique").on(t.therapistId, t.storeId),
]);

// ─── Story Posts (Instagram-style) ───────────────────────────────────────────

export const storyPosts = mysqlTable("story_posts", {
  id: int("id").autoincrement().primaryKey(),
  therapistId: int("therapistId").notNull().references(() => therapists.id),
  mediaUrl: text("mediaUrl").notNull(),
  mediaType: mysqlEnum("mediaType", ["image", "video"]).default("image").notNull(),
  caption: text("caption"),
  viewCount: int("viewCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Room = typeof rooms.$inferSelect;
export type AffiliationRequest = typeof affiliationRequests.$inferSelect;
export type TherapistSalarySetting = typeof therapistSalarySettings.$inferSelect;
export type StoryPost = typeof storyPosts.$inferSelect;

// ─── Email Verification Codes ─────────────────────────────────────────────────
export const emailVerificationCodes = mysqlTable("email_verification_codes", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  code: varchar("code", { length: 8 }).notNull(),
  role: mysqlEnum("role", ["store", "therapist", "customer"]).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EmailVerificationCode = typeof emailVerificationCodes.$inferSelect;
