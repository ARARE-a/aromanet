// Preconfigured storage helpers for Manus WebDev templates
// Uploads via Forge Server presigned URL to S3 (PUT direct).
// Downloads return /manus-storage/{key} paths served via 307 redirect.

import { ENV } from "./_core/env";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DB_TABLE_READY = { value: false };

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function hasForgeConfig() {
  return Boolean(ENV.forgeApiUrl && ENV.forgeApiKey);
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function getMaxUploadBytes() {
  const configured = Number(process.env.MAX_UPLOAD_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_UPLOAD_BYTES;
}

async function ensureUploadTable() {
  if (DB_TABLE_READY.value) return;
  const db = await getDb();
  if (!db) {
    throw new Error("Database storage is unavailable: DATABASE_URL is not configured");
  }

  await (db as any).execute(sql`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      \`key\` varchar(255) NOT NULL PRIMARY KEY,
      contentType varchar(100) NOT NULL,
      data longtext NOT NULL,
      byteLength int NOT NULL,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  DB_TABLE_READY.value = true;
}

async function databaseStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const raw = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  const maxBytes = getMaxUploadBytes();
  if (raw.byteLength > maxBytes) {
    throw new Error(`File is too large. Maximum upload size is ${Math.floor(maxBytes / 1024 / 1024)}MB.`);
  }

  await ensureUploadTable();
  const db = await getDb();
  if (!db) {
    throw new Error("Database storage is unavailable");
  }

  const key = appendHashSuffix(normalizeKey(relKey));
  const base64 = raw.toString("base64");
  await (db as any).execute(sql`
    INSERT INTO uploaded_files (\`key\`, contentType, data, byteLength)
    VALUES (${key}, ${contentType}, ${base64}, ${raw.byteLength})
    ON DUPLICATE KEY UPDATE
      contentType = VALUES(contentType),
      data = VALUES(data),
      byteLength = VALUES(byteLength)
  `);

  return { key, url: `/uploads/${key}` };
}

export async function storageRead(
  relKey: string,
): Promise<{ key: string; contentType: string; data: Buffer; byteLength: number } | null> {
  await ensureUploadTable();
  const db = await getDb();
  if (!db) return null;

  const key = normalizeKey(relKey);
  const result = await (db as any).execute(sql`
    SELECT \`key\`, contentType, data, byteLength
    FROM uploaded_files
    WHERE \`key\` = ${key}
    LIMIT 1
  `);
  const rows = Array.isArray(result) ? result[0] : [];
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;

  return {
    key: row.key,
    contentType: row.contentType,
    data: Buffer.from(row.data, "base64"),
    byteLength: Number(row.byteLength) || 0,
  };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const raw = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  const maxBytes = getMaxUploadBytes();
  if (raw.byteLength > maxBytes) {
    throw new Error(`File is too large. Maximum upload size is ${Math.floor(maxBytes / 1024 / 1024)}MB.`);
  }

  if (!hasForgeConfig()) {
    return databaseStoragePut(relKey, raw, contentType);
  }

  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    new Blob([raw as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}
