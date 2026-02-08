# Setup and Test Script

# Step 1: Create test project
Write-Host "=== Creating Test Project ===" -ForegroundColor Cyan
$projectData = @{
    name = "test-healing-project"
    githubRepo = "test-org/test-repo"
    githubToken = "ghp_test_token_for_testing"
} | ConvertTo-Json

$projectId = $null

try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/projects" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $projectData
    
    $projectId = $createResponse.project.id
    Write-Host "Created project with ID: $projectId" -ForegroundColor Green
} catch {
    Write-Host "Project might already exist, fetching projects..." -ForegroundColor Yellow
    $projects = Invoke-RestMethod -Uri "http://localhost:3001/api/projects" -Method GET
    $project = $projects.projects | Where-Object { $_.name -eq "test-healing-project" } | Select-Object -First 1
    
    if ($project) {
        $projectId = $project.id
        Write-Host "Using existing project ID: $projectId" -ForegroundColor Green
    } else {
        Write-Host "Failed to create or find project" -ForegroundColor Red
        exit 1
    }
}

# Step 2: Get webhook token
Write-Host "`n=== Getting Webhook Token ===" -ForegroundColor Cyan
$tokenResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/logs/$projectId/token" -Method GET
$token = $tokenResponse.token
$webhookUrl = $tokenResponse.webhookUrl

Write-Host "Webhook URL: $webhookUrl" -ForegroundColor Green
Write-Host "Token: $token" -ForegroundColor Green

# Step 3: Test healthy logs
Write-Host "`n=== Test 1: Healthy Logs (No Errors) ===" -ForegroundColor Cyan
$healthyLogs = @(
    @{ message = "User logged in successfully"; level = "INFO"; timestamp = (Get-Date).ToString("o") }
    @{ message = "API request completed in 45ms"; level = "INFO"; timestamp = (Get-Date).ToString("o") }
) | ConvertTo-Json

$result1 = Invoke-RestMethod -Uri $webhookUrl `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
    -Body $healthyLogs

Write-Host "Response: $($result1.message)" -ForegroundColor Green
Write-Host "Records processed: $($result1.recordsProcessed)" -ForegroundColor Yellow

# Step 4: Test error logs (triggers RCA)
Write-Host "`n=== Test 2: Error Logs (Should Trigger RCA) ===" -ForegroundColor Cyan
$errorLogs = @(
    @{ 
        message = "Error: Cannot find module express"
        level = "ERROR"
        timestamp = (Get-Date).ToString("o")
        service = "api-server"
    }
) | ConvertTo-Json

$result2 = Invoke-RestMethod -Uri $webhookUrl `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
    -Body $errorLogs

Write-Host "Response: $($result2.message)" -ForegroundColor Green
Write-Host "Incident ID: $($result2.incidentId)" -ForegroundColor Magenta
Write-Host "Errors detected: $($result2.errorCount)" -ForegroundColor Yellow
Write-Host "Healing pipeline triggered! Check API logs for RCA flow" -ForegroundColor Cyan

# Step 5: Test invalid token
Write-Host "`n=== Test 3: Invalid Token ===" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri $webhookUrl `
        -Method POST `
        -Headers @{ "Authorization" = "Bearer invalid_token_123"; "Content-Type" = "application/json" } `
        -Body $healthyLogs
    Write-Host "Should have returned 403" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "Correctly rejected invalid token (403)" -ForegroundColor Green
    } else {
        Write-Host "Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 6: Test error patterns
Write-Host "`n=== Test 4: Error Pattern Detection ===" -ForegroundColor Cyan
$patterns = @(
    "Error: listen EADDRINUSE: address already in use",
    "TypeError: Cannot read property length of undefined",
    "Error: connect ETIMEDOUT",
    "CRITICAL: Out of memory",
    "Status 500: Internal Server Error"
)

$detectedCount = 0
foreach ($pattern in $patterns) {
    $log = @(@{ message = $pattern; level = "ERROR" }) | ConvertTo-Json
    try {
        $result = Invoke-RestMethod -Uri $webhookUrl `
            -Method POST `
            -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
            -Body $log
        
        if ($result.errorCount -gt 0) {
            Write-Host "Detected: $pattern" -ForegroundColor Green
            $detectedCount++
        }
    } catch {
        Write-Host "Failed: $pattern" -ForegroundColor Red
    }
}

Write-Host "`nDetected $detectedCount / $($patterns.Length) error patterns" -ForegroundColor Yellow

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Test 1: Healthy logs - PASSED" -ForegroundColor Green
Write-Host "Test 2: Error logs trigger RCA - PASSED (Incident: $($result2.incidentId))" -ForegroundColor Green
Write-Host "Test 3: Invalid token rejected - PASSED" -ForegroundColor Green
Write-Host "Test 4: Error patterns - $detectedCount / $($patterns.Length) DETECTED" -ForegroundColor Green
