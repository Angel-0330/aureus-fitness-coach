"use client";

// Orquestador de navegación, estado y acciones de la aplicación.
import {
  KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  createClientRecord,
  NAV_BY_ROLE,
  ROLE_META,
  SECRETARY_VIEW_LABELS,
  START_VIEW,
} from "./data";
import type {
  Account,
  AgendaSession,
  AppPreferences,
  Client,
  ClientRecord,
  ExternalSale,
  GymPlan,
  MeasurementRecord,
  PaymentMethod,
  PaymentReceipt,
  PaymentStatus,
  ReceiptConcept,
  ReceiptPaymentMethod,
  StaffMember,
  Trainer,
  ViewName,
  WorkspaceData,
} from "./types";
import { Brand, RoleBadge } from "./components/shared";
import { OwnerHome, SecretaryHome, TrainerHome } from "./features/dashboards";
import {
  AgendaView,
  DirectoryView,
  PaymentsView,
  PlansView,
  StaffEditorModal,
  TeamView,
  TrainersView,
} from "./features/management";
import {
  RegistrationWizard,
  TrainerDetail,
  TrainerProfileEditor,
} from "./features/people";
import { ClientRecordDetail } from "./features/records";
import { ReceiptModal } from "./features/receipts";
import { SalesView } from "./features/sales";
import { AddStaffModal, SettingsModal } from "./features/settings";
import { ProgressView, RoutinesView } from "./features/training";
import { markClientPaidInSupabase } from "@/lib/clients-data";
import { registerNewClient } from "@/lib/client-onboarding";
import { fetchMedicalRecord, saveMedicalRecord } from "@/lib/medical-record-data";
import { savePlanToSupabase } from "@/lib/gym-plans-data";
import { saveMeasurementToSupabase } from "@/lib/measurements-data";
import { createStaffAccount, updateStaffAccountReal } from "@/lib/staff-data";
import { saveSessionToSupabase, assignTrainerToClient } from "@/lib/agenda-data";
import { saveExternalSale } from "@/lib/external-sales-data";
import { issueReceipt, initialsFromGymName } from "@/lib/receipts-data";
import { initials } from "./utils";

export function AppShell({ account, workspace, onUpdateWorkspace, onLogout, onCreateStaff, onUpdateStaffAccount, clientIdMap, onClientCreated, planIdMap, onPlanCreated, measurementIdMap, onMeasurementCreated, staffIdMap, onStaffCreated, trainerIdMap, sessionIdMap, onSessionCreated, sessionScheduledAtMap, sales, onSaleCreated }: { account: Account; workspace: WorkspaceData; onUpdateWorkspace: (updater: (current: WorkspaceData) => WorkspaceData) => void; onLogout: () => void; onCreateStaff: (account: Account) => void; onUpdateStaffAccount: (member: StaffMember) => void; clientIdMap?: Record<number, string>; onClientCreated?: (localId: number, realId: string) => void; planIdMap?: Record<number, string>; onPlanCreated?: (localId: number, realId: string) => void; measurementIdMap?: Record<number, string>; onMeasurementCreated?: (localId: number, realId: string) => void; staffIdMap?: Record<number, string>; onStaffCreated?: (localId: number, realId: string) => void; trainerIdMap?: Record<number, string>; sessionIdMap?: Record<number, string>; onSessionCreated?: (localId: number, realId: string, scheduledAt: string) => void; sessionScheduledAtMap?: Record<number, string>; sales?: ExternalSale[]; onSaleCreated?: (sale: ExternalSale) => void }) {
  // Extensión clínica Medical 360: cuando está apagada, la app funciona sin
  // evaluación médica (el entrenador se asigna al registrar) y sin las
  // secciones clínicas del expediente.
  const medical360Enabled = account.medical360Enabled !== false;
  const [view, setView] = useState<ViewName>(START_VIEW[account.role]);
  const [viewHistory, setViewHistory] = useState<ViewName[]>([]);
  const { clients, clientRecords, trainers, measurements, staff, plans, sessions } = workspace;
  const [preferences, setPreferences] = useState<AppPreferences>(() => {
    const defaults: AppPreferences = { compact: false, animations: true, notificationBadge: true, theme: "dark" };
    if (typeof window === "undefined") return defaults;
    try {
      const saved = window.localStorage.getItem("aureus-preferences-gold-v1");
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [remoteRecord, setRemoteRecord] = useState<ClientRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordLoadError, setRecordLoadError] = useState(false);
  const [recordRetryToken, setRecordRetryToken] = useState(0);
  const [receiptClient, setReceiptClient] = useState<Client | null>(null);

  // Al abrir la ficha de un cliente, traemos su expediente real de Supabase
  // (si ya existe uno enlazado). Si la petición falla de verdad (no solo
  // "todavía no tiene expediente"), mostramos un aviso en vez de usar datos
  // de ejemplo, para nunca confundir información falsa con información real.
  useEffect(() => {
    setRemoteRecord(null);
    setRecordLoadError(false);
    if (!selectedClient) return;
    const realId = clientIdMap?.[selectedClient.id];
    if (!realId) return;
    let cancelled = false;
    setRecordLoading(true);
    fetchMedicalRecord(realId, selectedClient.id)
      .then((record) => {
        if (cancelled) return;
        if (record) setRemoteRecord(record);
      })
      .catch(() => {
        if (!cancelled) setRecordLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setRecordLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClient?.id, clientIdMap, recordRetryToken]);

  function retryRecordFetch() {
    setRecordRetryToken((token) => token + 1);
  }
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [showStaff, setShowStaff] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const nav = NAV_BY_ROLE[account.role];

  function setClients(action: Client[] | ((current: Client[]) => Client[])) {
    onUpdateWorkspace((current) => ({ ...current, clients: typeof action === "function" ? action(current.clients) : action }));
  }
  function setClientRecords(action: ClientRecord[] | ((current: ClientRecord[]) => ClientRecord[])) {
    onUpdateWorkspace((current) => ({ ...current, clientRecords: typeof action === "function" ? action(current.clientRecords) : action }));
  }
  function setMeasurements(action: MeasurementRecord[] | ((current: MeasurementRecord[]) => MeasurementRecord[])) {
    onUpdateWorkspace((current) => ({ ...current, measurements: typeof action === "function" ? action(current.measurements) : action }));
  }
  function setStaff(action: StaffMember[] | ((current: StaffMember[]) => StaffMember[])) {
    onUpdateWorkspace((current) => ({ ...current, staff: typeof action === "function" ? action(current.staff) : action }));
  }
  function setPlans(action: GymPlan[] | ((current: GymPlan[]) => GymPlan[])) {
    onUpdateWorkspace((current) => ({ ...current, plans: typeof action === "function" ? action(current.plans) : action }));
  }
  function setSessions(action: AgendaSession[] | ((current: AgendaSession[]) => AgendaSession[])) {
    onUpdateWorkspace((current) => ({ ...current, sessions: typeof action === "function" ? action(current.sessions) : action }));
  }
  function saveTrainerProfile(trainer: Trainer) {
    onUpdateWorkspace((current) => ({ ...current, trainers: current.trainers.map((item) => item.id === trainer.id ? trainer : item) }));
    setSelectedTrainer((current) => current?.id === trainer.id ? trainer : current);
    notify("Perfil profesional actualizado. El dueño ya puede ver los cambios.");
  }

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolvedTheme = preferences.theme === "system" ? (systemTheme.matches ? "dark" : "light") : preferences.theme;
      document.documentElement.classList.toggle("theme-light", resolvedTheme === "light");
      document.documentElement.classList.toggle("theme-dark", resolvedTheme === "dark");
    };
    applyTheme();
    systemTheme.addEventListener("change", applyTheme);
    return () => systemTheme.removeEventListener("change", applyTheme);
  }, [preferences.theme]);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  const notificationItems: { title: string; detail: string; view: ViewName }[] = account.role === "owner" ? [
    ...(medical360Enabled ? [{ title: "Evaluaciones médicas", detail: `${sessions.filter((session) => session.type === "Evaluación médica" && session.status === "Pendiente").length} citas pendientes antes de asignar entrenador.`, view: "Agenda" as ViewName }] : []),
    { title: "Pagos por revisar", detail: "Hay mensualidades pendientes o próximas a vencer.", view: "Pagos" },
    { title: "Invitación pendiente", detail: "Revisa el estado de las cuentas del equipo.", view: "Equipo" },
  ] : account.role === "secretary" ? [
    { title: "Agenda del día", detail: "Confirma las sesiones pendientes de recepción.", view: "Agenda" },
    { title: "Pagos por verificar", detail: "Revisa vencimientos antes del cierre diario.", view: "Pagos" },
    { title: "Nuevo registro", detail: "Añade un cliente nuevo al gimnasio.", view: "Registrar cliente" },
  ] : [
    { title: "Próxima sesión", detail: "Consulta el horario y abre la sesión asignada.", view: "Agenda" },
    { title: "Rutinas por revisar", detail: "Actualiza el programa semanal de tus clientes.", view: "Rutinas" },
    { title: "Seguimiento pendiente", detail: "Registra una nueva evaluación de progreso.", view: "Progreso" },
  ];

  function notify(message: string) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 2800);
  }
  function changeView(next: ViewName) {
    if (next !== view) {
      setViewHistory((items) => [...items, view].slice(-12));
      setView(next);
      window.scrollTo({ top: 0, behavior: preferences.animations ? "smooth" : "auto" });
    }
    setMenuOpen(false);
    setShowNotifications(false);
  }
  function goToPreviousView() {
    const previous = viewHistory.at(-1);
    if (!previous) return;
    setViewHistory((items) => items.slice(0, -1));
    setView(previous);
    setMenuOpen(false);
    setShowNotifications(false);
  }
  async function markPaid(id: number) {
    const realClientId = clientIdMap?.[id];
    let nextDueLabel = "22 ago.";
    if (realClientId) {
      try {
        nextDueLabel = await markClientPaidInSupabase(realClientId);
      } catch {
        notify("No se pudo confirmar el pago. Intenta de nuevo.");
        return;
      }
    }
    setClients((items) => items.map((client) => client.id === id ? { ...client, payment: "Al día" as PaymentStatus, nextDue: nextDueLabel } : client));
    setSelectedClient((client) => client?.id === id ? { ...client, payment: "Al día", nextDue: nextDueLabel } : client);
    notify("Mensualidad marcada como pagada.");
  }
  async function issueReceiptForClient(client: Client, input: { amount: number; concept: ReceiptConcept; paymentMethod: ReceiptPaymentMethod; balance: number; service: string; nextDue: string }): Promise<PaymentReceipt | null> {
    const clientRealId = clientIdMap?.[client.id];
    if (!clientRealId || !account.gymId) {
      notify("No se pudo emitir el recibo. Intenta de nuevo.");
      return null;
    }
    try {
      const receipt = await issueReceipt(account.gymId, clientRealId, account.id, account.name, input, account.receiptPrefix || initialsFromGymName(account.gym));
      if (input.concept === "Cancelación") {
        const nextDueLabel = input.nextDue ? new Date(`${input.nextDue}T12:00:00`).toLocaleDateString("es-PA", { day: "2-digit", month: "short" }) : "Por definir";
        setClients((items) => items.map((item) => item.id === client.id ? { ...item, payment: "Al día" as PaymentStatus, nextDue: nextDueLabel } : item));
        setSelectedClient((current) => current?.id === client.id ? { ...current, payment: "Al día", nextDue: nextDueLabel } : current);
      }
      notify(`Recibo ${receipt.displayNumber} emitido por $${input.amount.toFixed(2)}.`);
      return { ...receipt, clientName: client.name };
    } catch {
      notify("No se pudo emitir el recibo. Intenta de nuevo.");
      return null;
    }
  }
  async function saveMeasurement(record: MeasurementRecord) {
    const clientRealId = clientIdMap?.[record.clientId];
    if (!clientRealId || !account.gymId) {
      notify("No se pudo guardar el registro. Intenta de nuevo.");
      return;
    }
    const creating = record.id === 0;
    try {
      const realId = creating ? undefined : measurementIdMap?.[record.id];
      const savedRealId = await saveMeasurementToSupabase(account.gymId, clientRealId, record, realId);
      setMeasurements((items) => {
        const saved = creating ? { ...record, id: items.reduce((highest, item) => Math.max(highest, item.id), 0) + 1 } : record;
        if (creating) onMeasurementCreated?.(saved.id, savedRealId);
        return items.some((item) => item.id === saved.id) ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items];
      });
      setClients((items) => items.map((client) => client.id === record.clientId ? { ...client, lastUpdate: "Ahora" } : client));
      notify("Registro de medidas guardado correctamente.");
    } catch {
      notify("No se pudo guardar el registro de medidas. Intenta de nuevo.");
    }
  }
  async function savePlan(plan: GymPlan) {
    if (!account.gymId) {
      notify("No se pudo guardar el plan. Intenta de nuevo.");
      return;
    }
    const creating = plan.id === 0;
    try {
      const realId = creating ? undefined : planIdMap?.[plan.id];
      const savedRealId = await savePlanToSupabase(account.gymId, plan, realId);
      setPlans((items) => {
        const saved = creating ? { ...plan, id: items.reduce((highest, item) => Math.max(highest, item.id), 0) + 1 } : plan;
        if (creating) onPlanCreated?.(saved.id, savedRealId);
        return items.some((item) => item.id === saved.id) ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved];
      });
      notify(creating ? "Plan creado correctamente." : "Plan actualizado correctamente.");
    } catch {
      notify("No se pudo guardar el plan. Intenta de nuevo.");
    }
  }
  async function saveSale(input: { product: string; amount: number; paymentMethod: PaymentMethod }) {
    if (!account.gymId) {
      notify("No se pudo guardar la venta. Intenta de nuevo.");
      return;
    }
    try {
      const { createdAt } = await saveExternalSale(account.gymId, account.id, input);
      onSaleCreated?.({
        id: Date.now(),
        product: input.product,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        createdAt,
      });
      notify(`Venta de ${input.product} registrada por $${input.amount.toFixed(2)}.`);
    } catch {
      notify("No se pudo guardar la venta. Intenta de nuevo.");
    }
  }
  async function saveSession(session: AgendaSession) {
    const clientRealId = clientIdMap?.[session.clientId];
    if (!clientRealId || !account.gymId) {
      notify("No se pudo guardar la cita. Intenta de nuevo.");
      return;
    }
    const creating = session.id === 0;
    const trainerLocalId = trainers.find((item) => item.name === session.trainer)?.id;
    const trainerRealId = trainerLocalId ? trainerIdMap?.[trainerLocalId] ?? null : null;
    try {
      const realId = creating ? undefined : sessionIdMap?.[session.id];
      const existingScheduledAt = creating ? undefined : sessionScheduledAtMap?.[session.id];
      const { realId: savedRealId, scheduledAt } = await saveSessionToSupabase(account.gymId, session, clientRealId, trainerRealId, realId, existingScheduledAt);
      setSessions((items) => {
        const saved = creating ? { ...session, id: items.reduce((highest, item) => Math.max(highest, item.id), 0) + 1 } : session;
        onSessionCreated?.(saved.id, savedRealId, scheduledAt);
        return items.some((item) => item.id === saved.id) ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved];
      });
      notify(creating ? "Sesión añadida a la agenda." : "Sesión actualizada correctamente.");
    } catch {
      notify("No se pudo guardar la cita. Intenta de nuevo.");
    }
  }
  async function saveClientRecord(record: ClientRecord) {
    let recordToStore = record;
    const realId = clientIdMap?.[record.clientId];
    if (realId) {
      try {
        recordToStore = await saveMedicalRecord(realId, record, record.clientId);
      } catch {
        notify("No se pudo guardar la ficha. Verifica tu conexión e intenta de nuevo.");
        return;
      }
    }
    setClientRecords((items) => items.some((item) => item.clientId === recordToStore.clientId) ? items.map((item) => item.clientId === recordToStore.clientId ? recordToStore : item) : [...items, recordToStore]);
    setRemoteRecord(recordToStore);
    notify("Ficha actualizada correctamente.");
  }
  async function addClient(input: { name: string; email: string; phone: string; goal: string; plan: string; price: number; medicalDate: string; medicalTime: string; trainerId?: number }) {
    const ownerName = account.role === "owner" ? account.name : workspace.staff.find((member) => member.role === "owner")?.name ?? "Dueño";
    const medicalTime = input.medicalTime;
    const assignedTrainer = input.trainerId ? trainers.find((item) => item.id === input.trainerId) : undefined;

    const newLocalId = workspace.clients.reduce((highest, item) => Math.max(highest, item.id), 0) + 1;
    const client: Client = { id: newLocalId, name: input.name, initials: initials(input.name), email: input.email, phone: input.phone, plan: input.plan, price: input.price, trainer: medical360Enabled ? "Pendiente de evaluación médica" : assignedTrainer?.name ?? "Sin asignar", goal: input.goal, progress: 0, payment: "Pendiente", nextDue: "Hoy", sessions: 0, lastUpdate: "Recién registrado", color: medical360Enabled ? "amber" : assignedTrainer?.color ?? "amber" };

    if (account.gymId) {
      try {
        const realId = await registerNewClient(
          account.gymId,
          { name: input.name, email: input.email, phone: input.phone, goal: input.goal, planName: input.plan, price: input.price },
          input.medicalDate,
          input.medicalTime,
          { medical360Enabled, trainerRealId: assignedTrainer ? trainerIdMap?.[assignedTrainer.id] ?? null : null }
        );
        onClientCreated?.(newLocalId, realId);
      } catch {
        notify("No se pudo guardar el cliente en la base de datos. Intenta de nuevo.");
        return;
      }
    }

    onUpdateWorkspace((current) => {
      const record = createClientRecord(client, medical360Enabled ? { medicalAppointmentTime: medicalTime } : undefined);
      if (!medical360Enabled) {
        return {
          ...current,
          clients: [client, ...current.clients],
          clientRecords: [record, ...current.clientRecords],
          trainers: current.trainers.map((item) => assignedTrainer && item.id === assignedTrainer.id ? { ...item, clients: item.clients + 1, openSpots: Math.max(0, item.openSpots - 1) } : item),
        };
      }
      const medicalAppointment: AgendaSession = {
        id: current.sessions.reduce((highest, session) => Math.max(highest, session.id), 0) + 1,
        time: medicalTime,
        clientId: client.id,
        clientName: client.name,
        focus: "Evaluación médica inicial",
        trainer: ownerName,
        status: "Pendiente",
        type: "Evaluación médica",
        ownerOnly: true,
      };
      return { ...current, clients: [client, ...current.clients], clientRecords: [record, ...current.clientRecords], sessions: [...current.sessions, medicalAppointment] };
    });
    changeView(medical360Enabled && account.role === "owner" ? "Agenda" : "Clientes");
    notify(medical360Enabled
      ? `${client.name} fue registrado. La evaluación médica se añadió a la agenda del dueño.`
      : `${client.name} fue registrado y asignado a ${assignedTrainer?.name ?? "su entrenador"}.`);
  }
  async function completeMedicalAssessment(session: AgendaSession, record: ClientRecord, trainer?: Trainer) {
    // 1. Guardar el expediente médico real (signos, antecedentes, aptitud).
    const clientRealId = clientIdMap?.[record.clientId];
    if (clientRealId) {
      try {
        await saveMedicalRecord(clientRealId, record, record.clientId);
      } catch {
        notify("No se pudo guardar la evaluación médica. Intenta de nuevo.");
        return;
      }
    }

    // 2. Asignar el entrenador al cliente en la base de datos (esto es lo
    //    que hace que aparezca en "Mis clientes" de ese entrenador).
    if (trainer && clientRealId) {
      const trainerRealId = trainerIdMap?.[trainer.id];
      if (trainerRealId) {
        try {
          await assignTrainerToClient(clientRealId, trainerRealId);
        } catch {
          notify("La evaluación se guardó, pero no se pudo asignar el entrenador. Intenta de nuevo.");
        }
      }
    }

    // 3. Actualizar el estado de la cita en la agenda.
    if (account.gymId && clientRealId) {
      const trainerRealId = trainer ? trainerIdMap?.[trainer.id] ?? null : null;
      try {
        await saveSessionToSupabase(account.gymId, session, clientRealId, trainerRealId, sessionIdMap?.[session.id], sessionScheduledAtMap?.[session.id]);
      } catch {
        console.error("No se pudo actualizar el estado de la cita.");
      }
    }

    if (!trainer) {
      onUpdateWorkspace((current) => ({
        ...current,
        clients: current.clients.map((client) => client.id === record.clientId ? { ...client, lastUpdate: "Seguimiento médico requerido" } : client),
        clientRecords: current.clientRecords.map((item) => item.clientId === record.clientId ? record : item),
        sessions: current.sessions.map((item) => item.id === session.id ? session : item),
      }));
      setSelectedClient((client) => client?.id === record.clientId ? { ...client, lastUpdate: "Seguimiento médico requerido" } : client);
      notify(`Evaluación guardada. ${session.clientName} permanece pendiente de autorización médica.`);
      return;
    }
    onUpdateWorkspace((current) => {
      const currentClient = current.clients.find((client) => client.id === record.clientId);
      const previousTrainer = currentClient?.trainer;
      return {
        ...current,
        clients: current.clients.map((client) => client.id === record.clientId ? { ...client, trainer: trainer.name, color: trainer.color, lastUpdate: "Evaluación médica completada" } : client),
        clientRecords: current.clientRecords.map((item) => item.clientId === record.clientId ? record : item),
        sessions: current.sessions.map((item) => item.id === session.id ? session : item),
        trainers: current.trainers.map((item) => {
          if (previousTrainer === trainer.name) return item;
          if (item.name === previousTrainer && previousTrainer !== "Pendiente de evaluación médica") return { ...item, clients: Math.max(0, item.clients - 1), openSpots: item.openSpots + 1 };
          if (item.id === trainer.id) return { ...item, clients: item.clients + 1, openSpots: Math.max(0, item.openSpots - 1) };
          return item;
        }),
      };
    });
    setSelectedClient((client) => client?.id === record.clientId ? { ...client, trainer: trainer.name, color: trainer.color, lastUpdate: "Evaluación médica completada" } : client);
    notify(`Evaluación completada. La asignación de ${session.clientName} con ${trainer.name} quedó registrada.`);
  }
    async function addStaff(member: StaffMember, newAccount: Account, password: string) {
    try {
            const { realId } = await createStaffAccount({ name: member.name, email: member.email, role: member.role, password });
      const savedMember: StaffMember = { ...member, id: staff.reduce((highest, item) => Math.max(highest, item.id), 0) + 1, status: "Activo" };
      onStaffCreated?.(savedMember.id, realId);
      setStaff((items) => [...items, savedMember]);
      onCreateStaff(newAccount);
      setShowStaff(false);
            notify(`Cuenta de ${member.name} creada. Al entrar por primera vez tendrá que elegir  su propia contraseña.`);
    } catch (error: any) {
      notify(error?.message ?? "No se pudo crear la cuenta. Intenta de nuevo.");
    }
  }
  async function updateStaff(member: StaffMember) {
    const realId = staffIdMap?.[member.id];
    if (!realId) {
      notify("No se pudo actualizar la cuenta. Intenta de nuevo.");
      return;
    }
    try {
      await updateStaffAccountReal(realId, { role: member.role, status: member.status });
      setStaff((items) => items.map((item) => item.id === member.id ? member : item));
      onUpdateStaffAccount(member);
      setEditingStaff(null);
      notify(`Cuenta de ${member.name} actualizada.`);
    } catch (error: any) {
      notify(error?.message ?? "No se pudo actualizar la cuenta. Intenta de nuevo.");
    }
  }
  function savePreferences(next: AppPreferences) { setPreferences(next); window.localStorage.setItem("aureus-preferences-gold-v1", JSON.stringify(next)); setShowSettings(false); notify("Preferencias guardadas."); }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") changeView(account.role === "trainer" ? "Mis clientes" : "Clientes");
  }

  const filteredClients = useMemo(() => clients.filter((client) => `${client.name} ${client.plan} ${client.trainer}`.toLowerCase().includes(query.toLowerCase())), [clients, query]);

  function content() {
    if (view === "Resumen") return <OwnerHome clients={clients} trainers={trainers} staff={staff} setView={changeView} onSelect={setSelectedClient} />;
    if (view === "Recepción") return <SecretaryHome clients={clients} sessions={sessions} setView={changeView} onSelect={setSelectedClient} />;
    if (view === "Mi panel") return <TrainerHome clients={clients} sessions={sessions} trainerName={account.name} setView={changeView} onSelect={setSelectedClient} />;
    if (view === "Clientes" || view === "Mis clientes") return <DirectoryView clients={clients} query={query} role={account.role} trainerName={account.name} onSelect={setSelectedClient} />;
    if (view === "Entrenadores") return <TrainersView trainers={trainers} onOpen={setSelectedTrainer} />;
    if (view === "Mi perfil") {
      const trainer = trainers.find((item) => item.name === account.name);
      return trainer ? <TrainerProfileEditor trainer={trainer} onSave={saveTrainerProfile} /> : <section className="ops-page"><div className="ops-empty"><UserRound size={26} /><strong>Perfil no encontrado</strong><span>Solicita al dueño que vincule tu cuenta con un entrenador.</span></div></section>;
    }
    if (view === "Pagos") return <PaymentsView clients={filteredClients} role={account.role} onMarkPaid={markPaid} onSelect={setSelectedClient} onReceipt={setReceiptClient} />;
    if (view === "Planes") return <PlansView plans={plans} onSave={savePlan} />;
    if (view === "Ventas externas") return <SalesView sales={sales ?? []} onSave={saveSale} />;
    if (view === "Equipo") return <TeamView staff={staff} onAdd={() => setShowStaff(true)} onEdit={setEditingStaff} />;
    if (view === "Agenda") return <AgendaView sessions={sessions} clients={clients} records={clientRecords} trainers={trainers} role={account.role} trainerName={account.name} onSave={saveSession} onMedicalComplete={completeMedicalAssessment} medical360Enabled={medical360Enabled} />;
    if (view === "Rutinas") return <RoutinesView clients={clients} records={clientRecords} trainerName={account.name} onSave={saveClientRecord} />;
    if (view === "Progreso") return <ProgressView clients={clients} trainerName={account.name} measurements={measurements} onSave={saveMeasurement} onSelect={setSelectedClient} />;
    if (view === "Registrar cliente") return <RegistrationWizard plans={plans} onAdd={addClient} onCancel={() => changeView(START_VIEW[account.role])} medical360Enabled={medical360Enabled} trainers={trainers} />;
    return null;
  }

  const addLabel = account.role === "trainer" ? "Actualizar" : "Registrar cliente";
  const addAction = () => account.role === "trainer" ? changeView("Progreso") : changeView("Registrar cliente");
  return (
    <main className={`app-shell ops-shell ops-shell--${account.role} ${preferences.compact ? "ops-shell--compact" : ""} ${preferences.animations ? "" : "ops-shell--reduced-motion"}`}>
      <aside className={`sidebar ops-sidebar ${menuOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand"><Brand compact /><button type="button" className="icon-button sidebar__close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><X size={20} /></button></div>
        <div className="sidebar-role"><RoleBadge role={account.role} /><span>{account.gym}</span></div>
        <nav className="sidebar__nav" aria-label="Navegación principal"><span className="nav-label">{account.role === "owner" ? "ADMINISTRACIÓN" : account.role === "secretary" ? "TAREAS PRINCIPALES" : "ESPACIO DEL ENTRENADOR"}</span>{nav.map(({ label, icon: Icon }) => <button type="button" key={label} className={view === label ? "active" : ""} onClick={() => changeView(label)}><Icon size={19} /><span>{account.role === "secretary" ? SECRETARY_VIEW_LABELS[label] ?? label : label}</span>{view === label && <i />}</button>)}<span className="nav-label nav-label--second">CUENTA</span><button type="button" onClick={() => setShowSettings(true)}><Settings size={19} /><span>Configuración</span></button></nav>
        <div className="sidebar-permission"><ShieldCheck size={17} /><div><strong>Permisos: {ROLE_META[account.role].label}</strong><small>{account.role === "owner" ? "Acceso completo a toda la operación." : account.role === "secretary" ? "Sin acceso a configuración del dueño." : "Solo clientes asignados a tu cuenta."}</small></div></div>
        <div className="sidebar__profile"><span className="avatar avatar--gold">{account.initials}</span><div><strong>{account.name}</strong><small>{ROLE_META[account.role].label}</small></div><button type="button" className="icon-button" onClick={onLogout} aria-label="Cerrar sesión"><LogOut size={17} /></button></div>
      </aside>
      {menuOpen && <button type="button" className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />}

      <section className="workspace ops-workspace">
        <header className="topbar ops-topbar"><div className="topbar__left"><button type="button" className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><Menu size={22} /></button><button type="button" className="back-view-button" onClick={goToPreviousView} disabled={!viewHistory.length} aria-label={viewHistory.length ? `Volver a ${viewHistory.at(-1)}` : "No hay una pestaña anterior"} title={viewHistory.length ? `Volver a ${viewHistory.at(-1)}` : "No hay una pestaña anterior"}><ArrowLeft size={17} /><span>Volver</span></button><div><span>{new Date().toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</span><h1>{account.role === "secretary" ? SECRETARY_VIEW_LABELS[view] ?? view : view}</h1></div></div><div className="topbar__actions"><label className="search-box"><Search size={18} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleSearchKeyDown} placeholder={account.role === "secretary" ? "Escribe el nombre de una persona..." : "Buscar cliente, plan o entrenador..."} aria-label="Buscar" />{query ? <button type="button" onClick={() => { setQuery(""); searchRef.current?.focus(); }} aria-label="Limpiar búsqueda"><X size={14} /></button> : <kbd>⌘ K</kbd>}</label><button type="button" className="icon-button icon-button--top" onClick={() => setShowNotifications((open) => !open)} aria-label="Notificaciones" aria-expanded={showNotifications} aria-controls="notifications-panel"><Bell size={19} />{preferences.notificationBadge && <i />}</button><button type="button" className="primary-button primary-button--top" onClick={addAction}><Plus size={18} /><span>{account.role === "secretary" ? "Nuevo cliente" : addLabel}</span></button></div></header>
        {showNotifications && <aside className="notification-panel" id="notifications-panel" aria-label="Avisos"><div className="notification-panel__heading"><span><Bell size={16} /><strong>Avisos</strong></span><button type="button" className="icon-button" onClick={() => setShowNotifications(false)} aria-label="Cerrar avisos"><X size={16} /></button></div>{notificationItems.map((item) => <button type="button" key={item.title} onClick={() => changeView(item.view)}><span><strong>{item.title}</strong><small>{item.detail}</small></span><ChevronRight size={15} /></button>)}</aside>}
        <div className="workspace__body ops-body">{content()}</div>
      </section>

      <nav className={`bottom-nav ops-bottom-nav ${account.role !== "owner" ? "bottom-nav--six" : ""}`} aria-label="Navegación móvil">{(account.role !== "owner" ? nav : nav.slice(0, 5)).map(({ label, icon: Icon }) => <button type="button" key={label} className={view === label ? "active" : ""} onClick={() => changeView(label)}><Icon size={19} /><span>{account.role === "secretary" ? SECRETARY_VIEW_LABELS[label] ?? label : label}</span></button>)}</nav>
      {(() => {
        if (!selectedClient || (account.role === "trainer" && selectedClient.trainer !== account.name)) return null;
        const hasLinkedRecord = Boolean(clientIdMap?.[selectedClient.id]);
        const recordStatus = hasLinkedRecord ? (recordLoading ? "loading" : recordLoadError ? "error" : "ready") : "ready";
        return (
          <ClientRecordDetail
            key={`${selectedClient.id}-${recordStatus}`}
            client={selectedClient}
            record={remoteRecord ?? clientRecords.find((record) => record.clientId === selectedClient.id) ?? createClientRecord(selectedClient)}
            role={account.role}
            accountName={account.name}
            onClose={() => setSelectedClient(null)}
            onSave={saveClientRecord}
            loading={hasLinkedRecord && recordLoading}
            loadError={hasLinkedRecord && recordLoadError}
            onRetry={retryRecordFetch}
            medical360Enabled={medical360Enabled}
          />
        );
      })()}
      {receiptClient && <ReceiptModal client={receiptClient} gymName={account.gym} gymTagline={account.gymTagline} gymCity={account.gymCity} issuedByName={account.name} onClose={() => setReceiptClient(null)} onIssue={(input) => issueReceiptForClient(receiptClient, input)} />}
      {selectedTrainer && <TrainerDetail trainer={selectedTrainer} clients={clients} onClose={() => setSelectedTrainer(null)} onClient={(client) => { setSelectedTrainer(null); setSelectedClient(client); }} />}
      {showStaff && <AddStaffModal gym={account.gym} existingEmails={staff.map((member) => member.email)} onClose={() => setShowStaff(false)} onSave={addStaff} />}
      {editingStaff && <StaffEditorModal member={editingStaff} onClose={() => setEditingStaff(null)} onSave={updateStaff} />}
      {showSettings && <SettingsModal account={account} preferences={preferences} onClose={() => setShowSettings(false)} onSave={savePreferences} />}
      {toast && <div className="toast" role="status" style={{ zIndex: 9999 }}><CheckCircle2 size={18} /><span>{toast}</span></div>}
    </main>
  );
}