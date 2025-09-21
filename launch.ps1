$ErrorActionPreference = 'Stop'
$CURRENT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $CURRENT_DIR

Write-Host "=== Gif Studio Portable Launch (Final Fixed) ==="

# Ensure logs directory and rotating log
if (!(Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" | Out-Null }
$dateTag = Get-Date -Format "yyyy-MM-dd"
$logFile = "logs/launch-$dateTag.log"
Start-Transcript -Path $logFile -Append

# Ensure config directory
if (!(Test-Path "config")) { New-Item -ItemType Directory -Path "config" | Out-Null }

# Load last port
$lastPortFile = "config/lastport.txt"
$port = 5173
if (Test-Path $lastPortFile) {
    try { $port = Get-Content $lastPortFile | Select-Object -First 1 } catch { $port = 5173 }
}

# Node.js portable location
$nodeRoot = Join-Path $CURRENT_DIR "node-portable"
if (!(Test-Path $nodeRoot)) {
    Write-Host "✖ node-portable not found. Please run pack_offline.ps1 or place Node.js portable here."
    Stop-Transcript
    exit 1
}

# Find node.exe and npm.cmd
$nodeExe = Get-ChildItem -Path $nodeRoot -Recurse -Filter node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $nodeExe) {
    Write-Host "✖ node.exe not found in node-portable/"
    Stop-Transcript
    exit 1
}

$nodeBin = Split-Path $nodeExe.FullName
$npmCmd = Join-Path $nodeBin "npm.cmd"

# Debug check: ensure npm exists
if (!(Test-Path $npmCmd)) {
    Write-Host "✖ npm.cmd not found at $npmCmd"
    Write-Host "Available candidates in ${nodeRoot}:"
    Get-ChildItem -Recurse $nodeRoot | Where-Object { $_.Name -like "npm*.cmd" }
    Stop-Transcript
    exit 1
}

Write-Host "Checking Node.js version..."
& "$($nodeExe.FullName)" -v
& "$npmCmd" -v

# Install dependencies if missing
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    try {
        & "$npmCmd" install | Tee-Object -FilePath "logs/install.log"
    } catch {
        Write-Host "⚠ npm install failed, retrying clean..."
        if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
        & "$npmCmd" install | Tee-Object -FilePath "logs/install.log"
    }
}

function Wait-ForServer($tryPort) {
    for ($i = 0; $i -lt 40; $i++) {
        try {
            $res = curl.exe -s "http://localhost:$tryPort/"
            if ($LASTEXITCODE -eq 0) { return $true }
        } catch {}
        Start-Sleep -Seconds 1
    }
    return $false
}

function Start-App($tryPort) {
    Write-Host "Launching on port $tryPort..."
    $process = Start-Process "$npmCmd" -ArgumentList "run", "dev", "--", "--port", "$tryPort" -PassThru -NoNewWindow
    if (Wait-ForServer $tryPort) {
        Set-Content $lastPortFile $tryPort
        Write-Host "✔ Gif Studio running at http://localhost:$tryPort"
        Start-Process "http://localhost:$tryPort"
        return $true
    } else {
        Write-Host "✖ Server failed to start on port $tryPort"
        if ($process -and !$process.HasExited) { $process | Stop-Process -Force }
        return $false
    }
} # <-- correctly closed here

# Try up to 10 ports
$maxTries = 10
$ok = $false
for ($i = 0; $i -lt $maxTries; $i++) {
    $tryPort = [int]$port + $i
    if (Start-App $tryPort) { $ok = $true; break }
}

if (-not $ok) {
    Write-Host "✖ Failed to launch after trying $maxTries ports."
    Write-Host "ℹ Tip: Delete config/lastport.txt if it’s stuck on a bad port."
    Stop-Transcript
    exit 1
}

Stop-Transcript
