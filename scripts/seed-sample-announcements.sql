-- ============================================================
-- Sample data: Announcements + Notification Center
--
-- Table: com.ntf_notifications + com.rec_recipients
--
-- Announcements (ntf_id 1-5):
--   item-1, cat_id=6 (Inbox), ntf_created_by = dev user email
--   rec_action_type = 'required' (broadcast)
--
-- Notification Center (ntf_id 6-30):
--   5 items per category (1-5), various item types
--   rec_action_type = 'readonly', recipient = usr_id=1
--
-- Idempotency:
--   ntf_notifications -> ON CONFLICT (ntf_id) DO NOTHING
--   rec_recipients    -> ON CONFLICT (ntf_id, usr_id) DO NOTHING
-- ============================================================

-- ── ANNOUNCEMENTS (item-1) ────────────────────────────────

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
SELECT 1, 6, 'item-1',
  '{"userName":"Dev User","title":"Bienvenida al equipo","text":"Nos alegra tenerte en el equipo DS App. Revisa el portal de beneficios y configuraciones iniciales."}'::json,
  '2026-01-15 09:00:00+00', usr_email
FROM ds.tbl_users WHERE usr_id = 1
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
SELECT 2, 6, 'item-1',
  '{"userName":"Dev User","title":"Actualización de política de tiempo libre","text":"A partir del 1 de julio de 2026, todas las solicitudes de vacaciones deben enviarse con al menos 15 días de anticipación."}'::json,
  '2026-04-01 10:00:00+00', usr_email
FROM ds.tbl_users WHERE usr_id = 1
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
SELECT 3, 6, 'item-1',
  '{"userName":"Dev User","title":"Mantenimiento del sistema","text":"El domingo 20 de julio de 2026 habrá mantenimiento programado de 10 PM a 2 AM. El sistema no estará disponible durante ese período."}'::json,
  '2026-07-10 14:00:00+00', usr_email
FROM ds.tbl_users WHERE usr_id = 1
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
SELECT 4, 6, 'item-1',
  '{"userName":"Dev User","title":"Cierre de nómina Q2 2026","text":"Recordatorio: el cierre de nómina del segundo trimestre se realizará el viernes 3 de julio. Asegúrate de tener todas las horas registradas."}'::json,
  '2026-06-28 08:00:00+00', usr_email
FROM ds.tbl_users WHERE usr_id = 1
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
SELECT 5, 6, 'item-1',
  '{"userName":"Dev User","title":"Nuevo proceso de aprobación de compensatorio","text":"A partir de hoy las solicitudes de tiempo compensatorio deberán incluir el número de proyecto. Revisa el manual actualizado en el portal."}'::json,
  '2026-05-15 11:00:00+00', usr_email
FROM ds.tbl_users WHERE usr_id = 1
ON CONFLICT (ntf_id) DO NOTHING;

-- Recipients for announcements (required action)
INSERT INTO com.rec_recipients (ntf_id, usr_id, rec_action_type, rec_is_read, rec_is_archived)
VALUES (1, 1, 'required', false, false) ON CONFLICT (ntf_id, usr_id) DO NOTHING;
INSERT INTO com.rec_recipients (ntf_id, usr_id, rec_action_type, rec_is_read, rec_is_archived)
VALUES (2, 1, 'required', true,  false) ON CONFLICT (ntf_id, usr_id) DO NOTHING;
INSERT INTO com.rec_recipients (ntf_id, usr_id, rec_action_type, rec_is_read, rec_is_archived)
VALUES (3, 1, 'required', false, false) ON CONFLICT (ntf_id, usr_id) DO NOTHING;
INSERT INTO com.rec_recipients (ntf_id, usr_id, rec_action_type, rec_is_read, rec_is_archived)
VALUES (4, 1, 'required', true,  false) ON CONFLICT (ntf_id, usr_id) DO NOTHING;
INSERT INTO com.rec_recipients (ntf_id, usr_id, rec_action_type, rec_is_read, rec_is_archived)
VALUES (5, 1, 'required', false, false) ON CONFLICT (ntf_id, usr_id) DO NOTHING;

-- ── NOTIFICATION CENTER ───────────────────────────────────
-- cat_id=1 Tiempo Libre (ntf_id 6-10) — item-3 readonly (status updates to TM)

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (6, 1, 'item-3',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=3b82f6&color=fff","badgeColor":"online","description":"aprobó tu solicitud de vacaciones","link":"/time-off","day":"23 Jun – 27 Jun","info":"5 días aprobados"}'::json,
  '2026-06-12 08:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (7, 1, 'item-3',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=3b82f6&color=fff","badgeColor":"away","description":"recibió tu solicitud de tiempo libre y la tiene en revisión","link":"/time-off","day":"14 – 18 Jul","info":"Pendiente de aprobación"}'::json,
  '2026-07-02 09:15:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (8, 1, 'item-3',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=3b82f6&color=fff","badgeColor":"busy","description":"rechazó tu solicitud de vacaciones","link":"/time-off","day":"21 – 31 Dic","info":"Periodo bloqueado por cierre fiscal"}'::json,
  '2026-11-20 10:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (9, 1, 'item-3',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=3b82f6&color=fff","badgeColor":"online","description":"registró tus vacaciones como tomadas","link":"/time-off","day":"23 – 27 Mar","info":"5 días tomados"}'::json,
  '2026-03-28 08:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (10, 1, 'item-3',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=3b82f6&color=fff","badgeColor":"offline","description":"canceló tu solicitud de LOA","link":"/time-off","day":"27 – 30 Abr","info":"Cancelada por el solicitante"}'::json,
  '2026-04-25 14:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

-- cat_id=2 Endosos (ntf_id 11-15)
INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (11, 2, 'item-11',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=16a34a&color=fff","badgeColor":"green","description":"Recibiste un endoso de Excelencia Técnica de tu supervisor.","info":"Endoso registrado en tu perfil"}'::json,
  '2026-05-10 11:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (12, 2, 'item-11',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=16a34a&color=fff","badgeColor":"green","description":"Recibiste un endoso de Trabajo en Equipo por el proyecto Cloud Migration.","info":"Visible en tu perfil"}'::json,
  '2026-04-22 10:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (13, 2, 'item-11',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=16a34a&color=fff","badgeColor":"blue","description":"Tu endoso de Innovación fue aprobado y enviado al cliente.","info":"2 endosos este trimestre"}'::json,
  '2026-03-15 09:30:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (14, 2, 'item-11',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=16a34a&color=fff","badgeColor":"purple","description":"Tienes un nuevo endoso pendiente de respuesta de tu parte.","info":"Responder antes del viernes"}'::json,
  '2026-06-18 08:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (15, 2, 'item-11',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=16a34a&color=fff","badgeColor":"gray","description":"El período de endosos Q1 2026 se cerró. Revisa tu historial.","info":"3 endosos recibidos en Q1"}'::json,
  '2026-04-01 17:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

-- cat_id=3 Contratación (ntf_id 16-20)
INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (16, 3, 'item-11',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=7c3aed&color=fff","badgeColor":"purple","description":"Se publicó una nueva posición de Senior Developer en tu equipo.","info":"Cierre de postulaciones: 30 Jun"}'::json,
  '2026-06-15 09:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (17, 3, 'item-11',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=7c3aed&color=fff","badgeColor":"blue","description":"El proceso de selección para QA Lead ha avanzado a entrevistas.","info":"3 candidatos en proceso"}'::json,
  '2026-05-28 10:30:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (18, 3, 'item-11',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=7c3aed&color=fff","badgeColor":"green","description":"Nuevo integrante incorporado: Ana García como Frontend Developer.","info":"Inicio: 1 julio 2026"}'::json,
  '2026-06-25 08:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (19, 3, 'item-11',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=7c3aed&color=fff","badgeColor":"yellow","description":"Recuerda completar el formulario de referidos para la posición de DevOps.","info":"Bono de referido: $500"}'::json,
  '2026-04-10 11:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (20, 3, 'item-11',
  '{"userName":"Sistema DS App","avatar":"https://ui-avatars.com/api/?name=DS+App&background=7c3aed&color=fff","badgeColor":"red","description":"La posición de Scrum Master fue cerrada sin candidato seleccionado.","info":"Se reabrirá en Q3"}'::json,
  '2026-05-05 15:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

-- cat_id=4 Sistema (ntf_id 21-25)
INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (21, 4, 'item-14',
  '{"message":"Actualización del sistema completada. Nueva versión: 2.4.1. Revisa las notas de la versión en el portal."}'::json,
  '2026-06-01 06:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (22, 4, 'item-14',
  '{"message":"Mantenimiento programado el domingo 20 Jul de 10 PM a 2 AM. El sistema no estará disponible."}'::json,
  '2026-07-10 14:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (23, 4, 'item-14',
  '{"message":"Tu contraseña expirará en 7 días. Actualízala desde el portal de seguridad."}'::json,
  '2026-06-20 09:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (24, 4, 'item-14',
  '{"message":"Nuevo módulo disponible: Compensatorio. Puedes gestionar tus solicitudes desde el menú principal."}'::json,
  '2026-05-20 10:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (25, 4, 'item-14',
  '{"message":"Respaldo de base de datos completado exitosamente el 15 Jun 2026 a las 3 AM."}'::json,
  '2026-06-15 03:30:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

-- cat_id=5 Intercambio de Días (ntf_id 26-30) — holiday-swap type
INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (26, 5, 'holiday-swap',
  '{"userName":"Sistema DS App","description":"Tu intercambio de día festivo fue aprobado. Día libre: 2 May.","holidayName":"Día del Trabajo","originalDate":"01/05/2026","replacementDate":"02/05/2026"}'::json,
  '2026-04-28 10:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (27, 5, 'holiday-swap',
  '{"userName":"Sistema DS App","description":"Tu solicitud de intercambio está pendiente de revisión por tu supervisor.","holidayName":"Día de la Independencia","originalDate":"15/09/2026","replacementDate":"18/09/2026"}'::json,
  '2026-09-10 09:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (28, 5, 'holiday-swap',
  '{"userName":"Sistema DS App","description":"Tu solicitud de intercambio fue rechazada. La fecha de reemplazo no está disponible.","holidayName":"Navidad","originalDate":"25/12/2026","replacementDate":"28/12/2026"}'::json,
  '2026-12-05 11:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (29, 5, 'holiday-swap',
  '{"userName":"Sistema DS App","description":"Tu intercambio de día festivo fue completado. Día libre tomado el 5 Ene.","holidayName":"Año Nuevo","originalDate":"01/01/2026","replacementDate":"05/01/2026"}'::json,
  '2026-01-06 08:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

INSERT INTO com.ntf_notifications (ntf_id, cat_id, ntf_item_type, ntf_payload, ntf_created_at, ntf_created_by)
VALUES (30, 5, 'holiday-swap',
  '{"userName":"Sistema DS App","description":"Recordatorio: tienes un intercambio de día festivo programado. Trabajas el 29 Jun y descansas el 30 Jun.","holidayName":"Día del Banco","originalDate":"30/06/2026","replacementDate":"29/06/2026"}'::json,
  '2026-06-25 08:00:00+00', 'system')
ON CONFLICT (ntf_id) DO NOTHING;

-- Recipients for notification center (readonly, unread)
INSERT INTO com.rec_recipients (ntf_id, usr_id, rec_action_type, rec_is_read, rec_is_archived)
VALUES  (6,  1, 'readonly', true,  false),
        (7,  1, 'readonly', false, false),
        (8,  1, 'readonly', false, false),
        (9,  1, 'readonly', true,  false),
        (10, 1, 'readonly', true,  false),
        (11, 1, 'readonly', true,  false),
        (12, 1, 'readonly', false, false),
        (13, 1, 'readonly', true,  false),
        (14, 1, 'readonly', false, false),
        (15, 1, 'readonly', true,  false),
        (16, 1, 'readonly', false, false),
        (17, 1, 'readonly', true,  false),
        (18, 1, 'readonly', false, false),
        (19, 1, 'readonly', false, false),
        (20, 1, 'readonly', true,  false),
        (21, 1, 'readonly', true,  false),
        (22, 1, 'readonly', false, false),
        (23, 1, 'readonly', false, false),
        (24, 1, 'readonly', true,  false),
        (25, 1, 'readonly', true,  false),
        (26, 1, 'readonly', true,  false),
        (27, 1, 'readonly', false, false),
        (28, 1, 'readonly', false, false),
        (29, 1, 'readonly', true,  false),
        (30, 1, 'readonly', false, false)
ON CONFLICT (ntf_id, usr_id) DO NOTHING;

-- Reset sequence
SELECT setval(pg_get_serial_sequence('com.ntf_notifications', 'ntf_id'), GREATEST(MAX(ntf_id), 30), true) FROM com.ntf_notifications;
SELECT setval(pg_get_serial_sequence('com.rec_recipients', 'rec_id'), GREATEST(MAX(rec_id), 1), true) FROM com.rec_recipients;
