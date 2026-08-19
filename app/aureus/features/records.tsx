"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  FileHeart,
  HeartPulse,
  LockKeyhole,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import type {
  Client,
  ClientRecord,
  ClientTreatment,
  Role,
  TreatmentArea,
  TreatmentStatus,
} from "../types";
import { ModalLayer } from "../components/shared";

type RecordSection = "health" | "history" | "treatments" | "program" | "evolution";

const SECTIONS: { id: RecordSection; label: string; icon: typeof HeartPulse }[] = [
  { id: "health", label: "Ficha de salud", icon: HeartPulse },
  { id: "history", label: "Antecedentes", icon: ClipboardList },
  { id: "treatments", label: "Tratamientos", icon: Stethoscope },
  { id: "program", label: "Programa", icon: Dumbbell },
  { id: "evolution", label: "Evolución", icon: Activity },
];

// Secciones que sólo existen con la extensión clínica Medical 360.
const MEDICAL_ONLY_SECTIONS: RecordSection[] = ["history", "treatments"];

const TREATMENT_AREAS: TreatmentArea[] = ["Entrenamiento", "Nutrición", "Fisioterapia", "Medicina"];
const TREATMENT_STATUSES: TreatmentStatus[] = ["Activo", "Seguimiento", "Finalizado"];

function cloneRecord(record: ClientRecord): ClientRecord {
  return {
    ...record,
    treatments: record.treatments.map((treatment) => ({ ...treatment })),
    weeklyPlan: record.weeklyPlan.map((day) => ({ ...day })),
    evolution: record.evolution.map((entry) => ({ ...entry })),
  };
}

function RecordField({ label, value, onChange, disabled = false, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; type?: string; placeholder?: string }) {
  return <label className="record-field"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} placeholder={placeholder} /></label>;
}

function RecordTextarea({ label, value, onChange, disabled = false, rows = 4, placeholder }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; rows?: number; placeholder?: string }) {
  return <label className="record-field record-field--textarea"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} rows={rows} placeholder={placeholder} /></label>;
}

export function ClientRecordDetail({ client, record, role, accountName, onClose, onSave, loading = false, loadError = false, onRetry, medical360Enabled = true }: { client: Client; record: ClientRecord; role: Role; accountName: string; onClose: () => void; onSave: (record: ClientRecord) => void; loading?: boolean; loadError?: boolean; onRetry?: () => void; medical360Enabled?: boolean }) {
  const [section, setSection] = useState<RecordSection>("health");
  const [draft, setDraft] = useState<ClientRecord>(() => cloneRecord(record));
  const [evolutionNote, setEvolutionNote] = useState("");
  const [privateEvolution, setPrivateEvolution] = useState(false);
  const [evolutionError, setEvolutionError] = useState("");
  const canEditIdentity = role === "owner" || role === "secretary";
  const canEditClinical = role === "owner";
  const canEditProgram = role === "owner" || role === "trainer";
  const visibleSections = useMemo(() => {
    let sections = SECTIONS;
    // Sin Medical 360, las secciones clínicas no existen en absoluto.
    if (!medical360Enabled) sections = sections.filter((item) => !MEDICAL_ONLY_SECTIONS.includes(item.id));
    // Recepción solo ve la ficha administrativa.
    if (role === "secretary") sections = sections.filter((item) => item.id === "health");
    return sections;
  }, [medical360Enabled, role]);
  const sectionAllowed = visibleSections.some((item) => item.id === section);
  const activeSection: RecordSection = sectionAllowed ? section : "health";
  const visibleEvolution = useMemo(
    () => draft.evolution.filter((entry) => role === "owner" || entry.visibility === "team").sort((a, b) => b.date.localeCompare(a.date)),
    [draft.evolution, role],
  );

  function updateField<K extends keyof ClientRecord>(field: K, value: ClientRecord[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveSection() {
    onSave(draft);
  }

  function updateTreatment(id: number, field: keyof ClientTreatment, value: string) {
    setDraft((current) => ({
      ...current,
      treatments: current.treatments.map((treatment) => treatment.id === id ? { ...treatment, [field]: value } : treatment),
    }));
  }

  function addTreatment() {
    setDraft((current) => ({
      ...current,
      treatments: [
        ...current.treatments,
        {
          id: Date.now(),
          area: "Entrenamiento",
          summary: "",
          professional: "",
          status: "Activo",
        },
      ],
    }));
  }

  function addEvolution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (evolutionNote.trim().length < 5) {
      setEvolutionError("Escribe una observación de al menos cinco caracteres.");
      return;
    }
    const next: ClientRecord = {
      ...draft,
      evolution: [
        ...draft.evolution,
        {
          id: draft.evolution.reduce((highest, entry) => Math.max(highest, entry.id), 0) + 1,
          date: new Date().toISOString().slice(0, 10),
          author: accountName,
          note: evolutionNote.trim(),
          visibility: role === "owner" && privateEvolution ? "owner" : "team",
        },
      ],
    };
    setDraft(next);
    onSave(next);
    setEvolutionNote("");
    setPrivateEvolution(false);
    setEvolutionError("");
  }

  return (
    <ModalLayer className="modal-backdrop--record" onClose={onClose}>
      <section className="modal client-record-modal" role="dialog" aria-modal="true" aria-labelledby="record-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="record-heading">
          <div>
            <span>{role === "secretary" ? "FICHA ADMINISTRATIVA" : medical360Enabled ? "EXPEDIENTE DEL CLIENTE" : "FICHA DEL CLIENTE"}</span>
            <h2 id="record-title">{client.name}</h2>
            <p>{client.trainer} · {client.goal}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar expediente"><X size={20} /></button>
        </header>

        {loading ? (
          <div className="record-empty" role="status">
            <Loader2 size={26} className="spin" />
            <strong>Cargando ficha del cliente…</strong>
            <span>Estamos trayendo la información real desde el servidor.</span>
          </div>
        ) : loadError ? (
          <div className="record-empty" role="alert">
            <TriangleAlert size={26} />
            <strong>No se pudo cargar la ficha del cliente</strong>
            <span>Verifica tu conexión a internet e intenta de nuevo. No se muestran datos de ejemplo para evitar confundirlos con información real.</span>
            {onRetry && <button type="button" className="primary-button primary-button--inline" onClick={onRetry}><RefreshCcw size={16} /> Reintentar</button>}
          </div>
        ) : (
          <>
            <div className="record-security">
              <ShieldCheck size={18} />
              <span>
                <strong>{role === "owner" ? "Acceso completo de dirección" : role === "trainer" ? "Información autorizada para entrenamiento" : "Acceso administrativo"}</strong>
                <small>{role === "owner" ? (medical360Enabled ? "Incluye notas privadas y toda la información del expediente." : "Incluye toda la información de la ficha del cliente.") : role === "trainer" ? "Puedes consultar la ficha autorizada y actualizar programa y evolución." : "Los datos clínicos permanecen protegidos."}</small>
              </span>
            </div>

            <nav className="record-tabs" aria-label="Secciones del expediente">
              {visibleSections.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={activeSection === id ? "active" : ""} onClick={() => setSection(id)}><Icon size={16} /><span>{label}</span></button>)}
              {role === "secretary" && medical360Enabled && <span className="record-tabs__locked"><LockKeyhole size={14} /> Secciones clínicas protegidas</span>}
            </nav>

            <div className="record-content">
              {activeSection === "health" && (
                <section className="record-section">
                  <div className="record-section__heading"><span><FileHeart size={18} /></span><div><h3>Ficha de salud</h3><p>Identificación y datos iniciales del cliente.</p></div></div>
                  <div className="record-contact-strip"><span className={`avatar avatar--${client.color}`}>{client.initials}</span><span><strong>{client.email}</strong><small>{client.phone} · Contacto registrado</small></span></div>
                  <div className="record-form-grid">
                    <RecordField label="Cédula o identificación" value={draft.nationalId} onChange={(value) => updateField("nationalId", value)} disabled={!canEditIdentity} placeholder="Ej. 8-000-0000" />
                    <RecordField label="Fecha de nacimiento" type="date" value={draft.birthDate} onChange={(value) => updateField("birthDate", value)} disabled={!canEditIdentity} />
                    <RecordField label="Sexo" value={draft.sex} onChange={(value) => updateField("sex", value)} disabled={!canEditIdentity} placeholder="Sin registrar" />
                    <RecordField label="Peso" value={draft.weight} onChange={(value) => updateField("weight", value)} disabled={!canEditIdentity} placeholder="Ej. 72 kg" />
                    <RecordField label="Estatura" value={draft.height} onChange={(value) => updateField("height", value)} disabled={!canEditIdentity} placeholder="Ej. 1.70 m" />
                    <RecordField label="Contacto de emergencia" value={draft.emergencyContact} onChange={(value) => updateField("emergencyContact", value)} disabled={!canEditIdentity} placeholder="Nombre completo" />
                    <RecordField label="Teléfono de emergencia" value={draft.emergencyPhone} onChange={(value) => updateField("emergencyPhone", value)} disabled={!canEditIdentity} placeholder="6000-0000" />
                    <RecordTextarea label="Motivo de ingreso y objetivo" value={draft.reasonForVisit} onChange={(value) => updateField("reasonForVisit", value)} disabled={!canEditIdentity} rows={3} />
                  </div>
                  {canEditIdentity && <div className="record-save-row"><button type="button" className="primary-button primary-button--inline" onClick={saveSection}><Save size={16} /> Guardar ficha</button></div>}
                </section>
              )}

              {activeSection === "history" && medical360Enabled && role !== "secretary" && (
                <section className="record-section">
                  <div className="record-section__heading"><span><ClipboardList size={18} /></span><div><h3>Antecedentes médicos</h3><p>Información necesaria para entrenar de forma segura.</p></div></div>
                  <div className="record-form-grid record-form-grid--two">
                    <RecordTextarea label="Condiciones o enfermedades" value={draft.conditions} onChange={(value) => updateField("conditions", value)} disabled={!canEditClinical} />
                    <RecordTextarea label="Medicamentos" value={draft.medications} onChange={(value) => updateField("medications", value)} disabled={!canEditClinical} />
                    <RecordTextarea label="Cirugías u operaciones" value={draft.surgeries} onChange={(value) => updateField("surgeries", value)} disabled={!canEditClinical} />
                    <RecordTextarea label="Lesiones o molestias" value={draft.injuries} onChange={(value) => updateField("injuries", value)} disabled={!canEditClinical} />
                  </div>
                  <div className="record-safety-grid">
                    <RecordTextarea label="Recomendaciones para el entrenador" value={draft.recommendations} onChange={(value) => updateField("recommendations", value)} disabled={!canEditClinical} />
                    <RecordTextarea label="Restricciones y señales de alerta" value={draft.restrictions} onChange={(value) => updateField("restrictions", value)} disabled={!canEditClinical} />
                  </div>
                  {role === "owner" && <div className="record-private-note"><LockKeyhole size={17} /><RecordTextarea label="Nota privada de dirección · no visible para el entrenador" value={draft.privateNotes} onChange={(value) => updateField("privateNotes", value)} rows={3} /></div>}
                  {canEditClinical && <div className="record-save-row"><button type="button" className="primary-button primary-button--inline" onClick={saveSection}><Save size={16} /> Guardar antecedentes</button></div>}
                </section>
              )}

              {activeSection === "treatments" && medical360Enabled && role !== "secretary" && (
                <section className="record-section">
                  <div className="record-section__heading record-section__heading--actions"><span><Stethoscope size={18} /></span><div><h3>Tratamientos y seguimiento</h3><p>Áreas que participan en la atención del cliente.</p></div>{canEditClinical && <button type="button" className="secondary-button" onClick={addTreatment}><Plus size={15} /> Añadir</button>}</div>
                  <div className="treatment-list">
                    {draft.treatments.map((treatment) => <article className="treatment-card" key={treatment.id}>
                      <div className="treatment-card__top">
                        {canEditClinical ? <select value={treatment.area} onChange={(event) => updateTreatment(treatment.id, "area", event.target.value)}>{TREATMENT_AREAS.map((area) => <option key={area}>{area}</option>)}</select> : <strong>{treatment.area}</strong>}
                        {canEditClinical ? <select value={treatment.status} onChange={(event) => updateTreatment(treatment.id, "status", event.target.value)}>{TREATMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select> : <em>{treatment.status}</em>}
                      </div>
                      <RecordTextarea label="Tratamiento o indicación" value={treatment.summary} onChange={(value) => updateTreatment(treatment.id, "summary", value)} disabled={!canEditClinical} rows={3} />
                      <RecordField label="Profesional responsable" value={treatment.professional} onChange={(value) => updateTreatment(treatment.id, "professional", value)} disabled={!canEditClinical} />
                    </article>)}
                  </div>
                  {canEditClinical && <div className="record-save-row"><button type="button" className="primary-button primary-button--inline" onClick={saveSection}><Save size={16} /> Guardar tratamientos</button></div>}
                </section>
              )}

              {activeSection === "program" && role !== "secretary" && (
                <section className="record-section">
                  <div className="record-section__heading"><span><Dumbbell size={18} /></span><div><h3>Programa semanal de entrenamiento</h3><p>Una hoja sencilla por día, con espacio libre para escribir la sesión completa.</p></div></div>
                  <div className="weekly-program">
                    {draft.weeklyPlan.map((day, index) => <article key={day.day}>
                      <header><strong>{day.day}</strong><label><CalendarDays size={13} /><input value={day.duration} onChange={(event) => setDraft((current) => ({ ...current, weeklyPlan: current.weeklyPlan.map((item, itemIndex) => itemIndex === index ? { ...item, duration: event.target.value } : item) }))} disabled={!canEditProgram} placeholder="Duración" aria-label={`Duración del ${day.day}`} /></label></header>
                      <textarea value={day.plan} onChange={(event) => setDraft((current) => ({ ...current, weeklyPlan: current.weeklyPlan.map((item, itemIndex) => itemIndex === index ? { ...item, plan: event.target.value } : item) }))} disabled={!canEditProgram} rows={7} placeholder="Escribe calentamiento, ejercicios, series, repeticiones y observaciones..." aria-label={`Rutina del ${day.day}`} />
                    </article>)}
                  </div>
                  <RecordTextarea label="Observaciones generales del programa" value={draft.programNotes} onChange={(value) => updateField("programNotes", value)} disabled={!canEditProgram} rows={3} />
                  {canEditProgram && <div className="record-save-row"><button type="button" className="primary-button primary-button--inline" onClick={saveSection}><Save size={16} /> Guardar programa</button></div>}
                </section>
              )}

              {activeSection === "evolution" && role !== "secretary" && (
                <section className="record-section">
                  <div className="record-section__heading"><span><Activity size={18} /></span><div><h3>Evolución del cliente</h3><p>Registro cronológico de respuesta, avances y ajustes.</p></div></div>
                  <form className="evolution-composer" onSubmit={addEvolution}>
                    <label><span>Nueva evolución</span><textarea value={evolutionNote} onChange={(event) => setEvolutionNote(event.target.value)} rows={3} placeholder="Describe cómo respondió el cliente y qué debe revisarse en la próxima sesión." /></label>
                    {role === "owner" && <label className="record-private-toggle"><input type="checkbox" checked={privateEvolution} onChange={(event) => setPrivateEvolution(event.target.checked)} /><span><LockKeyhole size={14} /> Solo dirección</span></label>}
                    {evolutionError && <p className="form-error" role="alert">{evolutionError}</p>}
                    <button type="submit" className="primary-button primary-button--inline"><Plus size={16} /> Añadir evolución</button>
                  </form>
                  <div className="evolution-timeline">
                    {visibleEvolution.length ? visibleEvolution.map((entry) => <article key={entry.id}><i /><div><header><strong>{entry.author}</strong><time>{entry.date}</time>{entry.visibility === "owner" && <span><LockKeyhole size={11} /> Privado</span>}</header><p>{entry.note}</p></div></article>) : <div className="record-empty"><UserRound size={24} /><strong>Sin evoluciones registradas</strong><span>Añade la primera observación después de una sesión.</span></div>}
                  </div>
                </section>
              )}
            </div>
          </>
        )}
      </section>
    </ModalLayer>
  );
}