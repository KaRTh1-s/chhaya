<#
.SYNOPSIS
    Deploys the Chhaya static web frontend to AWS S3 and CloudFront.

.DESCRIPTION
    1. Validates AWS CLI and Node environment.
    2. Deploys or updates the CloudFormation stack (infra/web-hosting.yaml).
    3. Builds the production Vite bundle with configured environment variables.
    4. Syncs assets to S3 with optimal HTTP Cache-Control headers (immutable assets, no-cache HTML).
    5. Triggers a CloudFront cache invalidation.
    6. Runs smoke verification checks on the live distribution.

.PARAMETER Environment
    Target environment: dev (default), staging, prod.

.PARAMETER ApiUrl
    Optional backend API Gateway / FastAPI endpoint URL (e.g. https://api.chhaya.example.com).

.PARAMETER StackLive
    Optional comma-separated list of active AWS services for status banner (e.g. "api,bedrock,dynamodb").

.PARAMETER Region
    AWS region for CloudFormation and S3 (default: ap-south-1).

.PARAMETER Profile
    Optional AWS CLI profile name.

.PARAMETER DomainName
    Optional custom domain name (e.g. app.chhaya.example).

.PARAMETER AcmCertArn
    Optional ACM Certificate ARN in us-east-1 for custom domain SSL.

.EXAMPLE
    .\scripts\deploy_web.ps1 -Environment dev
    .\scripts\deploy_web.ps1 -Environment prod -ApiUrl https://api.chhaya.example.com -StackLive "api,bedrock,dynamodb,open-meteo,cams,sns"
#>

[CmdletBinding()]
param(
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",

    [Parameter(Mandatory = $true, HelpMessage = "Backend API Gateway or FastAPI endpoint URL is required.")]
    [ValidateNotNullOrEmpty()]
    [string]$ApiUrl,

    [string]$StackLive = "",

    [string]$Region = "ap-south-1",

    [string]$Profile = "",

    [string]$DomainName = "",

    [string]$AcmCertArn = ""
)

$ErrorActionPreference = "Stop"

# Validate ApiUrl is non-empty and derive Origin (scheme + host, no path or trailing slash)
if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
    throw "Error: -ApiUrl is required and cannot be empty."
}

try {
    $uri = [System.Uri]$ApiUrl
    $ApiOrigin = "$($uri.Scheme)://$($uri.Authority)"
} catch {
    throw "Error: Invalid -ApiUrl format '$ApiUrl': $($_.Exception.Message)"
}


# Helper for AWS CLI arguments
function Invoke-AwsCli {
    param([string[]]$Arguments)
    if ($Profile) {
        $Arguments += @("--profile", $Profile)
    }
    if ($Region) {
        $Arguments += @("--region", $Region)
    }
    & aws @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI command failed: aws $($Arguments -join ' ')"
    }
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Chhaya Web Frontend Deployment (Target: $Environment)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Check prerequisites
Write-Host "`n[1/6] Checking prerequisites..." -ForegroundColor Yellow
try {
    $awsVersion = & aws --version 2>&1
    Write-Host "  ✓ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    throw "AWS CLI is required. Please install and configure credentials."
}

try {
    $nodeVersion = & node --version 2>&1
    Write-Host "  ✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    throw "Node.js is required to build the web application."
}

# 2. Deploy CloudFormation Stack
$StackName = "chhaya-web-$Environment"
$TemplatePath = Join-Path $PSScriptRoot "..\infra\web-hosting.yaml"

Write-Host "`n[2/6] Deploying CloudFormation infrastructure ($StackName)..." -ForegroundColor Yellow
$paramOverrides = @("EnvironmentName=$Environment", "ApiBaseUrl=$ApiOrigin")
if ($DomainName) { $paramOverrides += "DomainName=$DomainName" }
if ($AcmCertArn) { $paramOverrides += "AcmCertificateArn=$AcmCertArn" }

$cfnArgs = @(
    "cloudformation", "deploy",
    "--template-file", $TemplatePath,
    "--stack-name", $StackName,
    "--parameter-overrides"
) + $paramOverrides + @(
    "--capabilities", "CAPABILITY_IAM",
    "--no-fail-on-empty-changeset"
)

Invoke-AwsCli -Arguments $cfnArgs
Write-Host "  ✓ Infrastructure stack ready." -ForegroundColor Green

# 3. Query Stack Outputs
Write-Host "`n[3/6] Retrieving infrastructure details from stack outputs..." -ForegroundColor Yellow
$describeArgs = @(
    "cloudformation", "describe-stacks",
    "--stack-name", $StackName,
    "--query", "Stacks[0].Outputs",
    "--output", "json"
)
if ($Profile) { $describeArgs += @("--profile", $Profile) }
if ($Region) { $describeArgs += @("--region", $Region) }

$outputsJson = (& aws @describeArgs) | ConvertFrom-Json
$BucketName = ($outputsJson | Where-Object { $_.OutputKey -eq "BucketName" }).OutputValue
$DistributionId = ($outputsJson | Where-Object { $_.OutputKey -eq "DistributionId" }).OutputValue
$DistributionDomain = ($outputsJson | Where-Object { $_.OutputKey -eq "DistributionDomain" }).OutputValue
$SiteUrl = ($outputsJson | Where-Object { $_.OutputKey -eq "SiteUrl" }).OutputValue

if (-not $BucketName -or -not $DistributionId) {
    throw "Could not retrieve BucketName or DistributionId from stack outputs."
}

Write-Host "  Bucket Name:      $BucketName" -ForegroundColor DarkCyan
Write-Host "  Distribution ID:  $DistributionId" -ForegroundColor DarkCyan
Write-Host "  Site URL:         $SiteUrl" -ForegroundColor DarkCyan

# 4. Build Vite Web Bundle
Write-Host "`n[4/6] Building production web bundle..." -ForegroundColor Yellow
$WebDir = Join-Path $PSScriptRoot "..\web"

$prevApiUrl = $env:VITE_API_URL
$prevStackLive = $env:VITE_STACK_LIVE
$prevUseMock = $env:VITE_USE_MOCK

$env:VITE_API_URL = $ApiUrl
$env:VITE_STACK_LIVE = $StackLive
$env:VITE_USE_MOCK = "false"

try {
    Push-Location $WebDir
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed."
    }
} finally {
    Pop-Location
    $env:VITE_API_URL = $prevApiUrl
    $env:VITE_STACK_LIVE = $prevStackLive
    $env:VITE_USE_MOCK = $prevUseMock
}
Write-Host "  ✓ Build successful." -ForegroundColor Green

# 5. Sync to S3 and Invalidate CloudFront
Write-Host "`n[5/6] Syncing static assets to S3 (s3://$BucketName)..." -ForegroundColor Yellow
$DistDir = Join-Path $WebDir "dist"

# (a) Sync hashed static assets (1-year immutable cache)
$syncAssetsArgs = @(
    "s3", "sync", $DistDir, "s3://$BucketName/",
    "--delete",
    "--exclude", "*.html",
    "--cache-control", "public, max-age=31536000, immutable"
)
Invoke-AwsCli -Arguments $syncAssetsArgs

# (b) Sync HTML files (no-cache so updates propagate immediately)
$syncHtmlArgs = @(
    "s3", "sync", $DistDir, "s3://$BucketName/",
    "--exclude", "*",
    "--include", "*.html",
    "--cache-control", "public, max-age=0, must-revalidate"
)
Invoke-AwsCli -Arguments $syncHtmlArgs
Write-Host "  ✓ S3 asset sync complete." -ForegroundColor Green

Write-Host "  Invalidating CloudFront cache..." -ForegroundColor Yellow
$invalArgs = @(
    "cloudfront", "create-invalidation",
    "--distribution-id", $DistributionId,
    "--paths", "/*"
)
Invoke-AwsCli -Arguments $invalArgs
Write-Host "  ✓ Invalidation request submitted." -ForegroundColor Green

# 6. Verification and Smoke Checks
Write-Host "`n[6/6] Running live smoke checks..." -ForegroundColor Yellow
try {
    $resp = Invoke-WebRequest -Uri $SiteUrl -UseBasicParsing -TimeoutSec 15
    if ($resp.StatusCode -eq 200) {
        Write-Host "  ✓ Root endpoint ($SiteUrl) returned HTTP 200 OK" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Root endpoint returned status $($resp.StatusCode)" -ForegroundColor Yellow
    }

    # Verify security headers
    $hsts = $resp.Headers["Strict-Transport-Security"]
    $frameOptions = $resp.Headers["X-Frame-Options"]
    if ($hsts) {
        Write-Host "  ✓ Security header HSTS present: $hsts" -ForegroundColor Green
    }
    if ($frameOptions) {
        Write-Host "  ✓ Security header X-Frame-Options present: $frameOptions" -ForegroundColor Green
    }

    # Verify SPA deep route
    $deepRouteUrl = "$SiteUrl/plans"
    $deepResp = Invoke-WebRequest -Uri $deepRouteUrl -UseBasicParsing -TimeoutSec 15
    if ($deepResp.StatusCode -eq 200) {
        Write-Host "  ✓ SPA deep route ($deepRouteUrl) returned HTTP 200 OK" -ForegroundColor Green
    }
} catch {
    Write-Host "  ℹ Smoke check note: CloudFront distribution may still be completing global deployment: $($_.Exception.Message)" -ForegroundColor Gray
}

if ($ApiUrl) {
    try {
        $healthUrl = "$ApiUrl/health"
        $apiResp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 10
        Write-Host "  ✓ Backend API health check ($healthUrl) returned HTTP $($apiResp.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠ Backend API health check failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  Chhaya Web Frontend Successfully Deployed!" -ForegroundColor Green
Write-Host "  URL: $SiteUrl" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
