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

$cmdExe = if ($env:ComSpec) { $env:ComSpec } else { "cmd.exe" }

function ConvertTo-CmdArgument {
    param(
        [string]$Value
    )

    if ($null -eq $Value) {
        return '""'
    }

    if ($Value -notmatch '[\s\"]') {
        return $Value
    }

    $escaped = $Value -replace '"', '""'
    return '"' + $escaped + '"'
}

function Get-CmdInvocationString {
    param(
        [string]$Executable,
        [string[]]$Arguments
    )

    $parts = @($Executable) + $Arguments
    return ($parts | ForEach-Object { ConvertTo-CmdArgument $_ }) -join ' '
}

function Invoke-Npm {
    param(
        [string[]]$Arguments,
        [string]$LogPath
    )

    $effectiveArguments = @()
    if ($npmBootstrapArgs) {
        $effectiveArguments += $npmBootstrapArgs
    }
    if ($Arguments) {
        $effectiveArguments += $Arguments
    }

    $command = Get-CmdInvocationString -Executable $npmExecutable -Arguments $effectiveArguments
    # Wrap the entire command so cmd.exe handles paths that contain spaces.
    $wrappedCommand = '"' + $command + '"'
    $cmdArgs = @("/d", "/s", "/c", $wrappedCommand)

    if ($LogPath) {
        $output = & $cmdExe $cmdArgs | Tee-Object -FilePath $LogPath
    } else {
        $output = & $cmdExe $cmdArgs
    }

    if ($LASTEXITCODE -ne 0) {
        $commandDisplay = "$npmExecutable $($effectiveArguments -join ' ')"
        throw "npm command failed with exit code $LASTEXITCODE while running: $commandDisplay"
    }

    return $output
}

function Start-NpmProcess {
    param(
        [string[]]$Arguments
    )

    $effectiveArguments = @()
    if ($npmBootstrapArgs) {
        $effectiveArguments += $npmBootstrapArgs
    }
    if ($Arguments) {
        $effectiveArguments += $Arguments
    }

    $command = Get-CmdInvocationString -Executable $npmExecutable -Arguments $effectiveArguments
    # Wrap the entire command so cmd.exe handles paths that contain spaces.
    $wrappedCommand = '"' + $command + '"'
    $cmdArgs = @("/d", "/s", "/c", $wrappedCommand)

    return Start-Process -FilePath $cmdExe -ArgumentList $cmdArgs -WorkingDirectory $CURRENT_DIR -PassThru -NoNewWindow
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

function Resolve-NpmExecutable {
    param(
        [string]$NodeExe
    )

    $nodeDir = Split-Path -Parent $NodeExe
    $candidateCmds = @(
        Join-Path $nodeDir "npm.cmd",
        Join-Path $nodeDir "node_modules\npm\bin\npm.cmd"
    ) | Where-Object { Test-Path $_ }

    if ($candidateCmds) {
        $cmdPath = $candidateCmds | Select-Object -First 1
        return [PSCustomObject]@{
            Executable    = $cmdPath
            BootstrapArgs = @()
            Source        = $cmdPath
            IsSystem      = $false
        }
    }

    $npmCliJs = Join-Path $nodeDir "node_modules\npm\bin\npm-cli.js"
    if (Test-Path $npmCliJs) {
        return [PSCustomObject]@{
            Executable    = $NodeExe
            BootstrapArgs = @($npmCliJs)
            Source        = $npmCliJs
            IsSystem      = $false
        }
    }

    $systemNpm = $null
    foreach ($name in @("npm.cmd", "npm")) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($cmd) {
            $resolvedPath = $null
            if ($cmd.PSObject.Properties.Match('Path')) {
                $resolvedPath = $cmd.Path
            }
            if (-not $resolvedPath -and $cmd.PSObject.Properties.Match('Source')) {
                $resolvedPath = $cmd.Source
            }
            if (-not $resolvedPath -and $cmd.PSObject.Properties.Match('Definition')) {
                $resolvedPath = $cmd.Definition
            }

            if ($resolvedPath) {
                $systemNpm = $resolvedPath
                break
            }
        }
    }

    if ($systemNpm) {
        return [PSCustomObject]@{
            Executable    = $systemNpm
            BootstrapArgs = @()
            Source        = "system npm at $systemNpm"
            IsSystem      = $true
        }
    }

    Write-ErrorAndExit "Unable to locate npm alongside Node.js or on PATH."
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

    $logPath = "logs/install.log"
    $installArgs = if (Test-Path $lockFile) { @("ci") } else { @("install") }
    $installLabel = "npm $($installArgs -join ' ')"
    Write-Step "Installing dependencies using $installLabel (log: $logPath)"

    $attempt = 1
    while ($true) {
        try {
            Invoke-Npm -Arguments $installArgs -LogPath $logPath | Out-Null
            break
        } catch {
            $errorMessage = $_.Exception.Message
            if ($attempt -ge 2) {
                Write-ErrorAndExit "Dependency installation failed after retry. See $logPath for details.`n$errorMessage"
            }

            Write-Warn "$installLabel failed on attempt $attempt. $errorMessage"
            if (Test-Path "node_modules") {
                Write-Step "Removing node_modules before retry..."
                Remove-Item -Path "node_modules" -Recurse -Force
            }
            $attempt++
        }
    }

    Write-Step "Dependencies installed successfully."

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
        [int]$TryPort
    )

    Write-Step "Launching on port $TryPort..."
    $process = Start-NpmProcess -Arguments @("run", "dev", "--", "--port", "$TryPort", "--host")

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

$npmBootstrapArgs = @()

$npmInfo = Resolve-NpmExecutable -NodeExe $nodeExe
$npmExecutable = $npmInfo.Executable
$npmBootstrapArgs = $npmInfo.BootstrapArgs
$npmSource = $npmInfo.Source

Write-Step "Node executable: $nodeExe"
$nodeVersion = (& $nodeExe -v | Select-Object -Last 1).Trim()
if ($nodeVersion) {
    Write-Step "Node version: $nodeVersion"
}

if ($npmInfo.IsSystem) {
    Write-Warn "npm portable not found. Falling back to $npmSource"
} else {
    Write-Step "Using npm located at $npmSource"
}
$npmVersion = Invoke-Npm -Arguments @("-v")
if ($npmVersion) {
    $npmVersionString = ($npmVersion | Select-Object -Last 1).Trim()
    if ($npmVersionString) {
        Write-Step "npm version: $npmVersionString"
    }
}

Ensure-Dependencies

$maxTries = 10
$ok = $false
for ($i = 0; $i -lt $maxTries; $i++) {
    $tryPort = [int]$port + $i
    if (Start-App -TryPort $tryPort) {
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
