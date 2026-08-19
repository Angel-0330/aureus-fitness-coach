// ============================================================================
// Qué parte del expediente puede VER y qué parte puede EDITAR cada rol.
//
// Esto se aplica en el SERVIDOR, no en la pantalla. Ocultar campos en la
// interfaz no protege nada: cualquiera puede abrir las herramientas del
// navegador y leer lo que el servidor haya enviado. Por eso los campos que
// un rol no debe ver nunca salen de aquí.
//
//   Secretaria → solo datos administrativos (identificación, contacto de
//                emergencia, motivo de ingreso).
//   Entrenador → administrativos + clínicos que necesita para entrenar
//                seguro + programa. NUNCA las notas privadas de dirección.
//   Dueño      → todo.
// ============================================================================

export type GymRole = "owner" | "secretary" | "trainer";

// Datos administrativos: los que recepción toma al inscribir.
const ADMIN_FIELDS = [
  "nationalId",
  "birthDate",
  "sex",
  "weight",
  "height",
  "emergencyContact",
  "emergencyPhone",
  "reasonForVisit",
];

// Programa de entrenamiento y evolución.
const PROGRAM_FIELDS = ["weeklyPlan", "programNotes", "evolution"];

// Información clínica. El entrenador la lee (necesita saber de alergias y
// restricciones para no lastimar a nadie) pero no la edita.
const CLINICAL_FIELDS = [
  "medicalAssessmentStatus",
  "medicalAppointmentTime",
  "assessmentDate",
  "clinicianName",
  "clinicianLicense",
  "informedConsent",
  "informationConfirmed",
  "bloodPressure",
  "restingHeartRate",
  "respiratoryRate",
  "oxygenSaturation",
  "waistCircumference",
  "bloodGlucose",
  "medicalObservations",
  "allergies",
  "familyHistory",
  "conditions",
  "medications",
  "surgeries",
  "injuries",
  "currentActivityLevel",
  "desiredExerciseIntensity",
  "lifestyleFactors",
  "screening",
  "physicalExam",
  "functionalAssessment",
  "exerciseResponse",
  "painLevel",
  "medicalClearanceStatus",
  "followUpPlan",
  "emergencyPlanReviewed",
  "recommendations",
  "restrictions",
  "treatments",
];

// Reservado a dirección.
const OWNER_ONLY_FIELDS = ["privateNotes"];

/** Campos que este rol puede recibir del servidor. */
export function visibleFields(role: GymRole): Set<string> {
  if (role === "owner") return new Set([...ADMIN_FIELDS, ...PROGRAM_FIELDS, ...CLINICAL_FIELDS, ...OWNER_ONLY_FIELDS]);
  if (role === "trainer") return new Set([...ADMIN_FIELDS, ...PROGRAM_FIELDS, ...CLINICAL_FIELDS]);
  return new Set(ADMIN_FIELDS);
}

/** Campos que este rol puede guardar. Los demás se ignoran en silencio. */
export function writableFields(role: GymRole): Set<string> {
  if (role === "owner") return new Set([...ADMIN_FIELDS, ...PROGRAM_FIELDS, ...CLINICAL_FIELDS, ...OWNER_ONLY_FIELDS]);
  if (role === "trainer") return new Set(PROGRAM_FIELDS);
  return new Set(ADMIN_FIELDS);
}

/** Solo el dueño administra la lista de tratamientos. */
export function canEditTreatments(role: GymRole): boolean {
  return role === "owner";
}

// Valor vacío que se envía en lugar de un campo que el rol no puede ver.
// Se manda vacío (y no se omite) para que la pantalla no se rompa.
const EMPTY_BY_FIELD: Record<string, unknown> = {
  informedConsent: false,
  informationConfirmed: false,
  emergencyPlanReviewed: false,
  screening: {},
  treatments: [],
  weeklyPlan: [],
  evolution: [],
  medicalAssessmentStatus: "Pendiente",
  medicalClearanceStatus: "Pendiente",
};

/**
 * Devuelve una copia del expediente con los campos que este rol no puede
 * ver reemplazados por un valor vacío.
 */
export function maskRecordForRole<T extends Record<string, any>>(payload: T, role: GymRole): T {
  const allowed = visibleFields(role);
  const masked: Record<string, any> = { ...payload };
  for (const key of Object.keys(masked)) {
    if (key === "clientId") continue;
    if (allowed.has(key)) continue;
    masked[key] = EMPTY_BY_FIELD[key] ?? "";
  }
  return masked as T;
}