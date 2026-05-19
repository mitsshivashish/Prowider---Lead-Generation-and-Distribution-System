import crypto from "crypto";
import bcrypt from "bcrypt";

const SECRET = () => {
  const secret = process.env.PROVIDER_AUTH_SECRET;
  if (!secret) {
    throw new Error("PROVIDER_AUTH_SECRET environment variable is required");
  }
  return secret;
};

const TOKEN_EXPIRY_HOURS = 24; // Token expires in 24 hours

// Hash password using bcrypt with 12 salt rounds
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Compare password with hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Sign provider token with expiry
export function signProviderToken(providerId: number): string {
  const expiryTime = Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
  const payload = `${providerId}:${expiryTime}`;
  const sig = crypto.createHmac("sha256", SECRET()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

// Verify provider token and check expiry
export function verifyProviderToken(token: string): number | null {
  const lastDotIndex = token.lastIndexOf(".");
  if (lastDotIndex === -1) return null;
  
  const payload = token.slice(0, lastDotIndex);
  const sig = token.slice(lastDotIndex + 1);

  if (!payload || !sig) return null;

  const [idStr, expiryStr] = payload.split(":");
  if (!idStr || !expiryStr) return null;

  const providerId = Number(idStr);
  const expiry = Number(expiryStr);

  if (!Number.isInteger(providerId) || providerId <= 0) return null;
  if (!Number.isInteger(expiry) || expiry <= 0) return null;

  // Check if token has expired
  if (Date.now() > expiry) return null;

  const expected = crypto.createHmac("sha256", SECRET()).update(payload).digest("hex");
  if (sig.length !== expected.length) return null;

  try {
    const valid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    return valid ? providerId : null;
  } catch {
    return null;
  }
}
