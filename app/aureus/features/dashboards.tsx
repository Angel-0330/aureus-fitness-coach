"use client";

// Paneles de inicio por rol. Todos los números vienen de datos reales:
// si no hay información todavía, muestran cero en vez de inventar cifras.

import {
  Activity,
  ArrowRight,
  Award,
  Bell,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Dumbbell,
  FileText,
  ReceiptText,
  Search,
  ShieldCheck,
  UserPlus,
  UsersRound,
  WalletCards,
} from "lucide-react";

import type { AgendaSession, Client, StaffMember, Trainer, ViewName } from "../types";
import { ClientsTable, StatCard } from "../components/shared";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function OwnerHome({ clients, trainers, staff, setView, onSelect }: { clients: Client[]; trainers: Trainer[]; staff?: StaffMember[]; setView: (view: ViewName) => void; onSelect: (client: Client) => void }) {
  const pending = clients.filter((client) => client.payment !== "Al día").length;
  const monthly = clients.reduce((sum, client) => sum + client.price, 0);
  const average = clients.length ? Math.round(clients.reduce((sum, client) => sum + client.progress, 0) / clients.length) : 0;
  const invitesPending = (staff ?? []).filter((member) => member.status === "Invitación enviada");
  const currentMonth = MONTHS[new Date().getMonth()];
  return (
    <div className="ops-stack">
      <section className="ops-welcome"><div><span className="eyebrow"><Building2 size={14} /> VISTA DEL DUEÑO</span><h2>Todo el gimnasio, en una pantalla.</h2><p>Clientes, equipo, planes y mensualidades con visibilidad completa.</p></div><button className="date-button" onClick={() => setView("Pagos")}><ReceiptText size={16} /> Cierre de {currentMonth} <ChevronRight size={14} /></button></section>
      <section className="ops-stats">
        <StatCard icon={UsersRound} label="Clientes registrados" value={String(clients.length)} note="Todos los entrenadores" gold onClick={() => setView("Clientes")} />
        <StatCard icon={Award} label="Entrenadores activos" value={String(trainers.length)} note={`${trainers.reduce((sum, trainer) => sum + trainer.openSpots, 0)} cupos disponibles`} onClick={() => setView("Entrenadores")} />
        <StatCard icon={CircleDollarSign} label="Ingreso mensual previsto" value={`$${monthly.toFixed(2)}`} note="Registro administrativo" onClick={() => setView("Pagos")} />
        <StatCard icon={Activity} label="Progreso promedio" value={`${average}%`} note={`${pending} ${pending === 1 ? "pago por revisar" : "pagos por revisar"}`} onClick={() => setView("Clientes")} />
      </section>
      <section className="ops-grid ops-grid--owner">
        <article className="panel ops-panel ops-panel--clients"><div className="panel__heading"><div><span>CONTROL GENERAL</span><h3>Todos los clientes</h3></div><button className="text-link" onClick={() => setView("Clientes")}>Abrir directorio <ArrowRight size={14} /></button></div><ClientsTable clients={clients.slice(0, 5)} onSelect={onSelect} compact /></article>
        <article className="panel ops-panel"><div className="panel__heading"><div><span>CARGA DEL EQUIPO</span><h3>Clientes por entrenador</h3></div><button className="icon-button icon-button--outlined" onClick={() => setView("Entrenadores")}><Award size={17} /></button></div><div className="trainer-load">{trainers.length ? trainers.map((trainer) => <button key={trainer.id} onClick={() => setView("Entrenadores")}><span className={`avatar avatar--${trainer.color}`}>{trainer.initials}</span><div><strong>{trainer.name}</strong><small>{trainer.specialty}</small><i><b style={{ width: `${Math.min(100, trainer.clients * 6)}%` }} /></i></div><em>{trainer.clients}</em></button>) : <div className="ops-empty ops-empty--small"><Award size={22} /><span>Todavía no hay entrenadores registrados. Créalos en la sección Equipo.</span></div>}</div></article>
        <article className="panel ops-panel alerts-panel"><div className="panel__heading"><div><span>ATENCIÓN</span><h3>Prioridades administrativas</h3></div><Bell size={18} /></div><button onClick={() => setView("Pagos")}><span className="alert-icon alert-icon--gold"><WalletCards size={18} /></span><div><strong>{pending} {pending === 1 ? "mensualidad requiere" : "mensualidades requieren"} revisión</strong><small>Consulta vencimientos y estados de pago.</small></div><ChevronRight size={16} /></button><button onClick={() => setView("Equipo")}><span className="alert-icon"><UserPlus size={18} /></span><div><strong>{invitesPending.length} {invitesPending.length === 1 ? "invitación de personal pendiente" : "invitaciones de personal pendientes"}</strong><small>{invitesPending.length ? `${invitesPending.map((member) => member.name).join(", ")} todavía no ${invitesPending.length === 1 ? "activa su cuenta" : "activan su cuenta"}.` : "Todas las cuentas del equipo están activas."}</small></div><ChevronRight size={16} /></button></article>
      </section>
    </div>
  );
}

export function SecretaryHome({ clients, sessions, setView, onSelect }: { clients: Client[]; sessions?: AgendaSession[]; setView: (view: ViewName) => void; onSelect: (client: Client) => void }) {
  const pending = clients.filter((client) => client.payment !== "Al día").length;
  const pendingSessions = (sessions ?? []).filter((session) => session.status === "Pendiente").length;
  const withoutTrainer = clients.filter((client) => client.trainer === "Pendiente de evaluación médica" || client.trainer === "Sin asignar").length;
  const recentClients = clients.slice(0, 3);
  return (
    <div className="ops-stack secretary-simple">
      <section className="secretary-welcome">
        <div><span className="eyebrow"><ClipboardCheck size={14} /> RECEPCIÓN</span><h2>¿Qué necesitas hacer?</h2><p>Elige una tarea. Te guiaremos paso a paso.</p></div>
        <span className="secretary-welcome__status"><CheckCircle2 size={17} /> Todo listo para comenzar</span>
      </section>

      <section className="secretary-actions" aria-label="Tareas principales">
        <button type="button" className="secretary-action secretary-action--primary" onClick={() => setView("Registrar cliente")}><span><UserPlus size={25} /></span><div><strong>Registrar una persona nueva</strong><small>Crear su ficha, elegir plan y dejar todo preparado.</small></div><ChevronRight size={22} /></button>
        <button type="button" className="secretary-action" onClick={() => setView("Agenda")}><span><CalendarDays size={25} /></span><div><strong>Ver o cambiar una cita</strong><small>Consultar horarios y agregar una sesión.</small></div><ChevronRight size={22} /></button>
        <button type="button" className="secretary-action" onClick={() => setView("Pagos")}><span><WalletCards size={25} /></span><div><strong>Registrar un pago</strong><small>{pending} {pending === 1 ? "pago pendiente" : "pagos pendientes"} por revisar.</small></div><ChevronRight size={22} /></button>
        <button type="button" className="secretary-action" onClick={() => setView("Ventas externas")}><span><ReceiptText size={25} /></span><div><strong>Registrar una venta externa</strong><small>Anotar el producto vendido y cómo pagó el cliente.</small></div><ChevronRight size={22} /></button>
        <button type="button" className="secretary-action" onClick={() => setView("Clientes")}><span><Search size={25} /></span><div><strong>Buscar una persona</strong><small>Consultar teléfono, plan, entrenador o estado.</small></div><ChevronRight size={22} /></button>
      </section>

      <section className="secretary-overview">
        <article className="panel secretary-today"><div className="panel__heading"><div><span>PARA HOY</span><h3>Resumen de recepción</h3></div><CalendarCheck size={19} /></div><div className="secretary-checklist"><button type="button" onClick={() => setView("Agenda")}><span><strong>{pendingSessions}</strong><small>{pendingSessions === 1 ? "Cita por confirmar" : "Citas por confirmar"}</small></span><ChevronRight size={17} /></button><button type="button" onClick={() => setView("Pagos")}><span><strong>{pending}</strong><small>{pending === 1 ? "Pago por revisar" : "Pagos por revisar"}</small></span><ChevronRight size={17} /></button><button type="button" onClick={() => setView("Clientes")}><span><strong>{withoutTrainer}</strong><small>{withoutTrainer === 1 ? "Cliente sin entrenador" : "Clientes sin entrenador"}</small></span><ChevronRight size={17} /></button></div></article>
        <article className="panel secretary-help"><div className="panel__heading"><div><span>AYUDA RÁPIDA</span><h3>Si tienes dudas</h3></div><ShieldCheck size={19} /></div><ol><li><strong>Busca primero a la persona</strong><span>Así evitas crear fichas repetidas.</span></li><li><strong>Lee antes de confirmar</strong><span>Cada pantalla muestra un resumen final.</span></li><li><strong>Nada se cobra aquí</strong><span>Solo se guarda el estado del pago.</span></li></ol></article>
        <article className="panel secretary-recent"><div className="panel__heading"><div><span>ACCESO RÁPIDO</span><h3>Personas recientes</h3></div><button className="text-link" onClick={() => setView("Clientes")}>Ver todas <ArrowRight size={14} /></button></div><div>{recentClients.length ? recentClients.map((client) => <button type="button" key={client.id} onClick={() => onSelect(client)}><span className={`avatar avatar--${client.color}`}>{client.initials}</span><span><strong>{client.name}</strong><small>{client.plan} · {client.payment}</small></span><ChevronRight size={16} /></button>) : <div className="ops-empty ops-empty--small"><UsersRound size={22} /><span>Todavía no hay clientes registrados.</span></div>}</div></article>
      </section>
    </div>
  );
}

export function TrainerHome({ clients, sessions, trainerName, setView, onSelect }: { clients: Client[]; sessions?: AgendaSession[]; trainerName: string; setView: (view: ViewName) => void; onSelect: (client: Client) => void }) {
  const mine = clients.filter((client) => client.trainer === trainerName);
  const mySessions = (sessions ?? []).filter((session) => session.trainer === trainerName && session.type !== "Evaluación médica").sort((a, b) => a.time.localeCompare(b.time));
  const nextSession = mySessions.find((session) => session.status === "Pendiente") ?? mySessions[0];
  const nextClient = nextSession ? clients.find((client) => client.id === nextSession.clientId) : mine[0];
  const plansToReview = mine.filter((client) => client.progress === 0).length;
  const average = mine.length ? Math.round(mine.reduce((sum, client) => sum + client.progress, 0) / mine.length) : 0;
  return (
    <div className="ops-stack">
      <section className="ops-welcome"><div><span className="eyebrow"><Dumbbell size={14} /> PORTAL DEL ENTRENADOR</span><h2>Tu día y tus clientes.</h2><p>Solo ves las personas asignadas a tu cuenta y sus planes de trabajo.</p></div><button className="primary-button primary-button--inline" onClick={() => setView("Progreso")}><Activity size={17} /> Actualizar progreso</button></section>
      <section className="ops-stats">
        <StatCard icon={UsersRound} label="Mis clientes" value={String(mine.length)} note="Asignados por dirección" gold onClick={() => setView("Mis clientes")} />
        <StatCard icon={CalendarCheck} label="Sesiones programadas" value={String(mySessions.length)} note={nextSession ? `La próxima es a las ${nextSession.time}` : "Sin sesiones programadas"} onClick={() => setView("Agenda")} />
        <StatCard icon={FileText} label="Planes por revisar" value={String(plansToReview)} note="Clientes sin progreso registrado" onClick={() => setView("Rutinas")} />
        <StatCard icon={Activity} label="Progreso promedio" value={`${average}%`} note="De tus clientes activos" onClick={() => setView("Progreso")} />
      </section>
      <section className="ops-grid ops-grid--trainer">
        <article className="panel ops-panel ops-panel--clients"><div className="panel__heading"><div><span>MI CARTERA</span><h3>Clientes asignados</h3></div><button className="text-link" onClick={() => setView("Mis clientes")}>Ver todos <ArrowRight size={14} /></button></div><ClientsTable clients={mine} onSelect={onSelect} compact /></article>
        <article className="panel ops-panel"><div className="panel__heading"><div><span>PRÓXIMA SESIÓN</span><h3>{nextSession && nextClient ? `${nextSession.time} · ${nextClient.name}` : "Sin sesiones programadas"}</h3></div><Clock3 size={18} /></div>{nextSession && nextClient ? <div className="next-session"><span className={`avatar avatar--${nextClient.color}`}>{nextClient.initials}</span><div><strong>{nextSession.focus || nextClient.goal}</strong><small>{nextClient.plan} · {nextClient.sessions} sesiones registradas</small></div><button onClick={() => onSelect(nextClient)}>Abrir ficha <ArrowRight size={14} /></button></div> : <div className="ops-empty ops-empty--small"><CalendarCheck size={22} /><span>{mine.length ? "No tienes sesiones programadas todavía." : "Dirección todavía no te ha asignado clientes."}</span></div>}</article>
      </section>
    </div>
  );
}