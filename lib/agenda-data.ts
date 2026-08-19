"use client";

// ============================================================================
// Trae y guarda las citas/sesiones reales de la agenda (tabla
// agenda_sessions). En la base de datos cada cita guarda fecha y hora
// completas (scheduled_at); la pantalla solo trabaja con la hora ("09:00"),
// así que aquí se traduce en ambos sentidos, conservando la fecha original
// al actualizar para no moverla sin querer.
// ============================================================================
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { AgendaSession, Client, Trainer } from "@/app/aureus/types";
import type { ClientIdMap } from "@/lib/clients-data";

export type SessionIdMap = Record<number, string>;

const STATUS_LABELS: Record<string, AgendaSession["status"]> = {
  confirmada: "Confirmada",
  pendiente: "Pendiente",
};

const STATUS_VALUES: Record<AgendaSession["status"], string> = {
  Confirmada: "confirmada",
  Pendiente: "pendiente",
};

const TYPE_LABELS: Record<string, AgendaSession["type"]> = {
  entrenamiento: "Entrenamiento",
  evaluacion_medica: "Evaluación médica",
};

const TYPE_VALUES: Record<string, string> = {
  Entrenamiento: "entrenamiento",
  "Evaluación médica": "evaluacion_medica",
};

function timeFromISO(value: string): string {
  try {
    const date = new Date(value);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "09:00";
  }
}

export async function fetchSessionsForGym(
  gymId: string,
  clientIdMap: ClientIdMap,
  clients: Client[],
  trainers: Trainer[]
): Promise<{ sessions: AgendaSession[]; idMap: SessionIdMap; scheduledAtMap: Record<number, string> }> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("agenda_sessions")
    .select("id, client_id, trainer_id, scheduled_at, focus, status, type, owner_only, profiles(name)")
    .eq("gym_id", gymId)
    .order("scheduled_at", { ascending: true });

  if (error || !data) {
    console.error("ERROR CARGAR AGENDA:", error);
    return { sessions: [], idMap: {}, scheduledAtMap: {} };
  }

  const realToLocalClient: Record<string, number> = {};
  Object.entries(clientIdMap).forEach(([localId, realId]) => {
    realToLocalClient[realId] = Number(localId);
  });

  const idMap: SessionIdMap = {};
  const scheduledAtMap: Record<number, string> = {};
  const sessions: AgendaSession[] = [];

  data.forEach((row: any, index: number) => {
    const localClientId = realToLocalClient[row.client_id];
    if (!localClientId) return;
    const client = clients.find((item) => item.id === localClientId);
    const localId = index + 1;
    idMap[localId] = row.id;
    scheduledAtMap[localId] = row.scheduled_at;
    sessions.push({
      id: localId,
      time: timeFromISO(row.scheduled_at),
      clientId: localClientId,
      clientName: client?.name ?? "Cliente",
      focus: row.focus ?? "",
      trainer: row.profiles?.name ?? client?.trainer ?? "Pendiente de evaluación médica",
      status: STATUS_LABELS[row.status as string] ?? "Pendiente",
      type: TYPE_LABELS[row.type as string] ?? "Entrenamiento",
      ownerOnly: row.owner_only ?? false,
    });
  });

  return { sessions, idMap, scheduledAtMap };
}

/**
 * Crea o actualiza una cita. Devuelve el UUID real de la cita guardada.
 * Si la cita ya existía, conserva su fecha original y solo cambia la hora.
 */
export async function saveSessionToSupabase(
  gymId: string,
  session: AgendaSession,
  clientRealId: string,
  trainerRealId: string | null,
  realId?: string,
  existingScheduledAt?: string
): Promise<{ realId: string; scheduledAt: string }> {
  const supabase = createSupabaseBrowserClient();

  // Conserva la fecha original si la cita ya existía; si es nueva, se
  // agenda para hoy a la hora indicada.
  const baseDate = existingScheduledAt ? new Date(existingScheduledAt) : new Date();
  const [hours, minutes] = session.time.split(":").map(Number);
  baseDate.setHours(hours ?? 9, minutes ?? 0, 0, 0);
  const scheduledAt = baseDate.toISOString();

  const payload = {
    gym_id: gymId,
    client_id: clientRealId,
    trainer_id: trainerRealId,
    scheduled_at: scheduledAt,
    focus: session.focus,
    status: STATUS_VALUES[session.status] ?? "pendiente",
    type: TYPE_VALUES[session.type ?? "Entrenamiento"] ?? "entrenamiento",
    owner_only: session.ownerOnly ?? false,
  };

  if (realId) {
    const { error } = await supabase.from("agenda_sessions").update(payload).eq("id", realId);
    if (error) {
      console.error("ERROR GUARDAR CITA:", error);
      throw new Error(error.message);
    }
    return { realId, scheduledAt };
  }

  const { data, error } = await supabase.from("agenda_sessions").insert(payload).select("id").single();
  if (error || !data) {
    console.error("ERROR CREAR CITA:", error);
    throw new Error(error?.message ?? "No se pudo guardar la cita");
  }
  return { realId: data.id, scheduledAt };
}

/**
 * Asigna un entrenador a un cliente en la tabla clients (esto es lo que
 * hace que el cliente aparezca en "Mis clientes" de ese entrenador).
 */
export async function assignTrainerToClient(clientRealId: string, trainerRealId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("clients").update({ trainer_id: trainerRealId }).eq("id", clientRealId);
  if (error) {
    console.error("ERROR ASIGNAR ENTRENADOR:", error);
    throw new Error(error.message);
  }
}