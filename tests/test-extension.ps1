$ApiUrl = "http://localhost:3001"
$ProjectId = "e033b3b2-f800-40cf-8a31-7e1c38b4d1ed" # Strater-AI-Browser-Extension-WXT

Write-Host "--- Test Extension Auto-Fix ---" -ForegroundColor Cyan

# 1. Get Log Token
$tokenUri = "$ApiUrl/api/v1/logs/$ProjectId/token"
try {
    $tokenRes = Invoke-RestMethod -Uri $tokenUri -Method Get
    $Token = $tokenRes.token
    Write-Host "Got Token: $Token" -ForegroundColor Green
} catch {
    Write-Host "Failed to get token: $_" -ForegroundColor Red
    exit
}

# 2. Send CI/CD Failure Log
# Triggering Auto-Fix for a Manifest Error
Write-Host "`nSending CI/CD Failure Log..." -ForegroundColor Yellow
$LogPayload = @{
    service = "build-pipeline"
    ddsource = "ci-cd"
    message = "Build Failed: 'background' property is missing in manifest.json. Required for MV3 service workers."
    timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$ApiUrl/api/v1/logs/$ProjectId" `
        -Method Post `
        -Headers @{ "Authorization" = "Bearer $Token"; "Content-Type" = "application/json" } `
        -Body $LogPayload
    
    Write-Host "Response:" -ForegroundColor Gray
    $res | Format-List
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`nEvent Sent! Check Dashboard for Project: Strater-AI-Browser-Extension-WXT" -ForegroundColor Magenta
