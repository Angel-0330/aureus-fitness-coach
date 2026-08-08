"use client";

// ============================================================================
// Registro completo de un cliente nuevo.
// ----------------------------------------------------------------------------
// Cuando el dueño o la secretaria registra a alguien, tres cosas tienen que
// pasar en la base de datos, en este orden:
//   1. Se crea el cliente en la tabla `clients`.
//   2. Se crea un expediente médico VACÍO para ese cliente (listo para que
//      lo llene el dueño más adelante — eso es el siguiente módulo que
//      vamos a construir).
//   3. Se agenda la cita de evaluación médica inicial.
//
// Por ahora, el CONTENIDO del expediente médico (los 40+ campos, el
// cuestionario de salud, etc.) sigue siendo local/de prueba — solo estamos
// creando el "espacio" real en la base de datos para que exista desde ya.
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
  medicalAppointmentTime: string
): Promise<string> {
  const supabase = createSupabaseBrowserClient();

  // 1. Buscar el plan por nombre, para guardar su id real (si existe).
  const { data: plan } = await supabase
    .from("gym_plans")
    .select("id")
    .eq("gym_id", gymId)
    .eq("name", input.planName)
    .maybeSingle();

  // 2. Crear el cliente.
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
      payment_status: "pendiente",
      color: "amber",
    })
    .select("id")
    .single();

  if (clientError || !client) {
    console.error("ERROR REGISTRAR CLIENTE:", clientError);
    throw new Error(clientError?.message ?? "No se pudo registrar el cliente.");
  }

  // 3. Crear el expediente médico vacío, enlazado a ese cliente.
  const { error: recordError } = await supabase.from("client_medical_records").insert({
    client_id: client.id,
    gym_id: gymId,
    medical_assessment_status: "pendiente",
    medical_appointment_time: medicalAppointmentTime,
  });

  if (recordError) {
    // No detenemos el registro por esto — el cliente ya existe — pero sí
    // lo dejamos anotado en la consola para poder revisarlo.
    console.error("ERROR CREAR EXPEDIENTE INICIAL:", recordError);
  }

  // 4. Agendar la cita de evaluación médica inicial (para mañana, a la
  //    hora indicada). El módulo de Agenda completo se conecta más
  //    adelante — este es solo el primer registro real en esa tabla.
  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + 1);
  const [hours, minutes] = medicalAppointmentTime.split(":").map(Number);
  scheduledAt.setHours(hours ?? 9, minutes ?? 0, 0, 0);

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

  return client.id as string;
}
