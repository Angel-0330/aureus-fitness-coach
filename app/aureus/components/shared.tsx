"use client";

// Componentes visuales reutilizables.
import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Search,
} from "lucide-react";
import { ROLE_META } from "../data";
import type { Client, PaymentStatus, Role } from "../types";

export function ModalLayer({ children, onClose, className = "" }: { children: ReactNode; onClose: () => void; className?: string }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [onClose]);
  return createPortal(<div className={`modal-backdrop ${className}`} onMouseDown={onClose}>{children}</div>, document.body);
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`} aria-label="Aureus Fitness Coach">
      <span className="brand__mark" aria-hidden="true"><span>A</span></span>
      <span className="brand__copy"><strong>AUREUS</strong><small>FITNESS COACH</small></span>
    </div>
  );
}

export function SplashScreen() {
  return (
    <div className="splash" aria-live="polite" aria-label="Cargando Aureus Fitness Coach">
      <div className="splash__glow splash__glow--one" />
      <div className="splash__glow splash__glow--two" />
      <div className="splash__grid" />
      <div className="splash__content">
        <div className="splash__orbit" aria-hidden="true"><i /><i /><i /><span className="brand__mark brand__mark--splash"><span>A</span></span></div>
        <div className="splash__wordmark"><strong>AUREUS</strong><span>GYM OPERATIONS</span></div>
        <div className="splash__loader"><span /></div>
        <p>Preparando los portales del equipo</p>
      </div>
      <span className="splash__phase">ENTRENA · GESTIONA · EVOLUCIONA</span>
    </div>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  return <span className={`role-badge role-badge--${role}`}><Icon size={12} /> {meta.label}</span>;
}

export function StatCard({ icon: Icon, label, value, note, gold, onClick }: { icon: typeof Activity; label: string; value: string; note: string; gold?: boolean; onClick: () => void }) {
  return (
    <button className={`ops-stat ${gold ? "ops-stat--gold" : ""}`} onClick={onClick}>
      <span className="ops-stat__icon"><Icon size={20} /></span><ArrowUpRight className="ops-stat__arrow" size={16} />
      <small>{label}</small><strong>{value}</strong><p>{note}</p>
    </button>
  );
}

export function PaymentPill({ status }: { status: PaymentStatus }) {
  return <span className={`payment-pill payment-pill--${status.toLowerCase().replace(" ", "-")}`}><i />{status}</span>;
}

export function ClientsTable({ clients, onSelect, compact = false }: { clients: Client[]; onSelect: (client: Client) => void; compact?: boolean }) {
  return (
    <div className={`ops-table ${compact ? "ops-table--compact" : ""}`}>
      <div className="ops-table__head"><span>Cliente</span><span>Entrenador</span><span>Plan</span><span>Progreso</span><span>Pago</span><span /></div>
      {clients.map((client) => (
        <button className="ops-table__row" key={client.id} onClick={() => onSelect(client)}>
          <span className="client-name"><i className={`avatar avatar--${client.color}`}>{client.initials}</i><span><strong>{client.name}</strong><small>{client.goal}</small></span></span>
          <span>{client.trainer}</span><span><strong>{client.plan}</strong><small>${client.price}/mes</small></span>
          <span className="progress-cell"><i><b style={{ width: `${client.progress}%` }} /></i><small>{client.progress}%</small></span>
          <PaymentPill status={client.payment} /><ChevronRight size={16} />
        </button>
      ))}
      {!clients.length && <div className="ops-empty"><Search size={24} /><strong>No hay resultados</strong><span>Prueba con otro nombre, plan o entrenador.</span></div>}
    </div>
  );
}
