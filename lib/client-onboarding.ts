"use client";
// ============================================================================
// Registro completo de un cliente nuevo.
// ----------------------------------------------------------------------------
// El flujo cambia según si el gimnasio tiene la extensión Medical 360:
//
//   CON Medical 360:  cliente → expediente médico → cita de evaluación.
//                     El entrenador se asigna después, tras la evaluación.
//
//   SIN Medical 360:  cliente (con su entrenador ya asignado) → ficha de
//                     salud básica. No se agenda cita médica.
// ============================================================================
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export type NewClientInput = {
  name: string;
  email: string;
  phone: string;
  goal: string;
  planName: string;
  price: number;
};

function computeInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Registra un cliente nuevo de principio a fin. Devuelve el UUID real del
 * cliente creado, para que el resto de la app pueda enlazarlo con su id
 * local (ver lib/clients-data.ts).
 */
export async function registerNewClient(
  gymId: string,
  input: NewClientInput,
  medicalAppointmentDate: string,
  medicalAppointmentTime: string,
  options?: { medical360Enabled?: boolean; trainerRealId?: string | null }
): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const medicalEnabled = options?.medical360Enabled !== false;

  // 1. Buscar el plan por nombre, para guardar su id real (si existe).
  const { data: plan } = await supabase
    .from("gym_plans")
    .select("id")
    .eq("gym_id", gymId)
    .eq("name", input.planName)
    .maybeSingle();

  // 2. Crear el cliente. Sin Medical 360, el entrenador se asigna aquí
  //    mismo; con Medical 360 queda pendiente hasta la evaluación.
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      gym_id: gymId,
      name: input.name,
      initials: computeInitials(input.name),
      email: input.email,
      phone: input.phone,
      goal: input.goal,
      plan_id: plan?.id ?? null,
      trainer_id: medicalEnabled ? null : options?.trainerRealId ?? null,
      payment_status: "pendiente",
      color: "amber",
    })
    .select("id")
    .single();

  if (clientError || !client) {
    console.error("ERROR REGISTRAR CLIENTE:", clientError);
    throw new Error(clientError?.message ?? "No se pudo registrar el cliente.");
  }

  // 3. Crear la ficha de salud básica. Se crea siempre: incluso sin
  //    Medical 360, ahí viven peso, estatura, contacto de emergencia y el
  //    programa semanal de entrenamiento.
  const { error: recordError } = await supabase.from("client_medical_records").insert({
    client_id: client.id,
    gym_id: gymId,
    medical_assessment_status: "pendiente",
    medical_appointment_time: medicalEnabled ? `${medicalAppointmentDate} ${medicalAppointmentTime}` : null,
  });

  if (recordError) {
    // No detenemos el registro por esto — el cliente ya existe — pero sí
    // lo dejamos anotado en la consola para poder revisarlo.
    console.error("ERROR CREAR FICHA INICIAL:", recordError);
  }

  // 4. Solo con Medical 360: agendar la cita de evaluación médica en la
  //    fecha y hora exactas que se eligió a mano.
  if (medicalEnabled) {
    const scheduledAt = new Date(`${medicalAppointmentDate}T${medicalAppointmentTime}:00`);
    const { error: sessionError } = await supabase.from("agenda_sessions").insert({
      gym_id: gymId,
      client_id: client.id,
      trainer_id: null,
      scheduled_at: scheduledAt.toISOString(),
      focus: "Evaluación médica inicial",
      status: "pendiente",
      type: "evaluacion_medica",
      owner_only: true,
    });

    if (sessionError) {
      console.error("ERROR AGENDAR CITA INICIAL:", sessionError);
    }
  }

  return client.id as string;
}