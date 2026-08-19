"use client";

// Administración de cuentas y preferencias.
import { FormEvent, useState } from "react";

import {
  Eye,
  EyeOff,
  Mail,
  Monitor,
  Moon,
  Save,
  ShieldCheck,
  Sun,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { ROLE_META } from "../data";
import type {
  Account,
  AppPreferences,
  Role,
  StaffMember,
} from "../types";
import { initials } from "../utils";
import { ModalLayer } from "../components/shared";

export function AddStaffModal({ gym, existingEmails, onClose, onSave }: { gym: string; existingEmails: string[]; onClose: () => void; onSave: (member: StaffMember, account: Account, password: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("secretary");
  const [error, setError] = useState("");

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (name.trim().length < 3 || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Completa un nombre y correo válidos.");
      return;
    }
    if (existingEmails.some((item) => item.toLowerCase() === normalizedEmail)) {
      setError("Ya existe una cuenta con ese correo.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña temporal debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    const id = Date.now();
    const member: StaffMember = { id, name: name.trim(), email: normalizedEmail, role, status: "Activo", initials: initials(name) };
    const account: Account = { id: String(id), name: name.trim(), email: normalizedEmail, role, gym, initials: initials(name), active: true };
    onSave(member, account, password);
  }

  return <ModalLayer onClose={onClose}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="staff-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal__heading"><div><span>NUEVA CUENTA</span><h2 id="staff-title">Añadir personal</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button></div><p>Elige el rol y una contraseña temporal. La persona tendrá que cambiarla la primera vez que entre, así solo ella la conocerá.</p><form onSubmit={save}><label className="form-field"><span className="form-field__label">Nombre completo</span><span className="form-field__control"><UserRound size={18} /><input value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="Nombre del colaborador" autoFocus /></span></label><label className="form-field"><span className="form-field__label">Correo de acceso</span><span className="form-field__control"><Mail size={18} /><input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="personal@gimnasio.com" /></span></label><div className="entity-editor-grid"><label className="form-field"><span className="form-field__label">Contraseña temporal</span><span className="form-field__control"><ShieldCheck size={18} /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="Mínimo 8 caracteres" autoComplete="new-password" /><button type="button" className="icon-button icon-button--field" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label><label className="form-field"><span className="form-field__label">Confirmar</span><span className="form-field__control"><ShieldCheck size={18} /><input type="password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError(""); }} placeholder="Repite la contraseña" autoComplete="new-password" /></span></label></div><label className="form-field"><span className="form-field__label">Rol y permisos</span><span className="form-field__control"><ShieldCheck size={18} /><select value={role} onChange={(event) => setRole(event.target.value as Role)}><option value="secretary">Secretaria · recepción, agenda y pagos</option><option value="trainer">Entrenador · clientes asignados</option></select></span></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal__actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button primary-button--inline" type="submit"><UserPlus size={16} /> Crear cuenta</button></div></form></section></ModalLayer>;
}

export function SettingsModal({ account, preferences, onClose, onSave }: { account: Account; preferences: AppPreferences; onClose: () => void; onSave: (preferences: AppPreferences) => void }) {
  const [draft, setDraft] = useState(preferences);
  return <ModalLayer onClose={onClose}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal__heading"><div><span>PREFERENCIAS</span><h2 id="settings-title">Configuración</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button></div><div className="settings-account"><span className="avatar avatar--gold">{account.initials}</span><span><strong>{account.name}</strong><small>{account.email} · {ROLE_META[account.role].label}</small></span></div><div className="settings-theme"><div><strong>Apariencia</strong><small>Elige el modo visual que prefieras.</small></div><div className="theme-selector" role="radiogroup" aria-label="Apariencia de la interfaz"><button type="button" role="radio" aria-checked={draft.theme === "light"} className={draft.theme === "light" ? "active" : ""} onClick={() => setDraft((current) => ({ ...current, theme: "light" }))}><Sun size={17} /><span>Claro</span></button><button type="button" role="radio" aria-checked={draft.theme === "dark"} className={draft.theme === "dark" ? "active" : ""} onClick={() => setDraft((current) => ({ ...current, theme: "dark" }))}><Moon size={17} /><span>Oscuro</span></button><button type="button" role="radio" aria-checked={draft.theme === "system"} className={draft.theme === "system" ? "active" : ""} onClick={() => setDraft((current) => ({ ...current, theme: "system" }))}><Monitor size={17} /><span>Sistema</span></button></div></div><div className="settings-options"><label><span><strong>Vista compacta</strong><small>Reduce el espacio vertical de tablas y paneles.</small></span><input type="checkbox" checked={draft.compact} onChange={(event) => setDraft((current) => ({ ...current, compact: event.target.checked }))} /></label><label><span><strong>Animaciones de interfaz</strong><small>Activa o reduce los movimientos visuales.</small></span><input type="checkbox" checked={draft.animations} onChange={(event) => setDraft((current) => ({ ...current, animations: event.target.checked }))} /></label><label><span><strong>Indicador de avisos</strong><small>Muestra el punto dorado en la campana.</small></span><input type="checkbox" checked={draft.notificationBadge} onChange={(event) => setDraft((current) => ({ ...current, notificationBadge: event.target.checked }))} /></label></div><div className="modal__actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="button" className="primary-button primary-button--inline" onClick={() => onSave(draft)}><Save size={16} /> Guardar preferencias</button></div></section></ModalLayer>;
}