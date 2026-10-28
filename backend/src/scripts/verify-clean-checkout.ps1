# Clean directory verification script
$source = "d:\Downloads\founders-den-redesign\backend"
$target = "C:\Users\manme\.gemini\antigravity-ide\brain\fa862b18-0e2d-4382-8c26-c0ceec0bac6c\scratch\clean-backend"

Write-Host "Creating clean checkout directory at $target..."
if (Test-Path $target) { Remove-Item -Recurse -Force $target }
New-Item -ItemType Directory -Path $target -Force | Out-Null

# Copy source repository backend code
Copy-Item -Path "$source\*" -Destination $target -Recurse -Exclude "dist","node_modules",".env"

# Copy .env for real connection credentials
Copy-Item -Path "$source\.env" -Destination "$target\.env"

Write-Host "Running npm ci in clean directory..."
Push-Location $target
npm ci

Write-Host "Running npm run build in clean directory..."
npm run build

Write-Host "Starting production backend on port 5055..."
$env:PORT = "5055"
$env:NODE_ENV = "production"
$process = Start-Process node -ArgumentList "dist/server.js" -WorkingDirectory $target -PassThru

Start-Sleep -Seconds 4

try {
    Write-Host "`n--- GET http://localhost:5055/health ---"
    $health = curl.exe -s http://localhost:5055/health
    Write-Host $health

    Write-Host "`n--- GET http://localhost:5055/api/v1/ready ---"
    $ready = curl.exe -s http://localhost:5055/api/v1/ready
    Write-Host $ready
} finally {
    Write-Host "`nStopping background test process $($process.Id)..."
    Stop-Process -Id $process.Id -Force
    Pop-Location
}
