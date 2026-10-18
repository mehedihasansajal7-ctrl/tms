# Daily PostgreSQL backup for the TMS (run by a scheduled task / startup loop).
# Dumps the `tms` database from the Docker container, gzips it inside the
# container, copies it out, and keeps the last N days.
$ErrorActionPreference = "SilentlyContinue"

$docker = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
$dir = "D:\tms-backups"
$keep = 14

New-Item -ItemType Directory -Force -Path $dir | Out-Null

$date = Get-Date -Format "yyyy-MM-dd"
$file = Join-Path $dir "tms-$date.sql.gz"

# Ensure the container is running.
$running = & $docker ps --format "{{.Names}}" 2>$null
if ($running -notcontains "tms-postgres") {
    & $docker start tms-postgres 2>$null | Out-Null
    Start-Sleep -Seconds 5
}

& $docker exec tms-postgres sh -c "pg_dump -U postgres tms | gzip > /tmp/tms-backup.sql.gz" 2>$null
if ($LASTEXITCODE -eq 0) {
    & $docker cp "tms-postgres:/tmp/tms-backup.sql.gz" $file 2>$null
    & $docker exec tms-postgres rm -f /tmp/tms-backup.sql.gz 2>$null
}

# Keep the newest $keep files.
Get-ChildItem $dir -Filter "tms-*.sql.gz" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $keep |
    Remove-Item -Force
