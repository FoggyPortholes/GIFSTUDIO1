Write-Host "=== Verifying GIFSTUDIO1 Repository ==="

$requiredFiles = @(
    ".github\workflows\release.yml",
    "launch.ps1",
    "launch.bat",
    "features.txt",
    "package.json",
    "vite.config.ts",
    "tsconfig.json",
    "index.html"
)

$requiredDirs = @("src","public","logs","node-portable")

# Check required files
Write-Host "`n-- Files --"
foreach ($f in $requiredFiles) {
    if (Test-Path $f) {
        Write-Host "✔ Found $f"
    } else {
        Write-Host "✖ Missing $f"
    }
}

# Check required directories
Write-Host "`n-- Dirs --"
foreach ($d in $requiredDirs) {
    if (Test-Path $d) {
        Write-Host "✔ Found $d"
    } else {
        Write-Host "✖ Missing $d (creating)"
        New-Item -ItemType Directory -Force -Path $d | Out-Null
    }
}

# Validate key contents of important files
Write-Host "`n-- Content checks --"

# launch.ps1
if (Test-Path "launch.ps1") {
    $launch = Get-Content "launch.ps1" -Raw
    if ($launch -match "node-portable") {
        Write-Host "✔ launch.ps1 mentions node-portable"
    } else {
        Write-Host "✖ launch.ps1 missing node-portable handling"
    }
}

# imageService.ts
$imageService = "src\services\imageService.ts"
if (Test-Path $imageService) {
    $img = Get-Content $imageService -Raw
    if ($img -match "palette") {
        Write-Host "✔ imageService.ts has palette handling"
    } else {
        Write-Host "✖ imageService.ts may be missing palette fix"
    }
} else {
    Write-Host "✖ src/services/imageService.ts not found"
}

# release.yml
$release = ".github\workflows\release.yml"
if (Test-Path $release) {
    $rel = Get-Content $release -Raw
    if ($rel -match "softprops/action-gh-release") {
        Write-Host "✔ release.yml uses action-gh-release"
    } else {
        Write-Host "✖ release.yml missing GitHub release action"
    }
} else {
    Write-Host "✖ release.yml not found"
}

Write-Host "`n=== Verification Complete ==="
