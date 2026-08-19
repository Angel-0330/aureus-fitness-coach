// ============================================================================
// GET  /api/medical-records/:clientId  — trae el expediente completo.
// PUT  /api/medical-records/:clientId  — guarda cambios al expediente y
//                                        sincroniza los tratamientos.
// ----------------------------------------------------------------------------
// Seguridad en capas:
//   1. Sesión válida.
//   2. Límite de peticiones.
//   3. RLS decide qué FILAS puede tocar el dueño y el entrenador.
//   4. La SECRETARIA no tiene acceso RLS a esta tabla a propósito: no puede
//      consultarla desde el navegador ni con herramientas de desarrollador.
//      Su acceso pasa solo por aquí, y solo a los campos administrativos.
//   5. Las NOTAS PRIVADAS viven en su propia tabla (client_private_notes)
//      con acceso exclusivo del dueño. Así lo garantiza Postgres, no este
//      código: aunque el entrenador consulte la tabla directo, no recibe
//      nada.
//   6. lib/medical-record-visibility decide qué COLUMNAS ve y escribe cada
//      rol (RLS trabaja por fila, no por columna).
//   7. Cifrado/descifrado de la cédula.
//
// Al guardar solo se aplican los campos que el rol tiene permitido escribir.
// Así, cuando la secretaria guarda la ficha administrativa, los datos
// clínicos que ella nunca recibió no se borran.
// ============================================================================
import { cookies } from "next/headers";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { checkRateLimit, medicalLimiter } from "@/lib/rate-limit";
import { decryptField, encryptField } from "@/lib/crypto";
import { canEditTreatments, maskRecordForRole, writableFields, type GymRole } from "@/lib/medical-record-visibility";

const ASSESSMENT_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  completada: "Completada",
  requiere_seguimiento: "Requiere seguimiento",
};

const CLEARANCE_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  apto_sin_restricciones: "Apto sin restricciones",
  apto_con_restricciones: "Apto con restricciones",
  requiere_evaluacion_adicional: "Requiere evaluación adicional",
  no_apto_temporalmente: "No apto temporalmente",
};

const TREATMENT_AREA_LABELS: Record<string, string> = {
  entrenamiento: "Entrenamiento",
  nutricion: "Nutrición",
  fisioterapia: "Fisioterapia",
  medicina: "Medicina",
};

const TREATMENT_STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  seguimiento: "Seguimiento",
  finalizado: "Finalizado",
};

function invert(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key]));
}

const ASSESSMENT_STATUS_VALUES = invert(ASSESSMENT_STATUS_LABELS);
const CLEARANCE_STATUS_VALUES = invert(CLEARANCE_STATUS_LABELS);
const TREATMENT_AREA_VALUES = invert(TREATMENT_AREA_LABELS);
const TREATMENT_STATUS_VALUES = invert(TREATMENT_STATUS_LABELS);

const DEFAULT_WEEKLY_PLAN = [
  { day: "Lunes", plan: "", duration: "" },
  { day: "Martes", plan: "", duration: "" },
  { day: "Miércoles", plan: "", duration: "" },
  { day: "Jueves", plan: "", duration: "" },
  { day: "Viernes", plan: "", duration: "" },
];

const EMPTY_SCREENING = {
  activityRestrictedByDoctor: "Sin responder",
  knownCardiovascularMetabolicRenalDisease: "Sin responder",
  exertionalChestPain: "Sin responder",
  dizzinessOrSyncope: "Sin responder",
  unusualBreathlessnessOrFatigue: "Sin responder",
  palpitations: "Sin responder",
  prematureFamilyCardiacHistory: "Sin responder",
  musculoskeletalLimitation: "Sin responder",
  pregnancyOrPostpartum: "Sin responder",
};

async function getAuthedContext() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient({
    get: (name) => cookieStore.get(name)?.value,
    set: (name, value, options) => cookieStore.set(name, value, options),
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as GymRole | null, gymId: null as string | null };

  const { data: profile } = await supabase.from("profiles").select("role, gym_id").eq("id", user.id).single();
  return {
    supabase,
    user,
    role: (profile?.role as GymRole) ?? null,
    gymId: (profile?.gym_id as string) ?? null,
  };
}

/**
 * Elige con qué cliente de base de datos trabajar. El dueño y el entrenador
 * usan su propia sesión, para que RLS siga siendo la red de seguridad. La
 * secretaria no tiene RLS sobre esta tabla, así que se usa la llave de
 * administrador — pero antes se comprueba a mano que el cliente sea de su
 * gimnasio. Devuelve null si no debe tener acceso.
 */
async function resolveDb(supabase: any, role: GymRole, gymId: string | null, clientId: string) {
  if (role !== "secretary") return supabase;
  if (!gymId) return null;
  const admin = createSupabaseAdminClient();
  const { data: owned } = await admin
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("gym_id", gymId)
    .maybeSingle();
  return owned ? admin : null;
}

async function loadRecordPayload(db: any, clientId: string, role: GymRole) {
  const [{ data: record, error }, { data: treatments }] = await Promise.all([
    db.from("client_medical_records").select("*").eq("client_id", clientId).single(),
    db.from("client_treatments").select("*").eq("client_id", clientId),
  ]);

  if (error || !record) return null;

  // Las notas privadas solo se consultan si quien pregunta es el dueño.
  let privateNotes = "";
  if (role === "owner") {
    const { data: noteRow } = await db
      .from("client_private_notes")
      .select("note")
      .eq("client_id", clientId)
      .maybeSingle();
    privateNotes = noteRow?.note ?? "";
  }

  const nationalId = record.national_id_encrypted ? decryptField(record.national_id_encrypted) : "";

  return {
    medicalAssessmentStatus: ASSESSMENT_STATUS_LABELS[record.medical_assessment_status] ?? "Pendiente",
    medicalAppointmentTime: record.medical_appointment_time ?? "",
    assessmentDate: record.assessment_date ?? "",
    clinicianName: record.clinician_name ?? "",
    clinicianLicense: record.clinician_license ?? "",
    informedConsent: record.informed_consent ?? false,
    informationConfirmed: record.information_confirmed ?? false,
    bloodPressure: record.blood_pressure ?? "",
    restingHeartRate: record.resting_heart_rate ?? "",
    respiratoryRate: record.respiratory_rate ?? "",
    oxygenSaturation: record.oxygen_saturation ?? "",
    waistCircumference: record.waist_circumference ?? "",
    bloodGlucose: record.blood_glucose ?? "",
    nationalId,
    birthDate: record.birth_date ?? "",
    sex: record.sex ?? "",
    weight: record.weight ?? "",
    height: record.height ?? "",
    emergencyContact: record.emergency_contact ?? "",
    emergencyPhone: record.emergency_phone ?? "",
    reasonForVisit: record.reason_for_visit ?? "",
    medicalObservations: record.medical_observations ?? "",
    allergies: record.allergies ?? "",
    familyHistory: record.family_history ?? "",
    conditions: record.conditions ?? "",
    medications: record.medications ?? "",
    surgeries: record.surgeries ?? "",
    injuries: record.injuries ?? "",
    currentActivityLevel: record.current_activity_level ?? "",
    desiredExerciseIntensity: record.desired_exercise_intensity ?? "",
    lifestyleFactors: record.lifestyle_factors ?? "",
    screening: { ...EMPTY_SCREENING, ...(record.screening ?? {}) },
    physicalExam: record.physical_exam ?? "",
    functionalAssessment: record.functional_assessment ?? "",
    exerciseResponse: record.exercise_response ?? "",
    painLevel: record.pain_level ?? "",
    medicalClearanceStatus: CLEARANCE_STATUS_LABELS[record.medical_clearance_status] ?? "Pendiente",
    followUpPlan: record.follow_up_plan ?? "",
    emergencyPlanReviewed: record.emergency_plan_reviewed ?? false,
    recommendations: record.recommendations ?? "",
    restrictions: record.restrictions ?? "",
    privateNotes,
    treatments: (treatments ?? []).map((item: any) => ({
      id: item.id,
      area: TREATMENT_AREA_LABELS[item.area] ?? "Entrenamiento",
      summary: item.summary ?? "",
      professional: "",
      status: TREATMENT_STATUS_LABELS[item.status] ?? "Activo",
    })),
    weeklyPlan: record.weekly_plan && record.weekly_plan.length > 0 ? record.weekly_plan : DEFAULT_WEEKLY_PLAN,
    programNotes: record.program_notes ?? "",
    evolution: record.evolution ?? [],
  };
}

export async function GET(request: Request, { params }: { params: { clientId: string } }) {
  const { supabase, user, role, gymId } = await getAuthedContext();

  if (!user || !role) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const { success } = await checkRateLimit(medicalLimiter, user.id);
  if (!success) {
    return Response.json({ error: "Demasiadas peticiones. Intenta de nuevo en un minuto." }, { status: 429 });
  }

  const db = await resolveDb(supabase, role, gymId, params.clientId);
  if (!db) {
    return Response.json({ error: "Expediente no encontrado o sin permiso" }, { status: 404 });
  }

  const payload = await loadRecordPayload(db, params.clientId, role);

  if (!payload) {
    return Response.json({ error: "Expediente no encontrado o sin permiso" }, { status: 404 });
  }

  return Response.json(maskRecordForRole(payload, role));
}

export async function PUT(request: Request, { params }: { params: { clientId: string } }) {
  const { supabase, user, role, gymId } = await getAuthedContext();

  if (!user || !role) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const { success } = await checkRateLimit(medicalLimiter, user.id);
  if (!success) {
    return Response.json({ error: "Demasiadas peticiones. Intenta de nuevo en un minuto." }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const db = await resolveDb(supabase, role, gymId, params.clientId);
  if (!db) {
    return Response.json({ error: "Expediente no encontrado o sin permiso" }, { status: 404 });
  }

  const { data: existingRecord } = await db
    .from("client_medical_records")
    .select("gym_id")
    .eq("client_id", params.clientId)
    .single();

  if (!existingRecord) {
    return Response.json({ error: "Expediente no encontrado o sin permiso" }, { status: 404 });
  }

  // Solo se guardan los campos que este rol tiene permitido escribir. Lo
  // demás se ignora, aunque venga en la petición.
  const allowed = writableFields(role);
  const updates: Record<string, unknown> = {};
  const put = (field: string, column: string, value: unknown) => {
    if (allowed.has(field)) updates[column] = value;
  };

  put("medicalAssessmentStatus", "medical_assessment_status", ASSESSMENT_STATUS_VALUES[body.medicalAssessmentStatus] ?? "pendiente");
  put("medicalAppointmentTime", "medical_appointment_time", body.medicalAppointmentTime || null);
  put("assessmentDate", "assessment_date", body.assessmentDate || null);
  put("clinicianName", "clinician_name", body.clinicianName ?? "");
  put("clinicianLicense", "clinician_license", body.clinicianLicense ?? "");
  put("informedConsent", "informed_consent", Boolean(body.informedConsent));
  put("informationConfirmed", "information_confirmed", Boolean(body.informationConfirmed));
  put("bloodPressure", "blood_pressure", body.bloodPressure ?? "");
  put("restingHeartRate", "resting_heart_rate", body.restingHeartRate ?? "");
  put("respiratoryRate", "respiratory_rate", body.respiratoryRate ?? "");
  put("oxygenSaturation", "oxygen_saturation", body.oxygenSaturation ?? "");
  put("waistCircumference", "waist_circumference", body.waistCircumference ?? "");
  put("bloodGlucose", "blood_glucose", body.bloodGlucose ?? "");
  put("birthDate", "birth_date", body.birthDate || null);
  put("sex", "sex", body.sex ?? "");
  put("weight", "weight", body.weight ?? "");
  put("height", "height", body.height ?? "");
  put("emergencyContact", "emergency_contact", body.emergencyContact ?? "");
  put("emergencyPhone", "emergency_phone", body.emergencyPhone ?? "");
  put("reasonForVisit", "reason_for_visit", body.reasonForVisit ?? "");
  put("medicalObservations", "medical_observations", body.medicalObservations ?? "");
  put("allergies", "allergies", body.allergies ?? "");
  put("familyHistory", "family_history", body.familyHistory ?? "");
  put("conditions", "conditions", body.conditions ?? "");
  put("medications", "medications", body.medications ?? "");
  put("surgeries", "surgeries", body.surgeries ?? "");
  put("injuries", "injuries", body.injuries ?? "");
  put("currentActivityLevel", "current_activity_level", body.currentActivityLevel ?? "");
  put("desiredExerciseIntensity", "desired_exercise_intensity", body.desiredExerciseIntensity ?? "");
  put("lifestyleFactors", "lifestyle_factors", body.lifestyleFactors ?? "");
  put("screening", "screening", body.screening ?? {});
  put("physicalExam", "physical_exam", body.physicalExam ?? "");
  put("functionalAssessment", "functional_assessment", body.functionalAssessment ?? "");
  put("exerciseResponse", "exercise_response", body.exerciseResponse ?? "");
  put("painLevel", "pain_level", body.painLevel ?? "");
  put("medicalClearanceStatus", "medical_clearance_status", CLEARANCE_STATUS_VALUES[body.medicalClearanceStatus] ?? "pendiente");
  put("followUpPlan", "follow_up_plan", body.followUpPlan ?? "");
  put("emergencyPlanReviewed", "emergency_plan_reviewed", Boolean(body.emergencyPlanReviewed));
  put("recommendations", "recommendations", body.recommendations ?? "");
  put("restrictions", "restrictions", body.restrictions ?? "");
  put("weeklyPlan", "weekly_plan", body.weeklyPlan ?? []);
  put("programNotes", "program_notes", body.programNotes ?? "");
  put("evolution", "evolution", body.evolution ?? []);

  if (allowed.has("nationalId") && typeof body.nationalId === "string") {
    updates.national_id_encrypted = body.nationalId ? encryptField(body.nationalId) : "";
  }

  if (Object.keys(updates).length > 0) {
    const { error: recordError } = await db
      .from("client_medical_records")
      .update(updates)
      .eq("client_id", params.clientId);

    if (recordError) {
      return Response.json({ error: "No se pudo guardar el expediente" }, { status: 500 });
    }
  }

  // Las notas privadas van a su propia tabla, y solo el dueño las escribe.
  if (role === "owner" && typeof body.privateNotes === "string") {
    const { error: noteError } = await db.from("client_private_notes").upsert({
      client_id: params.clientId,
      gym_id: existingRecord.gym_id,
      note: body.privateNotes,
      updated_at: new Date().toISOString(),
    });
    if (noteError) console.error("ERROR GUARDAR NOTA PRIVADA:", noteError);
  }

  // Los tratamientos solo los administra el dueño. Si otro rol guarda la
  // ficha, la lista se deja intacta en vez de borrarse.
  if (canEditTreatments(role)) {
    await db.from("client_treatments").delete().eq("client_id", params.clientId);

    if (Array.isArray(body.treatments) && body.treatments.length > 0) {
      const rows = body.treatments.map((treatment: any) => ({
        client_id: params.clientId,
        gym_id: existingRecord.gym_id,
        area: TREATMENT_AREA_VALUES[treatment.area] ?? "entrenamiento",
        summary: treatment.summary ?? "",
        status: TREATMENT_STATUS_VALUES[treatment.status] ?? "activo",
      }));

      const { error: treatmentsError } = await db.from("client_treatments").insert(rows);
      if (treatmentsError) {
        return Response.json({ error: "El expediente se guardó, pero los tratamientos no se pudieron guardar" }, { status: 500 });
      }
    }
  }

  const payload = await loadRecordPayload(db, params.clientId, role);
  if (!payload) {
    return Response.json({ error: "No se pudo confirmar el guardado" }, { status: 500 });
  }

  return Response.json(maskRecordForRole(payload, role));
}