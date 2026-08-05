// ============================================================================
// Cifrado de campo a nivel de aplicación.
// ----------------------------------------------------------------------------
// Supabase ya cifra TODA la base de datos "en reposo" (a nivel de disco)
// automáticamente — eso ya te protege ante un robo físico del servidor.
// Esta capa adicional es para el campo más sensible del sistema (el número
// de cédula/ID nacional): lo ciframos NOSOTROS antes de guardarlo, para que
// ni siquiera alguien con acceso directo a la base de datos (soporte del
// proveedor, un mal RLS, un backup mal compartido) pueda leerlo en texto
// plano sin la llave — que solo vive en tus secretos de servidor.
//
// Úsalo así:
//   import { encryptField, decryptField } from "@/lib/crypto";
//   const stored = encryptField(nationalId);       // al guardar
//   const original = decryptField(stored);          // al mostrarlo
//
// SOLO se usa en el servidor. Nunca importes este archivo en un componente
// "use client".
// ============================================================================
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
  // Formato guardado: iv.authTag.datosCifrados, todo en base64
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
