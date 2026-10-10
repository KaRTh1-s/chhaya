# scripts/verify_state.ps1
# Complete repository verification and state inspection script

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  1. GIT STATUS" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
git status

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "  2. GIT TAGS" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
git tag -l

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "  3. LAST 10 COMMITS" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
git log -n 10 --oneline --decorate

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "  4. REAL FIXTURES AUDIT (_meta, Peaks, WBGT/AQI, Avoid/Reduced Counts)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
python scripts/verify_fixtures.py

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "  5. SCENARIO LIST FROM LOCAL SERVER / ROUTER (GET /scenarios)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
python scripts/verify_fixtures.py scenarios

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "  6. PYTEST SUMMARY (Tests Per Package)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
python -m pytest engine/tests backend/tests --tb=short
