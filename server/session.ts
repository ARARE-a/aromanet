import { jwtVerify } from "jose";

const JWT_SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "aromanet-secret-key");
const SESSION_COOKIE = "aromanet_session";

export interface AromaSession {
  role: "store" | "therapist" | "customer";
  accountId: number;
  storeId?: number;
  therapistId?: number;
  email?: string;
}

export async function getSession(req: any): Promise<AromaSession | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    return payload as unknown as AromaSession;
  } catch {
    return null;
  }
}
