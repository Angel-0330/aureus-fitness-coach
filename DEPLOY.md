# Guía de despliegue — Backend de Aureus con Supabase

Esta guía asume que no eres programador. Ve paso por paso, sin saltarte ninguno.

## 0. Qué vas a instalar en tu proyecto

Estos archivos que te entregué reemplazan/añaden a tu repositorio actual:



Cópialos dentro de tu repositorio de GitHub, respetando esas mismas carpetas.

## 1. Crear el proyecto en Supabase

1. Ve a supabase.com → crea una cuenta gratis → "New Project".
2. Elige una región cercana a Panamá (ej. `us-east-1`, N. Virginia — es la más cercana disponible).
3. Guarda la contraseña de base de datos que te pida crear — la vas a necesitar en el paso 3.
4. Cuando el proyecto esté listo (1-2 minutos), ve a **Project Settings → API** y copia:
   - `Project URL` → será tu `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → será tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → será tu `SUPABASE_SERVICE_ROLE_KEY` (¡mantenla en secreto!)

## 2. Activar la extensión de cifrado (opcional pero recomendado)

En Supabase → **SQL Editor** → pega y ejecuta:

```sql
create extension if not exists pgcrypto;
```

## 3. Crear las tablas

En tu computadora, dentro de la carpeta del proyecto:

```bash
npm install drizzle-orm postgres @supabase/supabase-js @supabase/ssr @upstash/ratelimit @upstash/redis
npm install -D drizzle-kit
```

Copia `.env.example` a `.env.local` y completa los valores (URL, llaves, `DATABASE_URL` con el modo **Transaction pooler**, que está en Supabase → Project Settings → Database).

Genera y aplica las tablas:

```bash
npx drizzle-kit push
```

Esto lee `db/schema.ts` y crea todas las tablas directamente en tu base de Supabase.

## 4. Aplicar las reglas de seguridad (RLS)

En Supabase → **SQL Editor**, pega y ejecuta, en este orden:

1. El contenido completo de `supabase/migrations/0002_rls_policies.sql`
2. El contenido completo de `supabase/migrations/0003_audit_log.sql`

Verifica: en **Table Editor**, cada tabla debería mostrar un candadito verde que dice "RLS enabled".

## 5. Conectar Supabase Auth con la tabla `profiles`

Para que cada nueva persona que se registre tenga automáticamente su fila en `profiles`, ejecuta también en el SQL Editor:

```sql
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, gym_id, name, email, role, initials)
  values (
    new.id,
    (new.raw_user_meta_data->>'gym_id')::uuid,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'trainer')::role,
    upper(left(coalesce(new.raw_user_meta_data->>'name', new.email), 2))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

Esto quiere decir: cuando alguien se registra (`supabase.auth.signUp`), pasas `gym_id`, `name` y `role` como metadata, y el perfil se crea solo.

## 6. Configurar el límite de peticiones (Rate Limiting)

1. Crea una cuenta gratis en upstash.com → "Create Database" → tipo Redis.
2. Copia `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` a tu `.env.local` / secretos de producción.

Ya con eso, cualquier ruta que use `checkRateLimit(...)` (como el ejemplo en `app/api/medical-records/[clientId]/route.ts`) queda protegida.

**Capa extra, sin código, cuando tengas tu dominio propio:** una vez muevas el sitio a un dominio tuyo administrado por Cloudflare, ve a Cloudflare Dashboard → tu dominio → **Security → Rate Limiting Rules** → crea una regla como "máximo 100 peticiones por minuto por IP en /api/*". Esto bloquea el abuso antes de que la petición llegue siquiera a tu código — gratis, y sin mantenimiento.

## 7. Migrar tus componentes actuales

Hoy tus componentes en `app/aureus/features/*.tsx` leen datos de `app/aureus/data.ts` (los datos de prueba). El siguiente paso, componente por componente, es reemplazar esas lecturas por llamadas a Supabase, por ejemplo:

```ts
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const supabase = createSupabaseBrowserClient();
const { data: clients } = await supabase.from("clients").select("*");
```

Como las políticas RLS ya están activas, cada usuario automáticamente solo va a ver los clientes de su propio gimnasio (y, si es entrenador, solo lo que le corresponde).

## 8. Desplegar de forma independiente (para tu dominio propio)

Cuando quieras dejar de depender del hosting de OpenAI (`chatgpt.site`) y publicar en tu propio dominio:

1. Crea una cuenta gratis en cloudflare.com (el mismo proveedor que ya usa tu plantilla — Workers, D1, R2 son de Cloudflare).
2. Agrega un archivo `wrangler.toml` de configuración estándar.
3. `npx wrangler login` → conecta tu cuenta.
4. `npx wrangler deploy` → publica el sitio en un subdominio `*.workers.dev` gratuito.
5. Cloudflare → tu dominio comprado (ej. `aureusgym.com`) → conéctalo al Worker con un par de clics.

## Resumen de lo que NO tienes que hacer tú mismo

- Copias de seguridad de la base de datos → automáticas en Supabase.
- Escalado horizontal → automático en Cloudflare Workers y en Supabase (compute add-ons si crece mucho).
- Cifrado en tránsito (HTTPS) → automático en ambos.
- Parches de seguridad del servidor → no administras servidores, así que no aplica.
