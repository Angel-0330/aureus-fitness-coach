"use client";

// ============================================================================
// Trae el equipo real del gimnasio (tabla profiles) y maneja crear/editar
// cuentas de acceso. Crear y suspender cuentas necesita la llave de
// administrador de Supabase, así que esas dos acciones pasan por rutas de
// servidor (app/api/staff) en vez de hacerse directo desde el navegador.
// ============================================================================
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Role, StaffMember } from "@/app/aureus/types";

export type StaffIdMap = Record<number, string>;

const STATUS_LABELS: Record<string, StaffMember["status"]> = {
  active: "Activo",
  invited: "Invitación enviada",
  suspended: "Suspendido",
};

const STATUS_VALUES: Record<StaffMember["status"], string> = {
  Activo: "active",
  "Invitación enviada": "invited",
  Suspendido: "suspended",
};

export async function fetchStaffForGym(gymId: string): Promise<{ staff: StaffMember[]; idMap: StaffIdMap }> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, role, status, initials")
    .eq("gym_id", gymId)
    .order("role", { ascending: true });

  if (error || !data) {
    console.error("ERROR CARGAR EQUIPO:", error);
    return { staff: [], idMap: {} };
  }

  const idMap: StaffIdMap = {};
  const staff: StaffMember[] = data.map((row: any, index: number) => {
    const localId = index + 1;
    idMap[localId] = row.id;
    return {
      id: localId,
      name: row.name,
      email: row.email,
      role: row.role as Role,
      status: STATUS_LABELS[row.status as string] ?? "Activo",
      initials: row.initials,
    };
  });

  return { staff, idMap };
}

/**
 * Crea una cuenta de acceso real (usuario + contraseña temporal) para un
 * nuevo miembro del equipo.
 */
export async function createStaffAccount(input: { name: string; email: string; role: Role; password: string }): Promise<{ realId: string }> {
  const response = await fetch("/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? "No se pudo crear la cuenta");
  }
  return { realId: data.id };
}

/**
 * Actualiza el rol y estado de una cuenta existente. Si el estado pasa a
 * "Suspendido", también se bloquea el acceso real de esa persona.
 */
export async function updateStaffAccountReal(memberRealId: string, updates: { role: Role; status: StaffMember["status"] }): Promise<void> {
  const response = await fetch(`/api/staff/${memberRealId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: updates.role, status: STATUS_VALUES[updates.status] }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error ?? "No se pudo actualizar la cuenta");
  }
}