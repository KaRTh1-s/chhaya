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

### 7. Generate Plain-Language Advisory (/advise)
```powershell
$adviseBody = @{
    scenario = "delhi-heatwave-2025-06-09"
    job_type = "CONSTRUCTION"
    workload = "HEAVY"
    language = "hi"
    advisor_backend = "template"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8787/advise" -Method Post -Body $adviseBody -ContentType "application/json"
```

### 8. List Registered Crews
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/crews" -Method Get
```

### 9. Query Audit Trail
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/audit?limit=5" -Method Get
```

## Packaging & Deploying to AWS

### 1. Build Packages
```powershell
.\scripts\build_backend.ps1
```
Packages `ApiFunction` (`backend/build/`) and `AdvisorFunction` (`backend/build_advisor/`).

### 2. Deploy with AWS SAM
Prerequisites: `sam` CLI, `aws` CLI configured with active credentials.
```powershell
# Set write passcode for crew mutations
$env:CHHAYA_PASSCODE = "your-secure-passcode"

# Deploy to AWS ap-south-1
.\scripts\deploy_backend.ps1
```

### 3. Run Smoke Tests & Benchmark
```powershell
.\scripts\smoke_api.ps1 -ApiUrl "https://<api-id>.execute-api.ap-south-1.amazonaws.com" -Passcode "your-secure-passcode"
```

### 4. Teardown
```powershell
.\scripts\teardown_backend.ps1
```



## Web Application (Vite + React + TypeScript)

The web client runs independently or proxied against the local backend server.

### 1. Install Dependencies
```powershell
cd web
npm install
```

### 2. Run in Standalone Mock / Replay Mode (Zero backend required)
```powershell
# In web/ directory
$env:VITE_USE_MOCK="1"
npm run dev
```
Open `http://localhost:5173` to explore the UI with real recorded weather fixtures from Delhi, Chennai, and Coimbatore. A visible `"demo data"` badge is displayed in the live status pill.

### 3. Run with Local Backend API
```powershell
# Terminal 1 (Repo root): Start local mock API
.\scripts\dev.ps1 serve

# Terminal 2 (web/ directory): Start Vite dev server with proxy (/api -> http://localhost:8787)
cd web
npm run dev
```

### 4. Tests, Lint & Production Build
```powershell
# In web/ directory
npm test          # Run Vitest test suite (39 passing unit tests across 18 files)
npm run lint      # Run Oxlint
npm run build     # Compile TypeScript and bundle with Vite

# Full Accessibility and Visual QA suite (Headless Playwright + Axe-Core + Screen Capture)
node scripts/qa-web.mjs
```

### 5. Application Pages

- `/`: Home landing page with live product preview, 3-language advisory switcher, and architecture ticker.
- `/plans`: Core shift safety planner with 12 Indian cities, GPS locator, 4 job profiles, worker-first mobile layout, 24h interactive ribbon, inline-SVG WBGT curves, evidence citations modal, and WhatsApp share text exporter.
- `/board`: National Heat & Air Quality operational grid with Live and Replay tabs.
- `/crews`: Workforce roster management with passcode-protected write unlock (`sessionStorage`), crew creation, deletion, and shift plan detail drawer.
- `/report`: Printable one-page daily occupational brief with ranked city comparisons, flagged window schedules, hydration & PPE directives, and print stylesheet.
- `/analytics`: Truthful system telemetry counters (`seeded` demo tag), LLM first-pass validation rate with sample size denominator, and deterministic client-side handmade inline-SVG charts across 4 benchmark historical weather scenarios.
- `/audit`: Append-only operational event trail (30-day retention) with dynamic event type filters, relative time formatters, expandable JSON detail payloads, and PII-free privacy notice.
- `/safety`: Scientific basis and transparency hub rendering dynamic assumptions matrix (`assumptions.json`), deterministic 4-step calculation pipeline, plain-words model validator rules, zero-LLM template fallbacks, meteorological limitations, and National 112 / 108 emergency heat stroke guidance.

### 6. AWS Web Hosting Deployment (S3 + CloudFront OAC)

The frontend is packaged for high-availability static hosting via AWS CloudFormation:
- **Private S3 Bucket**: All public access blocked, encrypted with SSE-S3.
- **CloudFront Origin Access Control (OAC)**: SigV4 authenticated S3 reads.
- **Security Response Headers Policy**: Strict-Transport-Security (HSTS), Content-Security-Policy (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and Permissions-Policy.
- **SPA Routing**: 403/404 custom error responses rewritten to `/index.html`.
- **Caching**: 1-year immutable cache on `/assets/*`, immediate revalidation on `/index.html`.

Deploy to AWS:
```powershell
# Deploy infrastructure, build bundle, sync to S3, and invalidate CloudFront
.\scripts\deploy_web.ps1 -Environment dev -ApiUrl "https://api.chhaya.example.com" -StackLive "api,bedrock,dynamodb,open-meteo,cams,sns"

# Teardown stack and purge S3 bucket
.\scripts\teardown_web.ps1 -Environment dev
```

### Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `""` (relative/mock) | Base backend API URL endpoint |
| `VITE_STACK_LIVE` | `""` (mock/laptop) | Comma-separated list of active AWS services (e.g. `api,bedrock,dynamodb,open-meteo,cams,sns`) |
| `VITE_USE_MOCK` | `false` | When set to `true`, forces mock/fixture replay mode with visible fallback badge |



