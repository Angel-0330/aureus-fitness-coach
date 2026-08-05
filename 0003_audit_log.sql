-- ============================================================================
-- Auditoría automática de client_medical_records
-- ----------------------------------------------------------------------------
-- Cada vez que alguien crea, edita o borra un expediente médico, esta
-- función guarda automáticamente quién fue, cuándo y qué acción hizo —
-- sin que la aplicación tenga que "acordarse" de hacerlo. Corre dentro
-- de la base de datos, así que es imposible saltársela desde el código.
-- ============================================================================

create or replace function log_medical_record_change()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into audit_log (gym_id, actor_id, table_name, record_id, action)
  values (
    coalesce(new.gym_id, old.gym_id),
    auth.uid(),
    'client_medical_records',
    coalesce(new.client_id, old.client_id)::text,
    lower(tg_op)
  );
  return coalesce(new, old);
end;
$$;

create trigger trg_audit_medical_records
  after insert or update or delete on client_medical_records
  for each row execute function log_medical_record_change();
