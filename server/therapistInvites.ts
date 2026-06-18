import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";

let inviteSchemaReady: Promise<void> | null = null;

async function ignoreDuplicateIndex(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (!message.includes("Duplicate key name") && !message.includes("already exists")) throw error;
  }
}

export function generateInviteToken() {
  return randomBytes(24).toString("base64url");
}

export function ensureTherapistInviteLinksTable(db: any) {
  if (!inviteSchemaReady) {
    inviteSchemaReady = (async () => {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS therapist_invite_links (
          id int AUTO_INCREMENT NOT NULL,
          storeId int NOT NULL,
          token varchar(80) NOT NULL,
          label varchar(100),
          isActive boolean NOT NULL DEFAULT true,
          maxUses int,
          usedCount int NOT NULL DEFAULT 0,
          expiresAt timestamp NULL,
          lastUsedAt timestamp NULL,
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT therapist_invite_links_id PRIMARY KEY(id)
        )
      `));
      await ignoreDuplicateIndex(db.execute(sql.raw("CREATE UNIQUE INDEX idx_therapist_invite_token ON therapist_invite_links (token)")));
      await ignoreDuplicateIndex(db.execute(sql.raw("CREATE INDEX idx_therapist_invite_store ON therapist_invite_links (storeId)")));
    })();
  }
  return inviteSchemaReady;
}

export function getInviteInvalidReason(invite: any) {
  if (!invite) return "not_found";
  if (!invite.isActive) return "inactive";
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) return "expired";
  if (invite.maxUses != null && Number(invite.usedCount ?? 0) >= Number(invite.maxUses)) return "used_up";
  return null;
}
