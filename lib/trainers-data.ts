"use client";

// ============================================================================
// Trae los entrenadores reales del gimnasio (tabla profiles, role =
// 'trainer'), solo lectura por ahora. La cantidad de clientes asignados es
// real (se calcula contando la tabla clients). La calificación, el color y
// los cupos disponibles todavía no existen como columnas en la base de
// datos, así que se muestran valores de referencia mientras se decide cómo
// guardarlos de verdad.
//
// idMap traduce el id local de cada entrenador (1, 2, 3...) a su UUID real
// en profiles — necesario para asignar entrenadores a clientes.
// ============================================================================
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Trainer } from "@/app/aureus/types";

const COLOR_PALETTE = ["amber", "gold", "teal", "indigo", "rose"];

export type TrainerIdMap = Record<number, string>;

export async function fetchTrainersForGym(gymId: string): Promise<{ trainers: Trainer[]; idMap: TrainerIdMap }> {
  const supabase = createSupabaseBrowserClient();
  const [{ data: profiles, error }, { data: clientRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, initials, specialty, preparation, experience, availability, bio, certifications, email, phone, instagram")
      .eq("gym_id", gymId)
      .eq("role", "trainer")
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase.from("clients").select("trainer_id").eq("gym_id", gymId),
  ]);

  if (error || !profiles) {
    console.error("ERROR CARGAR ENTRENADORES:", error);
    return { trainers: [], idMap: {} };
  }

  const countByTrainer: Record<string, number> = {};
  (clientRows ?? []).forEach((row: any) => {
    if (!row.trainer_id) return;
    countByTrainer[row.trainer_id] = (countByTrainer[row.trainer_id] ?? 0) + 1;
  });

  const idMap: TrainerIdMap = {};
  const trainers: Trainer[] = profiles.map((row: any, index: number) => {
    const activeClients = countByTrainer[row.id] ?? 0;
    idMap[index + 1] = row.id;
    return {
      id: index + 1,
      name: row.name,
      initials: row.initials,
      specialty: row.specialty ?? "Sin especialidad registrada",
      preparation: row.preparation ?? "Sin preparación registrada",
      experience: row.experience ?? "Sin experiencia registrada",
      availability: row.availability ?? "Sin disponibilidad registrada",
      openSpots: Math.max(0, 8 - activeClients),
      clients: activeClients,
      rating: "Nuevo",
      color: COLOR_PALETTE[index % COLOR_PALETTE.length],
      bio: row.bio ?? "",
      certifications: row.certifications ?? [],
      email: row.email ?? "",
      phone: row.phone ?? "",
      instagram: row.instagram ?? "",
    };
  });

  return { trainers, idMap };
}