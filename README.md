# Chhaya

Chhaya ("shade") is a hyperlocal heat-and-air exposure copilot for outdoor workers in Indian cities.

## Quick Start (PowerShell / Windows)

```powershell
# 1. Setup development virtual environment and dependencies
.\scripts\dev.ps1 setup

# 2. Run all engine and backend tests
.\scripts\dev.ps1 test

# 3. Run linter
.\scripts\dev.ps1 lint

# 4. Start local HTTP API server (mocks DynamoDB in-process on http://localhost:8787)
.\scripts\dev.ps1 serve

# (Optional) Start local server in live Open-Meteo mode
.\scripts\dev.ps1 serve --live
```

## Local API Examples (PowerShell `Invoke-RestMethod`)

With the server running on `http://localhost:8787`:

### 1. Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/health" -Method Get
```

### 2. List Seeded Cities
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/cities" -Method Get
```

### 3. Generate Day Plan (Delhi - Construction - Heavy Workload)
```powershell
$body = @{
    city_id = "delhi"
    job_type = "CONSTRUCTION"
    workload = "HEAVY"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8787/plan" -Method Post -Body $body -ContentType "application/json"
```

### 4. Risk Board
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/board" -Method Get
```

### 5. Global Stats
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/stats" -Method Get
```

### 6. Register a New Crew (Requires Passcode)
```powershell
$crewBody = @{
    name = "Delhi Central Fleet"
    city_id = "delhi"
    job_type = "RIDER"
    size = 20
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8787/crews" -Method Post -Headers @{"X-Chhaya-Passcode"="demo"} -Body $crewBody -ContentType "application/json"
```

### 7. List Registered Crews
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/crews" -Method Get
```

### 8. Query Audit Trail
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/audit?limit=5" -Method Get
```

## Packaging for AWS Lambda

```powershell
.\scripts\build_backend.ps1
```
This packages `chhaya_engine` alongside the backend handler into `backend/build/` ready for SAM deployment.

