"use client";

// ============================================================================
// Cliente de Supabase para el NAVEGADOR.
// ----------------------------------------------------------------------------
// Usa la "anon key" (clave pública, segura de exponer). Cada consulta que
// hagas con este cliente pasa por las políticas RLS que definimos en
// supabase/migrations/0002_rls_policies.sql — es decir, aunque este código
// viaje al navegador de cualquier visitante, la base de datos igual filtra
// qué puede ver o modificar cada usuario según su sesión real.
// ============================================================================
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
