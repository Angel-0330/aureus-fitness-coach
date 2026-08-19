-- ============================================================================
-- Ajuste: permitir que la secretaria cree el expediente médico VACÍO al
-- registrar un cliente nuevo — sin darle permiso de leerlo ni editarlo
-- después (esas reglas, ya definidas en 0002_rls_policies.sql, se mantienen
-- intactas: solo el dueño y el entrenador asignado pueden ver/editar el
-- contenido del expediente).
-- ============================================================================

drop policy if exists "dueno y entrenador asignado editan el expediente" on client_medical_records;

create policy "crear expediente al registrar cliente"
  on client_medical_records for insert
  with check (
    gym_id in (select gym_id from auth_profile() where role in ('owner', 'secretary'))
    or client_id in (select id from clients where trainer_id in (select id from auth_profile() where role = 'trainer'))
  );
