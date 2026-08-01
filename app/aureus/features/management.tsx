"use client";

// Directorio, pagos, planes, equipo y agenda.
import { FormEvent, useState } from "react";

import {
  Activity,
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  CreditCard,
  Dumbbell,
  FileText,
  Filter,
  GraduationCap,
  HeartPulse,
  Instagram,
  LockKeyhole,
  MessageCircle,
  Plus,
  ReceiptText,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  Trophy,
  UserCog,
  UserPlus,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { TRAINERS } from "../data";
import type {
  AgendaSession,
  Client,
  ClientRecord,
  GymPlan,
  MedicalClearanceStatus,
  PreExerciseScreening,
  Role,
  ScreeningAnswer,
  StaffMember,
  Trainer,
} from "../types";
import {
  ClientsTable,
  ModalLayer,
  PaymentPill,
  RoleBadge,
} from "../components/shared";

export function DirectoryView({ clients, query, role, trainerName, onSelect }: { clients: Client[]; query: string; role: Role; trainerName: string; onSelect: (client: Client) => void }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [planFilter, setPlanFilter] = useState("Todos");
  const [paymentFilter, setPaymentFilter] = useState("Todos");
  const [trainerFilter, setTrainerFilter] = useState("Todos");
  const visible = role === "trainer" ? clients.filter((client) => client.trainer === trainerName) : clients;
  const plans = Array.from(new Set(visible.map((client) => client.plan)));
  const trainers = Array.from(new Set(visible.map((client) => client.trainer)));
  const filtered = visible.filter((client) => {
    const matchesQuery = `${client.name} ${client.plan} ${client.trainer}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (planFilter === "Todos" || client.plan === planFilter) && (paymentFilter === "Todos" || client.payment === paymentFilter) && (trainerFilter === "Todos" || client.trainer === trainerFilter);
  });
  const activeFilters = [planFilter, paymentFilter, trainerFilter].filter((value) => value !== "Todos").length;

  function clearFilters() {
    setPlanFilter("Todos");
    setPaymentFilter("Todos");
    setTrainerFilter("Todos");
  }

  return (
    <section className="ops-page"><div className="ops-page__heading"><div><span className="eyebrow"><UsersRound size={14} /> {role === "trainer" ? "CARTERA PERSONAL" : "DIRECTORIO GENERAL"}</span><h2>{role === "trainer" ? "Mis clientes" : "Todos los clientes"}</h2><p>{role === "owner" ? "Información completa de clientes, entrenador, progreso, plan y mensualidad." : role === "secretary" ? "Consulta datos administrativos, evaluación pendiente y estados de pago." : "Consulta planes y actualiza el seguimiento de tus clientes asignados."}</p></div><button type="button" className={`filter-button ${filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} aria-controls="directory-filters"><Filter size={16} /> Filtros {activeFilters > 0 && <strong>{activeFilters}</strong>} <ChevronDown size={14} /></button></div>{filtersOpen && <div className="directory-filters" id="directory-filters"><label><span>Plan</span><select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}><option>Todos</option>{plans.map((plan) => <option key={plan}>{plan}</option>)}</select></label><label><span>Estado de pago</span><select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option>Todos</option><option>Al día</option><option>Pendiente</option><option>Por vencer</option></select></label>{role !== "trainer" && <label><span>Entrenador</span><select value={trainerFilter} onChange={(event) => setTrainerFilter(event.target.value)}><option>Todos</option>{trainers.map((trainer) => <option key={trainer}>{trainer}</option>)}</select></label>}<button type="button" className="secondary-button" onClick={clearFilters} disabled={activeFilters === 0}>Limpiar filtros</button></div>}<article className="panel ops-panel directory-panel"><div className="directory-summary"><span><strong>{filtered.length}</strong> resultados</span><span>{query ? `Búsqueda: “${query}”` : "Actualizado hoy"}</span></div><ClientsTable clients={filtered} onSelect={onSelect} /></article></section>
  );
}

export function TrainersView({ trainers, onOpen }: { trainers: Trainer[]; onOpen: (trainer: Trainer) => void }) {
  return (
    <section className="ops-page"><div className="ops-page__heading"><div><span className="eyebrow"><Award size={14} /> EQUIPO PROFESIONAL</span><h2>Entrenadores y especialidades</h2><p>Consulta su formación, experiencia, certificaciones y datos de contacto.</p></div></div><div className="trainer-directory">{trainers.map((trainer) => <article className="trainer-profile-card" key={trainer.id}><div className="trainer-profile-card__top"><span className={`avatar avatar--${trainer.color}`}>{trainer.initials}</span><span className="rating"><Trophy size={13} /> {trainer.rating}</span></div><h3>{trainer.name}</h3><p>{trainer.specialty}</p><div className="trainer-credentials"><span><GraduationCap size={15} /> {trainer.preparation}</span><span><Award size={15} /> {trainer.experience}</span><span><Instagram size={15} /> {trainer.instagram}</span></div><div className="trainer-capacity"><div><span>Carga actual</span><strong>{trainer.clients} clientes</strong></div><div><span>Disponibles</span><strong>{trainer.openSpots} cupos</strong></div></div><button className="secondary-button secondary-button--full" onClick={() => onOpen(trainer)}>Ver perfil profesional <ArrowRight size={15} /></button></article>)}</div></section>
  );
}

export function PaymentsView({ clients, role, onMarkPaid, onSelect }: { clients: Client[]; role: Role; onMarkPaid: (id: number) => void; onSelect: (client: Client) => void }) {
  const pending = clients.filter((client) => client.payment !== "Al día");
  const paidTotal = clients.filter((client) => client.payment === "Al día").reduce((sum, client) => sum + client.price, 0);

  function sendPaymentReminder(client: Client) {
    const localNumber = client.phone.replace(/\D/g, "");
    const whatsappNumber = localNumber.length === 8 ? `507${localNumber}` : localNumber;
    const firstName = client.name.split(" ")[0];
    const message = `Hola ${firstName}, te recordamos que la mensualidad de tu plan ${client.plan} está ${client.payment.toLowerCase()} y tiene fecha ${client.nextDue}. Si ya realizaste el pago, por favor ignora este mensaje. Gracias, Aureus Fitness Coach.`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="ops-page"><div className="ops-page__heading"><div><span className="eyebrow"><WalletCards size={14} /> PAGOS</span><h2>Revisar pagos</h2><p>{role === "secretary" ? "Confirma los pagos recibidos o prepara un recordatorio por WhatsApp al número registrado." : "Cuando una persona ya haya pagado, pulsa “Confirmar pago”. Aquí no se cobra dinero."}</p></div><button className="secondary-button" onClick={() => window.print()}><ReceiptText size={15} /> Imprimir lista</button></div><section className="payment-summary"><div><span>Registrado este mes</span><strong>${paidTotal}</strong><small>{clients.length - pending.length} mensualidades al día</small></div><div><span>Falta revisar</span><strong>{pending.length}</strong><small>Requieren seguimiento</small></div><div><span>Próximo vencimiento</span><strong>25 jul.</strong><small>Miguel Vega</small></div></section><article className="panel ops-panel payments-panel"><div className="payment-table__head"><span>Persona</span><span>Plan</span><span>Fecha</span><span>Estado</span><span>Qué hacer</span></div>{clients.map((client) => <div className="payment-row" key={client.id}><button className="payment-row__client" onClick={() => onSelect(client)}><span className={`avatar avatar--${client.color}`}>{client.initials}</span><span><strong>{client.name}</strong><small>{client.phone} · {client.trainer}</small></span></button><span><strong>{client.plan}</strong><small>${client.price}/mes</small></span><span>{client.nextDue}</span><PaymentPill status={client.payment} /><div className="payment-actions">{client.payment === "Al día" ? <button className="paid-button" onClick={() => onSelect(client)}><Check size={14} /> Ya pagó</button> : <>{role === "secretary" && <button className="payment-reminder-button" onClick={() => sendPaymentReminder(client)} aria-label={`Preparar recordatorio de pago para ${client.name}`}><MessageCircle size={14} /> Recordar pago</button>}<button className="mark-paid-button" onClick={() => onMarkPaid(client.id)}>Confirmar pago</button></>}</div></div>)}</article></section>
  );
}

export function PlanEditorModal({ initial, onClose, onSave }: { initial: GymPlan; onClose: () => void; onSave: (plan: GymPlan) => void }) {
  const [draft, setDraft] = useState(initial);
  const [featureText, setFeatureText] = useState(initial.features.join("\n"));
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const features = featureText.split("\n").map((feature) => feature.trim()).filter(Boolean);
    if (draft.name.trim().length < 2 || draft.price <= 0 || draft.description.trim().length < 3 || !features.length) {
      setError("Completa el nombre, precio, descripción y al menos un beneficio.");
      return;
    }
    onSave({ ...draft, name: draft.name.trim(), description: draft.description.trim(), features });
  }

  return <ModalLayer onClose={onClose}><section className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="plan-editor-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal__heading"><div><span>{draft.id === 0 ? "NUEVO PLAN" : "EDITAR PLAN"}</span><h2 id="plan-editor-title">{draft.id === 0 ? "Crear plan" : draft.name}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button></div><form onSubmit={submit}><div className="entity-editor-grid"><label className="form-field"><span className="form-field__label">Nombre</span><span className="form-field__control"><CreditCard size={18} /><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Avanzado" autoFocus /></span></label><label className="form-field"><span className="form-field__label">Precio mensual</span><span className="form-field__control"><CircleDollarSign size={18} /><input type="number" min="1" step="1" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: Number(event.target.value) }))} /></span></label></div><label className="form-field"><span className="form-field__label">Descripción</span><span className="form-field__control"><FileText size={18} /><input value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Descripción breve del plan" /></span></label><label className="form-field"><span className="form-field__label">Beneficios · uno por línea</span><textarea className="standalone-textarea" value={featureText} onChange={(event) => setFeatureText(event.target.value)} rows={4} placeholder={"Seguimiento mensual\nAgenda personal"} /></label><div className="editor-checks"><label><input type="checkbox" checked={draft.featured} onChange={(event) => setDraft((current) => ({ ...current, featured: event.target.checked }))} /><span><Sparkles size={16} /> Destacar como recomendado</span></label><label><input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} /><span><CheckCircle2 size={16} /> Disponible para nuevos clientes</span></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal__actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button primary-button--inline" type="submit"><Save size={16} /> Guardar plan</button></div></form></section></ModalLayer>;
}

export function PlansView({ plans, onSave }: { plans: GymPlan[]; onSave: (plan: GymPlan) => void }) {
  const [editing, setEditing] = useState<GymPlan | null>(null);
  const createPlan = () => setEditing({ id: 0, name: "", price: 40, description: "", features: ["Seguimiento mensual"], featured: false, active: true });
  return <section className="ops-page"><div className="ops-page__heading"><div><span className="eyebrow"><CreditCard size={14} /> PLANES DEL GIMNASIO</span><h2>Planes y mensualidades</h2><p>Configura lo que incluye cada opción comercial.</p></div><button type="button" className="primary-button primary-button--inline" onClick={createPlan}><Plus size={16} /> Nuevo plan</button></div><div className="plans-grid">{plans.map((plan) => <article className={`plan-card ${plan.featured ? "plan-card--featured" : ""} ${!plan.active ? "plan-card--inactive" : ""}`} key={plan.id}>{plan.featured && <span className="plan-card__featured"><Sparkles size={12} /> MÁS ELEGIDO</span>}<small>PLAN {plan.name.toUpperCase()} · {plan.active ? "ACTIVO" : "PAUSADO"}</small><h3>${plan.price}<span>/mes</span></h3><p>{plan.description}</p><ul>{plan.features.map((feature) => <li key={feature}><CheckCircle2 size={15} /> {feature}</li>)}</ul><button type="button" className="secondary-button secondary-button--full" onClick={() => setEditing(plan)}>Editar plan <ArrowRight size={15} /></button></article>)}</div>{editing && <PlanEditorModal initial={editing} onClose={() => setEditing(null)} onSave={(plan) => { onSave(plan); setEditing(null); }} />}</section>;
}

export function StaffEditorModal({ member, onClose, onSave }: { member: StaffMember; onClose: () => void; onSave: (member: StaffMember) => void }) {
  const [role, setRole] = useState(member.role);
  const [status, setStatus] = useState(member.status);
  const editable = member.role !== "owner";
  return <ModalLayer onClose={onClose}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="staff-options-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal__heading"><div><span>CUENTA DEL EQUIPO</span><h2 id="staff-options-title">{member.name}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button></div><p>{editable ? "Actualiza el rol y el estado de acceso de esta cuenta." : "La cuenta propietaria conserva siempre el control total del gimnasio."}</p>{editable && <div className="entity-editor-grid entity-editor-grid--single"><label className="form-field"><span className="form-field__label">Rol y permisos</span><span className="form-field__control"><ShieldCheck size={18} /><select value={role} onChange={(event) => setRole(event.target.value as Role)}><option value="secretary">Secretaria</option><option value="trainer">Entrenador</option></select></span></label><label className="form-field"><span className="form-field__label">Estado de la cuenta</span><span className="form-field__control"><BadgeCheck size={18} /><select value={status} onChange={(event) => setStatus(event.target.value as StaffMember["status"])}><option>Activo</option><option>Invitación enviada</option><option>Suspendido</option></select></span></label></div>}<div className="modal__actions"><button type="button" className="secondary-button" onClick={onClose}>{editable ? "Cancelar" : "Cerrar"}</button>{editable && <button type="button" className="primary-button primary-button--inline" onClick={() => onSave({ ...member, role, status })}><Save size={16} /> Guardar cambios</button>}</div></section></ModalLayer>;
}

export function TeamView({ staff, onAdd, onEdit }: { staff: StaffMember[]; onAdd: () => void; onEdit: (member: StaffMember) => void }) {
  return <section className="ops-page"><div className="ops-page__heading"><div><span className="eyebrow"><UserCog size={14} /> CUENTAS Y PERMISOS</span><h2>Equipo del gimnasio</h2><p>Solo el dueño puede crear cuentas, asignar roles o cambiar permisos.</p></div><button type="button" className="primary-button primary-button--inline" onClick={onAdd}><UserPlus size={16} /> Añadir personal</button></div><article className="panel ops-panel team-panel"><div className="team-table__head"><span>Usuario</span><span>Rol</span><span>Permisos</span><span>Estado</span><span /></div>{staff.map((member) => <div className="team-row" key={member.id}><span className="client-name"><i className="avatar avatar--gold">{member.initials}</i><span><strong>{member.name}</strong><small>{member.email}</small></span></span><RoleBadge role={member.role} /><span>{member.role === "owner" ? "Control total" : member.role === "secretary" ? "Recepción y pagos" : "Clientes asignados"}</span><span className={`team-status ${member.status === "Activo" ? "active" : member.status === "Suspendido" ? "suspended" : ""}`}><i />{member.status}</span><button type="button" className="icon-button" onClick={() => onEdit(member)} aria-label={`Configurar cuenta de ${member.name}`}><Settings size={16} /></button></div>)}</article><div className="permission-grid"><article><ShieldCheck size={22} /><h3>Dueño</h3><p>Evalúa al cliente y asigna al entrenador según los resultados médicos.</p></article><article><ClipboardCheck size={22} /><h3>Secretaria</h3><p>Registra clientes y administra citas, pagos y vencimientos.</p></article><article><Dumbbell size={22} /><h3>Entrenador</h3><p>Accede únicamente a sus clientes, rutinas, agenda y progreso.</p></article></div></section>;
}

export function SessionEditorModal({ initial, clients, role, trainerName, onClose, onSave }: { initial: AgendaSession; clients: Client[]; role: Role; trainerName: string; onClose: () => void; onSave: (session: AgendaSession) => void }) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");

  function chooseClient(clientId: number) {
    const client = clients.find((item) => item.id === clientId);
    if (!client) return;
    setDraft((current) => ({ ...current, clientId: client.id, clientName: client.name, trainer: role === "trainer" ? trainerName : client.trainer }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.clientId || !/^\d{2}:\d{2}$/.test(draft.time) || draft.focus.trim().length < 3 || !draft.trainer) {
      setError("Completa la hora, cliente, tipo de sesión y entrenador.");
      return;
    }
    onSave({ ...draft, focus: draft.focus.trim() });
  }

  return <ModalLayer onClose={onClose}><section className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="session-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal__heading"><div><span>{draft.id === 0 ? "NUEVA SESIÓN" : "EDITAR SESIÓN"}</span><h2 id="session-title">{draft.id === 0 ? "Programar sesión" : draft.clientName}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button></div><form onSubmit={submit}><div className="entity-editor-grid"><label className="form-field"><span className="form-field__label">Hora</span><span className="form-field__control"><Clock3 size={18} /><input type="time" value={draft.time} onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))} autoFocus /></span></label><label className="form-field"><span className="form-field__label">Cliente</span><span className="form-field__control"><UserRound size={18} /><select value={draft.clientId} onChange={(event) => chooseClient(Number(event.target.value))}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></span></label><label className="form-field"><span className="form-field__label">Tipo de sesión</span><span className="form-field__control"><Target size={18} /><input value={draft.focus} onChange={(event) => setDraft((current) => ({ ...current, focus: event.target.value }))} placeholder="Ej. Evaluación o movilidad" /></span></label><label className="form-field"><span className="form-field__label">Entrenador</span><span className="form-field__control"><Dumbbell size={18} />{role === "trainer" ? <input value={trainerName} readOnly /> : <select value={draft.trainer} onChange={(event) => setDraft((current) => ({ ...current, trainer: event.target.value }))}>{TRAINERS.map((trainer) => <option key={trainer.id}>{trainer.name}</option>)}</select>}</span></label><label className="form-field"><span className="form-field__label">Estado</span><span className="form-field__control"><CalendarCheck size={18} /><select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as AgendaSession["status"] }))}><option>Confirmada</option><option>Pendiente</option></select></span></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal__actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button primary-button--inline" type="submit"><Save size={16} /> Guardar sesión</button></div></form></section></ModalLayer>;
}

const PRE_EXERCISE_QUESTIONS: { key: keyof PreExerciseScreening; label: string }[] = [
  { key: "activityRestrictedByDoctor", label: "¿Algún profesional de salud ha limitado antes su actividad física?" },
  { key: "knownCardiovascularMetabolicRenalDisease", label: "¿Tiene diagnóstico cardiovascular, respiratorio, metabólico o renal relevante?" },
  { key: "exertionalChestPain", label: "¿Presenta dolor, presión u opresión en el pecho con actividad o en reposo?" },
  { key: "dizzinessOrSyncope", label: "¿Ha tenido mareos importantes, desmayos o pérdida de equilibrio?" },
  { key: "unusualBreathlessnessOrFatigue", label: "¿Siente falta de aire o fatiga inusual con esfuerzos cotidianos?" },
  { key: "palpitations", label: "¿Ha notado palpitaciones o ritmo cardiaco irregular durante el esfuerzo?" },
  { key: "prematureFamilyCardiacHistory", label: "¿Hay muerte súbita o enfermedad cardiaca prematura en familiares cercanos?" },
  { key: "musculoskeletalLimitation", label: "¿Existe lesión, dolor óseo o articular que pueda empeorar con ejercicio?" },
  { key: "pregnancyOrPostpartum", label: "¿Existe embarazo o posparto actual que requiera adaptación? (si aplica)" },
];

const MEDICAL_CLEARANCE_OPTIONS: MedicalClearanceStatus[] = ["Pendiente", "Apto sin restricciones", "Apto con restricciones", "Requiere evaluación adicional", "No apto temporalmente"];

function MedicalEvaluationModal({ session, client, record, trainers, onClose, onComplete }: { session: AgendaSession; client: Client; record: ClientRecord; trainers: Trainer[]; onClose: () => void; onComplete: (session: AgendaSession, record: ClientRecord, trainer?: Trainer) => void }) {
  const [assessmentDate, setAssessmentDate] = useState(record.assessmentDate || new Date().toISOString().slice(0, 10));
  const [clinicianName, setClinicianName] = useState(record.clinicianName);
  const [clinicianLicense, setClinicianLicense] = useState(record.clinicianLicense);
  const [informedConsent, setInformedConsent] = useState(record.informedConsent);
  const [informationConfirmed, setInformationConfirmed] = useState(record.informationConfirmed);
  const [nationalId, setNationalId] = useState(record.nationalId);
  const [birthDate, setBirthDate] = useState(record.birthDate);
  const [sex, setSex] = useState(record.sex);
  const [emergencyContact, setEmergencyContact] = useState(record.emergencyContact);
  const [emergencyPhone, setEmergencyPhone] = useState(record.emergencyPhone);
  const [bloodPressure, setBloodPressure] = useState(record.bloodPressure);
  const [restingHeartRate, setRestingHeartRate] = useState(record.restingHeartRate);
  const [respiratoryRate, setRespiratoryRate] = useState(record.respiratoryRate);
  const [oxygenSaturation, setOxygenSaturation] = useState(record.oxygenSaturation);
  const [weight, setWeight] = useState(record.weight);
  const [height, setHeight] = useState(record.height);
  const [waistCircumference, setWaistCircumference] = useState(record.waistCircumference);
  const [bloodGlucose, setBloodGlucose] = useState(record.bloodGlucose);
  const [conditions, setConditions] = useState(record.conditions);
  const [medications, setMedications] = useState(record.medications);
  const [allergies, setAllergies] = useState(record.allergies);
  const [familyHistory, setFamilyHistory] = useState(record.familyHistory);
  const [surgeries, setSurgeries] = useState(record.surgeries);
  const [injuries, setInjuries] = useState(record.injuries);
  const [currentActivityLevel, setCurrentActivityLevel] = useState(record.currentActivityLevel);
  const [desiredExerciseIntensity, setDesiredExerciseIntensity] = useState(record.desiredExerciseIntensity);
  const [lifestyleFactors, setLifestyleFactors] = useState(record.lifestyleFactors);
  const [screening, setScreening] = useState<PreExerciseScreening>({ ...record.screening });
  const [physicalExam, setPhysicalExam] = useState(record.physicalExam);
  const [functionalAssessment, setFunctionalAssessment] = useState(record.functionalAssessment);
  const [exerciseResponse, setExerciseResponse] = useState(record.exerciseResponse);
  const [painLevel, setPainLevel] = useState(record.painLevel);
  const [observations, setObservations] = useState(record.medicalObservations);
  const [recommendations, setRecommendations] = useState(record.recommendations === "Mantener una progresión gradual y registrar cualquier molestia." ? "" : record.recommendations);
  const [restrictions, setRestrictions] = useState(record.restrictions === "Sin restricciones registradas." ? "" : record.restrictions);
  const [clearanceStatus, setClearanceStatus] = useState<MedicalClearanceStatus>(record.medicalClearanceStatus);
  const [followUpPlan, setFollowUpPlan] = useState(record.followUpPlan);
  const [emergencyPlanReviewed, setEmergencyPlanReviewed] = useState(record.emergencyPlanReviewed);
  const [privateNotes, setPrivateNotes] = useState(record.privateNotes);
  const [trainerId, setTrainerId] = useState(() => trainers.find((trainer) => trainer.name === client.trainer)?.id ?? 0);
  const [error, setError] = useState("");
  const selectedTrainer = trainers.find((trainer) => trainer.id === trainerId);
  const canAssignTrainer = clearanceStatus === "Apto sin restricciones" || clearanceStatus === "Apto con restricciones";
  const positiveScreeningCount = Object.values(screening).filter((answer) => answer === "Sí").length;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const heartRate = Number(restingHeartRate);
    const breathingRate = Number(respiratoryRate);
    const saturation = Number(oxygenSaturation);
    if (!assessmentDate || clinicianName.trim().length < 3 || clinicianLicense.trim().length < 3 || !informedConsent || !informationConfirmed) {
      setError("Registra al profesional responsable y confirma el consentimiento y la veracidad de la información.");
      return;
    }
    if (nationalId.trim().length < 4 || !birthDate || emergencyContact.trim().length < 3 || emergencyPhone.trim().length < 7) {
      setError("Completa la identificación, fecha de nacimiento y contacto de emergencia del cliente.");
      return;
    }
    if (Object.values(screening).some((answer) => answer === "Sin responder")) {
      setError("Responde todas las preguntas del tamizaje previo al ejercicio.");
      return;
    }
    if (bloodPressure.trim().length < 5 || !Number.isFinite(heartRate) || heartRate < 30 || heartRate > 220 || !Number.isFinite(breathingRate) || breathingRate < 5 || breathingRate > 60 || !Number.isFinite(saturation) || saturation < 50 || saturation > 100 || weight.trim().length < 2 || height.trim().length < 2) {
      setError("Completa los signos vitales y las medidas con valores válidos.");
      return;
    }
    if (physicalExam.trim().length < 10 || functionalAssessment.trim().length < 10 || observations.trim().length < 10 || clearanceStatus === "Pendiente" || !emergencyPlanReviewed) {
      setError("Completa el examen físico, la evaluación funcional, las observaciones, la aptitud médica y el plan de emergencia.");
      return;
    }
    if ((positiveScreeningCount > 0 || !canAssignTrainer) && followUpPlan.trim().length < 10) {
      setError("Documenta la conducta o seguimiento para los hallazgos positivos y la decisión de aptitud.");
      return;
    }
    if (canAssignTrainer && (recommendations.trim().length < 5 || !selectedTrainer)) {
      setError("Añade recomendaciones de entrenamiento y selecciona al entrenador indicado.");
      return;
    }
    if (clearanceStatus === "Apto con restricciones" && restrictions.trim().length < 5) {
      setError("Detalla las restricciones antes de autorizar el entrenamiento.");
      return;
    }
    const retainedTreatments = record.treatments.filter((treatment) => !(treatment.area === "Medicina" && treatment.summary.startsWith("Evaluación médica inicial:")) && (treatment.area !== "Entrenamiento" || treatment.professional !== client.trainer));
    const savedRecommendations = recommendations.trim() || "No iniciar entrenamiento hasta recibir autorización médica.";
    const nextRecord: ClientRecord = {
      ...record,
      medicalAssessmentStatus: canAssignTrainer ? "Completada" : "Requiere seguimiento",
      medicalAppointmentTime: session.time,
      assessmentDate,
      clinicianName: clinicianName.trim(),
      clinicianLicense: clinicianLicense.trim(),
      informedConsent,
      informationConfirmed,
      nationalId: nationalId.trim(),
      birthDate,
      sex: sex.trim(),
      emergencyContact: emergencyContact.trim(),
      emergencyPhone: emergencyPhone.trim(),
      bloodPressure: bloodPressure.trim(),
      restingHeartRate: restingHeartRate.trim(),
      respiratoryRate: respiratoryRate.trim(),
      oxygenSaturation: oxygenSaturation.trim(),
      weight: weight.trim(),
      height: height.trim(),
      waistCircumference: waistCircumference.trim(),
      bloodGlucose: bloodGlucose.trim(),
      conditions: conditions.trim() || "Sin condiciones registradas.",
      medications: medications.trim() || "Sin medicamentos registrados.",
      allergies: allergies.trim() || "Sin alergias registradas.",
      familyHistory: familyHistory.trim() || "Sin antecedentes familiares registrados.",
      surgeries: surgeries.trim() || "Sin cirugías registradas.",
      injuries: injuries.trim() || "Sin lesiones registradas.",
      currentActivityLevel,
      desiredExerciseIntensity,
      lifestyleFactors: lifestyleFactors.trim(),
      screening,
      physicalExam: physicalExam.trim(),
      functionalAssessment: functionalAssessment.trim(),
      exerciseResponse: exerciseResponse.trim(),
      painLevel,
      medicalObservations: observations.trim(),
      recommendations: savedRecommendations,
      restrictions: restrictions.trim() || (canAssignTrainer ? "Sin restricciones adicionales." : "Entrenamiento suspendido hasta nueva autorización."),
      medicalClearanceStatus: clearanceStatus,
      followUpPlan: followUpPlan.trim(),
      emergencyPlanReviewed,
      privateNotes: privateNotes.trim(),
      treatments: [
        ...retainedTreatments,
        { id: retainedTreatments.reduce((highest, treatment) => Math.max(highest, treatment.id), 0) + 1, area: "Medicina", summary: `Evaluación médica inicial: ${observations.trim()}`, professional: clinicianName.trim(), status: canAssignTrainer ? "Finalizado" : "Seguimiento" },
        ...(canAssignTrainer && selectedTrainer ? [{ id: retainedTreatments.reduce((highest, treatment) => Math.max(highest, treatment.id), 0) + 2, area: "Entrenamiento" as const, summary: savedRecommendations, professional: selectedTrainer.name, status: "Activo" as const }] : []),
      ],
    };
    onComplete({ ...session, status: canAssignTrainer ? "Confirmada" : "Pendiente", focus: canAssignTrainer ? "Evaluación médica completada" : "Seguimiento médico requerido" }, nextRecord, canAssignTrainer ? selectedTrainer : undefined);
  }

  return (
    <ModalLayer onClose={onClose}>
      <section className="modal medical-evaluation-modal" role="dialog" aria-modal="true" aria-labelledby="medical-evaluation-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal__heading"><div><span>PROCESO MÉDICO DE INGRESO</span><h2 id="medical-evaluation-title">{client.name}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button></div>
        <div className="medical-evaluation-security"><ShieldCheck size={18} /><span><strong>Evaluación reservada para un profesional de salud calificado</strong><small>Este expediente orienta la aptitud para el ejercicio; no sustituye diagnóstico, tratamiento ni atención de urgencias.</small></span></div>
        <form onSubmit={submit} onInput={() => setError("")} onChange={() => setError("")}>
          <section className="medical-form-section">
            <div className="medical-form-section__heading"><BadgeCheck size={17} /><span><strong>Responsable, fecha y consentimiento</strong><small>Identificación del profesional que realiza y firma la evaluación.</small></span></div>
            <div className="medical-results-grid medical-results-grid--three">
              <label className="form-field"><span className="form-field__label">Fecha de evaluación</span><span className="form-field__control"><CalendarDays size={18} /><input type="date" value={assessmentDate} onChange={(event) => setAssessmentDate(event.target.value)} /></span></label>
              <label className="form-field"><span className="form-field__label">Profesional responsable</span><span className="form-field__control"><UserRound size={18} /><input value={clinicianName} onChange={(event) => setClinicianName(event.target.value)} placeholder="Nombre completo" /></span></label>
              <label className="form-field"><span className="form-field__label">Idoneidad o licencia</span><span className="form-field__control"><ShieldCheck size={18} /><input value={clinicianLicense} onChange={(event) => setClinicianLicense(event.target.value)} placeholder="Número de registro" /></span></label>
            </div>
            <div className="medical-consent-grid">
              <label><input type="checkbox" checked={informedConsent} onChange={(event) => setInformedConsent(event.target.checked)} /><span><strong>Consentimiento informado</strong><small>El cliente comprende el propósito, alcance y manejo confidencial de sus datos.</small></span></label>
              <label><input type="checkbox" checked={informationConfirmed} onChange={(event) => setInformationConfirmed(event.target.checked)} /><span><strong>Información confirmada</strong><small>El cliente declara que sus respuestas son completas y correctas.</small></span></label>
            </div>
          </section>

          <section className="medical-form-section">
            <div className="medical-form-section__heading"><UserRound size={17} /><span><strong>Identificación y contacto de emergencia</strong><small>Datos necesarios para la atención segura y la trazabilidad del expediente.</small></span></div>
            <div className="medical-client-strip"><span className={`avatar avatar--${client.color}`}>{client.initials}</span><span><strong>{client.name}</strong><small>{client.email} · {client.phone}</small></span></div>
            <div className="medical-results-grid medical-results-grid--three">
              <label className="form-field"><span className="form-field__label">Cédula o identificación</span><span className="form-field__control"><FileText size={18} /><input value={nationalId} onChange={(event) => setNationalId(event.target.value)} placeholder="8-000-0000" /></span></label>
              <label className="form-field"><span className="form-field__label">Fecha de nacimiento</span><span className="form-field__control"><CalendarDays size={18} /><input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></span></label>
              <label className="form-field"><span className="form-field__label">Sexo (si es clínicamente relevante)</span><span className="form-field__control"><UserRound size={18} /><input value={sex} onChange={(event) => setSex(event.target.value)} placeholder="Sin registrar" /></span></label>
              <label className="form-field"><span className="form-field__label">Contacto de emergencia</span><span className="form-field__control"><UserRound size={18} /><input value={emergencyContact} onChange={(event) => setEmergencyContact(event.target.value)} placeholder="Nombre completo" /></span></label>
              <label className="form-field"><span className="form-field__label">Teléfono de emergencia</span><span className="form-field__control"><MessageCircle size={18} /><input value={emergencyPhone} onChange={(event) => setEmergencyPhone(event.target.value)} placeholder="6000-0000" /></span></label>
            </div>
          </section>

          <section className="medical-form-section">
            <div className="medical-form-section__heading"><ClipboardCheck size={17} /><span><strong>Tamizaje previo al ejercicio</strong><small>Preguntas de seguridad inspiradas en el proceso internacional PAR-Q+ y la evaluación preparticipación.</small></span></div>
            <div className="preexercise-screening">
              {PRE_EXERCISE_QUESTIONS.map((question, index) => <div key={question.key}><span><b>{index + 1}</b>{question.label}</span><div role="group" aria-label={question.label}>{(["Sí", "No"] as ScreeningAnswer[]).map((answer) => <button type="button" key={answer} className={screening[question.key] === answer ? (answer === "Sí" ? "yes" : "selected") : ""} aria-pressed={screening[question.key] === answer} onClick={() => { setScreening((current) => ({ ...current, [question.key]: answer })); setError(""); }}>{answer}</button>)}</div></div>)}
            </div>
            {positiveScreeningCount > 0 && <div className="medical-screening-alert"><HeartPulse size={17} /><span><strong>{positiveScreeningCount} respuesta{positiveScreeningCount === 1 ? " positiva" : "s positivas"}</strong><small>El profesional debe valorar estos hallazgos y documentar la conducta antes de autorizar el entrenamiento.</small></span></div>}
          </section>

          <section className="medical-form-section">
            <div className="medical-form-section__heading"><HeartPulse size={17} /><span><strong>Signos vitales y medidas</strong><small>Resultados básicos del examen inicial.</small></span></div>
            <div className="medical-results-grid medical-results-grid--four">
              <label className="form-field"><span className="form-field__label">Presión arterial</span><span className="form-field__control"><HeartPulse size={18} /><input value={bloodPressure} onChange={(event) => setBloodPressure(event.target.value)} placeholder="120/80 mmHg" autoFocus /></span></label>
              <label className="form-field"><span className="form-field__label">Frecuencia en reposo</span><span className="form-field__control"><Activity size={18} /><input type="number" min="30" max="220" value={restingHeartRate} onChange={(event) => setRestingHeartRate(event.target.value)} placeholder="68 lpm" /></span></label>
              <label className="form-field"><span className="form-field__label">Frecuencia respiratoria</span><span className="form-field__control"><Activity size={18} /><input type="number" min="5" max="60" value={respiratoryRate} onChange={(event) => setRespiratoryRate(event.target.value)} placeholder="16 rpm" /></span></label>
              <label className="form-field"><span className="form-field__label">Saturación de oxígeno</span><span className="form-field__control"><HeartPulse size={18} /><input type="number" min="50" max="100" value={oxygenSaturation} onChange={(event) => setOxygenSaturation(event.target.value)} placeholder="98 %" /></span></label>
              <label className="form-field"><span className="form-field__label">Peso</span><span className="form-field__control"><Activity size={18} /><input value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="72 kg" /></span></label>
              <label className="form-field"><span className="form-field__label">Estatura</span><span className="form-field__control"><Activity size={18} /><input value={height} onChange={(event) => setHeight(event.target.value)} placeholder="1.70 m" /></span></label>
              <label className="form-field"><span className="form-field__label">Circunferencia de cintura</span><span className="form-field__control"><Activity size={18} /><input value={waistCircumference} onChange={(event) => setWaistCircumference(event.target.value)} placeholder="82 cm" /></span></label>
              <label className="form-field"><span className="form-field__label">Glucosa (si está indicada)</span><span className="form-field__control"><HeartPulse size={18} /><input value={bloodGlucose} onChange={(event) => setBloodGlucose(event.target.value)} placeholder="Resultado y contexto" /></span></label>
            </div>
          </section>

          <section className="medical-form-section">
            <div className="medical-form-section__heading"><FileText size={17} /><span><strong>Antecedentes médicos</strong><small>Información necesaria para decidir un entrenamiento seguro.</small></span></div>
            <div className="medical-results-grid">
              <label className="form-field"><span className="form-field__label">Condiciones o enfermedades</span><textarea className="standalone-textarea" value={conditions} onChange={(event) => setConditions(event.target.value)} rows={3} /></label>
              <label className="form-field"><span className="form-field__label">Medicamentos</span><textarea className="standalone-textarea" value={medications} onChange={(event) => setMedications(event.target.value)} rows={3} /></label>
              <label className="form-field"><span className="form-field__label">Alergias y reacciones</span><textarea className="standalone-textarea" value={allergies} onChange={(event) => setAllergies(event.target.value)} rows={3} /></label>
              <label className="form-field"><span className="form-field__label">Antecedentes familiares relevantes</span><textarea className="standalone-textarea" value={familyHistory} onChange={(event) => setFamilyHistory(event.target.value)} rows={3} placeholder="Enfermedad cardiaca, muerte súbita, diabetes u otros." /></label>
              <label className="form-field"><span className="form-field__label">Cirugías u operaciones</span><textarea className="standalone-textarea" value={surgeries} onChange={(event) => setSurgeries(event.target.value)} rows={3} /></label>
              <label className="form-field"><span className="form-field__label">Lesiones o molestias</span><textarea className="standalone-textarea" value={injuries} onChange={(event) => setInjuries(event.target.value)} rows={3} /></label>
            </div>
          </section>

          <section className="medical-form-section">
            <div className="medical-form-section__heading"><Activity size={17} /><span><strong>Hábitos, actividad actual y objetivo</strong><small>Contexto que influye en el riesgo, la intensidad inicial y la adherencia.</small></span></div>
            <div className="medical-results-grid">
              <label className="form-field"><span className="form-field__label">Nivel de actividad actual</span><span className="form-field__control"><Activity size={18} /><select value={currentActivityLevel} onChange={(event) => setCurrentActivityLevel(event.target.value)}><option>Sedentario o inactivo</option><option>Actividad ligera ocasional</option><option>Entrenamiento regular moderado</option><option>Entrenamiento vigoroso habitual</option></select></span></label>
              <label className="form-field"><span className="form-field__label">Intensidad que desea alcanzar</span><span className="form-field__control"><Target size={18} /><select value={desiredExerciseIntensity} onChange={(event) => setDesiredExerciseIntensity(event.target.value)}><option>Ligera a moderada</option><option>Moderada</option><option>Moderada a vigorosa</option><option>Vigorosa o competitiva</option></select></span></label>
            </div>
            <label className="form-field"><span className="form-field__label">Sueño, estrés, nutrición, tabaco, alcohol y otras sustancias</span><textarea className="standalone-textarea" value={lifestyleFactors} onChange={(event) => setLifestyleFactors(event.target.value)} rows={3} placeholder="Describe hábitos relevantes y cualquier factor que requiera acompañamiento." /></label>
          </section>

          <section className="medical-form-section">
            <div className="medical-form-section__heading"><Stethoscope size={17} /><span><strong>Examen físico y evaluación funcional</strong><small>Documenta hallazgos relevantes y la capacidad segura para realizar movimientos básicos.</small></span></div>
            <label className="form-field"><span className="form-field__label">Examen físico dirigido</span><textarea className="standalone-textarea" value={physicalExam} onChange={(event) => setPhysicalExam(event.target.value)} rows={4} placeholder="Cardiovascular, respiratorio, neurológico y musculoesquelético según indicación clínica." /></label>
            <div className="medical-results-grid">
              <label className="form-field"><span className="form-field__label">Dolor actual (0–10)</span><span className="form-field__control"><Activity size={18} /><input type="number" min="0" max="10" value={painLevel} onChange={(event) => setPainLevel(event.target.value)} /></span></label>
              <label className="form-field"><span className="form-field__label">Respuesta a prueba de esfuerzo (sólo si está indicada)</span><span className="form-field__control"><HeartPulse size={18} /><input value={exerciseResponse} onChange={(event) => setExerciseResponse(event.target.value)} placeholder="Protocolo, síntomas, FC, PA y recuperación" /></span></label>
            </div>
            <label className="form-field"><span className="form-field__label">Evaluación funcional</span><textarea className="standalone-textarea" value={functionalAssessment} onChange={(event) => setFunctionalAssessment(event.target.value)} rows={4} placeholder="Movilidad, equilibrio, marcha, sentadilla, empuje, tracción, dolor y compensaciones. Realizar sólo pruebas seguras para el cliente." /></label>
            <label className="form-field"><span className="form-field__label">Resultados y observaciones médicas integradas</span><textarea className="standalone-textarea" value={observations} onChange={(event) => setObservations(event.target.value)} rows={4} placeholder="Resume hallazgos, nivel de riesgo, tolerancia y cualquier condición observada." /></label>
          </section>

          <section className="medical-form-section medical-clearance-section">
            <div className="medical-form-section__heading"><ShieldCheck size={17} /><span><strong>Aptitud médica y plan de seguridad</strong><small>La asignación de entrenador sólo se habilita cuando existe autorización para entrenar.</small></span></div>
            <label className="form-field"><span className="form-field__label">Decisión de aptitud</span><span className="form-field__control"><BadgeCheck size={18} /><select value={clearanceStatus} onChange={(event) => { const next = event.target.value as MedicalClearanceStatus; setClearanceStatus(next); if (next !== "Apto sin restricciones" && next !== "Apto con restricciones") setTrainerId(0); }}>{MEDICAL_CLEARANCE_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></span></label>
            <div className={`medical-clearance-banner ${canAssignTrainer ? "cleared" : clearanceStatus === "Pendiente" ? "" : "blocked"}`}><ShieldCheck size={18} /><span><strong>{canAssignTrainer ? "Autorización para iniciar entrenamiento" : clearanceStatus === "Pendiente" ? "Aptitud aún sin definir" : "Asignación de entrenador bloqueada"}</strong><small>{canAssignTrainer ? "Registra recomendaciones y restricciones específicas antes de elegir al profesional." : clearanceStatus === "Pendiente" ? "El profesional debe emitir una decisión clínica." : "El cliente permanecerá en seguimiento médico hasta recibir una nueva autorización."}</small></span></div>
            <label className="form-field"><span className="form-field__label">Conducta, derivación o plan de seguimiento</span><textarea className="standalone-textarea" value={followUpPlan} onChange={(event) => setFollowUpPlan(event.target.value)} rows={3} placeholder="Indica controles, interconsultas, estudios adicionales y fecha de reevaluación cuando corresponda." /></label>
            <div className="medical-results-grid"><label className="form-field"><span className="form-field__label">Recomendaciones para el entrenamiento</span><textarea className="standalone-textarea" value={recommendations} onChange={(event) => setRecommendations(event.target.value)} rows={3} placeholder="Intensidad inicial, progresión, frecuencia, monitoreo y señales para detenerse." /></label><label className="form-field"><span className="form-field__label">Restricciones y señales de alarma</span><textarea className="standalone-textarea" value={restrictions} onChange={(event) => setRestrictions(event.target.value)} rows={3} placeholder="Ej. Evitar impacto, controlar presión o suspender ante dolor torácico, síncope o falta de aire inusual." /></label></div>
            <label className="medical-emergency-check"><input type="checkbox" checked={emergencyPlanReviewed} onChange={(event) => setEmergencyPlanReviewed(event.target.checked)} /><span><strong>Plan de emergencia revisado</strong><small>Se verificaron contacto de emergencia, señales de alarma, protocolo de actuación y acceso a equipo de respuesta del centro.</small></span></label>
            <label className="form-field medical-private-notes"><span className="form-field__label"><LockKeyhole size={14} /> Observaciones clínicas privadas</span><textarea className="standalone-textarea" value={privateNotes} onChange={(event) => setPrivateNotes(event.target.value)} rows={2} placeholder="Información reservada para dirección y el profesional autorizado." /></label>
          </section>

          <section className={`medical-assignment ${canAssignTrainer ? "" : "medical-assignment--locked"}`}>
            <div className="medical-assignment__heading"><Dumbbell size={20} /><span><strong>Asignación final</strong><small>{canAssignTrainer ? "Compara los perfiles y selecciona al entrenador según la evaluación completa." : "Disponible únicamente después de emitir una aptitud favorable."}</small></span></div>
            <div className="trainer-assignment-options" role="group" aria-label="Seleccionar entrenador recomendado">
              {trainers.map((trainer) => <button type="button" key={trainer.id} className={trainerId === trainer.id ? "selected" : ""} aria-pressed={trainerId === trainer.id} disabled={!canAssignTrainer} onClick={() => { setTrainerId(trainer.id); setError(""); }}><span className={`avatar avatar--${trainer.color}`}>{trainer.initials}</span><span><strong>{trainer.name}</strong><small>{trainer.specialty}</small><em>{trainer.openSpots} cupos · {trainer.availability}</em></span>{trainerId === trainer.id && <CheckCircle2 size={18} />}</button>)}
            </div>
            {selectedTrainer ? <article className="trainer-mini-profile" aria-live="polite">
              <header><span className={`avatar avatar--${selectedTrainer.color}`}>{selectedTrainer.initials}</span><div><small>PERFIL SELECCIONADO</small><strong>{selectedTrainer.name}</strong><p>{selectedTrainer.specialty}</p></div><em><Trophy size={13} /> {selectedTrainer.rating}</em></header>
              <p>{selectedTrainer.bio}</p>
              <div className="trainer-mini-profile__details"><span><GraduationCap size={15} /><small>FORMACIÓN</small><strong>{selectedTrainer.preparation}</strong></span><span><Award size={15} /><small>EXPERIENCIA</small><strong>{selectedTrainer.experience}</strong></span><span><CalendarDays size={15} /><small>DISPONIBILIDAD</small><strong>{selectedTrainer.availability}</strong></span></div>
              <div className="trainer-mini-profile__certifications"><small>CERTIFICACIONES</small>{selectedTrainer.certifications.slice(0, 3).map((certification) => <span key={certification}><Check size={12} /> {certification}</span>)}</div>
            </article> : <div className="trainer-profile-placeholder"><UserRound size={22} /><span><strong>{canAssignTrainer ? "Selecciona un entrenador" : "Esperando aptitud médica favorable"}</strong><small>{canAssignTrainer ? "Su perfil profesional y especialidad aparecerán aquí." : "No se puede asignar entrenador mientras el proceso clínico esté pendiente o requiera seguimiento."}</small></span></div>}
          </section>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal__actions"><button type="button" className="secondary-button" onClick={onClose}>Cerrar sin guardar</button><button className="primary-button primary-button--inline" type="submit"><CheckCircle2 size={16} /> {canAssignTrainer ? "Completar proceso y asignar" : "Guardar evaluación y seguimiento"}</button></div>
        </form>
      </section>
    </ModalLayer>
  );
}

export function AgendaView({ sessions, clients, records, trainers, role, trainerName, onSave, onMedicalComplete }: { sessions: AgendaSession[]; clients: Client[]; records: ClientRecord[]; trainers: Trainer[]; role: Role; trainerName: string; onSave: (session: AgendaSession) => void; onMedicalComplete: (session: AgendaSession, record: ClientRecord, trainer?: Trainer) => void }) {
  const permittedClients = role === "trainer" ? clients.filter((client) => client.trainer === trainerName) : clients.filter((client) => client.trainer !== "Pendiente de evaluación médica");
  const [editing, setEditing] = useState<AgendaSession | null>(null);
  const [medicalEditing, setMedicalEditing] = useState<AgendaSession | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<"Pendientes" | "Completadas" | "Todas">("Pendientes");

  const medicalSessions = sessions.filter((session) => session.type === "Evaluación médica").sort((a, b) => a.time.localeCompare(b.time));
  const pendingMedicalCount = medicalSessions.filter((session) => session.status === "Pendiente").length;
  const completedMedicalCount = medicalSessions.filter((session) => session.status === "Confirmada").length;
  const visible = role === "owner"
    ? medicalSessions.filter((session) => ownerFilter === "Todas" || (ownerFilter === "Pendientes" ? session.status === "Pendiente" : session.status === "Confirmada"))
    : sessions.filter((session) => !session.ownerOnly && (role !== "trainer" || session.trainer === trainerName)).sort((a, b) => a.time.localeCompare(b.time));

  function createSession() {
    const client = permittedClients[0];
    if (!client) return;
    setEditing({ id: 0, time: "09:00", clientId: client.id, clientName: client.name, focus: "", trainer: role === "trainer" ? trainerName : client.trainer, status: "Pendiente" });
  }

  const medicalClient = medicalEditing ? clients.find((client) => client.id === medicalEditing.clientId) : undefined;
  const medicalRecord = medicalClient ? records.find((record) => record.clientId === medicalClient.id) : undefined;

  return (
    <section className="ops-page">
      <div className="ops-page__heading">
        <div>
          <span className="eyebrow"><CalendarDays size={14} /> {role === "owner" ? "AGENDA MÉDICA DE INGRESO" : "AGENDA DE HOY"}</span>
          <h2>{role === "owner" ? "Citas de clientes nuevos" : role === "trainer" ? "Mis sesiones" : "Citas y sesiones"}</h2>
          <p>{role === "owner" ? "Aquí aparecen automáticamente los clientes registrados por primera vez. Abre una cita para completar todo el proceso médico y asignar entrenador." : role === "secretary" ? "Pulsa una cita para verla o cambiarla. Las evaluaciones médicas son privadas del dueño." : "Miércoles, 22 de julio de 2026."}</p>
        </div>
        {role !== "owner" && <button type="button" className="primary-button primary-button--inline" onClick={createSession} disabled={!permittedClients.length}><Plus size={16} /> {role === "secretary" ? "Agregar cita" : "Nueva sesión"}</button>}
      </div>

      {role === "owner" && <>
        <section className="medical-agenda-summary" aria-label="Resumen de evaluaciones médicas">
          <article><span><Stethoscope size={19} /></span><div><small>PENDIENTES</small><strong>{pendingMedicalCount}</strong><p>Esperan evaluación</p></div></article>
          <article><span><CheckCircle2 size={19} /></span><div><small>COMPLETADAS</small><strong>{completedMedicalCount}</strong><p>Ya tienen entrenador</p></div></article>
          <article><span><UsersRound size={19} /></span><div><small>INGRESOS NUEVOS</small><strong>{medicalSessions.length}</strong><p>Procesos registrados</p></div></article>
        </section>
        <section className="medical-process-strip" aria-label="Proceso médico de ingreso">
          <div><b>1</b><span><strong>Cliente registrado</strong><small>La cita se crea automáticamente.</small></span></div>
          <i />
          <div><b>2</b><span><strong>Evaluación médica</strong><small>Signos, antecedentes y observaciones.</small></span></div>
          <i />
          <div><b>3</b><span><strong>Asignación final</strong><small>El dueño elige al entrenador.</small></span></div>
        </section>
      </>}

      <article className="panel agenda-board">
        {role === "owner" && <div className="agenda-filter-tabs" role="group" aria-label="Filtrar citas médicas">{(["Pendientes", "Completadas", "Todas"] as const).map((filter) => <button type="button" key={filter} className={ownerFilter === filter ? "active" : ""} onClick={() => setOwnerFilter(filter)}>{filter}</button>)}</div>}
        <div className="agenda-hours">
          {visible.map((session) => {
            const client = clients.find((item) => item.id === session.clientId);
            return <button type="button" className={session.type === "Evaluación médica" ? "agenda-medical-row" : ""} key={session.id} onClick={() => session.type === "Evaluación médica" && role === "owner" ? setMedicalEditing(session) : setEditing(session)}><time>{session.time}</time><i className={session.status === "Confirmada" ? "active" : ""} /><span><strong>{session.clientName}</strong><small>{role === "owner" && client ? `${client.goal} · Plan ${client.plan}` : `${session.focus} · ${session.status}`}</small></span><em>{session.type === "Evaluación médica" ? (session.status === "Pendiente" ? "Proceso pendiente" : "Proceso completado") : session.trainer}</em>{session.type === "Evaluación médica" ? <Stethoscope size={16} /> : <ChevronRight size={16} />}</button>;
          })}
          {!visible.length && <div className="agenda-empty"><CalendarCheck size={28} /><strong>{role === "owner" && ownerFilter === "Pendientes" ? "No hay evaluaciones pendientes" : "No hay citas en esta vista"}</strong><span>{role === "owner" ? "Los nuevos registros aparecerán aquí automáticamente." : "Agrega una cita para comenzar."}</span></div>}
        </div>
      </article>

      {editing && <SessionEditorModal initial={editing} clients={permittedClients} role={role} trainerName={trainerName} onClose={() => setEditing(null)} onSave={(session) => { onSave(session); setEditing(null); }} />}
      {medicalEditing && medicalClient && medicalRecord && <MedicalEvaluationModal session={medicalEditing} client={medicalClient} record={medicalRecord} trainers={trainers} onClose={() => setMedicalEditing(null)} onComplete={(session, record, trainer) => { onMedicalComplete(session, record, trainer); setMedicalEditing(null); }} />}
    </section>
  );
}
