$ApiUrl = "http://localhost:3001"
$ProjectId = "4be2f05c-4124-46d6-9f36-29e72b84c1e9" # Existing Project "ARYANjoshi09"

Write-Host "--- Test End-to-End Auto-Fix ---" -ForegroundColor Cyan

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
# We explicitly set 'environment': 'ci-cd' to trigger the Auto-Fix workflow (skipping Slack approval)
Write-Host "`nSending CI/CD Failure Log..." -ForegroundColor Yellow
$LogPayload = @{
    service = "profile-readme"
    ddsource = "ci-cd" # Explicitly set errorSource to 'ci-cd'
    message = "Error: README.md contains broken link to 'twitter.com/aryan' - Run SmarterRCA-$(Get-Random)"
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

Write-Host "`nCheck Server Logs for: RCA -> Patch -> Verify -> PR Created" -ForegroundColor Magenta
