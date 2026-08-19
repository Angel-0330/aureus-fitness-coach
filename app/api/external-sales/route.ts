// ============================================================================
// POST /api/external-sales — registra una venta externa.
// ----------------------------------------------------------------------------
// Igual que los recibos: quién la registró se toma de la sesión, el monto se
// valida aquí, y solo el dueño y la secretaria pueden registrar ventas.
// ============================================================================
import { cookies } from "next/headers";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { checkRateLimit, generalLimiter } from "@/lib/rate-limit";

const METHOD_VALUES: Record<string, string> = {
  Efectivo: "efectivo",
  Yappy: "yappy",
  Tarjeta: "tarjeta",
};

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, gym_id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "owner" && profile.role !== "secretary")) {
    return Response.json({ error: "No tienes permiso para registrar ventas" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const product = typeof body.product === "string" ? body.product.trim().slice(0, 120) : "";
  const amount = Number(body.amount);
  const paymentMethod = METHOD_VALUES[body.paymentMethod] ?? null;

  if (product.length < 2) {
    return Response.json({ error: "Escribe qué producto se vendió" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "El monto debe ser mayor que cero" }, { status: 400 });
  }
  if (!paymentMethod) {
    return Response.json({ error: "Forma de pago inválida" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("external_sales")
    .insert({
      gym_id: profile.gym_id,
      product,
      amount,
      payment_method: paymentMethod,
      recorded_by: user.id,
    })
    .select("id, created_at")
    .single();

  if (error || !data) {
    console.error("ERROR GUARDAR VENTA EXTERNA:", error);
    return Response.json({ error: "No se pudo guardar la venta" }, { status: 500 });
  }

  return Response.json({ id: data.id, createdAt: data.created_at });
}