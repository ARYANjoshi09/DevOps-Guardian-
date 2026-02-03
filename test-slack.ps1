# Test Slack Integration

Write-Host "=== Testing Slack Connection ===" -ForegroundColor Cyan

$testPayload = @{
    botToken = $env:SLACK_BOT_TOKEN
    channelId = $env:SLACK_CHANNEL_ID
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "http://localhost:3001/api/slack/test" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $testPayload
    
    Write-Host "✅ Slack connected successfully!" -ForegroundColor Green
    Write-Host "Message ID: $($result.messageId)" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Slack connection failed: $($_.Exception.Message)" -ForegroundColor Red
}
