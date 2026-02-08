# DevOps Guardian - Test Scripts

This folder contains PowerShell test scripts for various DevOps Guardian features.

## Test Scripts

### Core Functionality Tests

- **`test-complete.ps1`** - Complete end-to-end test suite
- **`test-e2e.ps1`** - End-to-end integration tests

### Log Ingestion Tests

- **`test-log-ingestion.ps1`** - Test log ingestion API endpoint
- **`test-webhook.ps1`** - Test webhook functionality
- **`test-live-logs.ps1`** - Test real-time log streaming

### Deduplication & Metadata Tests

- **`test-dedup.ps1`** - Test incident deduplication logic
- **`test-metadata.ps1`** - Test metadata extraction from logs

### Slack Integration Tests

- **`test-slack.ps1`** - Basic Slack integration test
- **`test-slack-block-kit.ps1`** - Test Slack Block Kit UI components
- **`test-slack-workflows.ps1`** - Test Slack workflow automation

### Extension Tests

- **`test-extension.ps1`** - Test Chrome extension functionality

### Utilities

- **`fix-ports.ps1`** - Fix port conflicts for local development

---

## Usage

### Run Individual Tests

```powershell
# From project root
.\tests\test-log-ingestion.ps1

# Or from tests directory
cd tests
.\test-log-ingestion.ps1
```

### Prerequisites

- API must be running on `http://localhost:3001`
- Web app must be running on `http://localhost:3002` (for some tests)
- Valid project ID and webhook token

### Environment Variables

Some tests may require:

- `GEMINI_API_KEY` - For AI-powered tests
- `SLACK_BOT_TOKEN` - For Slack tests
- `E2B_API_KEY` - For sandbox tests

---

## Test Development

### Adding New Tests

1. Create a new `.ps1` file in this directory
2. Follow the naming convention: `test-{feature-name}.ps1`
3. Include clear output with color-coded results:
   - `Green` for success
   - `Red` for errors
   - `Yellow` for warnings
   - `Cyan` for informational messages

### Example Test Structure

```powershell
# Test Script: Feature Name
Write-Host "=== Testing Feature ===`n" -ForegroundColor Cyan

try {
    # Test logic here
    $result = Invoke-RestMethod -Uri "http://localhost:3001/api/endpoint" -Method POST

    if ($result.success) {
        Write-Host "✓ Test passed" -ForegroundColor Green
    } else {
        Write-Host "✗ Test failed" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
```

---

## CI/CD Integration

These tests can be integrated into GitHub Actions:

```yaml
- name: Run Tests
  run: |
    pwsh ./tests/test-log-ingestion.ps1
    pwsh ./tests/test-dedup.ps1
```

---

## Troubleshooting

### Port Already in Use

Run `.\tests\fix-ports.ps1` to kill processes on ports 3001 and 3002.

### API Not Responding

Ensure the API is running: `npm run dev --workspace=apps/api`

### Authentication Errors

Generate a new webhook token: `curl http://localhost:3001/api/v1/logs/YOUR_PROJECT_ID/token`
