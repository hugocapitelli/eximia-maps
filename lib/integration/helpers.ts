import { createHash, randomBytes, createHmac, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): string {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32);
  if (!key) throw new Error("Missing INTEGRATION_ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY");
  return key;
}

export function generateApiKey(appSlug: string): { raw: string; prefix: string; hash: string } {
  const random = randomBytes(32).toString("hex");
  const raw = `eximia_${appSlug}_${random}`;
  const prefix = raw.slice(0, 16);
  const hash = hashKey(raw);
  return { raw, prefix, hash };
}

export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(getEncryptionKey(), "utf-8"), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

export function decrypt(encrypted: string): string {
  const [ivHex, tagHex, data] = encrypted.split(":");
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(getEncryptionKey(), "utf-8"), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function signPayload(secret: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}
