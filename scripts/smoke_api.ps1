# End-to-End Smoke Test Suite for Deployed Chhaya HTTP API
param(
    [Parameter(Mandatory=$true)]
    [string]$ApiUrl,
    [string]$Passcode = "demo"
)

$ErrorActionPreference = "Continue"
$ApiUrl = $ApiUrl.TrimEnd('/')

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CHHAYA HTTP API SMOKE TESTS & BENCHMARK" -ForegroundColor Cyan
Write-Host "  Target: $ApiUrl" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$Results = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Path,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$ExpectedStatus = 200,
        [scriptblock]$Validation = $null
    )

    $uri = "$ApiUrl$Path"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $status = 0
    $passed = $false
    $errMessage = ""
    $respBody = $null
    $corsPresent = $false

    try {
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $Headers
            ErrorAction = "Stop"
        }
        if ($Body) {
            $params["Body"] = $Body
            $params["ContentType"] = "application/json"
        }

        $params["UseBasicParsing"] = $true
        $response = Invoke-WebRequest @params
        $sw.Stop()
        $status = [int]$response.StatusCode
        $respBody = $response.Content | ConvertFrom-Json
        $corsPresent = $response.Headers.ContainsKey("Access-Control-Allow-Origin") -or $response.Headers.ContainsKey("access-control-allow-origin")

        if ($status -eq $ExpectedStatus) {
            $passed = $true
            if ($Validation) {
                $customOk = & $Validation $respBody $response
                if (-not $customOk) {
                    $passed = $false
                    $errMessage = "Custom validation assertion failed"
                }
            }
        } else {
            $errMessage = "Status $status != expected $ExpectedStatus"
        }
    } catch {
        $sw.Stop()
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            if ($status -eq $ExpectedStatus) {
                $passed = $true
            } else {
                $errMessage = "HTTP $status != expected $ExpectedStatus"
            }
        } else {
            $errMessage = $_.Exception.Message
        }
    }

    # Check response hygiene (no DynamoDB keys)
    $hygienePass = $true
    if ($respBody) {
        $rawJson = $respBody | ConvertTo-Json -Depth 10
        if ($rawJson -match '"pk"' -or $rawJson -match '"sk"' -or $rawJson -match '"ttl"') {
            $hygienePass = $false
            $errMessage += " [LEAKED DYNAMODB INTERNAL KEYS]"
            $passed = $false
        }
    }

    $script:Results += [PSCustomObject]@{
        Name = $Name
        Method = $Method
        Path = $Path
        Status = $status
        Expected = $ExpectedStatus
        LatencyMs = [math]::Round($sw.Elapsed.TotalMilliseconds, 1)
        Passed = $passed
        Notes = $errMessage
    }

    return $respBody
}

# 1. Cold Start Call
Write-Host "`n--- Running Endpoint Smoke Tests ---" -ForegroundColor Yellow

$health = Test-Endpoint -Name "Health Check (Cold Start)" -Method "GET" -Path "/health"
$cities = Test-Endpoint -Name "List Cities" -Method "GET" -Path "/cities" -Validation { param($d) return $d.cities.Count -gt 0 }
$scenarios = Test-Endpoint -Name "List Scenarios" -Method "GET" -Path "/scenarios" -Validation { param($d) return $d.scenarios.Count -eq 4 }
$stats = Test-Endpoint -Name "Global Stats" -Method "GET" -Path "/stats"
$audit = Test-Endpoint -Name "Audit Log" -Method "GET" -Path "/audit?limit=5"

# 2. Plan Endpoints
$livePlanBody = @{
    city_id = "delhi"
    job_type = "RIDER"
    workload = "MODERATE"
} | ConvertTo-Json
$livePlan = Test-Endpoint -Name "Plan (Live Delhi Rider)" -Method "POST" -Path "/plan" -Body $livePlanBody -Validation { param($d) return ($d.hours -ne $null -and @($d.hours).Count -ge 24) }

$replayPlanBody = @{
    scenario = "delhi-heatwave-2025-06-09"
    job_type = "CONSTRUCTION"
    workload = "HEAVY"
} | ConvertTo-Json
$replayPlan = Test-Endpoint -Name "Plan (Replay Delhi Heatwave)" -Method "POST" -Path "/plan" -Body $replayPlanBody -Validation { param($d) return $d.data_source -eq "replay" }

# 3. Multilingual Advisory Endpoints
foreach ($lang in @("en", "hi", "ta")) {
    $adviseBody = @{
        scenario = "delhi-heatwave-2025-06-09"
        job_type = "CONSTRUCTION"
        workload = "HEAVY"
        language = $lang
        advisor_backend = "template"
    } | ConvertTo-Json
    $advRes = Test-Endpoint -Name "Advise ($lang - Template)" -Method "POST" -Path "/advise" -Body $adviseBody -Validation { param($d) return $d.advisory.validated -eq $true }
}

# 3b. Bedrock Converse Advisor Endpoints (en, ta)
Write-Host "`n--- Testing Bedrock Converse Advisory (en, ta) ---" -ForegroundColor Yellow
$bedrockEnBody = @{
    scenario = "delhi-heatwave-2025-06-09"
    job_type = "CONSTRUCTION"
    workload = "HEAVY"
    language = "en"
    advisor_backend = "bedrock"
} | ConvertTo-Json
$advBedrockEn = Test-Endpoint -Name "Advise (en - Bedrock Converse)" -Method "POST" -Path "/advise" -Body $bedrockEnBody -Validation { param($d) return $d.advisory -ne $null }

$bedrockTaBody = @{
    scenario = "delhi-heatwave-2025-06-09"
    job_type = "CONSTRUCTION"
    workload = "HEAVY"
    language = "ta"
    advisor_backend = "bedrock"
} | ConvertTo-Json
$advBedrockTa = Test-Endpoint -Name "Advise (ta - Bedrock Converse)" -Method "POST" -Path "/advise" -Body $bedrockTaBody -Validation { param($d) return $d.advisory -ne $null }

Write-Host "`nBedrock English Advisory Response:" -ForegroundColor Magenta
$advBedrockEn | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Cyan

Write-Host "`nBedrock Tamil Advisory Response:" -ForegroundColor Magenta
$advBedrockTa | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Cyan

# 4. Crew Auth & CRUD
$crewCreateBody = @{
    name = "Smoke Test Crew"
    city_id = "delhi"
    job_type = "VENDOR"
    size = 5
} | ConvertTo-Json

$unauthCrew = Test-Endpoint -Name "Create Crew (No Auth -> 401)" -Method "POST" -Path "/crews" -Body $crewCreateBody -ExpectedStatus 401
$createdCrew = Test-Endpoint -Name "Create Crew (Authorized -> 201)" -Method "POST" -Path "/crews" -Headers @{"X-Chhaya-Passcode"=$Passcode} -Body $crewCreateBody -ExpectedStatus 201

if ($createdCrew -and $createdCrew.crew -and $createdCrew.crew.id) {
    $cId = $createdCrew.crew.id
    $getCrew = Test-Endpoint -Name "Get Crew With Plan" -Method "GET" -Path "/crews/$cId"
    $delCrew = Test-Endpoint -Name "Delete Crew (Authorized)" -Method "DELETE" -Path "/crews/$cId" -Headers @{"X-Chhaya-Passcode"=$Passcode} -ExpectedStatus 200
}

# 5. Benchmark 20 Warm Calls to /plan
Write-Host "`n--- Running Warm Latency Benchmark (20 calls to /plan) ---" -ForegroundColor Yellow
$latencies = @()
for ($i = 1; $i -le 20; $i++) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $null = Invoke-RestMethod -Uri "$ApiUrl/plan" -Method Post -Body $replayPlanBody -ContentType "application/json" -ErrorAction Stop
        $sw.Stop()
        $latencies += $sw.Elapsed.TotalMilliseconds
    } catch {
        $sw.Stop()
    }
}

if ($latencies.Count -gt 0) {
    $sortedLat = $latencies | Sort-Object
    $p50 = [math]::Round($sortedLat[[math]::Floor($sortedLat.Count * 0.50)], 1)
    $p95 = [math]::Round($sortedLat[[math]::Floor($sortedLat.Count * 0.95)], 1)
    $minL = [math]::Round($sortedLat[0], 1)
    $maxL = [math]::Round($sortedLat[-1], 1)
} else {
    $p50 = 0.0; $p95 = 0.0; $minL = 0.0; $maxL = 0.0
}

# Print Summary Table
Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  SMOKE TEST EXECUTION RESULTS" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

$Results | Format-Table -Property Name, Method, Status, Expected, LatencyMs, Passed, Notes -AutoSize

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  LATENCY PERFORMANCE METRICS" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Cold Start Latency (First Call): $($Results[0].LatencyMs) ms" -ForegroundColor White
Write-Host "  Warm /plan Calls (20 iterations):" -ForegroundColor White
Write-Host "    - Min:  $minL ms" -ForegroundColor White
Write-Host "    - p50:  $p50 ms" -ForegroundColor Green
Write-Host "    - p95:  $p95 ms" -ForegroundColor Yellow
Write-Host "    - Max:  $maxL ms" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
