import { sql } from "drizzle-orm";
import { getDb } from "./db";

let runtimeSchemaReady: Promise<void> | null = null;

async function ignoreExistingColumn(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error: any) {
    const code = String(error?.code ?? "");
    const errno = Number(error?.errno ?? 0);
    const message = String(error?.message ?? "");
    const existingColumn =
      code === "ER_DUP_FIELDNAME" ||
      errno === 1060 ||
      message.includes("Duplicate column name") ||
      message.includes("already exists") ||
      message.includes("ER_DUP_FIELDNAME") ||
      message.includes("ALTER TABLE shifts ADD COLUMN approvalStatus") ||
      message.includes("ALTER TABLE shifts ADD COLUMN reviewedAt") ||
      message.includes("ALTER TABLE shifts ADD COLUMN reviewedByStoreId") ||
      message.includes("ALTER TABLE shifts ADD COLUMN reviewNote") ||
      message.includes("ALTER TABLE messages ADD COLUMN deletedForStore") ||
      message.includes("ALTER TABLE messages ADD COLUMN deletedForTherapist") ||
      message.includes("ALTER TABLE messages ADD COLUMN deletedForCustomer") ||
      message.includes("ALTER TABLE messages ADD COLUMN deletedAt") ||
      message.includes("ALTER TABLE messages ADD COLUMN deletedByRole") ||
      message.includes("ALTER TABLE messages ADD COLUMN deletedById");
    if (!existingColumn) {
      throw error;
    }
  }
}

export async function ensureRuntimeSchema() {
  if (!runtimeSchemaReady) {
    runtimeSchemaReady = (async () => {
      const db = await getDb();
      if (!db) return;

      await ignoreExistingColumn(db.execute(sql.raw("ALTER TABLE shifts ADD COLUMN approvalStatus enum('pending','approved','rejected') NOT NULL DEFAULT 'pending'")));
      await ignoreExistingColumn(db.execute(sql.raw("ALTER TABLE shifts ADD COLUMN reviewedAt timestamp NULL")));
      await ignoreExistingColumn(db.execute(sql.raw("ALTER TABLE shifts ADD COLUMN reviewedByStoreId int")));
      await ignoreExistingColumn(db.execute(sql.raw("ALTER TABLE shifts ADD COLUMN reviewNote text")));

      await ignoreExistingColumn(db.execute(sql.raw("ALTER TABLE messages ADD COLUMN deletedForStore boolean NOT NULL DEFAULT false")));
      await ignoreExistingColumn(db.execute(sql.raw("ALTER TABLE messages ADD COLUMN deletedForTherapist boolean NOT NULL DEFAULT false")));
      await ignoreExistingColumn(db.execute(sql.raw("ALTER TABLE messages ADD COLUMN deletedForCustomer boolean NOT NULL DEFAULT false")));
      await ignoreExistingColumn(db.execute(sql.raw("ALTER TABLE messages ADD COLUMN deletedAt timestamp NULL")));
      await ignoreExistingColumn(db.execute(sql.raw("ALTER TABLE messages ADD COLUMN deletedByRole varchar(20)")));
      await ignoreExistingColumn(db.execute(sql.raw("ALTER TABLE messages ADD COLUMN deletedById int")));
    })().catch(error => {
      runtimeSchemaReady = null;
      throw error;
    });
  }
  return runtimeSchemaReady;
}
