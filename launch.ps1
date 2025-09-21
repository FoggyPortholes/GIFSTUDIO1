Write-Log "[+] Checking Node portable..."

$nodeExe = (Get-ChildItem "$here\..\node-portable\node-v*\win-x64\node.exe" -Recurse |
            Select-Object -First 1 -ExpandProperty FullName)

if (-not $nodeExe) {
  throw "Node portable not found under node-portable folder."
}

$nodeDir = Split-Path $nodeExe
$npmCmd  = Join-Path $nodeDir "npm.cmd"

if (-not (Test-Path $npmCmd)) {
  Write-Log "[!] npm.cmd not found next to node.exe, falling back to system npm"
  $npmCmd = (Get-Command npm -ErrorAction SilentlyContinue).Source
  if (-not $npmCmd) { throw "No npm found (portable or system)" }
}

Write-Log "[+] Node:  $(& $nodeExe --version)"
Write-Log "[+] npm:   $(& $npmCmd --version)"
