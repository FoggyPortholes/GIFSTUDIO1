[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Log {
    param(
        [Parameter(Mandatory)]
        [string]$Message,
        [ValidateSet('INFO','WARN','ERROR')]
        [string]$Level = 'INFO'
    )

    $timestamp = Get-Date -Format 'HH:mm:ss'
    $color = switch ($Level) {
        'WARN' { 'Yellow' }
        'ERROR' { 'Red' }
        Default { 'Cyan' }
    }

    Write-Host "[$timestamp][$Level] $Message" -ForegroundColor $color
}

function Resolve-NodeEnvironment {
    param(
        [Parameter(Mandatory)]
        [string]$Root
    )

    $portableRoot = Join-Path -Path $Root -ChildPath 'node-portable'
    $portableNode = $null
    if (Test-Path $portableRoot) {
        $portableNode = Get-ChildItem -Path $portableRoot -Filter 'node.exe' -Recurse -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1 -ExpandProperty FullName
    }

    if ($portableNode) {
        [string]$nodeExe = $portableNode
        [string]$nodeDir = Split-Path -Path $nodeExe -Parent
        [string]$npmCandidate = Join-Path -Path $nodeDir -ChildPath 'npm.cmd'
        $npmCmd = $null
        if (Test-Path $npmCandidate) {
            $npmCmd = $npmCandidate
        }

        return [pscustomobject]@{
            NodeExe = $nodeExe
            NodeDir = $nodeDir
            NpmCmd  = $npmCmd
        }
    }

    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCommand) {
        return $null
    }

    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    [string]$nodeExeFallback = $nodeCommand.Source
    [string]$nodeDirFallback = Split-Path -Path $nodeExeFallback -Parent
    [string]$npmExeFallback = if ($npmCommand) { $npmCommand.Source } else { $null }

    return [pscustomobject]@{
        NodeExe = $nodeExeFallback
        NodeDir = $nodeDirFallback
        NpmCmd  = $npmExeFallback
    }
}

function Invoke-NpmCi {
    param(
        [Parameter(Mandatory)]
        [string]$NpmCmd
    )

    $maxAttempts = 2
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        Write-Log "Running npm ci (attempt $attempt/$maxAttempts)..."
        & $NpmCmd 'ci'
        $exitCode = $LASTEXITCODE
        if ($exitCode -eq 0) {
            Write-Log 'npm ci completed successfully.'
            return
        }

        if ($attempt -lt $maxAttempts) {
            Write-Log "npm ci failed with exit code $exitCode. Removing node_modules and retrying..." 'WARN'
            if (Test-Path 'node_modules') {
                Remove-Item -Path 'node_modules' -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
        else {
            throw "npm ci failed after $maxAttempts attempts (exit code $exitCode)."
        }
    }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).ProviderPath
Push-Location $repoRoot
try {
    Write-Log '=== GIF Studio Launch (Windows) ==='

    $nodeEnv = Resolve-NodeEnvironment -Root $repoRoot
    if (-not $nodeEnv) {
        throw 'Node.js not found. Install Node 18+ or provide node-portable.'
    }

    [string]$nodeExe = $nodeEnv.NodeExe
    [string]$nodeDir = $nodeEnv.NodeDir
    [string]$npmCmd = $nodeEnv.NpmCmd

    if (-not $npmCmd) {
        $npmFallback = Get-Command npm -ErrorAction SilentlyContinue
        if ($npmFallback) {
            $npmCmd = $npmFallback.Source
            Write-Log 'Using system npm because portable npm.cmd is missing.' 'WARN'
        }
    }

    if (-not $npmCmd) {
        throw 'npm could not be located. Ensure npm is installed or included with node-portable.'
    }

    Write-Log "Node executable: $nodeExe"
    Write-Log "Node directory:  $nodeDir"
    Write-Log "npm executable:  $npmCmd"
    Write-Log "Node version:    $(& $nodeExe '--version')"
    Write-Log "npm version:     $(& $npmCmd '--version')"

    Invoke-NpmCi -NpmCmd $npmCmd

    $configDir = Join-Path -Path $repoRoot -ChildPath 'config'
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir | Out-Null
    }

    $portFile = Join-Path -Path $configDir -ChildPath 'lastport.txt'
    [int]$basePort = 5173
    if (Test-Path $portFile) {
        $savedPortText = Get-Content -Path $portFile -ErrorAction SilentlyContinue | Select-Object -First 1
        [int]$parsedPort = 0
        if ([int]::TryParse($savedPortText, [ref]$parsedPort)) {
            $basePort = $parsedPort
        }
    }

    $maxPortAttempts = 5
    for ($offset = 0; $offset -lt $maxPortAttempts; $offset++) {
        $port = $basePort + $offset
        Write-Log "Starting dev server on port $port..."
        $npmArgs = @('run', 'dev', '--', '--port', "$port", '--strictPort=false')

        $process = Start-Process -FilePath $npmCmd -ArgumentList $npmArgs -WorkingDirectory $repoRoot -NoNewWindow -PassThru
        Start-Sleep -Seconds 2

        if ($process.HasExited) {
            $exitCode = $process.ExitCode
            Write-Log "Dev server exited immediately with code $exitCode. Trying next port..." 'WARN'
            continue
        }

        Set-Content -Path $portFile -Value $port
        try {
            Start-Process "http://localhost:$port" | Out-Null
        }
        catch {
            Write-Log "Unable to open browser automatically: $($_.Exception.Message)" 'WARN'
        }

        Write-Log "Dev server running at http://localhost:$port (Ctrl+C to stop)."
        $process.WaitForExit()
        return
    }

    throw "Failed to start dev server after $maxPortAttempts attempts."
}
finally {
    Pop-Location
}
