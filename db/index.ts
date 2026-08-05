import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (cachedDb) return cachedDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta la variable de entorno DATABASE_URL. Cópiala desde Supabase → Project Settings → Database → Connection string (modo 'Transaction pooler', puerto 6543) y ponla en tus secretos de despliegue."
    );
  }

  // prepare: false es obligatorio cuando se usa el connection pooler de
  // Supabase (pgbouncer en modo transacción) — necesario en entornos
  // serverless/edge (Cloudflare Workers) donde cada petición puede llegar
  // a un "worker" distinto y no se puede mantener una sesión persistente.
  const client = postgres(connectionString, { prepare: false, max: 1 });
  cachedDb = drizzle(client, { schema });
  return cachedDb;
}
