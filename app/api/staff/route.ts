// ============================================================================
// POST /api/staff — crea una cuenta de acceso para un miembro del equipo.
// ----------------------------------------------------------------------------
// El dueño elige el correo y una contraseña inicial, y la cuenta queda
// marcada con must_change_password = true. La primera vez que la persona
// entre, la app la obliga a cambiarla.
//
// Por qué ese paso importa: si el dueño conociera la contraseña para
// siempre, podría entrar como su empleado, y entonces la bitácora de
// auditoría de los expedientes médicos dejaría de significar algo. Al
// obligar el cambio, cada quien vuelve a responder por lo que hace.
//
// Usa la llave de administrador de Supabase, que nunca debe llegar al
// navegador — por eso esto vive en el servidor. Solo el dueño puede crear
// cuentas.
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

  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("role, gym_id")
    .eq("id", user.id)
    .single();

  if (!requesterProfile || requesterProfile.role !== "owner") {
    return Response.json({ error: "Solo el dueño puede crear cuentas del equipo" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = body.role === "trainer" ? "trainer" : "secretary";

  if (name.length < 3 || !/^\S+@\S+\.\S+$/.test(email)) {
    return Response.json({ error: "Nombre o correo inválido" }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const initialsValue =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase() ?? "")
      .join("") || email[0]?.toUpperCase() || "?";

  const admin = createSupabaseAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      gym_id: requesterProfile.gym_id,
      name,
      role,
    },
  });

  if (error || !created?.user) {
    const message = error?.message?.toLowerCase().includes("already")
      ? "Ya existe una cuenta con ese correo."
      : "No se pudo crear la cuenta. Intenta de nuevo.";
    return Response.json({ error: message }, { status: 400 });
  }

  // El disparador handle_new_user() ya creó el perfil con nombre, rol y
  // gimnasio desde los metadatos; aquí completamos las iniciales y dejamos
  // marcada la cuenta para que cambie su contraseña al entrar.
  await admin
    .from("profiles")
    .update({ initials: initialsValue, must_change_password: true })
    .eq("id", created.user.id);

  return Response.json({ id: created.user.id });
}