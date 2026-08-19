import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums (equivalentes a los "union types" de app/aureus/types.ts)
// ---------------------------------------------------------------------------
export const roleEnum = pgEnum("role", ["owner", "secretary", "trainer"]);
export const staffStatusEnum = pgEnum("staff_status", ["active", "invited", "suspended"]);
export const paymentStatusEnum = pgEnum("payment_status", ["al_dia", "pendiente", "por_vencer"]);
export const treatmentAreaEnum = pgEnum("treatment_area", ["entrenamiento", "nutricion", "fisioterapia", "medicina"]);
export const treatmentStatusEnum = pgEnum("treatment_status", ["activo", "seguimiento", "finalizado"]);
export const medicalAssessmentStatusEnum = pgEnum("medical_assessment_status", ["pendiente", "completada", "requiere_seguimiento"]);
export const medicalClearanceEnum = pgEnum("medical_clearance_status", [
  "pendiente",
  "apto_sin_restricciones",
  "apto_con_restricciones",
  "requiere_evaluacion_adicional",
  "no_apto_temporalmente",
]);
export const sessionStatusEnum = pgEnum("session_status", ["confirmada", "pendiente"]);
export const sessionTypeEnum = pgEnum("session_type", ["entrenamiento", "evaluacion_medica"]);
export const routineStatusEnum = pgEnum("routine_status", ["activa", "borrador"]);

// ---------------------------------------------------------------------------
// gyms — cada fila es un cliente de tu SaaS (un gimnasio que paga suscripción)
// ---------------------------------------------------------------------------
export const gyms = pgTable("gyms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  subscriptionPlan: text("subscription_plan").notNull().default("trial"),
  subscriptionStatus: text("subscription_status").notNull().default("trialing"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// profiles — 1 fila por cada usuario de Supabase Auth (auth.users).
// No guarda contraseñas: eso lo maneja Supabase Auth de forma segura.
// ---------------------------------------------------------------------------
export const profiles = pgTable("profiles", {
  // Mismo id que auth.users.id (se enlaza por trigger, ver migración SQL)
  id: uuid("id").primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: roleEnum("role").notNull(),
  status: staffStatusEnum("status").notNull().default("active"),
  initials: text("initials").notNull(),
  // Solo aplica a role = 'trainer'
  specialty: text("specialty"),
  preparation: text("preparation"),
  experience: text("experience"),
  availability: text("availability"),
  bio: text("bio"),
  certifications: jsonb("certifications").$type<string[]>().default([]),
  phone: text("phone"),
  instagram: text("instagram"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// gym_plans — planes de membresía que vende cada gimnasio a sus clientes
// ---------------------------------------------------------------------------
export const gymPlans = pgTable("gym_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  features: jsonb("features").$type<string[]>().default([]),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
});

// ---------------------------------------------------------------------------
// clients — clientes del gimnasio (los que entrenan)
// ---------------------------------------------------------------------------
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  email: text("email"),
  phone: text("phone"),
  planId: uuid("plan_id").references(() => gymPlans.id),
  trainerId: uuid("trainer_id").references(() => profiles.id),
  goal: text("goal"),
  progress: integer("progress").notNull().default(0),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pendiente"),
  nextDue: timestamp("next_due", { withTimezone: true }),
  sessionsCompleted: integer("sessions_completed").notNull().default(0),
  color: text("color").default("amber"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// client_medical_records — LA TABLA SENSIBLE.
// Vive separada de "clients" a propósito: así las políticas de seguridad
// (RLS) pueden ser mucho más estrictas aquí que en el resto del sistema.
// Ver supabase/migrations/0002_rls_policies.sql
// ---------------------------------------------------------------------------
export const clientMedicalRecords = pgTable("client_medical_records", {
  clientId: uuid("client_id").primaryKey().references(() => clients.id, { onDelete: "cascade" }),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),

  medicalAssessmentStatus: medicalAssessmentStatusEnum("medical_assessment_status").notNull().default("pendiente"),
  medicalAppointmentTime: text("medical_appointment_time"),
  assessmentDate: timestamp("assessment_date", { withTimezone: true }),
  clinicianName: text("clinician_name"),
  clinicianLicense: text("clinician_license"),
  informedConsent: boolean("informed_consent").notNull().default(false),
  informationConfirmed: boolean("information_confirmed").notNull().default(false),

  // Signos vitales / antropometría
  bloodPressure: text("blood_pressure"),
  restingHeartRate: text("resting_heart_rate"),
  respiratoryRate: text("respiratory_rate"),
  oxygenSaturation: text("oxygen_saturation"),
  waistCircumference: text("waist_circumference"),
  bloodGlucose: text("blood_glucose"),

  // Identificación y datos personales sensibles
  // NOTA: nationalId se cifra a nivel de aplicación antes de guardar (ver lib/crypto.ts)
  nationalIdEncrypted: text("national_id_encrypted"),
  birthDate: text("birth_date"),
  sex: text("sex"),
  weight: text("weight"),
  height: text("height"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),

  reasonForVisit: text("reason_for_visit"),
  medicalObservations: text("medical_observations"),
  allergies: text("allergies"),
  familyHistory: text("family_history"),
  conditions: text("conditions"),
  medications: text("medications"),
  surgeries: text("surgeries"),
  injuries: text("injuries"),
  currentActivityLevel: text("current_activity_level"),
  desiredExerciseIntensity: text("desired_exercise_intensity"),
  lifestyleFactors: text("lifestyle_factors"),

  physicalExam: text("physical_exam"),
  functionalAssessment: text("functional_assessment"),
  exerciseResponse: text("exercise_response"),
  painLevel: text("pain_level"),
  medicalClearanceStatus: medicalClearanceEnum("medical_clearance_status").notNull().default("pendiente"),
  followUpPlan: text("follow_up_plan"),
  emergencyPlanReviewed: boolean("emergency_plan_reviewed").notNull().default(false),
  recommendations: text("recommendations"),
  restrictions: text("restrictions"),
  privateNotes: text("private_notes"), // visible solo para 'owner', ver RLS

  // Estructuras anidadas → jsonb (screening, plan semanal, evolución)
  screening: jsonb("screening").$type<Record<string, string>>().default({}),
  weeklyPlan: jsonb("weekly_plan").$type<Array<{ day: string; plan: string; duration: string }>>().default([]),
  evolution: jsonb("evolution").$type<
    Array<{ id: number; date: string; author: string; note: string; visibility: "team" | "owner" }>
  >().default([]),
  programNotes: text("program_notes"),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// client_treatments — tratamientos/áreas de seguimiento por cliente
// ---------------------------------------------------------------------------
export const clientTreatments = pgTable("client_treatments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  area: treatmentAreaEnum("area").notNull(),
  summary: text("summary").notNull(),
  professionalId: uuid("professional_id").references(() => profiles.id),
  status: treatmentStatusEnum("status").notNull().default("activo"),
});

// ---------------------------------------------------------------------------
// measurements — mediciones corporales periódicas
// ---------------------------------------------------------------------------
export const measurements = pgTable("measurements", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  weight: numeric("weight", { precision: 6, scale: 2 }),
  calf: numeric("calf", { precision: 6, scale: 2 }),
  thigh: numeric("thigh", { precision: 6, scale: 2 }),
  glute: numeric("glute", { precision: 6, scale: 2 }),
  waist: numeric("waist", { precision: 6, scale: 2 }),
  arm: numeric("arm", { precision: 6, scale: 2 }),
});

// ---------------------------------------------------------------------------
// routines — rutinas de entrenamiento
// ---------------------------------------------------------------------------
export const routines = pgTable("routines", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  focus: text("focus"),
  daysPerWeek: integer("days_per_week").notNull().default(3),
  status: routineStatusEnum("status").notNull().default("borrador"),
  notes: text("notes"),
});

export const routineExercises = pgTable("routine_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  routineId: uuid("routine_id").notNull().references(() => routines.id, { onDelete: "cascade" }),
  block: text("block").notNull(),
  name: text("name").notNull(),
  sets: text("sets"),
  repetitions: text("repetitions"),
  rest: text("rest"),
});

// ---------------------------------------------------------------------------
// agenda_sessions — calendario de sesiones/citas
// ---------------------------------------------------------------------------
export const agendaSessions = pgTable("agenda_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  trainerId: uuid("trainer_id").references(() => profiles.id),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  focus: text("focus"),
  status: sessionStatusEnum("status").notNull().default("pendiente"),
  type: sessionTypeEnum("type").notNull().default("entrenamiento"),
  ownerOnly: boolean("owner_only").notNull().default(false),
});

// ---------------------------------------------------------------------------
// client_messages — notas/mensajes cortos del panel de recepción
// ---------------------------------------------------------------------------
export const clientMessages = pgTable("client_messages", {
  clientId: uuid("client_id").primaryKey().references(() => clients.id, { onDelete: "cascade" }),
  message: text("message").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// audit_log — bitácora de auditoría. Se llena SOLA vía triggers de Postgres
// (ver supabase/migrations/0003_audit_log.sql) cada vez que alguien
// lee/modifica un registro médico. Nadie debería insertar aquí manualmente.
// ---------------------------------------------------------------------------
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull(),
  actorId: uuid("actor_id"),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  action: text("action").notNull(), // 'insert' | 'update' | 'delete'
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relaciones (para que Drizzle pueda hacer "joins" tipados fácilmente)
// ---------------------------------------------------------------------------
export const clientsRelations = relations(clients, ({ one, many }) => ({
  gym: one(gyms, { fields: [clients.gymId], references: [gyms.id] }),
  trainer: one(profiles, { fields: [clients.trainerId], references: [profiles.id] }),
  medicalRecord: one(clientMedicalRecords, { fields: [clients.id], references: [clientMedicalRecords.clientId] }),
  treatments: many(clientTreatments),
  measurements: many(measurements),
  routines: many(routines),
}));

export const routinesRelations = relations(routines, ({ many }) => ({
  exercises: many(routineExercises),
}));