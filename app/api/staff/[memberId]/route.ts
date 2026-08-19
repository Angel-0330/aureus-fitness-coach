// ============================================================================
// PATCH /api/staff/:memberId — actualiza el rol y estado de un miembro del
// equipo. Si se suspende la cuenta, también se bloquea el acceso real en
// Supabase Auth; si se reactiva, se quita el bloqueo.
//
// Solo el dueño del gimnasio puede hacer esto.
// ============================================================================
import { cookies } from "next/headers";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";

export async function PATCH(request: Request, { params }: { params: { memberId: string } }) {
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

  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("role, gym_id")
    .eq("id", user.id)
    .single();

  if (!requesterProfile || requesterProfile.role !== "owner") {
    return Response.json({ error: "Solo el dueño puede editar cuentas del equipo" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const role = body.role === "trainer" ? "trainer" : "secretary";
  const status = ["active", "invited", "suspended"].includes(body.status) ? body.status : "active";

  const admin = createSupabaseAdminClient();

  const { error: updateError } = await admin
    .from("profiles")
    .update({ role, status })
    .eq("id", params.memberId)
    .eq("gym_id", requesterProfile.gym_id);

  if (updateError) {
    return Response.json({ error: "No se pudo actualizar la cuenta" }, { status: 500 });
  }

  const { error: banError } = await admin.auth.admin.updateUserById(params.memberId, {
    ban_duration: status === "suspended" ? "876000h" : "none",
  });

  if (banError) {
    console.error("ERROR SUSPENDER/REACTIVAR CUENTA:", banError);
  }

  return Response.json({ success: true });
}