const MIN_PRODUCTION_SECRET_LENGTH = 32;

let cachedSecretKey: Uint8Array | null = null;

export function getJwtSecretKey() {
  if (cachedSecretKey) return cachedSecretKey;

  const secret = process.env.JWT_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!secret) {
    if (isProduction) {
      throw new Error("JWT_SECRET is required in production.");
    }
    console.warn("[Auth] JWT_SECRET is not set. Using a development-only session secret.");
    cachedSecretKey = new TextEncoder().encode("aromanet-development-only-session-secret");
    return cachedSecretKey;
  }

  if (isProduction && secret.length < MIN_PRODUCTION_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production.`);
  }

  cachedSecretKey = new TextEncoder().encode(secret);
  return cachedSecretKey;
}
