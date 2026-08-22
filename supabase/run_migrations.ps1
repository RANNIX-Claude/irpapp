# run_migrations.ps1 — Aplica todas las migraciones de /supabase/migrations/ en orden
# Uso:
#   .\supabase\run_migrations.ps1 -DbUrl "postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"
#
# La DbUrl se obtiene en Supabase → Settings → Database → Connection string (URI mode)

param(
  [Parameter(Mandatory)][string]$DbUrl
)

$ErrorActionPreference = "Stop"

$migrationsDir = Join-Path $PSScriptRoot "migrations"
$files = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name

if ($files.Count -eq 0) {
  Write-Host "No se encontraron archivos SQL en $migrationsDir" -ForegroundColor Yellow
  exit 0
}

Write-Host "Aplicando $($files.Count) migraciones..." -ForegroundColor Cyan
Write-Host ""

$ok = 0
$fail = 0

foreach ($f in $files) {
  Write-Host "  → $($f.Name)" -NoNewline
  try {
    $result = psql $DbUrl -f $f.FullName 2>&1
    if ($LASTEXITCODE -ne 0) { throw $result }
    Write-Host "  ✓" -ForegroundColor Green
    $ok++
  } catch {
    Write-Host "  ✗ ERROR" -ForegroundColor Red
    Write-Host "    $_" -ForegroundColor Red
    $fail++
  }
}

Write-Host ""
Write-Host "Resultado: $ok OK, $fail con error" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
