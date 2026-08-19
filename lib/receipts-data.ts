"use client";

// ============================================================================
// Recibos de pago.
//
// La LECTURA se hace directo contra Supabase (RLS decide qué recibos puede
// ver cada quien). La EMISIÓN pasa por /api/receipts, porque ahí el
// servidor decide quién firma y con qué prefijo se numera — datos que no se
// pueden confiar al navegador.
// ============================================================================
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { PaymentReceipt, ReceiptConcept, ReceiptPaymentMethod } from "@/app/aureus/types";

const CONCEPT_LABELS: Record<string, ReceiptConcept> = {
  cancelacion: "Cancelación",
  abono: "Abono",
};

const METHOD_LABELS: Record<string, ReceiptPaymentMethod> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  yappy: "Yappy",
  tarjeta: "Tarjeta",
};

/**
 * Arma el número visible del recibo: MG-0003-26 (prefijo del gimnasio,
 * correlativo de 4 dígitos y los dos últimos dígitos del año).
 */
export function formatReceiptNumber(receiptNumber: number, createdAt: string, prefix?: string): string {
  const year = new Date(createdAt).getFullYear().toString().slice(-2);
  const clean = (prefix ?? "").trim().toUpperCase() || "REC";
  return `${clean}-${String(receiptNumber).padStart(4, "0")}-${year}`;
}

/** Iniciales del gimnasio, para usarlas cuando no hay prefijo configurado. */
export function initialsFromGymName(gymName: string): string {
  return (
    gymName
      .trim()
      .split(/\s+/)
      .map((word) => word[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 3) || "REC"
  );
}

export async function fetchReceiptsForGym(gymId: string, prefix?: string): Promise<PaymentReceipt[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("payment_receipts")
    .select("id, client_id, receipt_number, amount, concept, payment_method, balance, service, next_due, issued_by_name, created_at, clients(name)")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    console.error("ERROR CARGAR RECIBOS:", error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    clientName: row.clients?.name ?? "Cliente",
    receiptNumber: row.receipt_number,
    displayNumber: formatReceiptNumber(row.receipt_number, row.created_at, prefix),
    amount: Number(row.amount),
    concept: CONCEPT_LABELS[row.concept as string] ?? "Cancelación",
    paymentMethod: METHOD_LABELS[row.payment_method as string] ?? "Efectivo",
    balance: Number(row.balance ?? 0),
    service: row.service ?? "",
    nextDue: row.next_due ?? "",
    issuedByName: row.issued_by_name ?? "",
    createdAt: row.created_at,
  }));
}

/**
 * Emite un recibo. Todo el trabajo delicado (numeración, quién firma, el
 * prefijo, validar montos y dejar al cliente al día) ocurre en el servidor.
 *
 * Nota: recibe gymId, profileId, issuedByName y prefix por compatibilidad
 * con quien la llama, pero YA NO LOS USA — el servidor los toma de la
 * sesión y de la base de datos, que es justamente lo que evita que alguien
 * emita un recibo a nombre de otra persona.
 */
export async function issueReceipt(
  _gymId: string,
  clientRealId: string,
  _profileId: string,
  _issuedByName: string,
  input: { amount: number; concept: ReceiptConcept; paymentMethod: ReceiptPaymentMethod; balance: number; service: string; nextDue: string },
  _prefix?: string
): Promise<PaymentReceipt> {
  const response = await fetch("/api/receipts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: clientRealId, ...input }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data) {
    console.error("ERROR EMITIR RECIBO:", data?.error);
    throw new Error(data?.error ?? "No se pudo emitir el recibo");
  }

  return {
    id: data.id,
    clientName: "",
    receiptNumber: data.receiptNumber,
    displayNumber: data.displayNumber,
    amount: input.amount,
    concept: input.concept,
    paymentMethod: input.paymentMethod,
    balance: input.balance,
    service: input.service,
    nextDue: input.nextDue,
    issuedByName: data.issuedByName,
    createdAt: data.createdAt,
  };
}