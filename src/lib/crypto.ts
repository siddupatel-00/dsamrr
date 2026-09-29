import crypto from "crypto";

const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const SCRYPT_OPTIONS = {
  N: 16384, // CPU/memory cost
  r: 8,     // Block size
  p: 1,     // Parallelization parameter
};

/**
 * Generates an ultra-secure scrypt hash with unique cryptographically random salt
 * Stored format: <salt_hex>:<derived_key_hex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = crypto
    .scryptSync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS)
    .toString("hex");
  return `${salt}:${derivedKey}`;
}

/**
 * Validates password against stored hash using constant-time comparison (prevents timing attacks)
 */
export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;

  try {
    const [salt, originalHash] = storedHash.split(":");
    if (!salt || !originalHash) return false;

    const keyBuffer = crypto.scryptSync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
    const originalBuffer = Buffer.from(originalHash, "hex");

    if (keyBuffer.length !== originalBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(keyBuffer, originalBuffer);
  } catch (err) {
    console.error("Password verification error:", err);
    return false;
  }
}

/**
 * Generates a cryptographically secure hash for OTP verification.
 * Combines 16-byte random salt, email context, and server pepper (NEXTAUTH_SECRET).
 * Format: <salt_hex>:<hmac_hex>
 */
export function hashOtp(otp: string, email: string): string {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const pepper = process.env.NEXTAUTH_SECRET || "dsamrr-otp-pepper-fallback";
  const hmac = crypto.createHmac("sha256", pepper);
  hmac.update(`${salt}:${email.toLowerCase().trim()}:${otp.trim()}`);
  const digest = hmac.digest("hex");
  return `${salt}:${digest}`;
}

/**
 * Validates candidate OTP against stored hash using constant-time comparison (crypto.timingSafeEqual).
 * Backwards-compatible with unhashed legacy codes if any exist within their expiration window.
 */
export function verifyOtp(
  candidateOtp: string,
  email: string,
  storedHash: string | null | undefined
): boolean {
  if (!storedHash || !candidateOtp) return false;

  const trimmedCandidate = candidateOtp.trim();

  // If stored in <salt>:<hash> format
  if (storedHash.includes(":")) {
    try {
      const [salt, originalDigest] = storedHash.split(":");
      if (!salt || !originalDigest) return false;

      const pepper = process.env.NEXTAUTH_SECRET || "dsamrr-otp-pepper-fallback";
      const hmac = crypto.createHmac("sha256", pepper);
      hmac.update(`${salt}:${email.toLowerCase().trim()}:${trimmedCandidate}`);
      const candidateDigest = hmac.digest("hex");

      const bufA = Buffer.from(candidateDigest, "hex");
      const bufB = Buffer.from(originalDigest, "hex");
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch (err) {
      console.error("OTP verification error:", err);
      return false;
    }
  }

  // Graceful fallback for legacy plaintext OTPs during zero-downtime transition
  try {
    const bufA = Buffer.from(trimmedCandidate);
    const bufB = Buffer.from(storedHash.trim());
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

