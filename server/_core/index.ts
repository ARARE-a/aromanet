import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import { eq, sql } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { storagePut } from "../storage";
import { getDb, hasDemoDatabase, runWithDatabaseMode } from "../db";
import { ensureRuntimeSchema } from "../runtimeMigrations";
import { getSession, getSessionDatabaseMode } from "../session";
import { customerAccounts, storeAccounts, stores, therapistAccounts, therapists } from "../../drizzle/schema";
import { setSessionCookie } from "../routers/auth";

type DemoRole = "store" | "therapist" | "customer";

const DEMO_LOGIN_CONFIG: Record<
  DemoRole,
  { email: string; unavailablePath: string; redirectPath: string }
> = {
  store: {
    email: process.env.DEMO_STORE_EMAIL || "showcase-store@aromanet.club",
    unavailablePath: "/store/login?demo=unavailable",
    redirectPath: "/store/dashboard?demo=1",
  },
  therapist: {
    email: process.env.DEMO_THERAPIST_EMAIL || "showcase-therapist@aromanet.club",
    unavailablePath: "/therapist/login?demo=unavailable",
    redirectPath: "/therapist/dashboard?demo=1",
  },
  customer: {
    email: process.env.DEMO_CUSTOMER_EMAIL || "showcase-customer@aromanet.club",
    unavailablePath: "/customer/login?demo=unavailable",
    redirectPath: "/home?demo=1",
  },
};

function parseDemoRole(value: unknown): DemoRole {
  return value === "therapist" || value === "customer" ? value : "store";
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

type ParsedUpload = {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
};

const UPLOAD_BODY_LIMIT = process.env.UPLOAD_BODY_LIMIT || "10mb";
const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

function isAllowedUploadType(mimeType: string) {
  return ALLOWED_UPLOAD_TYPES.has(mimeType.toLowerCase());
}

function extensionForUpload(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("heic")) return "heic";
  if (mimeType.includes("heif")) return "heif";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("quicktime")) return "mov";
  return "jpg";
}

function hasExpectedMagicBytes(buffer: Buffer, mimeType: string) {
  if (buffer.length < 4) return false;
  const hex = buffer.subarray(0, 12).toString("hex");
  if (mimeType === "image/jpeg") return hex.startsWith("ffd8ff");
  if (mimeType === "image/png") return hex.startsWith("89504e470d0a1a0a");
  if (mimeType === "image/gif") return buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a";
  if (mimeType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "image/heic" || mimeType === "image/heif") return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  if (mimeType === "video/mp4" || mimeType === "video/quicktime") return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  if (mimeType === "video/webm") return hex.startsWith("1a45dfa3");
  return false;
}

function multipartBoundary(contentType: string) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  return match?.[1] || match?.[2] || "";
}

function safeDecodeFileName(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseMultipartUpload(body: Buffer, contentType: string): ParsedUpload | null {
  const boundaryValue = multipartBoundary(contentType);
  if (!boundaryValue) return null;

  const boundary = Buffer.from(`--${boundaryValue}`);
  const headerSeparator = Buffer.from("\r\n\r\n");
  let boundaryStart = body.indexOf(boundary);

  while (boundaryStart !== -1) {
    let partStart = boundaryStart + boundary.length;
    if (body[partStart] === 45 && body[partStart + 1] === 45) break;
    if (body[partStart] === 13 && body[partStart + 1] === 10) partStart += 2;

    const headerEnd = body.indexOf(headerSeparator, partStart);
    if (headerEnd === -1) break;

    const headers = body.subarray(partStart, headerEnd).toString("utf8");
    const disposition = /content-disposition:\s*([^\r\n]+)/i.exec(headers)?.[1] ?? "";
    if (!/filename/i.test(disposition)) {
      boundaryStart = body.indexOf(boundary, headerEnd + headerSeparator.length);
      continue;
    }

    const quotedName = /filename="([^"]*)"/i.exec(disposition)?.[1];
    const encodedName = /filename\*=(?:UTF-8'')?([^;\r\n]+)/i.exec(disposition)?.[1];
    const fileName = safeDecodeFileName((encodedName || quotedName || "upload").trim().replace(/^"|"$/g, ""));
    const mimeType = (/content-type:\s*([^\r\n]+)/i.exec(headers)?.[1] ?? "application/octet-stream").trim();

    const dataStart = headerEnd + headerSeparator.length;
    const nextBoundary = body.indexOf(Buffer.from(`\r\n--${boundaryValue}`), dataStart);
    if (nextBoundary === -1) break;

    return {
      buffer: Buffer.from(body.subarray(dataStart, nextBoundary)),
      mimeType,
      fileName,
    };
  }

  return null;
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  ensureRuntimeSchema().catch(error => {
    console.warn("[RuntimeSchema] skipped:", error?.message ?? error);
  });
  if (hasDemoDatabase()) {
    ensureRuntimeSchema("demo").catch(error => {
      console.warn("[DemoRuntimeSchema] skipped:", error?.message ?? error);
    });
  }
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/demo-login", async (req, res) => {
    try {
      const role = parseDemoRole(req.query.role);
      const config = DEMO_LOGIN_CONFIG[role];
      if (!hasDemoDatabase()) {
        return res.redirect(302, config.unavailablePath);
      }
      const db = await getDb("demo");
      if (!db) {
        return res.redirect(302, config.unavailablePath);
      }

      if (role === "store") {
        const rows = await db
          .select({
            accountId: storeAccounts.id,
            email: storeAccounts.email,
            status: storeAccounts.status,
            storeId: stores.id,
          })
          .from(storeAccounts)
          .innerJoin(stores, eq(stores.accountId, storeAccounts.id))
          .where(eq(storeAccounts.email, config.email))
          .limit(1);

        const demo = rows[0];
        if (!demo || demo.status !== "active") {
          return res.redirect(302, config.unavailablePath);
        }

        await setSessionCookie(res, {
          role: "store",
          accountId: demo.accountId,
          storeId: demo.storeId,
          email: demo.email,
          demo: true,
        });
        return res.redirect(302, config.redirectPath);
      }

      if (role === "therapist") {
        const rows = await db
          .select({
            accountId: therapistAccounts.id,
            email: therapistAccounts.email,
            status: therapistAccounts.status,
            therapistId: therapists.id,
          })
          .from(therapistAccounts)
          .innerJoin(therapists, eq(therapists.accountId, therapistAccounts.id))
          .where(eq(therapistAccounts.email, config.email))
          .limit(1);

        const demo = rows[0];
        if (!demo || demo.status !== "active") {
          return res.redirect(302, config.unavailablePath);
        }

        await setSessionCookie(res, {
          role: "therapist",
          accountId: demo.accountId,
          therapistId: demo.therapistId,
          email: demo.email,
          demo: true,
        });
        return res.redirect(302, config.redirectPath);
      }

      const rows = await db
        .select({
          accountId: customerAccounts.id,
          email: customerAccounts.email,
          status: customerAccounts.status,
        })
        .from(customerAccounts)
        .where(eq(customerAccounts.email, config.email))
        .limit(1);

      const demo = rows[0];
      if (!demo || demo.status !== "active") {
        return res.redirect(302, config.unavailablePath);
      }

      await setSessionCookie(res, {
        role: "customer",
        accountId: demo.accountId,
        email: demo.email,
        demo: true,
      });
      return res.redirect(302, config.redirectPath);
    } catch (error) {
      console.error("[DemoLogin] Failed to create demo session", error);
      return res.redirect(302, "/store/login?demo=unavailable");
    }
  });

  app.use(async (req, _res, next) => {
    const routeSignature = `${req.path} ${req.originalUrl}`;
    const forcePrimary = routeSignature.includes("aroAuth.") || routeSignature.includes("/api/trpc/auth.");
    const mode = forcePrimary ? "primary" : await getSessionDatabaseMode(req);
    runWithDatabaseMode(mode, next);
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/ready", async (_req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ ok: false, database: false });
        return;
      }
      await (db as any).execute(sql`select 1`);
      res.json({ ok: true, database: true });
    } catch (error: any) {
      res.status(503).json({ ok: false, database: false, message: error?.message ?? "Database unavailable" });
    }
  });

  // File upload endpoint
  app.post("/api/upload", express.raw({ type: "*/*", limit: UPLOAD_BODY_LIMIT }), async (req, res) => {
    try {
      const session = await getSession(req);
      if (!session) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const contentType = String(req.headers["content-type"] || "application/octet-stream");
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? "");
      const parsed = contentType.includes("multipart/form-data")
        ? parseMultipartUpload(body, contentType)
        : { buffer: body, mimeType: contentType.split(";")[0].trim(), fileName: "upload" };

      if (!parsed || parsed.buffer.byteLength === 0) {
        res.status(400).json({ error: "No file found" });
        return;
      }

      if (!isAllowedUploadType(parsed.mimeType)) {
        res.status(415).json({ error: "Unsupported file type" });
        return;
      }

      if (!hasExpectedMagicBytes(parsed.buffer, parsed.mimeType.toLowerCase())) {
        res.status(415).json({ error: "File content does not match the declared type" });
        return;
      }

      const ext = extensionForUpload(parsed.mimeType.toLowerCase());
      const uploadPurpose = String(req.query.purpose || "");
      const keyPrefix = uploadPurpose === "verification"
        ? `private/verifications/${session.role}-${session.accountId}`
        : "uploads";
      const key = `${keyPrefix}/${Date.now()}.${ext}`;
      const { url, key: storedKey } = await storagePut(key, parsed.buffer, parsed.mimeType);
      res.json({ url, key: storedKey });
    } catch (e: any) {
      console.error("Upload error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
