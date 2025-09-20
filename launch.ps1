$ErrorActionPreference = 'Stop'
$CURRENT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $CURRENT_DIR

Write-Host "=== Gif Studio v1.3.0 Portable Launch ==="

# Logging
if (!(Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" | Out-Null }
$tag = Get-Date -Format "yyyy-MM-dd"
Start-Transcript -Path ("logs/launch-" + $tag + ".log") -Append

# Ensure config dir
if (!(Test-Path "config")) { New-Item -ItemType Directory -Path "config" | Out-Null }

# Preferred port
$lastPortFile = "config/lastport.txt"
$port = 5173
if (Test-Path $lastPortFile) {
    try { $port = Get-Content $lastPortFile | Select-Object -First 1 } catch { $port = 5173 }
}

# Prepare node portable
$nodeRoot = Join-Path $CURRENT_DIR "node-portable"
if (!(Test-Path $nodeRoot)) { New-Item -ItemType Directory -Path $nodeRoot | Out-Null }

# Find node.exe
$nodeExe = Get-ChildItem -Path $nodeRoot -Recurse -Filter node.exe -ErrorAction SilentlyContinue | Select-Object -First 1

# Download and extract if missing
if (-not $nodeExe) {
    Write-Host "Downloading Node.js portable (x64 v20.17.0)..."
    $nodeUrl = "https://nodejs.org/dist/v20.17.0/node-v20.17.0-win-x64.zip"
    $dlPath = Join-Path $CURRENT_DIR "node.zip"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $dlPath -UseBasicParsing
    Expand-Archive $dlPath -DestinationPath $nodeRoot -Force
    Remove-Item $dlPath -Force

    # Flatten structure
    $sub = Get-ChildItem $nodeRoot | Where-Object { $_.PSIsContainer } | Select-Object -First 1
    if ($sub) {
        Move-Item -Force -Path (Join-Path $sub.FullName '*') -Destination $nodeRoot
        Remove-Item $sub.FullName -Recurse -Force
    }

    $nodeExe = Get-ChildItem -Path $nodeRoot -Recurse -Filter node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
}

if (-not $nodeExe) {
    Write-Host "ERROR: node.exe not found after extraction."
    Stop-Transcript
    exit 1
}

$nodeBin = Split-Path $nodeExe.FullName
$npmCmd = Join-Path $nodeBin "npm.cmd"

if (!(Test-Path $npmCmd)) {
    Write-Host "ERROR: npm.cmd not found in node-portable. Extraction likely failed."
    Stop-Transcript
    exit 1
}

# Install deps if needed
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    & "$npmCmd" install 2>&1 | Tee-Object -FilePath "logs/install.log"
}

# Start server on a free port (try up to 10 ports)
function Wait-ForServer([int]$tryPort) {
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $r = curl.exe -s "http://localhost:$tryPort/"
            if ($LASTEXITCODE -eq 0) { return $true }
        } catch {}
        Start-Sleep -Seconds 1
    }
    return $false
}

function Start-App([int]$tryPort) {
    Write-Host "Starting Vite on port $tryPort..."
    $p = Start-Process "$npmCmd" -ArgumentList "run", "dev", "--", "--port", "$tryPort" -PassThru -NoNewWindow
    if (Wait-ForServer $tryPort) {
        Set-Content $lastPortFile $tryPort
        Start-Process "http://localhost:$tryPort"
        return $true
    } else {
        if ($p -and !$p.HasExited) { $p | Stop-Process -Force }
        return $false
    }
}

$ok = $false
for ($i = 0; $i -lt 10; $i++) {
    $tryPort = [int]$port + $i
    if (Start-App $tryPort) { $ok = $true; break }
}

if (-not $ok) {
    Write-Host "ERROR: Failed to launch after trying 10 ports."
    Stop-Transcript
    exit 1
}

Stop-Transcript
