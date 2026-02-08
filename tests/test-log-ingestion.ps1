# Test Script: Log Ingestion API

# Test 1: Healthy logs (no errors)
Write-Host "=== Test 1: Sending healthy logs ===" -ForegroundColor Cyan
$healthyLogs = @(
    @{ message = "User logged in successfully"; level = "INFO" }
    @{ message = "API request completed in 45ms"; level = "INFO" }
) | ConvertTo-Json

$response1 = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/logs/test-project/token" -Method GET
$tokenData = $response1.Content | ConvertFrom-Json
$token = $tokenData.token

Write-Host "Webhook Token: $token" -ForegroundColor Green

$result1 = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/logs/test-project" `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
    -Body $healthyLogs

Write-Host "Response: $($result1 | ConvertTo-Json)" -ForegroundColor Yellow

# Test 2: Error logs (should trigger RCA)
Write-Host "`n=== Test 2: Sending error logs ===" -ForegroundColor Cyan
$errorLogs = @(
    @{ 
        message = "Error: Cannot find module 'express'"
        level = "ERROR"
        timestamp = (Get-Date).ToString("o")
    }
) | ConvertTo-Json

$result2 = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/logs/test-project" `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
    -Body $errorLogs

Write-Host "Response: $($result2 | ConvertTo-Json)" -ForegroundColor Yellow

# Test 3: Invalid token
Write-Host "`n=== Test 3: Invalid token ===" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "http://localhost:3001/api/v1/logs/test-project" `
        -Method POST `
        -Headers @{ "Authorization" = "Bearer invalid_token"; "Content-Type" = "application/json" } `
        -Body $healthyLogs
} catch {
    Write-Host "Expected 403 error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Common error patterns
Write-Host "`n=== Test 4: Testing error patterns ===" -ForegroundColor Cyan
$patterns = @(
    "Error: listen EADDRINUSE: address already in use :::3000",
    "TypeError: Cannot read property 'length' of undefined",
    "Error: connect ETIMEDOUT",
    "fatal: repository not found",
    "CRITICAL: Out of memory",
    "Status 500: Internal Server Error"
)

foreach ($pattern in $patterns) {
    $log = @(@{ message = $pattern; level = "ERROR" }) | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/logs/test-project" `
        -Method POST `
        -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
        -Body $log
    
    Write-Host "Pattern: $pattern" -ForegroundColor Magenta
    Write-Host "Detected: $($result.errorCount) errors" -ForegroundColor Green
}

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Green
