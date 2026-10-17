# PowerShell script to apply calendar migration via Supabase SQL API

$projectRef = "cbkkztbcoitrfcleghfd"
$anonKey = "your-supabase-anon-key"

# Read migration SQL
$migrationSQL = Get-Content -Path "migrations\20260108120000_add_calendar_fields.sql" -Raw

# Create request body
$body = @{
    query = $migrationSQL
} | ConvertTo-Json

# Apply migration
Write-Host "Applying calendar fields migration..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod `
        -Uri "https://$projectRef.supabase.co/rest/v1/rpc/exec_sql" `
        -Method POST `
        -Headers @{
            "apikey" = $anonKey
            "Authorization" = "Bearer $anonKey"
            "Content-Type" = "application/json"
        } `
        -Body $body

    Write-Host "Migration applied successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error applying via API. Please apply manually:" -ForegroundColor Red
    Write-Host "1. Go to: https://supabase.com/dashboard/project/$projectRef/sql/new"
    Write-Host "2. Copy the SQL from: migrations\20260108120000_add_calendar_fields.sql"
    Write-Host "3. Paste and click 'Run'"
    Write-Host ""
    Write-Host "Error details: $_" -ForegroundColor Red
}
