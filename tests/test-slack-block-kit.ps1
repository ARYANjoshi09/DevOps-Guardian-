# Test Production Workflow Only (Block Kit)

Write-Host "=== Testing Slack Block Kit Notification ===" -ForegroundColor Cyan

# Get project ID
$projects = Invoke-RestMethod -Uri "http://localhost:3001/api/projects" -Method GET
$project = $projects.projects | Where-Object { $_.name -eq "test-healing-project" } | Select-Object -First 1
$projectId = $project.id

# Get webhook token
$tokenResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/logs/$projectId/token" -Method GET
$token = $tokenResponse.token
$webhookUrl = $tokenResponse.webhookUrl

Write-Host "Using Project ID: $projectId" -ForegroundColor Green

# Production Error (should request approval with new UI)
Write-Host "`n=== Sending Production Error ===" -ForegroundColor Cyan
$prodError = @(
    @{ 
        message = "Error: Database deadlock detected in transaction"
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
Write-Host "`nExpected Actions:" -ForegroundColor Yellow
Write-Host "1. Check Slack for Block Kit UI (Header, Sections, Code Block)"
Write-Host "2. Click 'Verify in Sandbox' -> Check for thread with logs"
Write-Host "3. Click 'Approve & PR' -> Check for PR creation"
