$ErrorActionPreference = 'Stop'
$CURRENT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $CURRENT_DIR

Write-Host "=== Gif Studio Portable Launch ==="

function Write-Step([string]$Message) {
    Write-Host "[+] $Message"
}

function Write-Warn([string]$Message) {
    Write-Host "[!] $Message"
}

function Stop-TranscriptSafe {
    try {
        Stop-Transcript | Out-Null
    } catch {
    }
}

function Write-ErrorAndExit([string]$Message, [int]$Code = 1) {
    Write-Host "✖ $Message"
    Stop-TranscriptSafe
    exit $Code
}

# Ensure logs directory and rotating log
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}
$dateTag = Get-Date -Format "yyyy-MM-dd"
$logFile = "logs/launch-$dateTag.log"
Start-Transcript -Path $logFile -Append | Out-Null

# Ensure config directory
if (!(Test-Path "config")) {
    New-Item -ItemType Directory -Path "config" | Out-Null
}

$lastPortFile = "config/lastport.txt"
$installMarker = "config/last-install.sha256"
$port = 5173
if (Test-Path $lastPortFile) {
    try {
        $port = [int](Get-Content $lastPortFile | Select-Object -First 1)
    } catch {
        $port = 5173
    }
}

function Ensure-NodePortable {
    param(
        [string]$Destination
    )

    $nodeExePath = Join-Path $Destination "node.exe"
    if (Test-Path $nodeExePath) {
        return $nodeExePath
    }

    if (Test-Path $Destination) {
        Write-Warn "Existing node-portable folder incomplete. Resetting..."
        Remove-Item -Path $Destination -Recurse -Force
    }

    $nodeVersion = "v20.17.0"
    $zipName = "node-$nodeVersion-win-x64.zip"
    $downloadUrl = "https://nodejs.org/dist/$nodeVersion/$zipName"
    $tempDir = Join-Path ([IO.Path]::GetTempPath()) "gifstudio-node"
    $zipPath = Join-Path $tempDir $zipName

    if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempDir | Out-Null

    Write-Step "Downloading Node.js $nodeVersion portable..."
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
    } catch {
        Write-ErrorAndExit "Failed to download Node.js from $downloadUrl. $_"
    }

    Write-Step "Extracting Node.js archive..."
    $extractDir = Join-Path $tempDir "extracted"
    Expand-Archive -LiteralPath $zipPath -DestinationPath $extractDir -Force

    $nodeFolder = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1
    if (-not $nodeFolder) {
        Write-ErrorAndExit "Node.js archive did not contain the expected folder."
    }

    New-Item -ItemType Directory -Path $Destination | Out-Null
    Get-ChildItem -Path $nodeFolder.FullName -Force | ForEach-Object {
        $target = Join-Path $Destination $_.Name
        if (Test-Path $target) {
            Remove-Item -Path $target -Recurse -Force
        }
        Move-Item -Path $_.FullName -Destination $Destination -Force
    }

    Remove-Item -Path $tempDir -Recurse -Force

    if (!(Test-Path $nodeExePath)) {
        Write-ErrorAndExit "Node.js executable not found after extraction."
    }

    return $nodeExePath
}

function Get-FileHashHex {
    param(
        [string]$Path
    )
    if (!(Test-Path $Path)) {
        return ""
    }
    return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash
}

function Ensure-Dependencies {
    param(
        [string]$NpmCmd
    )

    $lockFile = Join-Path $CURRENT_DIR "package-lock.json"
    $lockHash = Get-FileHashHex $lockFile
    $needInstall = $false

    if (!(Test-Path "node_modules")) {
        $needInstall = $true
    } elseif (!(Test-Path $installMarker)) {
        $needInstall = $true
    } else {
        $previousHash = Get-Content $installMarker | Select-Object -First 1
        if ($previousHash -ne $lockHash) {
            $needInstall = $true
        }
    }

    if (-not $needInstall) {
        Write-Step "Dependencies up to date."
        return
    }

    if (Test-Path "node_modules") {
        Write-Step "Removing outdated node_modules..."
        Remove-Item -Path "node_modules" -Recurse -Force
    }

    $logPath = "logs/install.log"
    Write-Step "Installing dependencies..."
    try {
        if (Test-Path $lockFile) {
            & $NpmCmd ci | Tee-Object -FilePath $logPath
        } else {
            & $NpmCmd install | Tee-Object -FilePath $logPath
        }
    } catch {
        Write-Warn "Dependency installation failed. Retrying with a clean state..."
        if (Test-Path "node_modules") {
            Remove-Item -Path "node_modules" -Recurse -Force
        }
        if (Test-Path $lockFile) {
            & $NpmCmd ci | Tee-Object -FilePath $logPath
        } else {
            & $NpmCmd install | Tee-Object -FilePath $logPath
        }
    }

    if ($lockHash) {
        Set-Content -Path $installMarker -Value $lockHash
    } else {
        Remove-Item -Path $installMarker -ErrorAction SilentlyContinue
    }
}

function Wait-ForServer {
    param(
        [int]$TryPort,
        [int]$TimeoutSeconds = 40
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$TryPort/" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        } catch {
            Start-Sleep -Seconds 1
            continue
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Start-App {
    param(
        [string]$NpmCmd,
        [int]$TryPort
    )

    Write-Step "Launching on port $TryPort..."
    $process = Start-Process $NpmCmd -ArgumentList "run", "dev", "--", "--port", "$TryPort", "--host" -WorkingDirectory $CURRENT_DIR -PassThru -NoNewWindow

    if (Wait-ForServer -TryPort $TryPort) {
        Set-Content $lastPortFile $TryPort
        Write-Step "Gif Studio running at http://localhost:$TryPort"
        Start-Process "http://localhost:$TryPort" | Out-Null
        return $true
    }

    Write-Warn "Server failed to start on port $TryPort"
    if ($process -and -not $process.HasExited) {
        $process | Stop-Process -Force
    }
    return $false
}

$nodeExe = Ensure-NodePortable -Destination (Join-Path $CURRENT_DIR "node-portable")
$nodeBin = Split-Path $nodeExe
$npmCmd = Join-Path $nodeBin "npm.cmd"

if (!(Test-Path $npmCmd)) {
    Write-ErrorAndExit "npm.cmd not found alongside Node.js."
}

Write-Step "Using Node.js located at $nodeBin"
& $nodeExe -v
& $npmCmd -v

Ensure-Dependencies -NpmCmd $npmCmd

$maxTries = 10
$ok = $false
for ($i = 0; $i -lt $maxTries; $i++) {
    $tryPort = [int]$port + $i
    if (Start-App -NpmCmd $npmCmd -TryPort $tryPort) {
        $ok = $true
        break
    }
}

if (-not $ok) {
    Write-Warn "Failed to launch after trying $maxTries ports."
    Write-Warn "Tip: Delete config/lastport.txt if it is stuck on an unavailable port."
    Write-ErrorAndExit "Unable to start Gif Studio."
}

Stop-TranscriptSafe
