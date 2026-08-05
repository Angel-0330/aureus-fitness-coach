import { defineConfig } from "drizzle-kit";

// Antes: dialect "sqlite" apuntando a Cloudflare D1.
// Ahora: Postgres estándar (Supabase). Si el día de mañana migras a otro
// proveedor de Postgres (AWS RDS, Neon, servidor propio), lo único que
// cambia es el valor de DATABASE_URL — este archivo no se toca.
export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
