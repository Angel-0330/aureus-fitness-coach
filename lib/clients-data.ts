"use client";

// ============================================================================
// Puente entre la tabla `clients` real (Supabase) y el resto de la app.
// ----------------------------------------------------------------------------
// El resto de la aplicación (DirectoryView, PaymentsView, etc.) espera que
// cada cliente tenga un `id` de tipo número — así estaba construida desde
// el inicio. Pero en la base de datos real, los ids son "uuid" (texto largo).
//
// Para no tener que reescribir todas las pantallas de golpe, aquí hacemos
// un "traductor": le asignamos a cada cliente un número local (1, 2, 3...)
// para que el resto de la app funcione exactamente igual que con los datos
// de prueba, y guardamos por dentro un mapa que dice "el cliente número 3
// en realidad es el UUID xxxxx en la base de datos" — así, cuando alguien
// confirma un pago, sabemos a cuál fila real hay que avisarle.
// ============================================================================
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Client, PaymentStatus } from "@/app/aureus/types";

export type ClientIdMap = Record<number, string>;

const PAYMENT_LABELS: Record<string, PaymentStatus> = {
  al_dia: "Al día",
  pendiente: "Pendiente",
  por_vencer: "Por vencer",
};

function formatDate(value: string | null) {
  if (!value) return "Por definir";
  try {
    return new Date(value).toLocaleDateString("es-PA", { day: "2-digit", month: "short" });
  } catch {
    return "Por definir";
  }
}

/**
 * Trae todos los clientes del gimnasio del usuario que inició sesión.
 * Las políticas de seguridad (RLS) ya se encargan de que un entrenador
 * solo reciba SUS clientes asignados — aquí no hace falta filtrar nada
 * a mano por rol.
 */
export async function fetchClientsForAccount(gymId: string): Promise<{ clients: Client[]; idMap: ClientIdMap }> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, name, initials, email, phone, goal, progress, payment_status, next_due, sessions_completed, color, gym_plans(name, price), profiles(name)"
    )
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("ERROR CARGAR CLIENTES:", error);
    return { clients: [], idMap: {} };
  }

  const idMap: ClientIdMap = {};
  const clients: Client[] = data.map((row: any, index: number) => {
    const localId = index + 1;
    idMap[localId] = row.id;
    return {
      id: localId,
      name: row.name,
      initials: row.initials,
      email: row.email ?? "",
      phone: row.phone ?? "",
      plan: row.gym_plans?.name ?? "Sin plan asignado",
      price: Number(row.gym_plans?.price ?? 0),
      trainer: row.profiles?.name ?? "Pendiente de evaluación médica",
      goal: row.goal ?? "",
      progress: row.progress ?? 0,
      payment: PAYMENT_LABELS[row.payment_status as string] ?? "Pendiente",
      nextDue: formatDate(row.next_due),
      sessions: row.sessions_completed ?? 0,
      lastUpdate: "Sincronizado con tu base de datos",
      color: row.color ?? "amber",
    };
  });

  return { clients, idMap };
}

/**
 * Marca un cliente como "Al día" directamente en Supabase, y devuelve
 * la nueva fecha de vencimiento ya formateada para mostrarla en pantalla.
 */
export async function markClientPaidInSupabase(clientUuid: string): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const nextDue = new Date();
  nextDue.setMonth(nextDue.getMonth() + 1);

  const { error } = await supabase
    .from("clients")
    .update({ payment_status: "al_dia", next_due: nextDue.toISOString() })
    .eq("id", clientUuid);

  if (error) {
    console.error("ERROR CONFIRMAR PAGO:", error);
    throw new Error(error.message);
  }

  return formatDate(nextDue.toISOString());
}
