# Test CI/CD vs Production Workflows with Slack

Write-Host "=== DevOps Guardian Slack Integration Test ===" -ForegroundColor Cyan

# Get project ID
$projects = Invoke-RestMethod -Uri "http://localhost:3001/api/projects" -Method GET
$project = $projects.projects | Where-Object { $_.name -eq "test-healing-project" } | Select-Object -First 1
$projectId = $project.id

Write-Host "`nProject ID: $projectId" -ForegroundColor Green

# Get webhook token
$tokenResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/logs/$projectId/token" -Method GET
$token = $tokenResponse.token
$webhookUrl = $tokenResponse.webhookUrl

# Test 1: CI/CD Error (should auto-fix and notify)
Write-Host "`n=== Test 1: CI/CD Error (Auto-Fix Workflow) ===" -ForegroundColor Cyan
$cicdError = @(
    @{ 
        message = "Error: Cannot find module 'dotenv'"
        level = "ERROR"
        errorSource = "ci-cd"
        timestamp = (Get-Date).ToString("o")
    }
) | ConvertTo-Json

$result1 = Invoke-RestMethod -Uri $webhookUrl `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
    -Body $cicdError

Write-Host "Response: $($result1.message)" -ForegroundColor Green
Write-Host "Incident ID: $($result1.incidentId)" -ForegroundColor Yellow
Write-Host "Expected: RCA -> Patch -> Verify -> PR -> Slack notification with bug report" -ForegroundColor Cyan
Write-Host "Check Slack for auto-fix report!" -ForegroundColor Magenta

Start-Sleep -Seconds 3

# Test 2: Production Error (should request approval)
Write-Host "`n=== Test 2: Production Error (Approval Workflow) ===" -ForegroundColor Cyan
$prodError = @(
    @{ 
        message = "Error: Database connection timeout"
        level = "ERROR"
        errorSource = "production"
        timestamp = (Get-Date).ToString("o")
    }
) | ConvertTo-Json

$result2 = Invoke-RestMethod -Uri $webhookUrl `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
    -Body $prodError

Write-Host "Response: $($result2.message)" -ForegroundColor Green
Write-Host "Incident ID: $($result2.incidentId)" -ForegroundColor Yellow
Write-Host "Expected: RCA -> Patch -> Slack approval request" -ForegroundColor Cyan
Write-Host "Check Slack for approval buttons!" -ForegroundColor Magenta

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "1. CI/CD error should auto-fix and send completion report to Slack" -ForegroundColor White
Write-Host "2. Production error should send approval request with buttons to Slack" -ForegroundColor White
Write-Host "3. Click 'Approve' button in Slack for production error to create PR" -ForegroundColor White
