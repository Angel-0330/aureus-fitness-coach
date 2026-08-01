"use client";

// Punto de entrada: arranque, sesión activa y estado global del espacio de trabajo.
import { useEffect, useState } from "react";
import { AppShell } from "./aureus/app-shell";
import { AuthScreen } from "./aureus/features/auth";
import { SplashScreen } from "./aureus/components/shared";
import {
  DEMO_ACCOUNTS,
  INITIAL_CLIENTS,
  INITIAL_CLIENT_RECORDS,
  INITIAL_MEASUREMENTS,
  INITIAL_PLANS,
  INITIAL_ROUTINES,
  INITIAL_SESSIONS,
  INITIAL_STAFF,
  TRAINERS,
} from "./aureus/data";
import type { Account, StaffMember, WorkspaceData } from "./aureus/types";

export default function Home() {
  const [booting, setBooting] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>(DEMO_ACCOUNTS);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
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
  useEffect(() => { const timer = window.setTimeout(() => setBooting(false), 2100); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [activeAccount]);
  function createOwner(account: Account) { setAccounts((items) => [...items, account]); setActiveAccount(account); }
  function createStaff(account: Account) { setAccounts((items) => [...items, account]); }
  function updateStaffAccount(member: StaffMember) { setAccounts((items) => items.map((account) => account.email.toLowerCase() === member.email.toLowerCase() ? { ...account, role: member.role, active: member.status !== "Suspendido" } : account)); }
  if (booting) return <SplashScreen />;
  if (!activeAccount) return <AuthScreen accounts={accounts} onLogin={setActiveAccount} onCreate={createOwner} />;
  return <AppShell account={activeAccount} workspace={workspace} onUpdateWorkspace={setWorkspace} onLogout={() => setActiveAccount(null)} onCreateStaff={createStaff} onUpdateStaffAccount={updateStaffAccount} />;
}
