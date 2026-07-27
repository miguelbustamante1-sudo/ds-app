#!/usr/bin/env bash
# restore-local-db.sh
# Restaura la base de datos local desde cero.
# Ejecutar desde la raiz del repo: ./ds-app/scripts/restore-local-db.sh
# O desde la carpeta del script: ./restore-local-db.sh
# Puerto bash de restore-local-db.ps1 (mismo comportamiento, para Mac/Linux sin pwsh).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$ROOT/ds-app/.env.local"
SCRIPTS_DIR="$ROOT/ds-app/scripts"
LOCAL_DIR="$ROOT/_local-scripts"
COMPOSE_FILE="$ROOT/ds-app/docker-compose.local.yml"
CONTAINER="ds_app_local_db"
PSQL_CONN="psql -U postgres -d ds_app_local"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DARKYELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

log()        { echo -e "${NC}$1${NC}"; }
log_step()   { echo ""; echo -e "${YELLOW}$1${NC}"; }
log_ok()     { echo -e "${GREEN}$1${NC}"; }
log_info()   { echo -e "${CYAN}$1${NC}"; }
log_skip()   { echo -e "${DARKYELLOW}$1${NC}"; }
log_err()    { echo -e "${RED}$1${NC}"; }

# ---- Leer DEV_USERNAME desde .env.local ----
DEV_EMAIL="$(grep -E '^DEV_USERNAME=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '[:space:]')"
if [ -z "$DEV_EMAIL" ]; then
  echo "DEV_USERNAME no encontrado en .env.local" >&2
  exit 1
fi
log_info "DEV_USERNAME: $DEV_EMAIL"

run_sql_file() {
  local local_path="$1" remote_path="$2" optional="${3:-}"
  if [ "$optional" = "optional" ] && [ ! -f "$local_path" ]; then
    log_skip "  SKIP: $(basename "$local_path") no encontrado"
    return 0
  fi
  docker cp "$local_path" "$CONTAINER:$remote_path"
  docker exec "$CONTAINER" bash -c "$PSQL_CONN -v ON_ERROR_STOP=1 -f $remote_path"
}

run_sql_string() {
  local sql="$1"
  local tmp
  tmp="$(mktemp /tmp/restore_local_db.XXXXXX.sql)"
  printf '%s' "$sql" > "$tmp"
  run_sql_file "$tmp" "/tmp/_run.sql"
  rm -f "$tmp"
}

# Manifiesto de seeds — agregar una entrada por cada nuevo archivo de seed
# Formato: "Label|archivo.sql|/tmp/remoto.sql|optional-o-vacio"
SEED_MANIFEST=(
  "Asignaciones TM-Proyecto|INSERT TMs Project.sql|/tmp/insert_tms_project.sql|"
  "Time Off real|insert timeoff.sql|/tmp/insert_timeoff.sql|"
  "My Tasks (muestra)|seed-sample-tasks.sql|/tmp/seed-sample-tasks.sql|"
  "Time Off (muestra)|seed-sample-timeoff.sql|/tmp/seed-sample-timeoff.sql|"
  "Anuncios (muestra)|seed-sample-announcements.sql|/tmp/seed-sample-announcements.sql|"
  "Holiday Swaps (muestra)|seed-sample-holiday-swaps.sql|/tmp/seed-sample-holiday-swaps.sql|"
  "Compensatorio (muestra)|seed-sample-comp-time.sql|/tmp/seed-sample-comp-time.sql|"
  "Top Performers (muestra)|seed-sample-top-performers.sql|/tmp/seed-sample-top-performers.sql|"
  "Workflows (muestra)|seed-sample-workflows.sql|/tmp/seed-sample-workflows.sql|"
  "Bench (muestra)|seed-sample-bench.sql|/tmp/seed-sample-bench.sql|"
  "Endorsements/Bonos (muestra)|seed-sample-endorsements.sql|/tmp/seed-sample-endorsements.sql|"
  "Corp. Phones (muestra)|seed-sample-corporate-phones.sql|/tmp/seed-sample-corp-phones.sql|"
  "Reports (muestra)|seed-sample-reports.sql|/tmp/seed-sample-reports.sql|"
  "Misc (muestra)|seed-sample-misc.sql|/tmp/seed-sample-misc.sql|"
)

# ── Paso 1 ────────────────────────────────────────────────────────
log_step "=== Paso 1: Levantar contenedor ==="
docker compose -f "$COMPOSE_FILE" up -d postgres-local
echo "Esperando que postgres este healthy..."
tries=0
while true; do
  sleep 3
  state="$(docker inspect "$CONTAINER" --format '{{.State.Health.Status}}' 2>/dev/null || echo '')"
  tries=$((tries + 1))
  if [ "$state" = "healthy" ]; then break; fi
  if [ "$tries" -gt 20 ]; then
    log_err "Timeout: postgres no llego a estado healthy"
    exit 1
  fi
done
log_ok "postgres healthy"

# ── Paso 2 ────────────────────────────────────────────────────────
log_step "=== Paso 2: Empujar schema de Prisma ==="
docker compose -f "$COMPOSE_FILE" --profile setup run --rm --build db-setup
log_ok "Schema aplicado"

# ── Paso 3 ────────────────────────────────────────────────────────
log_step "=== Paso 3: Seed de datos de referencia ==="
docker cp "$SCRIPTS_DIR/seed.sql" "$CONTAINER:/tmp/seed.sql"
docker exec "$CONTAINER" bash -c "$PSQL_CONN -v ON_ERROR_STOP=1 -v dev_email='$DEV_EMAIL' -f /tmp/seed.sql"
log_ok "Seed completado"

# ── Paso 4 ───────────────────────────────────────────────────────
log_step "=== Paso 4: Team members reales ==="
TMS_FILE="$LOCAL_DIR/insert_tms_clean.sql"
if [ -f "$TMS_FILE" ]; then
  run_sql_string "SELECT setval(pg_get_serial_sequence('ds.tbl_team_members', 'tms_id'), 1, true);"
  run_sql_file "$TMS_FILE" "/tmp/insert_tms_clean.sql"
  log_ok "Team members insertados"
  run_sql_string "SELECT MIN(tms_id), MAX(tms_id), COUNT(*) FROM ds.tbl_team_members;"
else
  log_skip "SKIP: $TMS_FILE no encontrado"
fi

# ── Paso 4b: Proyectos ───────────────────────────────────────────
log_step "=== Paso 4b: Proyectos ==="
PROJECTS_CLEAN="$LOCAL_DIR/insert_projects_clean.sql"
if [ -f "$PROJECTS_CLEAN" ]; then
  log_info "  >> Proyectos reales (clean con pro_id)..."
  run_sql_file "$PROJECTS_CLEAN" "/tmp/insert_projects_clean.sql"
  run_sql_string "SELECT setval(pg_get_serial_sequence('ds.pro_projects', 'pro_id'), MAX(pro_id), true) FROM ds.pro_projects;"
  log_ok "     OK (pro_ids de produccion preservados)"
else
  log_skip "  >> Proyectos reales (autoincrement — sin pro_ids de produccion)..."
  run_sql_file "$SCRIPTS_DIR/INSERT projects.sql" "/tmp/insert_projects.sql"
  log_skip "     OK (pro_ids locales 1-N, asignaciones TM-Proyecto pueden quedar mal vinculadas)"
  log_skip "  NOTA: Para preservar pro_ids, crea _local-scripts/insert_projects_clean.sql"
  log_skip "        Ejecuta en produccion la query en _docs/dev-guides/local-db-recovery-guide.md"
fi

# ── Paso 5: Seeds del manifiesto ──────────────────────────────────
log_step "=== Paso 5: Seeds de datos (manifiesto) ==="
seed_labels=()
seed_statuses=()
for entry in "${SEED_MANIFEST[@]}"; do
  IFS='|' read -r label file remote optional <<< "$entry"
  file_path="$SCRIPTS_DIR/$file"
  log_info "  >> $label..."
  if [ ! -f "$file_path" ]; then
    if [ "$optional" = "optional" ]; then
      log_skip "     SKIP: $file no encontrado"
      seed_labels+=("$label"); seed_statuses+=("SKIP")
      continue
    fi
    log_err "Archivo requerido no encontrado: $file_path"
    exit 1
  fi
  run_sql_file "$file_path" "$remote"
  log_ok "     OK"
  seed_labels+=("$label"); seed_statuses+=("OK")
done

# ── Paso 6 ────────────────────────────────────────────────────────
log_step "=== Paso 6: Asignar supervisor ==="
run_sql_string "
INSERT INTO ds.tbl_tms_x_supervisor (tms_id, sup_id, txs_stadat, txs_credat, txs_created_by)
SELECT tms_id, 1, '2020-01-01', CURRENT_DATE, 1
FROM ds.tbl_team_members
WHERE tms_id != 1
ON CONFLICT DO NOTHING;"
log_ok "Supervisor asignado"

# ── Paso 7: Verificacion final ────────────────────────────────────
log_step "=== Paso 7: Verificacion de readiness ==="

run_sql_string "
SELECT
    modulo,
    tabla,
    conteo,
    CASE WHEN conteo = 0 AND critico THEN 'VACIO (CRITICO)' WHEN conteo = 0 THEN 'VACIO' ELSE 'OK' END AS estado
FROM (VALUES
    ('Referencia',           'ds.cou_countries',              (SELECT COUNT(*)::int FROM ds.cou_countries),             TRUE),
    ('Referencia',           'ds.tbl_to_statuses',            (SELECT COUNT(*)::int FROM ds.tbl_to_statuses),           TRUE),
    ('Referencia',           'ds.hol_holiday',                (SELECT COUNT(*)::int FROM ds.hol_holiday),               TRUE),
    ('Equipo',               'ds.tbl_team_members',           (SELECT COUNT(*)::int FROM ds.tbl_team_members),          TRUE),
    ('Equipo',               'ds.tbl_users',                  (SELECT COUNT(*)::int FROM ds.tbl_users),                 TRUE),
    ('Equipo',               'ds.tbl_tms_x_supervisor',       (SELECT COUNT(*)::int FROM ds.tbl_tms_x_supervisor),      TRUE),
    ('Proyectos',            'ds.pro_projects',               (SELECT COUNT(*)::int FROM ds.pro_projects),              TRUE),
    ('Proyectos',            'ds.tmp_team_member_project',    (SELECT COUNT(*)::int FROM ds.tmp_team_member_project),   TRUE),
    ('Time Off',             'ds.tbl_tms_time_off',           (SELECT COUNT(*)::int FROM ds.tbl_tms_time_off),          TRUE),
    ('Time Off',             'ds.hsw_holiday_swap',           (SELECT COUNT(*)::int FROM ds.hsw_holiday_swap),          FALSE),
    ('Time Off',             'ds.ct_compensatory_time',       (SELECT COUNT(*)::int FROM ds.ct_compensatory_time),      FALSE),
    ('Tareas',               'ds.tsk_standalone_tasks',       (SELECT COUNT(*)::int FROM ds.tsk_standalone_tasks),      FALSE),
    ('Comunicaciones',       'com.ntf_notifications',         (SELECT COUNT(*)::int FROM com.ntf_notifications),        FALSE),
    ('Top Performers',       'ds.cyc_cycles',                 (SELECT COUNT(*)::int FROM ds.cyc_cycles),                FALSE),
    ('Workflows',            'ds.wfl_workflow_templates',     (SELECT COUNT(*)::int FROM ds.wfl_workflow_templates),    FALSE),
    ('Bench / Hiring',       'ds.ben_bench',                  (SELECT COUNT(*)::int FROM ds.ben_bench),                 FALSE),
    ('Bench / Hiring',       'ds.hir_hiring',                 (SELECT COUNT(*)::int FROM ds.hir_hiring),                FALSE),
    ('Endorsements',         'ds.end_endorsements',           (SELECT COUNT(*)::int FROM ds.end_endorsements),          FALSE),
    ('Seguridad',            'sec.rol_roles',                 (SELECT COUNT(*)::int FROM sec.rol_roles),                TRUE)
) AS t(modulo, tabla, conteo, critico)
ORDER BY modulo, tabla;"

# Abortar si alguna tabla critica esta vacia
run_sql_string "
DO \$\$
DECLARE v int;
BEGIN
  SELECT COUNT(*) INTO v FROM ds.tbl_team_members;
  IF v = 0 THEN RAISE EXCEPTION 'CRITICO: ds.tbl_team_members esta vacia'; END IF;
  SELECT COUNT(*) INTO v FROM ds.pro_projects;
  IF v = 0 THEN RAISE EXCEPTION 'CRITICO: ds.pro_projects esta vacia'; END IF;
  SELECT COUNT(*) INTO v FROM ds.tbl_tms_time_off;
  IF v = 0 THEN RAISE EXCEPTION 'CRITICO: ds.tbl_tms_time_off esta vacia'; END IF;
  SELECT COUNT(*) INTO v FROM ds.cou_countries;
  IF v = 0 THEN RAISE EXCEPTION 'CRITICO: ds.cou_countries esta vacia'; END IF;
END \$\$;"
log_ok "Tablas criticas verificadas OK"

# Resumen de seeds
echo ""
log_info "--- Resumen de seeds ---"
for i in "${!seed_labels[@]}"; do
  status="${seed_statuses[$i]}"
  if [ "$status" = "OK" ]; then
    log_ok "  [$status] ${seed_labels[$i]}"
  else
    log_skip "  [$status] ${seed_labels[$i]}"
  fi
done

# ── Paso 8 ────────────────────────────────────────────────────────
log_step "=== Paso 8: Construir y levantar la app ==="
docker compose -f "$COMPOSE_FILE" up -d --build app
log_ok "LISTO - App disponible en http://localhost:3000"
