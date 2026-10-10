# Run demo queries against local server
Write-Host "--- 1. GET /health ---" -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "http://localhost:8787/health" -Method Get
$health | ConvertTo-Json

Write-Host "`n--- 2. GET /cities (first 2) ---" -ForegroundColor Cyan
$cities = (Invoke-RestMethod -Uri "http://localhost:8787/cities" -Method Get).cities
$cities | Select-Object -First 2 | ConvertTo-Json

Write-Host "`n--- 3. POST /plan (Delhi, construction, heavy) ---" -ForegroundColor Cyan
$planBody = @{
    city_id = "delhi"
    job_type = "CONSTRUCTION"
    workload = "HEAVY"
} | ConvertTo-Json
$plan = Invoke-RestMethod -Uri "http://localhost:8787/plan" -Method Post -Body $planBody -ContentType "application/json"
[PSCustomObject]@{
    city_label = $plan.city_label
    generated_at = $plan.generated_at
    overall_risk = $plan.overall_risk
    no_safe_window = $plan.no_safe_window
    windows_count = $plan.windows.Count
    dangerous_windows_count = $plan.dangerous_windows.Count
    recommended_blocks_count = $plan.recommended_blocks.Count
    hydration = $plan.hydration.text
    mask = $plan.mask.type
} | ConvertTo-Json

Write-Host "`n--- 4. GET /board (first 2 cities) ---" -ForegroundColor Cyan
$board = Invoke-RestMethod -Uri "http://localhost:8787/board" -Method Get
[PSCustomObject]@{
    updated_at = $board.updated_at
    sample_cities = ($board.cities | Select-Object -First 2)
} | ConvertTo-Json -Depth 4

Write-Host "`n--- 5. GET /stats ---" -ForegroundColor Cyan
$stats = Invoke-RestMethod -Uri "http://localhost:8787/stats" -Method Get
$stats | ConvertTo-Json

Write-Host "`n--- 6. POST /crews without passcode (Expect 401) ---" -ForegroundColor Cyan
try {
    $crewBody = @{ name = "Jaipur Sanitation Team"; city_id = "jaipur"; job_type = "SANITATION"; size = 8 } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8787/crews" -Method Post -Body $crewBody -ContentType "application/json"
} catch {
    Write-Host "Status Code: " $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body: " $reader.ReadToEnd()
}

Write-Host "`n--- 7. POST /crews with passcode ---" -ForegroundColor Cyan
$crewBody = @{ name = "Jaipur Sanitation Team"; city_id = "jaipur"; job_type = "SANITATION"; size = 8 } | ConvertTo-Json
$created = Invoke-RestMethod -Uri "http://localhost:8787/crews" -Method Post -Headers @{"X-Chhaya-Passcode"="demo"} -Body $crewBody -ContentType "application/json"
$created | ConvertTo-Json

Write-Host "`n--- 8. GET /crews ---" -ForegroundColor Cyan
$crews = Invoke-RestMethod -Uri "http://localhost:8787/crews" -Method Get
$crews | ConvertTo-Json -Depth 3

Write-Host "`n--- 9. GET /audit?limit=3 ---" -ForegroundColor Cyan
$audit = Invoke-RestMethod -Uri "http://localhost:8787/audit?limit=3" -Method Get
$audit | ConvertTo-Json -Depth 4
