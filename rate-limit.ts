// ============================================================================
// Límite de peticiones (Rate Limiting)
// ----------------------------------------------------------------------------
// Usa Upstash Redis (plan gratuito de sobra para empezar). Se eligió esta
// opción, en vez de algo específico de Cloudflare, por dos razones:
//
//   1. Funciona igual de bien en Cloudflare Workers, Vercel, AWS Lambda o
//      cualquier otro lugar donde termines desplegando — así no dependes
//      de un proveedor en particular (tu requisito de "migrar fácil").
//   2. Es "serverless-friendly": no necesita mantener una conexión abierta,
//      cada verificación es una llamada HTTP rapidísima (~5-10ms).
//
// Cuando ya tengas tu propio dominio en Cloudflare, PUEDES sumar una capa
// extra sin escribir código: Cloudflare Dashboard → Security → Rate
// Limiting Rules. Esa es una protección de "primera línea" (bloquea antes
// de que la petición llegue siquiera a tu código). Este archivo es la
// segunda línea, más fina, con límites distintos por tipo de usuario/ruta.
// ============================================================================
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Límite general: 60 peticiones por minuto por usuario/IP.
export const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "aureus:rl:general",
});

// Límite más estricto para el módulo médico: 20 peticiones por minuto.
// Menos volumen esperado ahí, y queremos detectar rápido cualquier
// comportamiento anómalo (ej. alguien intentando descargar en masa
// expedientes médicos).
export const medicalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "aureus:rl:medical",
});

// Límite muy estricto para login: 5 intentos por minuto por IP,
// para dificultar ataques de fuerza bruta contra contraseñas.
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "aureus:rl:login",
});

/**
 * Úsalo al inicio de cualquier ruta de API/Edge Function:
 *
 *   const { success } = await checkRateLimit(medicalLimiter, userId);
 *   if (!success) return new Response("Demasiadas peticiones", { status: 429 });
 */
export async function checkRateLimit(limiter: Ratelimit, identifier: string) {
  return limiter.limit(identifier);
}
