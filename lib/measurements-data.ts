"use client";

// ============================================================================
// Trae y guarda las medidas corporales reales (tabla measurements). Cada
// medida pertenece a un cliente real (UUID); se traduce al id local del
// cliente usando el mismo clientIdMap que ya arma lib/clients-data.ts. El
// id de cada medida también se traduce a un id local con su propio idMap,
// igual que se hace con planes y clientes.
// ============================================================================
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { MeasurementRecord } from "@/app/aureus/types";
import type { ClientIdMap } from "@/lib/clients-data";

export type MeasurementIdMap = Record<number, string>;

export async function fetchMeasurementsForGym(gymId: string, clientIdMap: ClientIdMap): Promise<{ measurements: MeasurementRecord[]; idMap: MeasurementIdMap }> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("measurements")
    .select("id, client_id, date, weight, calf, thigh, glute, waist, arm")
    .eq("gym_id", gymId)
    .order("date", { ascending: false });

  if (error || !data) {
    console.error("ERROR CARGAR MEDIDAS:", error);
    return { measurements: [], idMap: {} };
  }

  const realToLocalClientId: Record<string, number> = {};
  Object.entries(clientIdMap).forEach(([localId, realId]) => {
    realToLocalClientId[realId] = Number(localId);
  });

  const idMap: MeasurementIdMap = {};
  const measurements: MeasurementRecord[] = [];

  data.forEach((row: any, index: number) => {
    const localClientId = realToLocalClientId[row.client_id];
    if (!localClientId) return;
    const localId = index + 1;
    idMap[localId] = row.id;
    measurements.push({
      id: localId,
      clientId: localClientId,
      date: row.date ? String(row.date).slice(0, 10) : "",
      weight: Number(row.weight),
      calf: Number(row.calf),
      thigh: Number(row.thigh),
      glute: Number(row.glute),
      waist: Number(row.waist),
      arm: Number(row.arm),
    });
  });

  return { measurements, idMap };
}

/**
 * Crea o actualiza una medida. Si realId viene vacío, se crea una nueva y
 * se devuelve su UUID real; si viene con valor, se actualiza esa medida.
 */
export async function saveMeasurementToSupabase(gymId: string, clientRealId: string, record: MeasurementRecord, realId?: string): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const payload = {
    gym_id: gymId,
    client_id: clientRealId,
    date: record.date,
    weight: record.weight,
    calf: record.calf,
    thigh: record.thigh,
    glute: record.glute,
    waist: record.waist,
    arm: record.arm,
  };

  if (realId) {
    const { error } = await supabase.from("measurements").update(payload).eq("id", realId);
    if (error) {
      console.error("ERROR GUARDAR MEDIDA:", error);
      throw new Error(error.message);
    }
    return realId;
  }

  const { data, error } = await supabase.from("measurements").insert(payload).select("id").single();
  if (error || !data) {
    console.error("ERROR CREAR MEDIDA:", error);
    throw new Error(error?.message ?? "No se pudo guardar la medida");
  }
  return data.id;
}