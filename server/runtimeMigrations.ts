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
      message.includes("ALTER TABLE messages ADD COLUMN deletedById") ||
      message.includes("ALTER TABLE customer_accounts ADD COLUMN phoneVerified") ||
      message.includes("ALTER TABLE customer_accounts ADD COLUMN phoneVerifiedAt") ||
      message.includes("ALTER TABLE story_posts ADD COLUMN editorState");
    if (!existingColumn) {
      throw error;
    }
  }
}

async function ignoreExistingTable(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error: any) {
    const code = String(error?.code ?? "");
    const errno = Number(error?.errno ?? 0);
    const message = String(error?.message ?? "");
    const existingTable =
      code === "ER_TABLE_EXISTS_ERROR" ||
      errno === 1050 ||
      message.includes("already exists") ||
      message.includes("Table") && message.includes("exists");
    if (!existingTable) {
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

      await ignoreExistingColumn(db.execute(sql.raw("ALTER TABLE customer_accounts ADD COLUMN phoneVerified boolean NOT NULL DEFAULT false")));
      await ignoreExistingColumn(db.execute(sql.raw("ALTER TABLE customer_accounts ADD COLUMN phoneVerifiedAt timestamp NULL")));

      await ignoreExistingColumn(db.execute(sql.raw("ALTER TABLE story_posts ADD COLUMN editorState text")));

      await ignoreExistingTable(db.execute(sql.raw(`
        CREATE TABLE reservation_financial_events (
          id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
          reservationId int NOT NULL,
          storeId int NOT NULL,
          actorRole enum('store','therapist','customer','admin') NOT NULL DEFAULT 'store',
          actorId int NOT NULL,
          eventType enum('financial_adjustment','status_change','payroll_recalculation') NOT NULL DEFAULT 'financial_adjustment',
          beforeTotal int NOT NULL DEFAULT 0,
          afterTotal int NOT NULL DEFAULT 0,
          optionAmount int NOT NULL DEFAULT 0,
          discountAmount int NOT NULL DEFAULT 0,
          detail text,
          note text,
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_reservation_financial_events_reservation (reservationId),
          INDEX idx_reservation_financial_events_store (storeId)
        )
      `)));
    })().catch(error => {
      runtimeSchemaReady = null;
      throw error;
    });
  }
  return runtimeSchemaReady;
}
