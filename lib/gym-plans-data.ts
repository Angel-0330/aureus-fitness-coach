"use client";

// ============================================================================
// Trae y guarda los planes de membresía reales del gimnasio (tabla
// gym_plans). El id local (número secuencial) se traduce al UUID real vía
// idMap, igual que ya se hace con los clientes en lib/clients-data.ts.
// ============================================================================
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { GymPlan } from "@/app/aureus/types";

export type PlanIdMap = Record<number, string>;

export async function fetchPlansForGym(gymId: string): Promise<{ plans: GymPlan[]; idMap: PlanIdMap }> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("gym_plans")
    .select("id, name, price, description, features, featured, active")
    .eq("gym_id", gymId)
    .order("price", { ascending: true });

  if (error || !data) {
    console.error("ERROR CARGAR PLANES:", error);
    return { plans: [], idMap: {} };
  }

  const idMap: PlanIdMap = {};
  const plans: GymPlan[] = data.map((row: any, index: number) => {
    const localId = index + 1;
    idMap[localId] = row.id;
    return {
      id: localId,
      name: row.name,
      price: Number(row.price),
      description: row.description ?? "",
      features: row.features ?? [],
      featured: row.featured ?? false,
      active: row.active ?? true,
    };
  });

  return { plans, idMap };
}

/**
 * Crea o actualiza un plan. Si realId viene vacío, se crea uno nuevo y se
 * devuelve su UUID real; si viene con valor, se actualiza ese plan.
 */
export async function savePlanToSupabase(gymId: string, plan: GymPlan, realId?: string): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const payload = {
    gym_id: gymId,
    name: plan.name,
    price: plan.price,
    description: plan.description,
    features: plan.features,
    featured: plan.featured,
    active: plan.active,
  };

  if (realId) {
    const { error } = await supabase.from("gym_plans").update(payload).eq("id", realId);
    if (error) {
      console.error("ERROR GUARDAR PLAN:", error);
      throw new Error(error.message);
    }
    return realId;
  }

  const { data, error } = await supabase.from("gym_plans").insert(payload).select("id").single();
  if (error || !data) {
    console.error("ERROR CREAR PLAN:", error);
    throw new Error(error?.message ?? "No se pudo crear el plan");
  }
  return data.id;
}