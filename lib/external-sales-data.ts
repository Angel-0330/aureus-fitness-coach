"use client";

// ============================================================================
// Ventas externas: productos vendidos en recepción (agua, bebidas, barras
// de proteína, etc.). NO es inventario — solo registra qué se vendió,
// cuánto se recibió y cómo pagó el cliente.
//
// La LECTURA va directo contra Supabase (RLS filtra por gimnasio). El
// REGISTRO pasa por /api/external-sales, para que el servidor valide el
// monto y deje constancia de quién la registró.
// ============================================================================
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { ExternalSale, PaymentMethod } from "@/app/aureus/types";

export type SaleIdMap = Record<number, string>;

const METHOD_LABELS: Record<string, PaymentMethod> = {
  efectivo: "Efectivo",
  yappy: "Yappy",
  tarjeta: "Tarjeta",
};

export async function fetchExternalSales(gymId: string): Promise<{ sales: ExternalSale[]; idMap: SaleIdMap }> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("external_sales")
    .select("id, product, amount, payment_method, created_at")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    console.error("ERROR CARGAR VENTAS EXTERNAS:", error);
    return { sales: [], idMap: {} };
  }

  const idMap: SaleIdMap = {};
  const sales: ExternalSale[] = data.map((row: any, index: number) => {
    const localId = index + 1;
    idMap[localId] = row.id;
    return {
      id: localId,
      product: row.product,
      amount: Number(row.amount),
      paymentMethod: METHOD_LABELS[row.payment_method as string] ?? "Efectivo",
      createdAt: row.created_at,
    };
  });

  return { sales, idMap };
}

/**
 * Registra una venta nueva. El servidor valida el monto y guarda quién la
 * registró a partir de la sesión.
 *
 * Nota: recibe gymId y profileId por compatibilidad con quien la llama,
 * pero ya no los usa — el servidor los deduce de la sesión.
 */
export async function saveExternalSale(
  _gymId: string,
  _profileId: string,
  input: { product: string; amount: number; paymentMethod: PaymentMethod }
): Promise<{ realId: string; createdAt: string }> {
  const response = await fetch("/api/external-sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data) {
    console.error("ERROR GUARDAR VENTA EXTERNA:", data?.error);
    throw new Error(data?.error ?? "No se pudo guardar la venta");
  }

  return { realId: data.id, createdAt: data.createdAt };
}