// Utilidades puras de formato y creación de borradores.
import type { MeasurementDraft } from "./types";

export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function blankMeasurement(): MeasurementDraft {
  return { date: "2026-07-22", weight: "", calf: "", thigh: "", glute: "", waist: "", arm: "" };
}

export function formatMeasurementDate(date: string) {
  return new Intl.DateTimeFormat("es-PA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}
