"use client";

// Punto de entrada: arranque, sesión activa (Supabase Auth) y estado global.
import { useEffect, useState } from "react";
import { AppShell } from "./aureus/app-shell";
import { AuthScreen } from "./aureus/features/auth";
import { ChangePasswordScreen } from "./aureus/features/change-password";
import { SplashScreen } from "./aureus/components/shared";
import {
  INITIAL_CLIENTS,
  INITIAL_CLIENT_RECORDS,
  INITIAL_MEASUREMENTS,
  INITIAL_PLANS,
  INITIAL_ROUTINES,
  INITIAL_SESSIONS,
  INITIAL_STAFF,
  TRAINERS,
} from "./aureus/data";
import type { Account, ExternalSale, Role, StaffMember, WorkspaceData } from "./aureus/types";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { fetchClientsForAccount, type ClientIdMap } from "@/lib/clients-data";
import { fetchPlansForGym, type PlanIdMap } from "@/lib/gym-plans-data";
import { fetchTrainersForGym, type TrainerIdMap } from "@/lib/trainers-data";
import { fetchMeasurementsForGym, type MeasurementIdMap } from "@/lib/measurements-data";
import { fetchAllMedicalRecords } from "@/lib/medical-record-data";
import { fetchStaffForGym, type StaffIdMap } from "@/lib/staff-data";
import { fetchSessionsForGym, type SessionIdMap } from "@/lib/agenda-data";
import { fetchExternalSales } from "@/lib/external-sales-data";

// NOTA: los mensajes de recepción TODAVÍA vienen de datos de demostración
// (./aureus/data.ts) — ese módulo se migrará después. Todo lo demás ya es
// real: sesión/login, clientes, planes, entrenadores, medidas, expedientes
// médicos, equipo, agenda, ventas externas y recibos.
export default function Home() {
  const [booting, setBooting] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  // Traducen ids numéricos locales (los que usa el resto de la app) a sus
  // UUID reales en Supabase — ver los archivos lib/*-data.ts.
  const [clientIdMap, setClientIdMap] = useState<ClientIdMap>({});
  const [planIdMap, setPlanIdMap] = useState<PlanIdMap>({});
  const [measurementIdMap, setMeasurementIdMap] = useState<MeasurementIdMap>({});
  const [staffIdMap, setStaffIdMap] = useState<StaffIdMap>({});
  const [trainerIdMap, setTrainerIdMap] = useState<TrainerIdMap>({});
  const [sessionIdMap, setSessionIdMap] = useState<SessionIdMap>({});
  // Guarda la fecha/hora original de cada cita, para no moverla sin querer
  // al editar solo la hora desde la pantalla.
  const [sessionScheduledAtMap, setSessionScheduledAtMap] = useState<Record<number, string>>({});
  const [sales, setSales] = useState<ExternalSale[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceData>({
    clients: INITIAL_CLIENTS,
    clientRecords: INITIAL_CLIENT_RECORDS,
    trainers: TRAINERS,
    measurements: INITIAL_MEASUREMENTS,
    routines: INITIAL_ROUTINES,
    staff: INITIAL_STAFF,
    plans: INITIAL_PLANS,
    sessions: INITIAL_SESSIONS,
    clientMessages: {},
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 2100);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [activeAccount]);

  // Al cargar la página, revisa si ya existe una sesión de Supabase válida
  // (por ejemplo, si la persona ya había iniciado sesión antes y no la
  // cerró). Si el correo aún no ha sido confirmado o el perfil no existe
  // todavía, se trata como "sin sesión" y se muestra el login.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function loadFromSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setActiveAccount(null);
        setCheckingSession(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, email, role, status, initials, gym_id, must_change_password, gyms(name, medical_360_enabled, tagline, city, receipt_prefix)")
        .eq("id", user.id)
        .single();

      if (!profile || profile.status !== "active") {
        setActiveAccount(null);
        setCheckingSession(false);
        return;
      }

      setActiveAccount({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as Role,
        // @ts-expect-error -- el join de Supabase devuelve un objeto anidado
        gym: profile.gyms?.name ?? "",
        gymId: profile.gym_id,
        initials: profile.initials,
        active: true,
        // @ts-expect-error -- el join de Supabase devuelve un objeto anidado
        medical360Enabled: profile.gyms?.medical_360_enabled ?? false,
        // @ts-expect-error -- el join de Supabase devuelve un objeto anidado
        gymTagline: profile.gyms?.tagline ?? "",
        // @ts-expect-error -- el join de Supabase devuelve un objeto anidado
        gymCity: profile.gyms?.city ?? "",
        // @ts-expect-error -- el join de Supabase devuelve un objeto anidado
        receiptPrefix: profile.gyms?.receipt_prefix ?? "",
        mustChangePassword: profile.must_change_password ?? false,
      });
      setCheckingSession(false);
    }

    loadFromSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setActiveAccount(null);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  // En cuanto sabemos quién inició sesión (y a qué gimnasio pertenece),
  // reemplazamos los datos de prueba por los datos reales guardados en
  // Supabase: clientes y entrenadores primero (porque la agenda depende de
  // ambos), y luego el resto. No se carga nada mientras la persona tenga
  // pendiente cambiar su contraseña inicial.
  useEffect(() => {
    if (!activeAccount?.gymId || activeAccount.mustChangePassword) return;
    let cancelled = false;

    async function loadWorkspaceData() {
      const gymId = activeAccount!.gymId!;
      const [{ clients, idMap }, trainersResult] = await Promise.all([
        fetchClientsForAccount(gymId),
        fetchTrainersForGym(gymId),
      ]);
      if (cancelled) return;
      setClientIdMap(idMap);
      setTrainerIdMap(trainersResult.idMap);
      setWorkspace((current) => ({ ...current, clients, trainers: trainersResult.trainers }));

      const [plansResult, measurementsResult, clientRecords, staffResult, sessionsResult, salesResult] = await Promise.all([
        fetchPlansForGym(gymId),
        fetchMeasurementsForGym(gymId, idMap),
        fetchAllMedicalRecords(idMap),
        fetchStaffForGym(gymId),
        fetchSessionsForGym(gymId, idMap, clients, trainersResult.trainers),
        fetchExternalSales(gymId),
      ]);
      if (cancelled) return;

      setPlanIdMap(plansResult.idMap);
      setMeasurementIdMap(measurementsResult.idMap);
      setStaffIdMap(staffResult.idMap);
      setSessionIdMap(sessionsResult.idMap);
      setSessionScheduledAtMap(sessionsResult.scheduledAtMap);
      setSales(salesResult.sales);
      setWorkspace((current) => ({
        ...current,
        plans: plansResult.plans,
        measurements: measurementsResult.measurements,
        clientRecords: clientRecords.length > 0 ? clientRecords : current.clientRecords,
        staff: staffResult.staff.length > 0 ? staffResult.staff : current.staff,
        sessions: sessionsResult.sessions,
      }));
    }

    loadWorkspaceData();
    return () => {
      cancelled = true;
    };
  }, [activeAccount?.gymId, activeAccount?.mustChangePassword]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setActiveAccount(null);
  }

  // El módulo "Equipo" ya crea y edita cuentas reales vía app/api/staff.
  // Estas dos funciones se conservan solo porque AppShell las espera; la
  // pantalla ya se actualiza sola con la respuesta real del servidor.
  function createStaff(_account: Account) {}
  function updateStaffAccount(_member: StaffMember) {}

  if (booting || checkingSession) return <SplashScreen />;
  if (!activeAccount) return <AuthScreen onLogin={setActiveAccount} onCreate={setActiveAccount} />;

  // Primer acceso del personal: hasta que no elija su propia contraseña, no
  // entra a la aplicación.
  if (activeAccount.mustChangePassword) {
    return (
      <ChangePasswordScreen
        accountName={activeAccount.name}
        onDone={() => setActiveAccount((current) => current ? { ...current, mustChangePassword: false } : current)}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <AppShell
      account={activeAccount}
      workspace={workspace}
      onUpdateWorkspace={setWorkspace}
      onLogout={handleLogout}
      onCreateStaff={createStaff}
      onUpdateStaffAccount={updateStaffAccount}
      clientIdMap={clientIdMap}
      onClientCreated={(localId, realId) => setClientIdMap((current) => ({ ...current, [localId]: realId }))}
      planIdMap={planIdMap}
      onPlanCreated={(localId, realId) => setPlanIdMap((current) => ({ ...current, [localId]: realId }))}
      measurementIdMap={measurementIdMap}
      onMeasurementCreated={(localId, realId) => setMeasurementIdMap((current) => ({ ...current, [localId]: realId }))}
      staffIdMap={staffIdMap}
      onStaffCreated={(localId, realId) => setStaffIdMap((current) => ({ ...current, [localId]: realId }))}
      trainerIdMap={trainerIdMap}
      sessionIdMap={sessionIdMap}
      sessionScheduledAtMap={sessionScheduledAtMap}
      onSessionCreated={(localId, realId, scheduledAt) => {
        setSessionIdMap((current) => ({ ...current, [localId]: realId }));
        setSessionScheduledAtMap((current) => ({ ...current, [localId]: scheduledAt }));
      }}
      sales={sales}
      onSaleCreated={(sale) => setSales((current) => [sale, ...current])}
    />
  );
}