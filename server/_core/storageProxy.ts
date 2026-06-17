import type { Express } from "express";
import { ENV } from "./env";
import { storageRead } from "../storage";

export function registerStorageProxy(app: Express) {
  app.get("/uploads/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing upload key");
      return;
    }

    try {
      const file = await storageRead(key);
      if (!file) {
        res.status(404).send("Upload not found");
        return;
      }

      res.set("Content-Type", file.contentType);
      res.set("Content-Length", String(file.data.byteLength));
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.send(file.data);
    } catch (err) {
      console.error("[StorageProxy] uploaded file read failed:", err);
      res.status(500).send("Upload storage error");
    }
  });

  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
