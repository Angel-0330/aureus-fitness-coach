// ============================================================================
// POST /api/receipts — emite un recibo de pago.
// ----------------------------------------------------------------------------
// Por qué esto vive en el servidor y no en el navegador:
//
//   · QUIÉN FIRMA el recibo se toma de la sesión, no de lo que manda el
//     navegador. Antes una secretaria podía emitir un recibo a nombre del
//     dueño simplemente cambiando el dato al vuelo.
//   · EL PREFIJO del número (MG-0001-26) se lee de la base de datos.
//   · Los MONTOS se validan aquí, además de las restricciones de Postgres.
//
// Solo el dueño y la secretaria pueden emitir recibos.
// ============================================================================
import { cookies } from "next/headers";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { checkRateLimit, generalLimiter } from "@/lib/rate-limit";

const CONCEPT_VALUES: Record<string, string> = {
  "Cancelación": "cancelacion",
  Abono: "abono",
};

const METHOD_VALUES: Record<string, string> = {
  Efectivo: "efectivo",
  Transferencia: "transferencia",
  Yappy: "yappy",
  Tarjeta: "tarjeta",
};

function initialsFromGymName(gymName: string): string {
  return (
    gymName
      .trim()
      .split(/\s+/)
      .map((word) => word[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 3) || "REC"
  );
}

function formatReceiptNumber(receiptNumber: number, createdAt: string, prefix: string): string {
  const year = new Date(createdAt).getFullYear().toString().slice(-2);
  return `${prefix}-${String(receiptNumber).padStart(4, "0")}-${year}`;
}

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

  // El nombre de quien firma sale de aquí, no del navegador.
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, gym_id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "owner" && profile.role !== "secretary")) {
    return Response.json({ error: "No tienes permiso para emitir recibos" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const balance = Number(body.balance ?? 0);
  const concept = CONCEPT_VALUES[body.concept] ?? null;
  const paymentMethod = METHOD_VALUES[body.paymentMethod] ?? null;
  const service = typeof body.service === "string" ? body.service.slice(0, 200) : "";
  const nextDue = typeof body.nextDue === "string" && body.nextDue ? body.nextDue : null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "El monto debe ser mayor que cero" }, { status: 400 });
  }
  if (!Number.isFinite(balance) || balance < 0) {
    return Response.json({ error: "El saldo no puede ser negativo" }, { status: 400 });
  }
  if (!concept || !paymentMethod) {
    return Response.json({ error: "Concepto o forma de pago inválidos" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // El cliente tiene que ser de su gimnasio.
  const { data: client } = await admin
    .from("clients")
    .select("id")
    .eq("id", body.clientId)
    .eq("gym_id", profile.gym_id)
    .maybeSingle();

  if (!client) {
    return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  // El prefijo del recibo se lee de la base de datos.
  const { data: gym } = await admin
    .from("gyms")
    .select("name, receipt_prefix")
    .eq("id", profile.gym_id)
    .single();

  const prefix = (gym?.receipt_prefix ?? "").trim().toUpperCase() || initialsFromGymName(gym?.name ?? "");

  const { data: last } = await admin
    .from("payment_receipts")
    .select("receipt_number")
    .eq("gym_id", profile.gym_id)
    .order("receipt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNumber = (last?.receipt_number ?? 0) + 1;
  let saved: any = null;

  for (let attempt = 0; attempt < 5 && !saved; attempt++) {
    const { data, error } = await admin
      .from("payment_receipts")
      .insert({
        gym_id: profile.gym_id,
        client_id: body.clientId,
        receipt_number: nextNumber,
        amount,
        concept,
        payment_method: paymentMethod,
        balance,
        service,
        next_due: nextDue,
        issued_by: user.id,
        issued_by_name: profile.name,
      })
      .select("id, receipt_number, created_at")
      .single();

    if (data) {
      saved = data;
      break;
    }
    // Número ya tomado por otra persona: probamos con el siguiente.
    if (error?.code === "23505") {
      nextNumber += 1;
      continue;
    }
    console.error("ERROR EMITIR RECIBO:", error);
    return Response.json({ error: "No se pudo emitir el recibo" }, { status: 500 });
  }

  if (!saved) {
    return Response.json({ error: "No se pudo asignar un número de recibo" }, { status: 500 });
  }

  // El recibo también actualiza la ficha del cliente: solo se marca al día
  // cuando el pago cancela la mensualidad completa.
  const clientUpdates: Record<string, unknown> = {};
  if (concept === "cancelacion") clientUpdates.payment_status = "al_dia";
  if (nextDue) clientUpdates.next_due = new Date(`${nextDue}T12:00:00`).toISOString();
  if (Object.keys(clientUpdates).length) {
    const { error: clientError } = await admin.from("clients").update(clientUpdates).eq("id", body.clientId);
    if (clientError) console.error("ERROR ACTUALIZAR PAGO DEL CLIENTE:", clientError);
  }

  return Response.json({
    id: saved.id,
    receiptNumber: saved.receipt_number,
    displayNumber: formatReceiptNumber(saved.receipt_number, saved.created_at, prefix),
    issuedByName: profile.name,
    createdAt: saved.created_at,
  });
}