// ============================================================================
// GET /api/medical-records — trae TODOS los expedientes del gimnasio en una
// sola petición. Lo usan pantallas como "Rutinas" o "Agenda", que necesitan
// ver el expediente de varios clientes a la vez.
//
// Misma seguridad que la ruta individual: el dueño y el entrenador van con
// su propia sesión (RLS filtra las filas), la secretaria no tiene acceso
// RLS a esta tabla y pasa por la llave de administrador con el gimnasio
// verificado a mano. Las notas privadas viven en su propia tabla y solo se
// consultan si quien pregunta es el dueño. En todos los casos se recortan
// las columnas que el rol no debe ver.
// ============================================================================
import { cookies } from "next/headers";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { checkRateLimit, medicalLimiter } from "@/lib/rate-limit";
import { decryptField } from "@/lib/crypto";
import { maskRecordForRole, type GymRole } from "@/lib/medical-record-visibility";

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

export async function GET(request: Request) {
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

  const { success } = await checkRateLimit(medicalLimiter, user.id);
  if (!success) {
    return Response.json({ error: "Demasiadas peticiones. Intenta de nuevo en un minuto." }, { status: 429 });
  }

  const { data: profile } = await supabase.from("profiles").select("role, gym_id").eq("id", user.id).single();
  if (!profile) {
    return Response.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  const role = profile.role as GymRole;

  // La secretaria no tiene acceso RLS a esta tabla: su lectura pasa por la
  // llave de administrador, siempre acotada a su propio gimnasio.
  const db = role === "secretary" ? createSupabaseAdminClient() : supabase;

  const [{ data: records, error }, { data: treatments }] = await Promise.all([
    db.from("client_medical_records").select("*").eq("gym_id", profile.gym_id),
    db.from("client_treatments").select("*").eq("gym_id", profile.gym_id),
  ]);

  if (error || !records) {
    return Response.json({ error: "No se pudieron cargar los expedientes" }, { status: 500 });
  }

  // Las notas privadas solo se consultan si quien pregunta es el dueño.
  const notesByClient: Record<string, string> = {};
  if (role === "owner") {
    const { data: notes } = await db
      .from("client_private_notes")
      .select("client_id, note")
      .eq("gym_id", profile.gym_id);
    (notes ?? []).forEach((item: any) => {
      notesByClient[item.client_id] = item.note ?? "";
    });
  }

  const treatmentsByClient: Record<string, any[]> = {};
  (treatments ?? []).forEach((item: any) => {
    (treatmentsByClient[item.client_id] ??= []).push(item);
  });

  const payload = records.map((record: any) => {
    const nationalId = record.national_id_encrypted ? decryptField(record.national_id_encrypted) : "";
    const clientTreatments = treatmentsByClient[record.client_id] ?? [];

    const full = {
      clientId: record.client_id, // UUID real — el frontend lo traduce a su id local
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
      privateNotes: notesByClient[record.client_id] ?? "",
      treatments: clientTreatments.map((item: any) => ({
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

    return maskRecordForRole(full, role);
  });

  return Response.json(payload);
}