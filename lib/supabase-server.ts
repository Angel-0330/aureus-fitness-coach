// ============================================================================
// Clientes de Supabase para el SERVIDOR.
// ----------------------------------------------------------------------------
// Hay dos aquí, y es muy importante no confundirlos:
//
// 1. createSupabaseServerClient() → usa la anon key + la sesión de la
//    persona que hizo la petición (vía cookies). Sigue respetando RLS.
//    Úsalo para el 95% de las operaciones normales del servidor.
//
// 2. createSupabaseAdminClient() → usa la "service role key", que SE
//    SALTA todas las políticas de RLS. Solo debe usarse en tareas de
//    administración muy puntuales (ej. crear un gimnasio nuevo al activar
//    una suscripción, tareas programadas). NUNCA debe llegar al navegador
//    ni usarse para responder directamente a peticiones de un usuario.
// ============================================================================
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export function createSupabaseServerClient(cookies: {
  get: (name: string) => string | undefined;
  set: (name: string, value: string, options: Record<string, unknown>) => void;
}) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: cookies.get,
        set: cookies.set,
        remove: (name: string, options: Record<string, unknown>) => cookies.set(name, "", options),
      },
    }
  );
}

export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY. Esta clave nunca debe exponerse al navegador.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
