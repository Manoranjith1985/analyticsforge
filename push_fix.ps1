Set-Location -Path $PSScriptRoot
git add -A
git commit -m "fix: replace invalid react-icons names, add type:module to package.json"
git push origin main
Write-Host "Pushed! Trigger a Manual Deploy on Render frontend." -ForegroundColor Green
