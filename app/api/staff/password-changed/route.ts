// ============================================================================
// POST /api/staff/password-changed — marca que la persona ya cambió la
// contraseña inicial que le puso el dueño.
// ----------------------------------------------------------------------------
// La contraseña en sí la cambia Supabase Auth desde el navegador; aquí solo
// se apaga la marca must_change_password, y únicamente para la propia
// cuenta de quien hace la petición (se toma de la sesión, no del cuerpo).
// ============================================================================
import { cookies } from "next/headers";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { checkRateLimit, generalLimiter } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient({
    get: (name) => cookieStore.get(name)?.value,
    set: (name, value, options) => cookieStore.set(name, value, options),
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const { success } = await checkRateLimit(generalLimiter, user.id);
  if (!success) {
    return Response.json({ error: "Demasiadas peticiones. Intenta de nuevo en un minuto." }, { status: 429 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  if (error) {
    console.error("ERROR MARCAR CONTRASEÑA CAMBIADA:", error);
    return Response.json({ error: "No se pudo actualizar la cuenta" }, { status: 500 });
  }

  return Response.json({ success: true });
}