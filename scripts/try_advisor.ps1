# Helper script to test Chhaya Advisor endpoint locally or with live Bedrock
param(
    [string]$Language = "en",
    [string]$JobType = "CONSTRUCTION",
    [string]$Scenario = "delhi-heatwave-2025-06-09",
    [string]$Backend = "template",
    [string]$Port = "8000"
)

$ErrorActionPreference = "Stop"

$body = @{
    scenario = $Scenario
    job_type = $JobType
    language = $Language
    advisor_backend = $Backend
} | ConvertTo-Json

Write-Host "Sending /advise request to http://127.0.0.1:$Port/advise..." -ForegroundColor Cyan
Write-Host "Payload: $body" -ForegroundColor DarkGray

try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/advise" -Method Post -Body $body -ContentType "application/json"
    Write-Host "`n=== Advisory Generated ($($resp.advisory.mode) mode, Lang: $($resp.advisory.language)) ===" -ForegroundColor Green
    Write-Host "Validated: $($resp.advisory.validated) | Fallback: $($resp.advisory.fallback_reason)" -ForegroundColor Yellow
    Write-Host "`nGuidance Sentences:" -ForegroundColor Cyan
    foreach ($s in $resp.advisory.sentences) {
        Write-Host " - $($s.text) [Evidence: $($s.evidence_ids -join ', ')]" -ForegroundColor White
    }
    Write-Host "`nSeek Help Guidelines:" -ForegroundColor Magenta
    foreach ($sh in $resp.advisory.seek_help) {
        Write-Host " ! $sh" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error invoking /advise: $_" -ForegroundColor Red
}
