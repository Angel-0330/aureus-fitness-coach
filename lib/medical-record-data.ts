"use client";

// ============================================================================
// Trae y guarda el expediente médico REAL de un cliente, pasando por la
// ruta de servidor (que ya se encarga de la seguridad: sesión, límite de
// peticiones, permisos por fila, y cifrar/descifrar la cédula).
//
// Si la petición de LECTURA falla por un motivo pasajero (por ejemplo, un
// hipo de conexión al validar la sesión), reintenta automáticamente antes
// de darse por vencido. Solo cuando el cliente en verdad no tiene un
// expediente todavía (código 404, algo normal y esperado) devuelve
// null — cualquier otro fallo real lanza un error, para que la pantalla
// nunca confunda un problema técnico con "no hay datos".
// ============================================================================
import type { ClientRecord } from "@/app/aureus/types";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 700;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Devuelve el expediente médico ya en la forma exacta que espera la app
 * (ClientRecord, con clientId ya ajustado al id local que usa el resto de
 * pantallas). Si el cliente todavía no tiene expediente en la base de
 * datos (por ejemplo, uno insertado a mano antes de este módulo),
 * devuelve null — en ese caso la pantalla debe usar un expediente vacío
 * de respaldo. Si la petición falla por cualquier otro motivo, lanza un
 * error después de reintentar.
 */
export async function fetchMedicalRecord(clientUuid: string, localClientId: number): Promise<ClientRecord | null> {
  let lastStatus: number | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`/api/medical-records/${clientUuid}`);
      lastStatus = response.status;

      if (response.status === 404) {
        return null;
      }

      if (response.ok) {
        const data = await response.json();
        return { ...data, clientId: localClientId } as ClientRecord;
      }
    } catch (error) {
      console.error("ERROR TRAER EXPEDIENTE:", error);
    }

    if (attempt < MAX_ATTEMPTS) await wait(RETRY_DELAY_MS * attempt);
  }

  throw new Error(`No se pudo cargar el expediente médico (código ${lastStatus ?? "desconocido"}).`);
}

/**
 * Guarda los cambios del expediente médico en Supabase. Lanza un error si
 * la petición falla, para que quien llame pueda avisar al usuario en vez
 * de dar por hecho que se guardó. Devuelve el expediente ya actualizado
 * (con los IDs reales de los tratamientos, por ejemplo).
 */
export async function saveMedicalRecord(clientUuid: string, record: ClientRecord, localClientId: number): Promise<ClientRecord> {
  const response = await fetch(`/api/medical-records/${clientUuid}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    throw new Error(`No se pudo guardar el expediente médico (código ${response.status}).`);
  }

  const data = await response.json();
  return { ...data, clientId: localClientId } as ClientRecord;
}

/**
 * Trae TODOS los expedientes médicos del gimnasio de una sola vez, ya
 * traducidos a ids locales usando clientIdMap. Se usa al iniciar sesión
 * para que pantallas como "Rutinas" o "Agenda" no dependan de abrir cada
 * ficha una por una para tener datos reales.
 */
export async function fetchAllMedicalRecords(clientIdMap: Record<number, string>): Promise<ClientRecord[]> {
  try {
    const response = await fetch("/api/medical-records");
    if (!response.ok) {
      console.error("ERROR TRAER EXPEDIENTES:", response.status);
      return [];
    }
    const rows = await response.json();
    const realToLocal: Record<string, number> = {};
    Object.entries(clientIdMap).forEach(([localId, realId]) => {
      realToLocal[realId] = Number(localId);
    });
    const records: ClientRecord[] = [];
    for (const row of rows) {
      const localClientId = realToLocal[row.clientId];
      if (!localClientId) continue;
      records.push({ ...row, clientId: localClientId } as ClientRecord);
    }
    return records;
  } catch (error) {
    console.error("ERROR TRAER EXPEDIENTES:", error);
    return [];
  }
}