$ApiUrl = "http://localhost:3001"

Write-Host "--- Test Structured Parsing ---" -ForegroundColor Cyan

# 0. Reuse Project (Assuming test-dedup created one, or create new if needed)
# For simplicity, we create a new one to be clean
$ProjBody = @{
    name = "Parsing Test Project"
    githubRepo = "test/parsing-repo"
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

# ---------------------------------------------------------
# Test 1: AWS Firehose Payload
# ---------------------------------------------------------
Write-Host "`nTest 1: AWS Firehose Payload..." -ForegroundColor Yellow
$AwsPayload = @{
    logGroup = "/aws/lambda/payment-processor-prod"
    logStream = "2023/10/24/[$LATEST]123456"
    region = "us-west-2"
    records = @(
        @{
            data = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes('{"message": "CRITICAL: DynamoDB Throughput Exceeded"}'))
        }
    )
} | ConvertTo-Json -Depth 5

try {
    Invoke-RestMethod -Uri "$ApiUrl/api/v1/logs/$ProjectId" `
        -Method Post `
        -Headers @{ "Authorization" = "Bearer $Token"; "Content-Type" = "application/json" } `
        -Body $AwsPayload | Out-Null
    Write-Host "AWS Log Sent." -ForegroundColor Gray
} catch { Write-Host "Error: $_" -ForegroundColor Red }

# ---------------------------------------------------------
# Test 2: Datadog Payload
# ---------------------------------------------------------
Write-Host "`nTest 2: Datadog Payload..." -ForegroundColor Yellow
$DatadogPayload = @{
    ddsource = "postgres"
    service = "user-db-shard-1"
    hostname = "ip-10-0-0-1"
    tags = "env:prod,version:v2.5"
    logs = @(
        @{
            message = "FATAL: Too many connections"
            status = "error"
        }
    )
} | ConvertTo-Json -Depth 5

try {
    Invoke-RestMethod -Uri "$ApiUrl/api/v1/logs/$ProjectId" `
        -Method Post `
        -Headers @{ "Authorization" = "Bearer $Token"; "Content-Type" = "application/json" } `
        -Body $DatadogPayload | Out-Null
    Write-Host "Datadog Log Sent." -ForegroundColor Gray
} catch { Write-Host "Error: $_" -ForegroundColor Red }

# ---------------------------------------------------------
# Verification: Check Database (Simulated)
# ---------------------------------------------------------
Write-Host "`nCheck the server logs manually to verify 'metadata' field extraction." -ForegroundColor Magenta
