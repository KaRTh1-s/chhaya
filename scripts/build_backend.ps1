# Build script packaging chhaya_engine alongside backend handlers for AWS Lambda deployment
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $RootDir "backend"
$EngineDir = Join-Path $RootDir "engine"
$BuildDir = Join-Path $BackendDir "build"

Write-Host "Packaging Chhaya Backend for AWS Lambda..." -ForegroundColor Cyan

# Clean existing build directory
if (Test-Path $BuildDir) {
    Remove-Item -Recurse -Force $BuildDir
}
New-Item -ItemType Directory -Path $BuildDir | Out-Null

# Copy Lambda handler entry point
Copy-Item (Join-Path $BackendDir "handlers\api.py") (Join-Path $BuildDir "api.py")

# Copy chhaya_backend package
Copy-Item -Recurse (Join-Path $BackendDir "src\chhaya_backend") (Join-Path $BuildDir "chhaya_backend")

# Copy chhaya_engine package (zero external dependencies)
Copy-Item -Recurse (Join-Path $EngineDir "src\chhaya_engine") (Join-Path $BuildDir "chhaya_engine")

Write-Host "Build complete! Package assembled at: $BuildDir" -ForegroundColor Green
