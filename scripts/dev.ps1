param (
    [Parameter(Position=0)]
    [string]$Command,
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

switch ($Command) {
    "setup" {
        python -m venv .venv
        .venv\Scripts\pip install -e ./engine[dev]
        .venv\Scripts\pip install -e ./backend[dev]
        Set-Location web
        npm install
        npm install -D vitest
        Set-Location ..
    }
    "test" {
        .venv\Scripts\pytest engine/tests backend/tests
        Set-Location web
        npx vitest run
        Set-Location ..
    }
    "lint" {
        .venv\Scripts\ruff check .
        Set-Location web
        npm run lint
        Set-Location ..
    }
    "run-cli" {
        .venv\Scripts\python -m chhaya_engine.cli $Args
    }
    "clean" {
        if (Test-Path .venv) { Remove-Item -Recurse -Force .venv }
        if (Test-Path web\node_modules) { Remove-Item -Recurse -Force web\node_modules }
        if (Test-Path web\dist) { Remove-Item -Recurse -Force web\dist }
    }
    default {
        Write-Host "Usage: .\scripts\dev.ps1 <setup|test|lint|run-cli|clean>"
    }
}
