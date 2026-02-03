
Write-Host "--- DevOps Guardian Cleanup & Start ---" -ForegroundColor Cyan

# Function to kill process by port
function Kill-Port {
    param([int]$port)
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($process) {
        $pidVal = $process.OwningProcess
        Write-Host "Killing process on port $port (PID: $pidVal)..." -ForegroundColor Yellow
        Stop-Process -Id $pidVal -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "Port $port is free." -ForegroundColor Green
    }
}

# 1. Kill Zombies
Kill-Port 3000
Kill-Port 3001
Kill-Port 3002

# 2. Wait a moment
Start-Sleep -Seconds 2

# 3. Start API (Background)
Write-Host "Starting API on Port 3001..." -ForegroundColor Magenta
Start-Process -FilePath "npm" -ArgumentList "run dev --workspace=apps/api" -NoNewWindow
# Note: In a real standardized dev env, you might want separate windows or a tool like 'concurrently'
# But for now, we just want to ensure ports are free.

# 4. Start Web (Foreground or separate window)
Write-Host "Starting Web on Port 3002..." -ForegroundColor Magenta
# We launch web in a new window so logs don't mix, or just tell user to run it.
Write-Host "You can now run 'npm run dev --workspace=apps/web' in a separate terminal safely." -ForegroundColor Green
