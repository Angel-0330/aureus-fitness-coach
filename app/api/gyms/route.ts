// ============================================================================
// POST /api/gyms
// ----------------------------------------------------------------------------
// Crea un gimnasio nuevo (un "tenant" de tu SaaS). Se ejecuta en el servidor
// con la llave administrativa (service role), porque crear un gimnasio es
// una acción de sistema, no algo que un usuario normal deba poder hacer
// libremente contra la base de datos.
//
// El flujo completo de "crear cuenta" es:
//   1. El frontend llama aquí primero → se crea la fila en `gyms`.
//   2. El frontend llama a supabase.auth.signUp(...) con ese gym_id en los
//      metadatos → el trigger `handle_new_user` (ver DEPLOY.md) crea
//      automáticamente el perfil del dueño enlazado a ese gimnasio.
// ============================================================================
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { generalLimiter, checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Limitamos por IP para evitar que un script cree cientos de gimnasios
  // falsos en poco tiempo.
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = await checkRateLimit(generalLimiter, `register:${ip}`);
  if (!success) {
    return Response.json({ error: "Demasiados intentos. Intenta de nuevo en un minuto." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const gymName = typeof body?.gymName === "string" ? body.gymName.trim() : "";

  if (gymName.length < 3) {
    return Response.json({ error: "El nombre del gimnasio debe tener al menos 3 caracteres." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("gyms")
    .insert({ name: gymName, subscription_plan: "trial", subscription_status: "trialing" })
    .select("id")
    .single();

  if (error || !data) {
    return Response.json({ error: "No se pudo crear el gimnasio. Intenta de nuevo." }, { status: 500 });
  }

  return Response.json({ gymId: data.id });
}
