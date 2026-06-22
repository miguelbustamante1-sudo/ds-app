# restore-local-db.ps1
# Restaura la base de datos local desde cero.
# Ejecutar desde la raiz del repo: .\ds-app\scripts\restore-local-db.ps1
# O desde la carpeta del script: .\restore-local-db.ps1

$ErrorActionPreference = 'Stop'
$Root        = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$EnvFile     = Join-Path $Root 'ds-app\.env.local'
$ScriptsDir  = Join-Path $Root 'ds-app\scripts'
$LocalDir    = Join-Path $Root '_local-scripts'
$ComposeFile = Join-Path $Root 'ds-app\docker-compose.local.yml'
$Container   = 'ds_app_local_db'
$PsqlConn    = 'psql -U postgres -d ds_app_local'

# Leer DEV_USERNAME desde .env.local
$DevEmail = ''
foreach ($line in (Get-Content $EnvFile)) {
    if ($line -match '^DEV_USERNAME=(.+)$') { $DevEmail = $Matches[1]; break }
}
if (-not $DevEmail) { throw 'DEV_USERNAME no encontrado en .env.local' }
Write-Host ('DEV_USERNAME: ' + $DevEmail) -ForegroundColor Cyan

function Run-SqlFile {
    param($LocalPath, $RemotePath, [switch]$Optional)
    if ($Optional -and -not (Test-Path $LocalPath)) {
        Write-Host ("  SKIP: $(Split-Path $LocalPath -Leaf) no encontrado") -ForegroundColor DarkYellow
        return
    }
    docker cp $LocalPath ($Container + ':' + $RemotePath)
    if ($LASTEXITCODE -ne 0) { throw "docker cp fallo para $LocalPath" }
    docker exec $Container bash -c ($PsqlConn + ' -v ON_ERROR_STOP=1 -f ' + $RemotePath)
    if ($LASTEXITCODE -ne 0) { throw "psql fallo ejecutando $RemotePath (exit $LASTEXITCODE)" }
}

function Run-SqlString {
    param([string]$Sql)
    $tmp = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.sql'
    [System.IO.File]::WriteAllText($tmp, $Sql, [System.Text.Encoding]::UTF8)
    try { Run-SqlFile $tmp '/tmp/_run.sql' }
    finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
}

# Manifiesto de seeds — agregar una entrada por cada nuevo archivo de seed
# Formato: @{ Label = '...'; File = 'nombre.sql'; Remote = '/tmp/nombre.sql'; Optional = $false }
# Optional=$true: el archivo se salta sin error si no existe (util para archivos gitignoreados)
$SeedManifest = @(
    @{ Label = 'Asignaciones TM-Proyecto';    File = 'INSERT TMs Project.sql';            Remote = '/tmp/insert_tms_project.sql';        Optional = $false },
    @{ Label = 'Time Off real';               File = 'insert timeoff.sql';                Remote = '/tmp/insert_timeoff.sql';            Optional = $false },
    @{ Label = 'My Tasks (muestra)';          File = 'seed-sample-tasks.sql';             Remote = '/tmp/seed-sample-tasks.sql';         Optional = $false },
    @{ Label = 'Time Off (muestra)';          File = 'seed-sample-timeoff.sql';           Remote = '/tmp/seed-sample-timeoff.sql';       Optional = $false },
    @{ Label = 'Anuncios (muestra)';          File = 'seed-sample-announcements.sql';     Remote = '/tmp/seed-sample-announcements.sql'; Optional = $false },
    @{ Label = 'Holiday Swaps (muestra)';     File = 'seed-sample-holiday-swaps.sql';     Remote = '/tmp/seed-sample-holiday-swaps.sql'; Optional = $false },
    @{ Label = 'Compensatorio (muestra)';     File = 'seed-sample-comp-time.sql';         Remote = '/tmp/seed-sample-comp-time.sql';     Optional = $false },
    @{ Label = 'Top Performers (muestra)';     File = 'seed-sample-top-performers.sql';    Remote = '/tmp/seed-sample-top-performers.sql'; Optional = $false },
    @{ Label = 'Workflows (muestra)';          File = 'seed-sample-workflows.sql';         Remote = '/tmp/seed-sample-workflows.sql';     Optional = $false },
    @{ Label = 'Bench (muestra)';              File = 'seed-sample-bench.sql';             Remote = '/tmp/seed-sample-bench.sql';         Optional = $false },
    @{ Label = 'Endorsements/Bonos (muestra)'; File = 'seed-sample-endorsements.sql';      Remote = '/tmp/seed-sample-endorsements.sql';  Optional = $false },
    @{ Label = 'Corp. Phones (muestra)';       File = 'seed-sample-corporate-phones.sql';  Remote = '/tmp/seed-sample-corp-phones.sql';   Optional = $false },
    @{ Label = 'Reports (muestra)';            File = 'seed-sample-reports.sql';           Remote = '/tmp/seed-sample-reports.sql';       Optional = $false },
    @{ Label = 'Misc (muestra)';               File = 'seed-sample-misc.sql';              Remote = '/tmp/seed-sample-misc.sql';          Optional = $false }
)

# ── Paso 1 ────────────────────────────────────────────────────────
Write-Host ''
Write-Host '=== Paso 1: Levantar contenedor ===' -ForegroundColor Yellow
docker compose -f $ComposeFile up -d postgres-local
Write-Host 'Esperando que postgres este healthy...'
$tries = 0
do {
    Start-Sleep -Seconds 3
    $state = (docker inspect $Container | ConvertFrom-Json)[0].State.Health.Status
    if (++$tries -gt 20) { throw 'Timeout: postgres no llego a estado healthy' }
} while ($state -ne 'healthy')
Write-Host 'postgres healthy' -ForegroundColor Green

# ── Paso 2 ────────────────────────────────────────────────────────
Write-Host ''
Write-Host '=== Paso 2: Empujar schema de Prisma ===' -ForegroundColor Yellow
docker compose -f $ComposeFile --profile setup run --rm --build db-setup
if ($LASTEXITCODE -ne 0) { throw 'prisma db push fallo' }
Write-Host 'Schema aplicado' -ForegroundColor Green

# ── Paso 3 ────────────────────────────────────────────────────────
Write-Host ''
Write-Host '=== Paso 3: Seed de datos de referencia ===' -ForegroundColor Yellow
$seedLocal = Join-Path $ScriptsDir 'seed.sql'
$q = [char]39
docker cp $seedLocal ($Container + ':/tmp/seed.sql')
if ($LASTEXITCODE -ne 0) { throw 'docker cp fallo para seed.sql' }
docker exec $Container bash -c ($PsqlConn + ' -v ON_ERROR_STOP=1 -v dev_email=' + $q + $DevEmail + $q + ' -f /tmp/seed.sql')
if ($LASTEXITCODE -ne 0) { throw 'psql fallo ejecutando seed.sql' }
Write-Host 'Seed completado' -ForegroundColor Green

# ── Paso 4 ────────────────────────────────────────────────────────
Write-Host ''
Write-Host '=== Paso 4: Team members reales ===' -ForegroundColor Yellow
$tmsFile = Join-Path $LocalDir 'insert_tms_clean.sql'
if (Test-Path $tmsFile) {
    Run-SqlString 'SELECT setval(pg_get_serial_sequence(''ds.tbl_team_members'', ''tms_id''), 1, true);'
    Run-SqlFile $tmsFile '/tmp/insert_tms_clean.sql'
    Write-Host 'Team members insertados' -ForegroundColor Green
    Run-SqlString 'SELECT MIN(tms_id), MAX(tms_id), COUNT(*) FROM ds.tbl_team_members;'
} else {
    Write-Host ('SKIP: ' + $tmsFile + ' no encontrado') -ForegroundColor DarkYellow
}

# ── Paso 4b: Proyectos ───────────────────────────────────────────
Write-Host ''
Write-Host '=== Paso 4b: Proyectos ===' -ForegroundColor Yellow
$ProjectsClean = Join-Path $LocalDir 'insert_projects_clean.sql'
if (Test-Path $ProjectsClean) {
    Write-Host '  >> Proyectos reales (clean con pro_id)...' -ForegroundColor Cyan
    Run-SqlFile $ProjectsClean '/tmp/insert_projects_clean.sql'
    Run-SqlString 'SELECT setval(pg_get_serial_sequence(''ds.pro_projects'', ''pro_id''), MAX(pro_id), true) FROM ds.pro_projects;'
    Write-Host '     OK (pro_ids de produccion preservados)' -ForegroundColor Green
} else {
    Write-Host '  >> Proyectos reales (autoincrement — sin pro_ids de produccion)...' -ForegroundColor DarkYellow
    Run-SqlFile (Join-Path $ScriptsDir 'INSERT projects.sql') '/tmp/insert_projects.sql'
    Write-Host '     OK (pro_ids locales 1-N, asignaciones TM-Proyecto seran skipeadas)' -ForegroundColor DarkYellow
    Write-Host '  NOTA: Para preservar pro_ids, crea _local-scripts/insert_projects_clean.sql' -ForegroundColor DarkYellow
    Write-Host '        Ejecuta en produccion la query en _docs/dev-guides/local-db-recovery-guide.md' -ForegroundColor DarkYellow
}

# ── Paso 5: Seeds del manifiesto ──────────────────────────────────
Write-Host ''
Write-Host '=== Paso 5: Seeds de datos (manifiesto) ===' -ForegroundColor Yellow
$seedResults = @()
foreach ($entry in $SeedManifest) {
    $filePath = Join-Path $ScriptsDir $entry.File
    Write-Host ("  >> $($entry.Label)...") -ForegroundColor Cyan
    $exists = Test-Path $filePath
    if (-not $exists -and $entry.Optional) {
        Write-Host ("     SKIP: $($entry.File) no encontrado") -ForegroundColor DarkYellow
        $seedResults += @{ Label = $entry.Label; Status = 'SKIP' }
        continue
    }
    if (-not $exists -and -not $entry.Optional) {
        throw "Archivo requerido no encontrado: $filePath"
    }
    Run-SqlFile $filePath $entry.Remote
    Write-Host ("     OK") -ForegroundColor Green
    $seedResults += @{ Label = $entry.Label; Status = 'OK' }
}

# ── Paso 6 ────────────────────────────────────────────────────────
Write-Host ''
Write-Host '=== Paso 6: Asignar supervisor ===' -ForegroundColor Yellow
$sql6 = @'
INSERT INTO ds.tbl_tms_x_supervisor (tms_id, sup_id, txs_stadat, txs_credat, txs_created_by)
SELECT tms_id, 1, '2020-01-01', CURRENT_DATE, 1
FROM ds.tbl_team_members
WHERE tms_id != 1
ON CONFLICT DO NOTHING;
'@
Run-SqlString $sql6
Write-Host 'Supervisor asignado' -ForegroundColor Green

# ── Paso 7: Verificacion final ────────────────────────────────────
Write-Host ''
Write-Host '=== Paso 7: Verificacion de readiness ===' -ForegroundColor Yellow

$sqlVerify = @'
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
ORDER BY modulo, tabla;
'@
Run-SqlString $sqlVerify

# Abortar si alguna tabla critica esta vacia
$critCheck = @'
DO $$
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
END $$;
'@
Run-SqlString $critCheck
Write-Host 'Tablas criticas verificadas OK' -ForegroundColor Green

# Resumen de seeds
Write-Host ''
Write-Host '--- Resumen de seeds ---' -ForegroundColor Cyan
foreach ($r in $seedResults) {
    $color = if ($r.Status -eq 'OK') { 'Green' } elseif ($r.Status -eq 'SKIP') { 'DarkYellow' } else { 'Red' }
    Write-Host ("  [$($r.Status)] $($r.Label)") -ForegroundColor $color
}

# ── Paso 8 ────────────────────────────────────────────────────────
Write-Host ''
Write-Host '=== Paso 8: Construir y levantar la app ===' -ForegroundColor Yellow
docker compose -f $ComposeFile up -d --build app
if ($LASTEXITCODE -ne 0) { throw 'docker compose up fallo para la app' }
Write-Host 'LISTO - App disponible en http://localhost:3000' -ForegroundColor Green
