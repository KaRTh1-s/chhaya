# Deployment script for Chhaya AWS Serverless Backend
# Enforces tests, build, linting, and secret validation prior to deployment
param(
    [string]$StackName = "chhaya-api",
    [string]$Region = "ap-south-1",
    [string]$CorsOrigin = "*",
    [string]$DataMode = "live",
    [string]$AppVersion = "0.3.4",
    [string]$AdvisorMode = "converse",
    [string]$BedrockModelId = "apac.amazon.nova-micro-v1:0",
    [string]$BedrockRegion = "ap-south-1",
    [string]$Passcode = ""
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot

if (Test-Path "C:\Program Files\Amazon\AWSSAMCLI\bin") {
    $env:PATH = "C:\Program Files\Amazon\AWSSAMCLI\bin;" + $env:PATH
}

if (-not $Passcode) {
    if ($env:CHHAYA_PASSCODE) {
        $Passcode = $env:CHHAYA_PASSCODE
    } else {
        $Passcode = "demo"
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CHHAYA BACKEND DEPLOYMENT ($StackName / $Region)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Precondition Checks
Write-Host "`n[1/5] Checking CLI prerequisites..." -ForegroundColor Yellow

$samInstalled = Get-Command "sam" -ErrorAction SilentlyContinue
if (-not $samInstalled) {
    Write-Host "ERROR: AWS SAM CLI ('sam') is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install AWS SAM CLI from: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html" -ForegroundColor Yellow
    exit 1
}

$awsInstalled = Get-Command "aws" -ErrorAction SilentlyContinue
if (-not $awsInstalled) {
    Write-Host "ERROR: AWS CLI ('aws') is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Check AWS authentication
try {
    $callerIdentity = aws sts get-caller-identity --output json | ConvertFrom-Json
    $maskedAccount = $callerIdentity.Account.Substring(0, 4) + "********"
    Write-Host "Authenticated as: $($callerIdentity.Arn) (Account: $maskedAccount)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: AWS credentials are not active or expired." -ForegroundColor Red
    Write-Host "Please run 'aws login' or configure credentials with 'aws configure'." -ForegroundColor Yellow
    exit 1
}

# 2. Run Test Suite
Write-Host "`n[2/5] Running test suite..." -ForegroundColor Yellow
python -m pytest
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Test suite failed. Aborting deployment." -ForegroundColor Red
    exit 1
}

# 3. Build & Package
Write-Host "`n[3/5] Packaging backend handlers and engine..." -ForegroundColor Yellow
& (Join-Path $PSScriptRoot "build_backend.ps1")

# 4. Validate SAM Template
Write-Host "`n[4/5] Validating SAM template with linting..." -ForegroundColor Yellow
Push-Location (Join-Path $RootDir "backend")
try {
    sam validate --lint -t template.yaml
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: SAM validation failed." -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

# 5. Deploy with AWS SAM
Write-Host "`n[5/5] Deploying stack to AWS ($StackName in $Region)..." -ForegroundColor Yellow
Push-Location (Join-Path $RootDir "backend")
try {
    sam deploy `
        --stack-name $StackName `
        --region $Region `
        --capabilities CAPABILITY_IAM `
        --resolve-s3 `
        --no-confirm-changeset `
        --template-file template.yaml `
        --parameter-overrides `
            WritePasscode="$Passcode" `
            CorsOrigin="$CorsOrigin" `
            DataMode="$DataMode" `
            AppVersion="$AppVersion" `
            AdvisorMode="$AdvisorMode" `
            BedrockModelId="$BedrockModelId" `
            BedrockRegion="$BedrockRegion"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n==========================================================" -ForegroundColor Green
        Write-Host "  DEPLOYMENT SUCCEEDED!" -ForegroundColor Green
        Write-Host "==========================================================" -ForegroundColor Green
        
        $stackOutputs = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
        foreach ($out in $stackOutputs) {
            Write-Host "  $($out.OutputKey): $($out.OutputValue)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "ERROR: SAM deployment encountered errors." -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}
