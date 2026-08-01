"use client";

// Rutinas y seguimiento del progreso.
import { FormEvent, useState } from "react";

import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  FileText,
  PencilLine,
  Ruler,
  Save,
  Scale,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import type {
  Client,
  ClientRecord,
  MeasurementDraft,
  MeasurementRecord,
} from "../types";
import { createClientRecord } from "../data";
import { blankMeasurement, formatMeasurementDate } from "../utils";

function copyRecord(record: ClientRecord): ClientRecord {
  return {
    ...record,
    weeklyPlan: record.weeklyPlan.map((day) => ({ ...day })),
    treatments: record.treatments.map((treatment) => ({ ...treatment })),
    evolution: record.evolution.map((entry) => ({ ...entry })),
  };
}

export function RoutinesView({ clients, records, trainerName, onSave }: { clients: Client[]; records: ClientRecord[]; trainerName: string; onSave: (record: ClientRecord) => void }) {
  const assignedClients = clients.filter((client) => client.trainer === trainerName);
  const initialClient = assignedClients[0];
  const initialRecord = initialClient ? records.find((record) => record.clientId === initialClient.id) ?? createClientRecord(initialClient) : null;
  const [selectedClientId, setSelectedClientId] = useState(initialClient?.id ?? 0);
  const [draft, setDraft] = useState<ClientRecord | null>(() => initialRecord ? copyRecord(initialRecord) : null);
  const selectedClient = assignedClients.find((client) => client.id === selectedClientId) ?? initialClient;

  function chooseClient(client: Client) {
    const record = records.find((item) => item.clientId === client.id) ?? createClientRecord(client);
    setSelectedClientId(client.id);
    setDraft(copyRecord(record));
  }

  function updateDay(index: number, field: "plan" | "duration", value: string) {
    setDraft((current) => current ? {
      ...current,
      weeklyPlan: current.weeklyPlan.map((day, dayIndex) => dayIndex === index ? { ...day, [field]: value } : day),
    } : current);
  }

  if (!selectedClient || !draft) {
    return <section className="ops-page"><div className="empty-state"><UsersRound size={30} /><h2>No tienes clientes asignados</h2><p>Cuando dirección te asigne un cliente después de su evaluación médica, podrás preparar su programa semanal aquí.</p></div></section>;
  }

  return (
    <section className="ops-page routine-page routine-simple-page">
      <div className="ops-page__heading">
        <div><span className="eyebrow"><Dumbbell size={14} /> PROGRAMA SEMANAL</span><h2>Rutina de mis clientes</h2><p>Elige un cliente y escribe directamente lo que hará cada día. Esta misma información aparece en su expediente.</p></div>
      </div>

      <div className="progress-client-picker routine-client-picker" aria-label="Elegir cliente para su rutina">
        {assignedClients.map((client) => <button type="button" className={selectedClient.id === client.id ? "selected" : ""} key={client.id} onClick={() => chooseClient(client)} aria-pressed={selectedClient.id === client.id}><span className={`avatar avatar--${client.color}`}>{client.initials}</span><span><strong>{client.name}</strong><small>{client.goal}</small></span>{selectedClient.id === client.id && <CheckCircle2 size={20} />}</button>)}
      </div>

      <article className="routine-client-context">
        <span className={`avatar avatar--${selectedClient.color}`}>{selectedClient.initials}</span>
        <div><small>PROGRAMA DE</small><strong>{selectedClient.name}</strong><span>{draft.reasonForVisit}</span></div>
        <div><small>RECOMENDACIONES</small><span>{draft.recommendations}</span></div>
        <div><small>RESTRICCIONES</small><span>{draft.restrictions}</span></div>
      </article>

      <div className="weekly-program routine-weekly-sheet">
        {draft.weeklyPlan.map((day, index) => <article key={day.day}>
          <header>
            <strong>{day.day}</strong>
            <label><CalendarDays size={13} /><input value={day.duration} onChange={(event) => updateDay(index, "duration", event.target.value)} placeholder="Duración" aria-label={`Duración del ${day.day}`} /></label>
          </header>
          <textarea value={day.plan} onChange={(event) => updateDay(index, "plan", event.target.value)} rows={9} placeholder={"Escribe la sesión completa:\n• calentamiento\n• ejercicios\n• series o repeticiones\n• observaciones"} aria-label={`Rutina del ${day.day}`} />
        </article>)}
      </div>

      <label className="routine-field routine-simple-notes"><span>Observaciones generales</span><textarea value={draft.programNotes} onChange={(event) => setDraft((current) => current ? { ...current, programNotes: event.target.value } : current)} rows={3} placeholder="Indicaciones, ajustes o recordatorios para toda la semana" /></label>
      <div className="routine-safety-note"><ShieldCheck size={17} /><span><strong>La rutina está vinculada al expediente</strong><small>Al guardar, dirección y el equipo autorizado verán el mismo programa semanal.</small></span></div>
      <div className="routine-simple-actions"><button type="button" className="primary-button primary-button--inline" onClick={() => onSave(draft)}><Save size={17} /> Guardar rutina semanal</button></div>
    </section>
  );
}

export function ProgressView({ clients, trainerName, measurements, onSave, onSelect }: { clients: Client[]; trainerName: string; measurements: MeasurementRecord[]; onSave: (record: MeasurementRecord) => void; onSelect: (client: Client) => void }) {
  const mine = clients.filter((client) => client.trainer === trainerName);
  const [selectedClientId, setSelectedClientId] = useState(mine[0]?.id ?? 0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<MeasurementDraft>(blankMeasurement());
  const [error, setError] = useState("");
  const selectedClient = mine.find((client) => client.id === selectedClientId) ?? mine[0];
  const records = measurements.filter((record) => record.clientId === selectedClient?.id).sort((a, b) => b.date.localeCompare(a.date));

  function updateField(field: keyof MeasurementDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function chooseClient(id: number) {
    setSelectedClientId(id);
    setEditingId(null);
    setDraft(blankMeasurement());
    setError("");
  }

  function editRecord(record: MeasurementRecord) {
    setEditingId(record.id);
    setDraft({
      date: record.date,
      weight: String(record.weight),
      calf: String(record.calf),
      thigh: String(record.thigh),
      glute: String(record.glute),
      waist: String(record.waist),
      arm: String(record.arm),
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(blankMeasurement());
    setError("");
  }

  function submitMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClient) return;
    const values = [draft.weight, draft.calf, draft.thigh, draft.glute, draft.waist, draft.arm].map(Number);
    if (!draft.date || values.some((value) => !Number.isFinite(value) || value <= 0)) {
      setError("Completa la fecha y todas las medidas con valores mayores que cero.");
      return;
    }
    onSave({
      id: editingId ?? 0,
      clientId: selectedClient.id,
      date: draft.date,
      weight: values[0],
      calf: values[1],
      thigh: values[2],
      glute: values[3],
      waist: values[4],
      arm: values[5],
    });
    setEditingId(null);
    setDraft(blankMeasurement());
    setError("");
  }

  if (!selectedClient) {
    return <section className="ops-page"><div className="empty-state"><UsersRound size={30} /><h2>No tienes clientes asignados</h2><p>Cuando dirección te asigne un cliente después de su evaluación médica, aparecerá aquí.</p></div></section>;
  }

  const fields: { key: Exclude<keyof MeasurementDraft, "date">; label: string; unit: string }[] = [
    { key: "weight", label: "Peso", unit: "kg" },
    { key: "calf", label: "Pantorrilla", unit: "cm" },
    { key: "thigh", label: "Pierna", unit: "cm" },
    { key: "glute", label: "Glúteo", unit: "cm" },
    { key: "waist", label: "Cintura", unit: "cm" },
    { key: "arm", label: "Brazo", unit: "cm" },
  ];

  return (
    <section className="ops-page measurement-page">
      <div className="ops-page__heading measurement-heading">
        <div><span className="eyebrow"><Activity size={14} /> REGISTRO DE MEDIDAS</span><h2>Progreso de mis clientes</h2><p>La misma tabla de papel, adaptada para guardar cada evaluación sin pasos complicados.</p></div>
        <button className="secondary-button" onClick={() => window.print()}><FileText size={16} /> Imprimir tabla</button>
      </div>

      <div className="measurement-steps" aria-label="Cómo registrar medidas">
        <span><strong>1</strong> Elige el cliente</span><i /><span><strong>2</strong> Escribe las medidas</span><i /><span><strong>3</strong> Guarda el registro</span>
      </div>

      <div className="progress-client-picker" aria-label="Elegir cliente">
        {mine.map((client) => {
          const recordCount = measurements.filter((record) => record.clientId === client.id).length;
          return <button type="button" className={selectedClient.id === client.id ? "selected" : ""} key={client.id} onClick={() => chooseClient(client.id)} aria-pressed={selectedClient.id === client.id}><span className={`avatar avatar--${client.color}`}>{client.initials}</span><span><strong>{client.name}</strong><small>{recordCount} {recordCount === 1 ? "registro" : "registros"}</small></span>{selectedClient.id === client.id && <CheckCircle2 size={20} />}</button>;
        })}
      </div>

      <div className="measurement-layout">
        <article className="panel measurement-form-card">
          <div className="measurement-card-heading"><div><span>{editingId ? "EDITANDO REGISTRO" : "NUEVA EVALUACIÓN"}</span><h3>{selectedClient.name}</h3><p>{editingId ? "Corrige los datos y vuelve a guardar." : "Completa una casilla por cada dato de la hoja."}</p></div><button className="icon-button icon-button--outlined" onClick={() => onSelect(selectedClient)} aria-label={`Abrir ficha de ${selectedClient.name}`}><UserRound size={18} /></button></div>
          <form onSubmit={submitMeasurement}>
            <label className="measurement-field measurement-field--date"><span><CalendarDays size={17} /> Fecha de evaluación</span><input type="date" value={draft.date} onChange={(event) => updateField("date", event.target.value)} required /></label>
            <div className="measurement-fields">
              {fields.map((field) => <label className="measurement-field" key={field.key}><span>{field.key === "weight" ? <Scale size={17} /> : <Ruler size={17} />}{field.label}</span><span className="measurement-input"><input type="number" min="0.1" step="0.1" inputMode="decimal" value={draft[field.key]} onChange={(event) => updateField(field.key, event.target.value)} placeholder="0.0" aria-label={`${field.label} en ${field.unit}`} required /><b>{field.unit}</b></span></label>)}
            </div>
            {error && <p className="form-error measurement-error" role="alert">{error}</p>}
            <div className="measurement-actions">{editingId && <button type="button" className="secondary-button" onClick={cancelEdit}>Cancelar edición</button>}<button className="primary-button primary-button--inline" type="submit"><Save size={17} /> {editingId ? "Actualizar registro" : "Guardar registro"}</button></div>
          </form>
          <p className="measurement-privacy"><ShieldCheck size={16} /> Registra únicamente datos autorizados por el cliente y necesarios para su seguimiento.</p>
        </article>

        <article className="panel measurement-history-card">
          <div className="measurement-card-heading"><div><span>HISTORIAL</span><h3>Tabla de {selectedClient.name}</h3><p>{records.length ? `${records.length} evaluaciones guardadas` : "Todavía no hay evaluaciones guardadas"}</p></div><span className="measurement-count">{records.length}</span></div>
          {records.length ? <div className="measurement-table-wrap"><table className="measurement-table"><thead><tr><th>Fecha</th><th>Peso</th><th>Pantorrilla</th><th>Pierna</th><th>Glúteo</th><th>Cintura</th><th>Brazo</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><strong>{formatMeasurementDate(record.date)}</strong></td><td>{record.weight}<small>kg</small></td><td>{record.calf}<small>cm</small></td><td>{record.thigh}<small>cm</small></td><td>{record.glute}<small>cm</small></td><td>{record.waist}<small>cm</small></td><td>{record.arm}<small>cm</small></td><td><button type="button" onClick={() => editRecord(record)} aria-label={`Editar registro del ${formatMeasurementDate(record.date)}`}><PencilLine size={15} /> Editar</button></td></tr>)}</tbody></table></div> : <div className="measurement-empty"><Ruler size={28} /><strong>Sin registros todavía</strong><p>Completa el formulario y pulsa “Guardar registro”.</p></div>}
        </article>
      </div>
    </section>
  );
}
