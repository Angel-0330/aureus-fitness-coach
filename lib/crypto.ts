import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

function getKey(): Buffer {
  const secret = process.env.FIELD_ENCRYPTION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "Falta FIELD_ENCRYPTION_SECRET (o es muy corto). Genera uno con: openssl rand -base64 32 — y ponlo en tus secretos de servidor. Nunca lo subas al repositorio."
    );
  }
  return scryptSync(secret, "aureus-field-encryption", 32);
}

export function encryptField(plainText: string): string {
  if (!plainText) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((buf) => buf.toString("base64")).join(".");
}

export function decryptField(stored: string): string {
  if (!stored) return "";
  const [ivB64, authTagB64, dataB64] = stored.split(".");
  if (!ivB64 || !authTagB64 || !dataB64) return "";
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}