"use client";

// Punto de entrada: arranque, sesión activa (Supabase Auth) y estado global.
import { useEffect, useState } from "react";
import { AppShell } from "./aureus/app-shell";
import { AuthScreen } from "./aureus/features/auth";
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
import type { Account, Role, StaffMember, WorkspaceData } from "./aureus/types";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { fetchClientsForAccount, type ClientIdMap } from "@/lib/clients-data";

// NOTA: clientRecords, trainers, measurements, etc. TODAVÍA vienen de datos
// de demostración (./aureus/data.ts) — esos módulos se migrarán en los
// siguientes pasos. La sesión/login y la LISTA DE CLIENTES ya son reales.
export default function Home() {
  const [booting, setBooting] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  // Traduce el id numérico local de cada cliente (el que usa el resto de
  // la app) a su UUID real en Supabase — ver lib/clients-data.ts.
  const [clientIdMap, setClientIdMap] = useState<ClientIdMap>({});
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
        .select("id, name, email, role, status, initials, gym_id, gyms(name)")
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
  // reemplazamos la lista de clientes de prueba por los clientes reales
  // guardados en Supabase.
  useEffect(() => {
    if (!activeAccount?.gymId) return;
    let cancelled = false;

    async function loadClients() {
      const { clients, idMap } = await fetchClientsForAccount(activeAccount.gymId!);
      if (cancelled) return;
      setClientIdMap(idMap);
      setWorkspace((current) => ({ ...current, clients }));
    }

    loadClients();
    return () => {
      cancelled = true;
    };
  }, [activeAccount?.gymId]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setActiveAccount(null);
  }

  // TODO (próximo paso — módulo "Equipo"): hoy esto solo actualiza la
  // pantalla localmente. Falta conectar con Supabase Admin API para
  // invitar/editar cuentas reales del personal.
  function createStaff(_account: Account) {}
  function updateStaffAccount(_member: StaffMember) {}

  if (booting || checkingSession) return <SplashScreen />;
  if (!activeAccount) return <AuthScreen onLogin={setActiveAccount} onCreate={setActiveAccount} />;
  return (
    <AppShell
      account={activeAccount}
      workspace={workspace}
      onUpdateWorkspace={setWorkspace}
      onLogout={handleLogout}
      onCreateStaff={createStaff}
      onUpdateStaffAccount={updateStaffAccount}
      clientIdMap={clientIdMap}
    />
  );
}
