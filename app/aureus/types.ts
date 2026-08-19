// Modelos de dominio compartidos por toda la aplicación.

export type Role = "owner" | "secretary" | "trainer";
export type PaymentStatus = "Al día" | "Pendiente" | "Por vencer";
export type ViewName =
  | "Resumen"
  | "Recepción"
  | "Mi panel"
  | "Clientes"
  | "Mis clientes"
  | "Entrenadores"
  | "Registrar cliente"
  | "Pagos"
  | "Planes"
  | "Equipo"
  | "Agenda"
  | "Rutinas"
  | "Progreso"
  | "Ventas externas"
  | "Mi perfil";
  export type Account = {
  id: string;
  name: string;
  email: string;
  // La contraseña ya no se guarda ni se compara en el frontend: Supabase
  // Auth la maneja de forma segura en el servidor. Este campo se mantiene
  // opcional solo por compatibilidad temporal con el módulo "Equipo"
  // (features/settings.tsx), que se migrará en el siguiente paso.
  password?: string;
  role: Role;
  gym: string;
  // Identificador real del gimnasio en la base de datos — necesario para
  // consultar clientes, pagos, etc. de este gimnasio específicamente.
  gymId?: string;
  // Si el gimnasio contrató la extensión clínica Medical 360. Cuando está
  // apagada, la app funciona sin evaluación médica ni expediente clínico.
  medical360Enabled?: boolean;
  // Datos que el gimnasio imprime en sus recibos.
  gymTagline?: string;
  gymCity?: string;
  receiptPrefix?: string;
  // Cuando es true, la persona todavía usa la contraseña que le puso el
  // dueño y la app la obliga a cambiarla antes de dejarla trabajar.
  mustChangePassword?: boolean;
  initials: string;
  active?: boolean;
};

export type Client = {
  id: number;
  name: string;
  initials: string;
  email: string;
  phone: string;
  plan: string;
  price: number;
  trainer: string;
  goal: string;
  progress: number;
  payment: PaymentStatus;
  nextDue: string;
  sessions: number;
  lastUpdate: string;
  color: string;
};

export type TreatmentArea = "Entrenamiento" | "Nutrición" | "Fisioterapia" | "Medicina";
export type TreatmentStatus = "Activo" | "Seguimiento" | "Finalizado";
export type Weekday = "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes";

export type ClientTreatment = {
  id: number;
  area: TreatmentArea;
  summary: string;
  professional: string;
  status: TreatmentStatus;
};

export type TrainingDayPlan = {
  day: Weekday;
  plan: string;
  duration: string;
};

export type EvolutionEntry = {
  id: number;
  date: string;
  author: string;
  note: string;
  visibility: "team" | "owner";
};

export type ScreeningAnswer = "Sin responder" | "Sí" | "No";
export type MedicalClearanceStatus = "Pendiente" | "Apto sin restricciones" | "Apto con restricciones" | "Requiere evaluación adicional" | "No apto temporalmente";

export type PreExerciseScreening = {
  activityRestrictedByDoctor: ScreeningAnswer;
  knownCardiovascularMetabolicRenalDisease: ScreeningAnswer;
  exertionalChestPain: ScreeningAnswer;
  dizzinessOrSyncope: ScreeningAnswer;
  unusualBreathlessnessOrFatigue: ScreeningAnswer;
  palpitations: ScreeningAnswer;
  prematureFamilyCardiacHistory: ScreeningAnswer;
  musculoskeletalLimitation: ScreeningAnswer;
  pregnancyOrPostpartum: ScreeningAnswer;
};

export type ClientRecord = {
  clientId: number;
  medicalAssessmentStatus: "Pendiente" | "Completada" | "Requiere seguimiento";
  medicalAppointmentTime: string;
  assessmentDate: string;
  clinicianName: string;
  clinicianLicense: string;
  informedConsent: boolean;
  informationConfirmed: boolean;
  bloodPressure: string;
  restingHeartRate: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  waistCircumference: string;
  bloodGlucose: string;
  medicalObservations: string;
  allergies: string;
  familyHistory: string;
  currentActivityLevel: string;
  desiredExerciseIntensity: string;
  lifestyleFactors: string;
  screening: PreExerciseScreening;
  physicalExam: string;
  functionalAssessment: string;
  exerciseResponse: string;
  painLevel: string;
  medicalClearanceStatus: MedicalClearanceStatus;
  followUpPlan: string;
  emergencyPlanReviewed: boolean;
  nationalId: string;
  birthDate: string;
  sex: string;
  weight: string;
  height: string;
  emergencyContact: string;
  emergencyPhone: string;
  reasonForVisit: string;
  conditions: string;
  medications: string;
  surgeries: string;
  injuries: string;
  recommendations: string;
  restrictions: string;
  privateNotes: string;
  treatments: ClientTreatment[];
  weeklyPlan: TrainingDayPlan[];
  programNotes: string;
  evolution: EvolutionEntry[];
};

export type Trainer = {
  id: number;
  name: string;
  initials: string;
  specialty: string;
  preparation: string;
  experience: string;
  availability: string;
  openSpots: number;
  clients: number;
  rating: string;
  color: string;
  bio: string;
  certifications: string[];
  email: string;
  phone: string;
  instagram: string;
};

export type StaffMember = {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: "Activo" | "Invitación enviada" | "Suspendido";
  initials: string;
};

export type GymPlan = {
  id: number;
  name: string;
  price: number;
  description: string;
  features: string[];
  featured: boolean;
  active: boolean;
};

export type AgendaSession = {
  id: number;
  time: string;
  clientId: number;
  clientName: string;
  focus: string;
  trainer: string;
  status: "Confirmada" | "Pendiente";
  type?: "Entrenamiento" | "Evaluación médica";
  ownerOnly?: boolean;
};

export type AppPreferences = {
  compact: boolean;
  animations: boolean;
  notificationBadge: boolean;
  theme: "light" | "dark" | "system";
};

export type MeasurementRecord = {
  id: number;
  clientId: number;
  date: string;
  weight: number;
  calf: number;
  thigh: number;
  glute: number;
  waist: number;
  arm: number;
};

export type MeasurementDraft = {
  date: string;
  weight: string;
  calf: string;
  thigh: string;
  glute: string;
  waist: string;
  arm: string;

export type PaymentMethod = "Efectivo" | "Yappy" | "Tarjeta";

export type ExternalSale = {
  id: number;
  product: string;
  amount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
};
export type ReceiptConcept = "Cancelación" | "Abono";
export type ReceiptPaymentMethod = "Efectivo" | "Transferencia" | "Yappy" | "Tarjeta";

export type PaymentReceipt = {
  id: string;
  clientName: string;
  receiptNumber: number;
  displayNumber: string;
  amount: number;
  concept: ReceiptConcept;
  paymentMethod: ReceiptPaymentMethod;
  balance: number;
  service: string;
  nextDue: string;
  issuedByName: string;
  createdAt: string;
};