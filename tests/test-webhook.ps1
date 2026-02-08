$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    repository = @{
        full_name = "test/devops-guardian-repo"
    }
    sender = @{
        login = "admin-user"
    }
    head_commit = @{
        message = "Fix: Update database connection pool"
        id = "a1b2c3d4e5"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/webhook/github" -Method Post -Headers $headers -Body $body
