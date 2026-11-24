# LabelGuard India - SIH26034 PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Launching LabelGuard India (Smart India Hackathon 2026)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot

Write-Host "[1/3] Starting Python FastAPI Backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; .\venv\Scripts\activate; python -m uvicorn main:app --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 3

Write-Host "[2/3] Starting React Vite Frontend on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"

Start-Sleep -Seconds 4

Write-Host "[3/3] Opening application in your default browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "LabelGuard India is now running!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend : http://127.0.0.1:8000/docs" -ForegroundColor White
