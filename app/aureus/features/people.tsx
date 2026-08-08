"use client";

// Registro y fichas de clientes y entrenadores.
import { FormEvent, useState } from "react";

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Instagram,
  Mail,
  MessageCircle,
  Save,
  ShieldCheck,
  Stethoscope,
  Target,
  Trophy,
  UserPlus,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import type {
  Client,
  GymPlan,
  Role,
  Trainer,
} from "../types";
import { initials } from "../utils";
import { ModalLayer, PaymentPill } from "../components/shared";

export function RegistrationWizard({ plans, onAdd, onCancel }: { plans: GymPlan[]; onAdd: (input: { name: string; email: string; phone: string; goal: string; plan: string; price: number }) => void; onCancel: () => void }) {
  const availablePlans = plans.filter((item) => item.active);
  const initialPlan = availablePlans.find((item) => item.featured)?.name ?? availablePlans[0]?.name ?? "";
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [goal, setGoal] = useState("Bienestar y hábitos activos");
  const [plan, setPlan] = useState(initialPlan);
  const [error, setError] = useState("");
  const planPrices = Object.fromEntries(availablePlans.map((item) => [item.name, item.price])) as Record<string, number>;

  function next() {
    setError("");
    if (step === 1 && (name.trim().length < 3 || !/^\S+@\S+\.\S+$/.test(email) || phone.trim().length < 7)) { setError("Completa el nombre, correo y teléfono del cliente."); return; }
    if (step === 2 && !availablePlans.some((item) => item.name === plan)) { setError("Activa o selecciona un plan antes de continuar."); return; }
    setStep((current) => Math.min(4, current + 1));
  }

  function finish() {
    onAdd({ name: name.trim(), email: email.trim(), phone: phone.trim(), goal, plan, price: planPrices[plan] ?? 0 });
  }

  return (
    <section className="registration-page">
      <div className="registration-heading"><button className="icon-button icon-button--outlined" onClick={onCancel} aria-label="Volver"><ArrowLeft size={18} /></button><div><span className="eyebrow"><UserPlus size={14} /> NUEVA PERSONA</span><h2>Registrar cliente</h2><p>Registra sus datos y deja preparada la evaluación médica inicial.</p></div></div>
      <div className="wizard-steps">{["Datos personales", "Elegir plan", "Cita médica", "Revisar y guardar"].map((label, index) => <div className={`${step === index + 1 ? "active" : ""} ${step > index + 1 ? "done" : ""}`} key={label}><span>{step > index + 1 ? <Check size={14} /> : index + 1}</span><strong>{label}</strong><i /></div>)}</div>
      <article className="registration-card">
        {step === 1 && <div className="wizard-section"><span className="wizard-kicker">PASO 1 DE 4</span><h3>Información del cliente</h3><p>Datos básicos para crear su ficha administrativa.</p><div className="wizard-form-grid"><label className="form-field"><span className="form-field__label">Nombre completo</span><span className="form-field__control"><UserRound size={18} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Natalia Guerra" autoFocus /></span></label><label className="form-field"><span className="form-field__label">Correo electrónico</span><span className="form-field__control"><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@correo.com" /></span></label><label className="form-field"><span className="form-field__label">Teléfono</span><span className="form-field__control"><MessageCircle size={18} /><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="6000-0000" /></span></label></div></div>}
        {step === 2 && <div className="wizard-section"><span className="wizard-kicker">PASO 2 DE 4</span><h3>Objetivo y plan</h3><p>El objetivo se tomará en cuenta junto con los resultados médicos para asignar al profesional adecuado.</p><label className="form-field"><span className="form-field__label">Objetivo general</span><span className="form-field__control"><Target size={18} /><select value={goal} onChange={(event) => setGoal(event.target.value)}><option>Bienestar y hábitos activos</option><option>Fuerza y acondicionamiento</option><option>Movilidad y recuperación</option><option>Rendimiento deportivo</option></select></span></label><div className="plan-selector">{availablePlans.map((item) => <button type="button" className={plan === item.name ? "selected" : ""} key={item.id} onClick={() => setPlan(item.name)}><span>{plan === item.name && <Check size={13} />}</span><strong>{item.name}</strong><b>${item.price}<small>/mes</small></b><p>{item.description}</p></button>)}</div></div>}
        {step === 3 && <div className="wizard-section"><span className="wizard-kicker">PASO 3 DE 4</span><h3>Evaluación médica inicial</h3><p>Al guardar el registro se creará automáticamente una cita privada en la agenda del dueño.</p><div className="medical-onboarding"><span><Stethoscope size={26} /></span><div><strong>Primero se evalúa, después se asigna</strong><p>El dueño registrará los resultados de los exámenes, las observaciones, recomendaciones y restricciones. Sólo entonces podrá elegir al entrenador más adecuado.</p></div></div><div className="medical-onboarding-steps"><span><b>1</b> Cita médica en agenda</span><span><b>2</b> Exámenes y observaciones</span><span><b>3</b> Asignación por el dueño</span></div></div>}
        {step === 4 && <div className="wizard-section"><span className="wizard-kicker">PASO 4 DE 4</span><h3>Revisar registro</h3><p>Confirma los datos antes de añadir el cliente al gimnasio.</p><div className="registration-review"><div><span className="avatar avatar--gold">{initials(name)}</span><span><small>CLIENTE</small><strong>{name}</strong><p>{email} · {phone}</p></span></div><div><Target size={19} /><span><small>OBJETIVO</small><strong>{goal}</strong><p>Plan {plan} · ${planPrices[plan]}/mes</p></span></div><div><Stethoscope size={19} /><span><small>SIGUIENTE PASO</small><strong>Evaluación médica pendiente</strong><p>La cita aparecerá en la agenda privada del dueño.</p></span></div></div><div className="review-note"><ShieldCheck size={18} /><span><strong>Asignación protegida</strong><small>El cliente no elige entrenador. El dueño lo asigna según los resultados médicos.</small></span></div></div>}
        {error && <p className="form-error wizard-error" role="alert">{error}</p>}
        <div className="wizard-actions"><button type="button" className="secondary-button" onClick={step === 1 ? onCancel : () => setStep((current) => current - 1)}>{step === 1 ? "Cancelar" : "Anterior"}</button>{step < 4 ? <button type="button" className="primary-button primary-button--inline" onClick={next}>Continuar <ArrowRight size={16} /></button> : <button type="button" className="primary-button primary-button--inline" onClick={finish}><CheckCircle2 size={16} /> Registrar cliente</button>}</div>
      </article>
    </section>
  );
}

export function ClientDetail({ client, onClose, onProgress, onPaid, onMessage, lastMessage, role }: { client: Client; onClose: () => void; onProgress: (id: number, progress: number) => void; onPaid: (id: number) => void; onMessage: (id: number, message: string) => void; lastMessage?: string; role: Role }) {
  const [progress, setProgress] = useState(client.progress);
  const [messageOpen, setMessageOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState("");
  const canEditProgress = role !== "secretary";

  function saveMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length < 3) {
      setMessageError("Escribe una nota breve antes de guardarla.");
      return;
    }
    onMessage(client.id, message.trim());
    setMessage("");
    setMessageError("");
    setMessageOpen(false);
  }

  return <ModalLayer onClose={onClose}><section className="modal client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="client-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal__heading"><div><span>FICHA DEL CLIENTE</span><h2 id="client-title">{client.name}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button></div><div className="client-detail-hero"><span className={`avatar avatar--${client.color}`}>{client.initials}</span><div><strong>{client.goal}</strong><small>{client.email} · {client.phone}</small></div><PaymentPill status={client.payment} /></div><div className="client-detail-grid"><div><small>PLAN ACTUAL</small><strong>{client.plan}</strong><span>${client.price}/mes</span></div><div><small>ENTRENADOR</small><strong>{client.trainer}</strong><span>{client.sessions} sesiones</span></div><div><small>PRÓXIMO PAGO</small><strong>{client.nextDue}</strong><span>{client.payment}</span></div><div><small>ÚLTIMA ACTUALIZACIÓN</small><strong>{client.lastUpdate}</strong><span>Seguimiento del plan</span></div></div><div className={`progress-editor ${!canEditProgress ? "progress-editor--readonly" : ""}`}><div><span><Activity size={17} /> Progreso del plan</span><strong>{progress}%</strong></div><input type="range" min="0" max="100" value={progress} onChange={(event) => setProgress(Number(event.target.value))} disabled={!canEditProgress} /><div><span>Inicio</span><span>Objetivo del plan</span></div>{!canEditProgress && <small>Recepción puede consultar este dato, pero solo el dueño o el entrenador pueden modificarlo.</small>}</div>{lastMessage && !messageOpen && <div className="client-last-message"><MessageCircle size={15} /><span><strong>Última nota interna</strong><small>{lastMessage}</small></span></div>}{messageOpen && <form className="client-message-composer" onSubmit={saveMessage}><label><span>Nota interna de seguimiento</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} placeholder="Escribe un recordatorio o resumen del contacto" autoFocus /></label><small>Se guarda únicamente en esta demostración y no envía mensajes externos.</small>{messageError && <p className="form-error" role="alert">{messageError}</p>}<div><button type="button" className="secondary-button" onClick={() => { setMessageOpen(false); setMessageError(""); }}>Cancelar</button><button className="primary-button primary-button--inline" type="submit"><Save size={15} /> Guardar nota</button></div></form>}<div className="client-detail-actions"><button type="button" className="secondary-button" onClick={() => setMessageOpen((open) => !open)}><MessageCircle size={15} /> {messageOpen ? "Ocultar nota" : "Añadir nota"}</button>{role !== "trainer" && client.payment !== "Al día" && <button type="button" className="secondary-button" onClick={() => onPaid(client.id)}><WalletCards size={15} /> Marcar pago</button>}{canEditProgress ? <button type="button" className="primary-button primary-button--inline" onClick={() => { onProgress(client.id, progress); onClose(); }}><Check size={16} /> Guardar cambios</button> : <button type="button" className="primary-button primary-button--inline" onClick={onClose}>Cerrar ficha</button>}</div></section></ModalLayer>;
}

export function TrainerProfileEditor({ trainer, onSave }: { trainer: Trainer; onSave: (trainer: Trainer) => void }) {
  const [draft, setDraft] = useState(trainer);
  const [certifications, setCertifications] = useState(trainer.certifications.join("\n"));
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const certificationList = certifications.split("\n").map((item) => item.trim()).filter(Boolean);
    if (draft.bio.trim().length < 20 || draft.specialty.trim().length < 3 || draft.preparation.trim().length < 3 || !draft.email.includes("@") || draft.phone.trim().length < 7 || !certificationList.length) {
      setError("Completa la presentación, formación, contacto y al menos una certificación.");
      return;
    }
    onSave({ ...draft, bio: draft.bio.trim(), specialty: draft.specialty.trim(), preparation: draft.preparation.trim(), email: draft.email.trim(), phone: draft.phone.trim(), instagram: draft.instagram.trim().startsWith("@") ? draft.instagram.trim() : `@${draft.instagram.trim()}`, certifications: certificationList });
    setError("");
  }

  return (
    <section className="ops-page trainer-profile-editor">
      <div className="ops-page__heading"><div><span className="eyebrow"><UserRound size={14} /> MI PERFIL PROFESIONAL</span><h2>Información visible para el dueño</h2><p>Actualiza tu presentación, formación y contacto. Los cambios aparecerán en el directorio del gimnasio.</p></div></div>
      <form className="panel trainer-profile-form" onSubmit={submit}>
        <div className="trainer-profile-form__identity"><span className={`avatar avatar--${trainer.color}`}>{trainer.initials}</span><div><strong>{trainer.name}</strong><small>{trainer.specialty}</small></div><span><CheckCircle2 size={15} /> Perfil del equipo</span></div>
        <div className="entity-editor-grid">
          <label className="form-field"><span className="form-field__label">Especialidad principal</span><span className="form-field__control"><Target size={18} /><input value={draft.specialty} onChange={(event) => setDraft((current) => ({ ...current, specialty: event.target.value }))} /></span></label>
          <label className="form-field"><span className="form-field__label">Formación principal</span><span className="form-field__control"><GraduationCap size={18} /><input value={draft.preparation} onChange={(event) => setDraft((current) => ({ ...current, preparation: event.target.value }))} /></span></label>
          <label className="form-field"><span className="form-field__label">Experiencia</span><span className="form-field__control"><Award size={18} /><input value={draft.experience} onChange={(event) => setDraft((current) => ({ ...current, experience: event.target.value }))} /></span></label>
          <label className="form-field"><span className="form-field__label">Disponibilidad</span><span className="form-field__control"><CalendarDays size={18} /><input value={draft.availability} onChange={(event) => setDraft((current) => ({ ...current, availability: event.target.value }))} /></span></label>
        </div>
        <label className="form-field"><span className="form-field__label">Presentación breve</span><textarea className="standalone-textarea" value={draft.bio} onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))} rows={3} placeholder="Cuenta brevemente cómo ayudas a tus clientes" /></label>
        <div className="entity-editor-grid">
          <label className="form-field"><span className="form-field__label">Correo profesional</span><span className="form-field__control"><Mail size={18} /><input type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} /></span></label>
          <label className="form-field"><span className="form-field__label">Teléfono</span><span className="form-field__control"><MessageCircle size={18} /><input value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} /></span></label>
          <label className="form-field"><span className="form-field__label">Perfil de Instagram</span><span className="form-field__control"><Instagram size={18} /><input value={draft.instagram} onChange={(event) => setDraft((current) => ({ ...current, instagram: event.target.value }))} placeholder="@usuario" /></span></label>
        </div>
        <label className="form-field"><span className="form-field__label">Certificaciones · una por línea</span><textarea className="standalone-textarea" value={certifications} onChange={(event) => setCertifications(event.target.value)} rows={4} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="trainer-profile-form__actions"><span><ShieldCheck size={16} /> El dueño verá la versión guardada.</span><button className="primary-button primary-button--inline" type="submit"><Save size={16} /> Guardar perfil</button></div>
      </form>
    </section>
  );
}

export function TrainerDetail({ trainer, clients, onClose, onClient }: { trainer: Trainer; clients: Client[]; onClose: () => void; onClient: (client: Client) => void }) {
  const assigned = clients.filter((client) => client.trainer === trainer.name);
  const instagramUrl = `https://instagram.com/${trainer.instagram.replace("@", "")}`;
  return (
    <ModalLayer onClose={onClose}>
      <section className="modal trainer-detail-modal" role="dialog" aria-modal="true" aria-labelledby="trainer-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal__heading"><div><span>PERFIL PROFESIONAL</span><h2 id="trainer-title">{trainer.name}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button></div>
        <div className="trainer-detail-head"><span className={`avatar avatar--${trainer.color}`}>{trainer.initials}</span><div><strong>{trainer.specialty}</strong><span><GraduationCap size={14} /> {trainer.preparation}</span><span><Award size={14} /> {trainer.experience}</span></div><em><Trophy size={14} /> {trainer.rating}</em></div>

        <div className="trainer-profile-summary">
          <p>{trainer.bio}</p>
          <div className="trainer-contact">
            <a href={`mailto:${trainer.email}`}><Mail size={15} /><span><small>Correo</small><strong>{trainer.email}</strong></span></a>
            <a href={`tel:${trainer.phone}`}><MessageCircle size={15} /><span><small>Teléfono</small><strong>{trainer.phone}</strong></span></a>
            <a href={instagramUrl} target="_blank" rel="noreferrer"><Instagram size={15} /><span><small>Instagram</small><strong>{trainer.instagram}</strong></span></a>
          </div>
        </div>

        <div className="trainer-cv-grid">
          <section><div className="trainer-section-title"><GraduationCap size={16} /><span><small>FORMACIÓN</small><strong>{trainer.preparation}</strong></span></div><p>{trainer.experience} · Formación orientada a {trainer.specialty.toLowerCase()}.</p></section>
          <section><div className="trainer-section-title"><BadgeCheck size={16} /><span><small>CERTIFICACIONES</small><strong>Preparación complementaria</strong></span></div><ul>{trainer.certifications.map((certification) => <li key={certification}><Check size={13} /> {certification}</li>)}</ul></section>
        </div>

        <div className="trainer-detail-stats"><div><strong>{assigned.length}</strong><span>Clientes visibles</span></div><div><strong>{trainer.openSpots}</strong><span>Cupos disponibles</span></div><div><strong>{trainer.availability}</strong><span>Horario</span></div></div>
        <h3 className="modal-subtitle">Clientes asignados</h3>
        <div className="modal-client-list">{assigned.map((client) => <button type="button" key={client.id} onClick={() => onClient(client)}><span className={`avatar avatar--${client.color}`}>{client.initials}</span><span><strong>{client.name}</strong><small>{client.plan} · {client.progress}%</small></span><ChevronRight size={16} /></button>)}</div>
      </section>
    </ModalLayer>
  );
}

