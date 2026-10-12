# Start the TMS stack on Windows logon:
#   1. launch Docker Desktop if not running
#   2. wait for the Docker engine
#   3. start PostgreSQL (db service)
#   4. start the Next.js app

$ErrorActionPreference = "SilentlyContinue"
$tms = "C:\Users\user\Downloads\Open code project\tms"
$dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
$docker = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"

# 1. Docker Desktop
if (-not (Get-Process "Docker Desktop" -ErrorAction SilentlyContinue)) {
    Start-Process $dockerDesktop
}

# 2. Wait for engine (up to 3 minutes)
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    & $docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ready) { exit 1 }

# 3. Postgres
Set-Location $tms
& $docker compose up -d db 2>&1 | Out-Null

# 4. App server
Start-Process -FilePath "cmd.exe" -ArgumentList '/c', "cd /d `"$tms`" && npm run start" -WindowStyle Minimized
