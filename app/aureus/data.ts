// Datos iniciales, navegación y configuración por rol.
import {
  Activity,
  Award,
  Building2,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
 LayoutDashboard,
  ShoppingBasket,
  UserCog,
  UserPlus,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type {
  AgendaSession,
  Client,
  ClientRecord,
  GymPlan,
  MeasurementRecord,
  Role,
  RoutinePlan,
  StaffMember,
  Trainer,
  ViewName,
} from "./types";

export const TRAINERS: Trainer[] = [
  { id: 1, name: "Marco Salas", initials: "MS", specialty: "Fuerza y acondicionamiento", preparation: "Lic. Ciencias del Deporte", experience: "8 años de experiencia", availability: "Lun. a sáb. · Mañana", openSpots: 4, clients: 12, rating: "4.9", color: "amber", bio: "Ayuda a personas de todos los niveles a ganar fuerza con una técnica segura y objetivos sostenibles.", certifications: ["Entrenamiento de fuerza", "Primeros auxilios deportivos", "Nutrición aplicada al ejercicio"], email: "marco@aureus.fit", phone: "6200-1401", instagram: "@marcosalas.fit" },
  { id: 2, name: "Valentina Ruiz", initials: "VR", specialty: "Movilidad y recuperación", preparation: "Fisioterapia deportiva", experience: "6 años de experiencia", availability: "Lun. a vie. · Tarde", openSpots: 6, clients: 9, rating: "4.8", color: "violet", bio: "Combina movimiento, recuperación y educación corporal para mejorar la comodidad y la autonomía diaria.", certifications: ["Fisioterapia deportiva", "Movilidad funcional", "Readaptación al ejercicio"], email: "valentina@aureus.fit", phone: "6200-1402", instagram: "@valentinar.movimiento" },
  { id: 3, name: "Carlos Mendoza", initials: "CM", specialty: "Rendimiento deportivo", preparation: "Preparador físico certificado", experience: "10 años de experiencia", availability: "Mar. a sáb. · Mixto", openSpots: 2, clients: 14, rating: "4.9", color: "blue", bio: "Diseña planes progresivos para deportistas que buscan mejorar rendimiento, potencia y resistencia.", certifications: ["Preparación física", "Rendimiento deportivo", "Evaluación funcional"], email: "carlos@aureus.fit", phone: "6200-1403", instagram: "@carlosm.performance" },
  { id: 4, name: "Elena Pérez", initials: "EP", specialty: "Bienestar y principiantes", preparation: "Entrenamiento funcional", experience: "5 años de experiencia", availability: "Lun. a vie. · Mañana", openSpots: 8, clients: 7, rating: "4.7", color: "green", bio: "Acompaña a personas que comienzan a entrenar con sesiones cercanas, claras y adaptadas a su ritmo.", certifications: ["Entrenamiento funcional", "Actividad física y salud", "Primeros auxilios"], email: "elena@aureus.fit", phone: "6200-1404", instagram: "@elenaperez.activa" },
];

export const INITIAL_CLIENTS: Client[] = [
  { id: 1, name: "Lucía Torres", initials: "LT", email: "lucia@email.com", phone: "6123-4412", plan: "Elite", price: 65, trainer: "Marco Salas", goal: "Fuerza funcional", progress: 82, payment: "Al día", nextDue: "05 ago.", sessions: 18, lastUpdate: "Hoy", color: "amber" },
  { id: 2, name: "Daniel Ríos", initials: "DR", email: "daniel@email.com", phone: "6771-2308", plan: "Performance", price: 50, trainer: "Carlos Mendoza", goal: "Rendimiento general", progress: 68, payment: "Pendiente", nextDue: "22 jul.", sessions: 12, lastUpdate: "Hace 2 días", color: "blue" },
  { id: 3, name: "Amelia Gómez", initials: "AG", email: "amelia@email.com", phone: "6502-1184", plan: "Elite", price: 65, trainer: "Valentina Ruiz", goal: "Movilidad y bienestar", progress: 91, payment: "Al día", nextDue: "09 ago.", sessions: 22, lastUpdate: "Ayer", color: "violet" },
  { id: 4, name: "Miguel Vega", initials: "MV", email: "miguel@email.com", phone: "6990-4411", plan: "Performance", price: 50, trainer: "Marco Salas", goal: "Acondicionamiento", progress: 74, payment: "Por vencer", nextDue: "25 jul.", sessions: 15, lastUpdate: "Hoy", color: "green" },
  { id: 5, name: "Sara Castillo", initials: "SC", email: "sara@email.com", phone: "6208-9031", plan: "Base", price: 35, trainer: "Elena Pérez", goal: "Hábitos activos", progress: 55, payment: "Pendiente", nextDue: "20 jul.", sessions: 8, lastUpdate: "Hace 3 días", color: "violet" },
  { id: 6, name: "Javier Núñez", initials: "JN", email: "javier@email.com", phone: "6881-1034", plan: "Elite", price: 65, trainer: "Carlos Mendoza", goal: "Preparación deportiva", progress: 79, payment: "Al día", nextDue: "12 ago.", sessions: 20, lastUpdate: "Ayer", color: "blue" },
  { id: 7, name: "Andrea López", initials: "AL", email: "andrea@email.com", phone: "6338-7741", plan: "Base", price: 35, trainer: "Elena Pérez", goal: "Movilidad general", progress: 61, payment: "Al día", nextDue: "01 ago.", sessions: 10, lastUpdate: "Hace 2 días", color: "green" },
  { id: 8, name: "Roberto Díaz", initials: "RD", email: "roberto@email.com", phone: "6550-8871", plan: "Performance", price: 50, trainer: "Marco Salas", goal: "Fuerza y resistencia", progress: 47, payment: "Por vencer", nextDue: "27 jul.", sessions: 7, lastUpdate: "Hace 4 días", color: "amber" },
];

const WEEKDAYS: ClientRecord["weeklyPlan"][number]["day"][] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export function createClientRecord(client: Client, overrides: Partial<ClientRecord> = {}): ClientRecord {
  const awaitingMedicalAssessment = client.trainer === "Pendiente de evaluación médica";
  return {
    clientId: client.id,
    medicalAssessmentStatus: awaitingMedicalAssessment ? "Pendiente" : "Completada",
    medicalAppointmentTime: "",
    assessmentDate: "",
    clinicianName: "",
    clinicianLicense: "",
    informedConsent: false,
    informationConfirmed: false,
    bloodPressure: "",
    restingHeartRate: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    waistCircumference: "",
    bloodGlucose: "",
    medicalObservations: "",
    allergies: "Sin alergias registradas.",
    familyHistory: "Sin antecedentes familiares registrados.",
    currentActivityLevel: "Sedentario o inactivo",
    desiredExerciseIntensity: "Ligera a moderada",
    lifestyleFactors: "",
    screening: {
      activityRestrictedByDoctor: "Sin responder",
      knownCardiovascularMetabolicRenalDisease: "Sin responder",
      exertionalChestPain: "Sin responder",
      dizzinessOrSyncope: "Sin responder",
      unusualBreathlessnessOrFatigue: "Sin responder",
      palpitations: "Sin responder",
      prematureFamilyCardiacHistory: "Sin responder",
      musculoskeletalLimitation: "Sin responder",
      pregnancyOrPostpartum: "Sin responder",
    },
    physicalExam: "",
    functionalAssessment: "",
    exerciseResponse: "",
    painLevel: "0",
    medicalClearanceStatus: awaitingMedicalAssessment ? "Pendiente" : "Apto sin restricciones",
    followUpPlan: "",
    emergencyPlanReviewed: false,
    nationalId: "",
    birthDate: "",
    sex: "",
    weight: "",
    height: "",
    emergencyContact: "",
    emergencyPhone: "",
    reasonForVisit: client.goal,
    conditions: "Sin antecedentes registrados.",
    medications: "Sin medicamentos registrados.",
    surgeries: "Sin cirugías registradas.",
    injuries: "Sin lesiones registradas.",
    recommendations: "Mantener una progresión gradual y registrar cualquier molestia.",
    restrictions: "Sin restricciones registradas.",
    privateNotes: "",
    treatments: awaitingMedicalAssessment ? [] : [
      { id: 1, area: "Entrenamiento", summary: "Programa de actividad física según objetivo inicial.", professional: client.trainer, status: "Activo" },
    ],
    weeklyPlan: WEEKDAYS.map((day) => ({ day, plan: "", duration: "" })),
    programNotes: "Ajustar el programa según tolerancia y evolución.",
    evolution: [],
    ...overrides,
  };
}

export const INITIAL_CLIENT_RECORDS: ClientRecord[] = INITIAL_CLIENTS.map((client) => {
  if (client.id === 1) {
    return createClientRecord(client, {
      nationalId: "8-921-1472",
      birthDate: "1992-04-16",
      sex: "Femenino",
      weight: "66.7 kg",
      height: "1.64 m",
      emergencyContact: "María Torres",
      emergencyPhone: "6102-2288",
      reasonForVisit: "Mejorar fuerza funcional y estabilidad sin agravar el hombro derecho.",
      conditions: "Hipertensión arterial controlada.",
      medications: "Losartán 50 mg, según indicación médica.",
      surgeries: "Sin cirugías relevantes.",
      injuries: "Antecedente de lesión del manguito rotador derecho.",
      recommendations: "Controlar presión antes de sesiones intensas. Priorizar técnica, movilidad escapular y cargas progresivas.",
      restrictions: "Evitar elevaciones sobre la cabeza con dolor y no aumentar carga sin supervisión.",
      privateNotes: "La información clínica ampliada permanece reservada para dirección.",
      treatments: [
        { id: 1, area: "Medicina", summary: "Control periódico de presión arterial.", professional: "Dirección clínica", status: "Seguimiento" },
        { id: 2, area: "Fisioterapia", summary: "Movilidad y fortalecimiento del hombro derecho.", professional: "Valentina Ruiz", status: "Activo" },
        { id: 3, area: "Entrenamiento", summary: "Fuerza funcional tres veces por semana.", professional: "Marco Salas", status: "Activo" },
      ],
      weeklyPlan: [
        { day: "Lunes", plan: "Movilidad general\nSentadilla goblet 3×10\nRemo con banda 3×12\nPuente de glúteo 3×12", duration: "50 min" },
        { day: "Martes", plan: "Caminata suave y movilidad de hombro.", duration: "30 min" },
        { day: "Miércoles", plan: "Bisagra de cadera 3×10\nPress inclinado ligero 3×10\nTrabajo de core 3 rondas", duration: "50 min" },
        { day: "Jueves", plan: "Recuperación activa y respiración.", duration: "25 min" },
        { day: "Viernes", plan: "Circuito funcional de bajo impacto y técnica.", duration: "45 min" },
      ],
      programNotes: "Detener cualquier ejercicio que provoque dolor agudo en el hombro. Registrar presión y percepción de esfuerzo.",
      evolution: [
        { id: 1, date: "2026-07-22", author: "Marco Salas", note: "Completó la sesión sin dolor. Mejor control en sentadilla y remo.", visibility: "team" },
        { id: 2, date: "2026-07-08", author: "Ángel Ortega", note: "Mantener vigilancia de presión y progresión conservadora.", visibility: "owner" },
      ],
    });
  }

  if (client.id === 4) {
    return createClientRecord(client, {
      nationalId: "8-845-9931",
      birthDate: "1985-11-03",
      sex: "Masculino",
      weight: "84.2 kg",
      height: "1.72 m",
      emergencyContact: "Ana Vega",
      emergencyPhone: "6990-4412",
      reasonForVisit: "Reducción de peso y mejora del acondicionamiento general.",
      conditions: "Obesidad grado I e hipertensión controlada.",
      medications: "Tratamiento antihipertensivo indicado por su médico.",
      surgeries: "Sin cirugías recientes.",
      injuries: "Molestia lumbar ocasional, sin lesión aguda.",
      recommendations: "Ejercicio de fuerza tres veces por semana, impacto bajo y control de presión.",
      restrictions: "Evitar esfuerzos máximos y suspender la sesión ante mareo, dolor torácico o falta de aire inusual.",
      treatments: [
        { id: 1, area: "Medicina", summary: "Seguimiento de presión arterial y peso.", professional: "Dirección clínica", status: "Activo" },
        { id: 2, area: "Entrenamiento", summary: "Fuerza y acondicionamiento de bajo impacto.", professional: "Marco Salas", status: "Activo" },
      ],
      weeklyPlan: [
        { day: "Lunes", plan: "Caminata 10 min\nFuerza de cuerpo completo\nVuelta a la calma", duration: "50 min" },
        { day: "Martes", plan: "Descanso activo: caminata cómoda.", duration: "25 min" },
        { day: "Miércoles", plan: "Circuito de fuerza de bajo impacto y movilidad.", duration: "50 min" },
        { day: "Jueves", plan: "Descanso.", duration: "—" },
        { day: "Viernes", plan: "Fuerza general y trabajo aeróbico moderado.", duration: "50 min" },
      ],
      programNotes: "Usar escala de esfuerzo percibido y registrar respuesta después de cada sesión.",
      evolution: [
        { id: 1, date: "2026-07-24", author: "Marco Salas", note: "Buena tolerancia al circuito. Se mantuvo en intensidad moderada.", visibility: "team" },
      ],
    });
  }

  return createClientRecord(client);
});

export const INITIAL_MEASUREMENTS: MeasurementRecord[] = [
  { id: 101, clientId: 1, date: "2026-07-08", weight: 66.7, calf: 36.8, thigh: 55.4, glute: 95.5, waist: 74.3, arm: 28.7 },
  { id: 102, clientId: 1, date: "2026-06-08", weight: 66.4, calf: 36.5, thigh: 55, glute: 95, waist: 74, arm: 28.5 },
  { id: 103, clientId: 4, date: "2026-07-12", weight: 84.2, calf: 40.2, thigh: 61.5, glute: 103.6, waist: 88.4, arm: 34.1 },
  { id: 104, clientId: 4, date: "2026-06-12", weight: 84, calf: 40, thigh: 61.2, glute: 103.2, waist: 88.1, arm: 34 },
  { id: 105, clientId: 8, date: "2026-07-15", weight: 77.8, calf: 38.6, thigh: 58.9, glute: 99.4, waist: 82.5, arm: 32.2 },
];

export const INITIAL_ROUTINES: RoutinePlan[] = [
  {
    id: 1,
    name: "Fuerza funcional A",
    clientId: 1,
    focus: "Fuerza general, control y técnica",
    daysPerWeek: 3,
    status: "Activa",
    notes: "Priorizar una ejecución cómoda y controlada.",
    exercises: [
      { id: 1, block: "Calentamiento", name: "Movilidad general", sets: "1", repetitions: "8 min", rest: "—" },
      { id: 2, block: "Bloque A", name: "Sentadilla goblet", sets: "3", repetitions: "10", rest: "75 s" },
      { id: 3, block: "Bloque A", name: "Remo con banda", sets: "3", repetitions: "12", rest: "60 s" },
      { id: 4, block: "Bloque B", name: "Puente de glúteo", sets: "3", repetitions: "12", rest: "60 s" },
    ],
  },
  {
    id: 2,
    name: "Acondicionamiento 02",
    clientId: 4,
    focus: "Acondicionamiento general y coordinación",
    daysPerWeek: 3,
    status: "Activa",
    notes: "Ajustar pausas según la respuesta del cliente.",
    exercises: [
      { id: 1, block: "Calentamiento", name: "Caminata cómoda", sets: "1", repetitions: "10 min", rest: "—" },
      { id: 2, block: "Bloque A", name: "Step-up bajo", sets: "3", repetitions: "10 por lado", rest: "60 s" },
      { id: 3, block: "Bloque A", name: "Press con banda", sets: "3", repetitions: "12", rest: "60 s" },
    ],
  },
  {
    id: 3,
    name: "Base de movilidad",
    clientId: 8,
    focus: "Movilidad, respiración y control",
    daysPerWeek: 2,
    status: "Borrador",
    notes: "Revisar comodidad antes de activar el programa.",
    exercises: [
      { id: 1, block: "Calentamiento", name: "Respiración diafragmática", sets: "2", repetitions: "6 ciclos", rest: "30 s" },
      { id: 2, block: "Bloque A", name: "Movilidad de cadera", sets: "2", repetitions: "8 por lado", rest: "45 s" },
      { id: 3, block: "Cierre", name: "Rotación torácica suave", sets: "2", repetitions: "8 por lado", rest: "45 s" },
    ],
  },
];

export const INITIAL_STAFF: StaffMember[] = [
  { id: 1, name: "Ángel Ortega", email: "dueno@aureus.fit", role: "owner", status: "Activo", initials: "AO" },
  { id: 2, name: "Laura Díaz", email: "secretaria@aureus.fit", role: "secretary", status: "Activo", initials: "LD" },
  { id: 3, name: "Marco Salas", email: "entrenador@aureus.fit", role: "trainer", status: "Activo", initials: "MS" },
  { id: 4, name: "Valentina Ruiz", email: "valentina@aureus.fit", role: "trainer", status: "Invitación enviada", initials: "VR" },
];

export const INITIAL_PLANS: GymPlan[] = [
  { id: 1, name: "Base", price: 35, description: "Acceso y planificación esencial", features: ["Plan mensual", "2 seguimientos", "Agenda personal"], featured: false, active: true },
  { id: 2, name: "Performance", price: 50, description: "Acompañamiento y control continuo", features: ["Plan personalizado", "4 seguimientos", "Registro de progreso"], featured: true, active: true },
  { id: 3, name: "Elite", price: 65, description: "Seguimiento completo y prioritario", features: ["Plan avanzado", "Seguimiento semanal", "Reportes ampliados"], featured: false, active: true },
];

export const INITIAL_SESSIONS: AgendaSession[] = [
  { id: 1, time: "08:00", clientId: 7, clientName: "Andrea López", focus: "Movilidad", trainer: "Elena Pérez", status: "Confirmada" },
  { id: 2, time: "10:00", clientId: 1, clientName: "Lucía Torres", focus: "Fuerza funcional", trainer: "Marco Salas", status: "Confirmada" },
  { id: 3, time: "11:30", clientId: 5, clientName: "Sara Castillo", focus: "Evaluación inicial", trainer: "Elena Pérez", status: "Pendiente" },
  { id: 4, time: "14:00", clientId: 2, clientName: "Daniel Ríos", focus: "Rendimiento", trainer: "Carlos Mendoza", status: "Confirmada" },
  { id: 5, time: "16:30", clientId: 4, clientName: "Miguel Vega", focus: "Acondicionamiento", trainer: "Marco Salas", status: "Pendiente" },
];

export const ROLE_META = {
  owner: { label: "Dueño", description: "Control total del gimnasio", icon: Building2 },
  secretary: { label: "Secretaria", description: "Recepción y registros", icon: ClipboardCheck },
  trainer: { label: "Entrenador", description: "Clientes y planificación", icon: Dumbbell },
};

export const NAV_BY_ROLE: Record<Role, { label: ViewName; icon: typeof LayoutDashboard }[]> = {
  owner: [
    { label: "Resumen", icon: LayoutDashboard },
    { label: "Agenda", icon: CalendarDays },
    { label: "Clientes", icon: UsersRound },
    { label: "Entrenadores", icon: Award },
    { label: "Pagos", icon: WalletCards },
    { label: "Planes", icon: CreditCard },
    { label: "Ventas externas", icon: ShoppingBasket },
    { label: "Equipo", icon: UserCog },
  ],
  secretary: [
    { label: "Recepción", icon: LayoutDashboard },
    { label: "Registrar cliente", icon: UserPlus },
    { label: "Clientes", icon: UsersRound },
    { label: "Entrenadores", icon: Award },
    { label: "Agenda", icon: CalendarDays },
    { label: "Pagos", icon: WalletCards },
    { label: "Ventas externas", icon: ShoppingBasket },
  ],
  trainer: [
    { label: "Mi panel", icon: LayoutDashboard },
    { label: "Mi perfil", icon: UserRound },
    { label: "Mis clientes", icon: UsersRound },
    { label: "Rutinas", icon: Dumbbell },
    { label: "Agenda", icon: CalendarDays },
    { label: "Progreso", icon: Activity },
  ],
};

export const START_VIEW: Record<Role, ViewName> = { owner: "Resumen", secretary: "Recepción", trainer: "Mi panel" };

export const SECRETARY_VIEW_LABELS: Partial<Record<ViewName, string>> = {
  "Recepción": "Inicio",
  "Registrar cliente": "Nuevo cliente",
  "Clientes": "Buscar cliente",
  "Entrenadores": "Perfiles",
  "Agenda": "Agenda de hoy",
  "Pagos": "Pagos",
};
