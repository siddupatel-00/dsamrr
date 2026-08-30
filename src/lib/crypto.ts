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
