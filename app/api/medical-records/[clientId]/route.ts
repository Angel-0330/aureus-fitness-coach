// ============================================================================
// EJEMPLO DE REFERENCIA — GET /api/medical-records/:clientId
// ----------------------------------------------------------------------------
// Este archivo muestra el patrón completo que deberías repetir en cada ruta
// que toque datos médicos:
//
//   1. Verificar que hay una sesión válida (Supabase Auth)
//   2. Aplicar el límite de peticiones (rate limiting)
//   3. Dejar que RLS decida qué puede ver este usuario (no confiамos en
//      el rol que "diga" el frontend — Postgres lo verifica de nuevo)
//   4. Desencriptar solo el campo que ciframos a nivel de aplicación
//   5. La auditoría (quién vio qué, cuándo) ya queda registrada sola por
//      el trigger de supabase/migrations/0003_audit_log.sql
//
// Usa esto como plantilla para el resto de rutas: /api/clients,
// /api/payments, /api/agenda, etc. (con generalLimiter en vez de
// medicalLimiter para las que no son médicas).
// ============================================================================
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, medicalLimiter } from "@/lib/rate-limit";
import { decryptField } from "@/lib/crypto";

export async function GET(request: Request, { params }: { params: { clientId: string } }) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient({
    get: (name) => cookieStore.get(name)?.value,
    set: (name, value, options) => cookieStore.set(name, value, options),
  });

  // 1. ¿Hay una sesión válida?
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Límite de peticiones — identificado por usuario, no por IP, porque
  //    varias personas del mismo gimnasio pueden compartir red/IP.
  const { success, limit, remaining } = await checkRateLimit(medicalLimiter, user.id);
  if (!success) {
    return Response.json(
      { error: "Demasiadas peticiones. Intenta de nuevo en un minuto." },
      { status: 429, headers: { "X-RateLimit-Limit": String(limit), "X-RateLimit-Remaining": String(remaining) } }
    );
  }

  // 3. La consulta pasa por RLS automáticamente: si este usuario no tiene
  //    derecho a ver este expediente (no es el dueño ni el entrenador
  //    asignado), Supabase simplemente no devuelve la fila — sin importar
  //    qué clientId se haya pedido en la URL.
  const { data: record, error } = await supabase
    .from("client_medical_records")
    .select("*")
    .eq("client_id", params.clientId)
    .single();

  if (error || !record) {
    return Response.json({ error: "Expediente no encontrado o sin permiso" }, { status: 404 });
  }

  // 4. Desencriptamos solo el campo protegido a nivel de aplicación
  const nationalId = record.national_id_encrypted ? decryptField(record.national_id_encrypted) : "";

  return Response.json({ ...record, national_id_encrypted: undefined, nationalId });
