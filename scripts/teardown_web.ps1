<#
.SYNOPSIS
    Tears down the Chhaya static web frontend AWS infrastructure.

.DESCRIPTION
    1. Empties the S3 bucket associated with the stack.
    2. Deletes the CloudFormation stack (infra/web-hosting.yaml).
    3. Waits for stack deletion completion.

.PARAMETER Environment
    Target environment: dev (default), staging, prod.

.PARAMETER Region
    AWS region (default: ap-south-1).

.PARAMETER Profile
    Optional AWS CLI profile name.

.EXAMPLE
    .\scripts\teardown_web.ps1 -Environment dev
#>

[CmdletBinding()]
param(
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",

    [string]$Region = "ap-south-1",

    [string]$Profile = ""
)

$ErrorActionPreference = "Stop"

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

$StackName = "chhaya-web-$Environment"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Chhaya Web Frontend Teardown (Stack: $StackName)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Retrieve Bucket Name
Write-Host "`n[1/3] Locating S3 bucket for stack $StackName..." -ForegroundColor Yellow
$describeArgs = @(
    "cloudformation", "describe-stacks",
    "--stack-name", $StackName,
    "--query", "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue",
    "--output", "text"
)
if ($Profile) { $describeArgs += @("--profile", $Profile) }
if ($Region) { $describeArgs += @("--region", $Region) }

try {
    $BucketName = (& aws @describeArgs).Trim()
} catch {
    Write-Host "  ℹ Stack $StackName not found or already deleted." -ForegroundColor Gray
    $BucketName = $null
}

# 2. Empty S3 Bucket
if ($BucketName) {
    Write-Host "`n[2/3] Emptying S3 bucket (s3://$BucketName)..." -ForegroundColor Yellow
    try {
        # Delete all versions and delete markers
        $rmArgs = @("s3", "rm", "s3://$BucketName", "--recursive")
        Invoke-AwsCli -Arguments $rmArgs
        Write-Host "  ✓ Bucket objects purged." -ForegroundColor Green
    } catch {
        Write-Host "  ⚠ Warning during bucket emptying: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[2/3] Skipping bucket purge (no bucket found)." -ForegroundColor Gray
}

# 3. Delete CloudFormation Stack
Write-Host "`n[3/3] Deleting CloudFormation stack $StackName..." -ForegroundColor Yellow
$deleteArgs = @(
    "cloudformation", "delete-stack",
    "--stack-name", $StackName
)
Invoke-AwsCli -Arguments $deleteArgs

Write-Host "  Waiting for stack deletion to complete..." -ForegroundColor Yellow
$waitArgs = @(
    "cloudformation", "wait", "stack-delete-complete",
    "--stack-name", $StackName
)
Invoke-AwsCli -Arguments $waitArgs
Write-Host "  ✓ Stack $StackName successfully deleted." -ForegroundColor Green

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  Teardown complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
