-- ============================================================================
-- Row Level Security (RLS) — Aureus
-- ----------------------------------------------------------------------------
-- ¿Qué es esto? Son reglas que vive DENTRO de la base de datos, no en tu
-- código. Aunque alguien robe la "llave" pública que usa la web (anon key),
-- la base de datos igual va a rechazar cualquier fila a la que ese usuario
-- no tenga derecho — sin importar qué le pida el código de la aplicación.
-- Es la capa de seguridad más fuerte que existe para datos como estos.
--
-- Cómo se aplica: pega y ejecuta este archivo en Supabase → SQL Editor,
-- después de crear las tablas con `npm run db:generate` + `db:push`
-- (ver DEPLOY.md).
-- ============================================================================

-- Función auxiliar: perfil del usuario que hace la petición ahora mismo
create or replace function auth_profile()
returns table (id uuid, gym_id uuid, role text)
language sql stable
as $$
  select p.id, p.gym_id, p.role::text
  from profiles p
  where p.id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- gyms
-- ----------------------------------------------------------------------------
alter table gyms enable row level security;

create policy "miembros ven su propio gimnasio"
  on gyms for select
  using (id in (select gym_id from auth_profile()));

-- ----------------------------------------------------------------------------
-- profiles (cuentas del personal: dueño, secretaria, entrenador)
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;

create policy "ver perfiles del mismo gimnasio"
  on profiles for select
  using (gym_id in (select gym_id from auth_profile()));

create policy "solo el dueno administra el personal"
  on profiles for insert
  with check (
    gym_id in (select gym_id from auth_profile() where role = 'owner')
  );

create policy "solo el dueno edita el personal"
  on profiles for update
  using (gym_id in (select gym_id from auth_profile() where role = 'owner'));

-- ----------------------------------------------------------------------------
-- clients / gym_plans / measurements / routines / agenda / mensajes
-- Regla general: cualquier miembro del gimnasio (dueño, secretaria,
-- entrenador) puede ver y trabajar con estos datos "operativos"
-- (no-médicos) de SU gimnasio, nunca de otro.
-- ----------------------------------------------------------------------------
alter table gym_plans enable row level security;
alter table clients enable row level security;
alter table client_treatments enable row level security;
alter table measurements enable row level security;
alter table routines enable row level security;
alter table routine_exercises enable row level security;
alter table agenda_sessions enable row level security;
alter table client_messages enable row level security;

create policy "acceso operativo al propio gimnasio - gym_plans"
  on gym_plans for all
  using (gym_id in (select gym_id from auth_profile()))
  with check (gym_id in (select gym_id from auth_profile()));

create policy "acceso operativo al propio gimnasio - clients"
  on clients for select
  using (gym_id in (select gym_id from auth_profile()));

create policy "owner y secretary administran clients"
  on clients for insert
  with check (gym_id in (select gym_id from auth_profile() where role in ('owner','secretary')));

create policy "owner, secretary y su entrenador actualizan clients"
  on clients for update
  using (
    gym_id in (select gym_id from auth_profile() where role in ('owner','secretary'))
    or trainer_id in (select id from auth_profile() where role = 'trainer')
  );

create policy "acceso operativo al propio gimnasio - treatments"
  on client_treatments for all
  using (gym_id in (select gym_id from auth_profile()))
  with check (gym_id in (select gym_id from auth_profile()));

create policy "acceso operativo al propio gimnasio - measurements"
  on measurements for all
  using (gym_id in (select gym_id from auth_profile()))
  with check (gym_id in (select gym_id from auth_profile()));

create policy "acceso operativo al propio gimnasio - routines"
  on routines for all
  using (gym_id in (select gym_id from auth_profile()))
  with check (gym_id in (select gym_id from auth_profile()));

create policy "acceso a ejercicios via rutina del propio gimnasio"
  on routine_exercises for all
  using (routine_id in (select id from routines where gym_id in (select gym_id from auth_profile())));

create policy "acceso operativo al propio gimnasio - agenda"
  on agenda_sessions for all
  using (gym_id in (select gym_id from auth_profile()))
  with check (gym_id in (select gym_id from auth_profile()));

create policy "acceso operativo al propio gimnasio - mensajes"
  on client_messages for all
  using (client_id in (select id from clients where gym_id in (select gym_id from auth_profile())));

-- ----------------------------------------------------------------------------
-- client_medical_records — LA TABLA MÁS SENSIBLE.
-- Regla mucho más estricta: SOLO el dueño y el entrenador/clínico asignado
-- a ESE cliente pueden verla. La secretaria queda fuera por diseño: no
-- necesita ver diagnósticos ni medicamentos para hacer su trabajo.
-- ----------------------------------------------------------------------------
alter table client_medical_records enable row level security;

create policy "dueno ve todos los expedientes de su gimnasio"
  on client_medical_records for select
  using (gym_id in (select gym_id from auth_profile() where role = 'owner'));

create policy "entrenador asignado ve el expediente de su cliente"
  on client_medical_records for select
  using (
    client_id in (
      select id from clients
      where trainer_id in (select id from auth_profile() where role = 'trainer')
    )
  );

create policy "dueno y entrenador asignado editan el expediente"
  on client_medical_records for insert
  with check (
    gym_id in (select gym_id from auth_profile() where role = 'owner')
    or client_id in (select id from clients where trainer_id in (select id from auth_profile() where role = 'trainer'))
  );

create policy "dueno y entrenador asignado actualizan el expediente"
  on client_medical_records for update
  using (
    gym_id in (select gym_id from auth_profile() where role = 'owner')
    or client_id in (select id from clients where trainer_id in (select id from auth_profile() where role = 'trainer'))
  );

-- Nadie puede borrar expedientes médicos directamente (ni con la app, ni
-- por accidente). Si algún día hace falta, se hace manualmente y queda
-- registrado en el audit_log.
-- (no se crea policy de "delete" → queda bloqueado por defecto)

-- ----------------------------------------------------------------------------
-- audit_log — nadie edita ni borra el historial de auditoría; solo el
-- dueño puede leerlo, y solo el sistema (triggers) puede escribir en él.
-- ----------------------------------------------------------------------------
alter table audit_log enable row level security;

create policy "solo el dueno lee la auditoria"
  on audit_log for select
  using (gym_id in (select gym_id from auth_profile() where role = 'owner'));
