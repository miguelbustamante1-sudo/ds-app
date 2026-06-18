-- ============================================================
-- Sample data: Standalone Tasks (ds.tsk_standalone_tasks)
-- Statuses: PENDING | APPROVED | REJECTED
-- Priorities: LOW | MEDIUM | HIGH | CRITICAL
-- References: tms_id 500-509 (fictional TMs always seeded)
--             tsk_created_by = 1 (dev user always seeded)
-- Idempotency: guarded by (tsk_title, tsk_team_member_id)
-- ============================================================

DO $$
BEGIN

  -- ── PENDING ──────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Revisar documentación del sprint' AND tsk_team_member_id = 500) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by)
    VALUES ('Revisar documentación del sprint', 'Actualizar los docs del sprint actual antes del cierre.', 'PENDING', 'MEDIUM', NOW() + INTERVAL '3 days', 500, 'INTERNAL', 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Completar revisión de código' AND tsk_team_member_id = 501) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by)
    VALUES ('Completar revisión de código', 'Revisar PRs pendientes del módulo de notificaciones.', 'PENDING', 'HIGH', NOW() + INTERVAL '1 days', 501, 'INTERNAL', 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Actualizar perfil de usuario' AND tsk_team_member_id = 502) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by)
    VALUES ('Actualizar perfil de usuario', 'Verificar que todos los datos del perfil estén correctos en el sistema.', 'PENDING', 'LOW', NOW() + INTERVAL '7 days', 502, 'INTERNAL', 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Confirmar asignación de proyecto' AND tsk_team_member_id = 503) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by)
    VALUES ('Confirmar asignación de proyecto', 'Confirmar disponibilidad para el nuevo proyecto del cliente.', 'PENDING', 'CRITICAL', NOW() + INTERVAL '1 days', 503, 'INTERNAL', 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Enviar reporte semanal' AND tsk_team_member_id = 504) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by)
    VALUES ('Enviar reporte semanal', 'Preparar y enviar el reporte de actividades de la semana.', 'PENDING', 'MEDIUM', NOW() + INTERVAL '2 days', 504, 'INTERNAL', 1);
  END IF;

  -- ── APPROVED ─────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Capacitación de seguridad completada' AND tsk_team_member_id = 505) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by, tsk_updated_by, tsk_updated_date, tsk_resolved_by, tsk_resolved_date, tsk_resolution_comment)
    VALUES ('Capacitación de seguridad completada', 'Tomar el curso anual de seguridad de la información.', 'APPROVED', 'HIGH', NOW() - INTERVAL '2 days', 505, 'INTERNAL', 1, 1, NOW() - INTERVAL '1 days', 1, NOW() - INTERVAL '1 days', 'Capacitación aprobada exitosamente.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Validar accesos a sistemas' AND tsk_team_member_id = 506) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by, tsk_updated_by, tsk_updated_date, tsk_resolved_by, tsk_resolved_date, tsk_resolution_comment)
    VALUES ('Validar accesos a sistemas', 'Confirmar que todos los accesos del equipo están vigentes.', 'APPROVED', 'MEDIUM', NOW() - INTERVAL '5 days', 506, 'INTERNAL', 1, 1, NOW() - INTERVAL '3 days', 1, NOW() - INTERVAL '3 days', 'Accesos validados y actualizados.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Onboarding completado' AND tsk_team_member_id = 507) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by, tsk_updated_by, tsk_updated_date, tsk_resolved_by, tsk_resolved_date, tsk_resolution_comment)
    VALUES ('Onboarding completado', 'Finalizar proceso de incorporación al equipo.', 'APPROVED', 'LOW', NOW() - INTERVAL '10 days', 507, 'INTERNAL', 1, 1, NOW() - INTERVAL '8 days', 1, NOW() - INTERVAL '8 days', 'Proceso de onboarding completado con éxito.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Firma de contrato' AND tsk_team_member_id = 508) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by, tsk_updated_by, tsk_updated_date, tsk_resolved_by, tsk_resolved_date, tsk_resolution_comment)
    VALUES ('Firma de contrato', 'Firmar el contrato de asignación al proyecto Cloud Migration.', 'APPROVED', 'CRITICAL', NOW() - INTERVAL '4 days', 508, 'INTERNAL', 1, 1, NOW() - INTERVAL '3 days', 1, NOW() - INTERVAL '3 days', 'Contrato firmado y archivado.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Actualizar datos bancarios' AND tsk_team_member_id = 509) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by, tsk_updated_by, tsk_updated_date, tsk_resolved_by, tsk_resolved_date, tsk_resolution_comment)
    VALUES ('Actualizar datos bancarios', 'Verificar y actualizar la cuenta de depósito de nómina.', 'APPROVED', 'HIGH', NOW() - INTERVAL '7 days', 509, 'INTERNAL', 1, 1, NOW() - INTERVAL '6 days', 1, NOW() - INTERVAL '6 days', 'Datos actualizados en RRHH.');
  END IF;

  -- ── REJECTED ─────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Solicitar equipo adicional' AND tsk_team_member_id = 500) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by, tsk_updated_by, tsk_updated_date, tsk_resolved_by, tsk_resolved_date, tsk_resolution_comment)
    VALUES ('Solicitar equipo adicional', 'Solicitar un monitor adicional para trabajo en casa.', 'REJECTED', 'MEDIUM', NOW() - INTERVAL '5 days', 500, 'INTERNAL', 1, 1, NOW() - INTERVAL '3 days', 1, NOW() - INTERVAL '3 days', 'Solicitud fuera de presupuesto Q2.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Cambio de horario solicitado' AND tsk_team_member_id = 502) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by, tsk_updated_by, tsk_updated_date, tsk_resolved_by, tsk_resolved_date, tsk_resolution_comment)
    VALUES ('Cambio de horario solicitado', 'Solicitar cambio de turno para el mes de agosto.', 'REJECTED', 'HIGH', NOW() - INTERVAL '8 days', 502, 'INTERNAL', 1, 1, NOW() - INTERVAL '6 days', 1, NOW() - INTERVAL '6 days', 'No hay cobertura disponible para el turno solicitado.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Solicitud de bono extraordinario' AND tsk_team_member_id = 504) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by, tsk_updated_by, tsk_updated_date, tsk_resolved_by, tsk_resolved_date, tsk_resolution_comment)
    VALUES ('Solicitud de bono extraordinario', 'Solicitar bono por trabajo en días festivos.', 'REJECTED', 'LOW', NOW() - INTERVAL '12 days', 504, 'INTERNAL', 1, 1, NOW() - INTERVAL '10 days', 1, NOW() - INTERVAL '10 days', 'Pendiente de revisión para el siguiente ciclo de nómina.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Certificación técnica extemporánea' AND tsk_team_member_id = 506) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by, tsk_updated_by, tsk_updated_date, tsk_resolved_by, tsk_resolved_date, tsk_resolution_comment)
    VALUES ('Certificación técnica extemporánea', 'Solicitar reembolso de certificación tomada fuera del plan anual.', 'REJECTED', 'MEDIUM', NOW() - INTERVAL '15 days', 506, 'INTERNAL', 1, 1, NOW() - INTERVAL '12 days', 1, NOW() - INTERVAL '12 days', 'Reembolsos extemporáneos no están cubiertos por política.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tsk_standalone_tasks WHERE tsk_title = 'Vacaciones en temporada alta' AND tsk_team_member_id = 508) THEN
    INSERT INTO ds.tsk_standalone_tasks (tsk_title, tsk_description, tsk_status, tsk_priority, tsk_due_date, tsk_team_member_id, tsk_source, tsk_created_by, tsk_updated_by, tsk_updated_date, tsk_resolved_by, tsk_resolved_date, tsk_resolution_comment)
    VALUES ('Vacaciones en temporada alta', 'Solicitar 2 semanas de vacaciones en diciembre.', 'REJECTED', 'CRITICAL', NOW() - INTERVAL '20 days', 508, 'INTERNAL', 1, 1, NOW() - INTERVAL '17 days', 1, NOW() - INTERVAL '17 days', 'Periodo bloqueado por cierre de año fiscal del cliente.');
  END IF;

END $$;
