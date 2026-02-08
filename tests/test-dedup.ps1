$ApiUrl = "http://localhost:3001"

Write-Host "--- Test Deduplication ---" -ForegroundColor Cyan

# 0. Create Project
Write-Host "Creating Test Project..." -ForegroundColor Yellow
$ProjBody = @{
    name = "Dedup Test Project"
    githubRepo = "test/dedup-repo"
} | ConvertTo-Json

try {
    $projRes = Invoke-RestMethod -Uri "$ApiUrl/api/projects" -Method Post -Body $ProjBody -Headers @{"Content-Type"="application/json"}
    $ProjectId = $projRes.project.id
    Write-Host "Created Project ID: $ProjectId" -ForegroundColor Green
} catch {
    Write-Host "Failed to create project: $_" -ForegroundColor Red
    exit
}

# 1. Get Token
$tokenUri = "$ApiUrl/api/v1/logs/$ProjectId/token"
try {
    $tokenRes = Invoke-RestMethod -Uri $tokenUri -Method Get
    $Token = $tokenRes.token
    Write-Host "Got Token: $Token" -ForegroundColor Green
} catch {
    Write-Host "Failed to get token: $_" -ForegroundColor Red
    exit
}

# 2. Define Log Payload
$LogPayload = @{
    logs = @(
        @{
            message = "CRITICAL: Database connection pool exhausted at 10:00 AM"
            service = "payment-service"
            level = "error"
        }
    )
} | ConvertTo-Json -Depth 3

# 3. First Request (Should Create Incident)
Write-Host "`nSending First Log Batch..." -ForegroundColor Yellow
try {
    $res1 = Invoke-RestMethod -Uri "$ApiUrl/api/v1/logs/$ProjectId" `
        -Method Post `
        -Headers @{ "Authorization" = "Bearer $Token"; "Content-Type" = "application/json" } `
        -Body $LogPayload
    
    Write-Host "Response 1:" -ForegroundColor Gray
    $res1 | Format-List
} catch {
    Write-Host "Error 1: $_" -ForegroundColor Red
}

# 4. Wait (Debounce Check - assume immediate for now as logic creates logic)
Start-Sleep -Seconds 2

# 5. Second Request (Should Update Count)
Write-Host "`nSending Second Log Batch (Duplicate)..." -ForegroundColor Yellow
try {
    $res2 = Invoke-RestMethod -Uri "$ApiUrl/api/v1/logs/$ProjectId" `
        -Method Post `
        -Headers @{ "Authorization" = "Bearer $Token"; "Content-Type" = "application/json" } `
        -Body $LogPayload
    
    Write-Host "Response 2:" -ForegroundColor Gray
    $res2 | Format-List
} catch {
    Write-Host "Error 2: $_" -ForegroundColor Red
}
