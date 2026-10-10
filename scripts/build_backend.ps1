# Build script packaging chhaya_engine alongside backend handlers for AWS Lambda deployment
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $RootDir "backend"
$EngineDir = Join-Path $RootDir "engine"
$BuildDir = Join-Path $BackendDir "build"
$BuildAdvisorDir = Join-Path $BackendDir "build_advisor"

Write-Host "Packaging Chhaya Backend for AWS Lambda..." -ForegroundColor Cyan

# 1. Package ApiFunction (Zero 3rd-party dependencies, <20ms cold start)
Write-Host "Assembling ApiFunction at $BuildDir..." -ForegroundColor Cyan
if (Test-Path $BuildDir) {
    Remove-Item -Recurse -Force $BuildDir
}
New-Item -ItemType Directory -Path $BuildDir | Out-Null

Copy-Item (Join-Path $BackendDir "handlers\api.py") (Join-Path $BuildDir "api.py")
Copy-Item -Recurse (Join-Path $BackendDir "src\chhaya_backend") (Join-Path $BuildDir "chhaya_backend")
Copy-Item -Recurse (Join-Path $EngineDir "src\chhaya_engine") (Join-Path $BuildDir "chhaya_engine")
Copy-Item -Recurse (Join-Path $EngineDir "tests\fixtures") (Join-Path $BuildDir "tests\fixtures")

# 2. Package AdvisorFunction (Dedicated Bedrock & Agent function)
Write-Host "Assembling AdvisorFunction at $BuildAdvisorDir..." -ForegroundColor Cyan
if (Test-Path $BuildAdvisorDir) {
    Remove-Item -Recurse -Force $BuildAdvisorDir
}
New-Item -ItemType Directory -Path $BuildAdvisorDir | Out-Null

Copy-Item (Join-Path $BackendDir "handlers\advisor.py") (Join-Path $BuildAdvisorDir "advisor.py")
Copy-Item -Recurse (Join-Path $BackendDir "src\chhaya_backend") (Join-Path $BuildAdvisorDir "chhaya_backend")
Copy-Item -Recurse (Join-Path $EngineDir "src\chhaya_engine") (Join-Path $BuildAdvisorDir "chhaya_engine")
Copy-Item -Recurse (Join-Path $EngineDir "tests\fixtures") (Join-Path $BuildAdvisorDir "tests\fixtures")

Write-Host "Build complete! Both Lambda packages assembled successfully." -ForegroundColor Green

