# Teardown script for Chhaya AWS Serverless Backend stack
param(
    [string]$StackName = "chhaya-api",
    [string]$Region = "ap-south-1"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Red
Write-Host "  TEARING DOWN CHHAYA BACKEND ($StackName in $Region)" -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Red

$samInstalled = Get-Command "sam" -ErrorAction SilentlyContinue
if (-not $samInstalled) {
    Write-Host "ERROR: AWS SAM CLI is not available in PATH." -ForegroundColor Red
    exit 1
}

Write-Host "Deleting CloudFormation stack and all provisioned resources..." -ForegroundColor Yellow
sam delete --stack-name $StackName --region $Region --no-prompts

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nStack $StackName successfully deleted." -ForegroundColor Green
} else {
    Write-Host "`nERROR: Stack deletion failed." -ForegroundColor Red
    exit 1
}
