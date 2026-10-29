# ==============================================================================
# Crestara CRM - Automated cPanel Packaging & Deployment Preparation Script
# ==============================================================================
param(
    [switch]$Build = $false
)

$ErrorActionPreference = "Stop"
$rootPath = Resolve-Path "$PSScriptRoot\.."
$frontendPath = Join-Path $rootPath "frontend"
$distPath = Join-Path $frontendPath "dist"
$zipOutput = Join-Path $rootPath "crestara-crm-cpanel.zip"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Crestara CRM cPanel Packaging Utility " -ForegroundColor Cyan
Write-Host " Target Domain: crm.crestaraadvisorygroup.com" -ForegroundColor Gray
Write-Host " Target Path:   /home/{user}/crm.crestaraadvisorygroup.com" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Trigger Vite build if requested or if dist is missing
if ($Build -or -not (Test-Path $distPath)) {
    Write-Host "`n[1/4] Running production build with yarn build..." -ForegroundColor Yellow
    Push-Location $frontendPath
    try {
        yarn build
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`n[1/4] Using existing frontend/dist build (pass -Build to recompile)..." -ForegroundColor Green
}

# 2. Verify and sync public assets (e.g. .htaccess, api endpoints)
Write-Host "`n[2/4] Verifying critical server assets in dist..." -ForegroundColor Yellow

$requiredFiles = @(
    "index.html",
    ".htaccess",
    "favicon.png",
    "crestara_crest.png",
    "crestara_logo.png"
)

$publicPath = Join-Path $frontendPath "public"

foreach ($file in $requiredFiles) {
    $targetFile = Join-Path $distPath $file
    $sourceFile = Join-Path $publicPath $file
    if (Test-Path $sourceFile) {
        Copy-Item -Path $sourceFile -Destination $targetFile -Force
    }
}

# Sync api directory
$targetApi = Join-Path $distPath "api"
$sourceApi = Join-Path $publicPath "api"
if (-not (Test-Path $targetApi)) {
    New-Item -ItemType Directory -Path $targetApi -Force | Out-Null
}
Get-ChildItem -Path $sourceApi -File | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $targetApi $_.Name) -Force
}

# 3. Create zip archive with Linux-compatible forward-slash relative paths
Write-Host "`n[3/4] Creating deployment archive ($zipOutput)..." -ForegroundColor Yellow

if (Test-Path $zipOutput) {
    Remove-Item $zipOutput -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipArchive = [System.IO.Compression.ZipFile]::Open($zipOutput, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    Get-ChildItem -Path $distPath -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Substring($distPath.Length).TrimStart("\", "/") -replace "\\", "/"
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipArchive, $_.FullName, $relativePath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally {
    $zipArchive.Dispose()
}

$zipItem = Get-Item $zipOutput
$zipSizeMb = [math]::Round($zipItem.Length / 1MB, 2)
$hash = (Get-FileHash -Path $zipOutput -Algorithm SHA256).Hash

Write-Host "  Archive created successfully!" -ForegroundColor Green
Write-Host "  Size:   $zipSizeMb MB ($($zipItem.Length) bytes)" -ForegroundColor Gray
Write-Host "  SHA256: $hash" -ForegroundColor Gray

# 4. Instructions
Write-Host "`n[4/4] Next Deployment Steps for cPanel:" -ForegroundColor Cyan
Write-Host "  1. Log into your cPanel account at https://104.160.240.35:2083 (or https://cpanel.crestaraadvisorygroup.com)" -ForegroundColor White
Write-Host "  2. Open 'File Manager' and navigate to: /home/{user}/crm.crestaraadvisorygroup.com" -ForegroundColor White
Write-Host "  3. Click 'Upload' and select '$zipOutput'" -ForegroundColor White
Write-Host "  4. Right-click 'crestara-crm-cpanel.zip' and click 'Extract' (into the same folder)" -ForegroundColor White
Write-Host "  5. Ensure hidden files are shown (Settings > Show Hidden Files) to confirm .htaccess is extracted." -ForegroundColor White
Write-Host "  6. In cPanel > 'Cron Jobs', add the following daily schedule at 08:00 AM:" -ForegroundColor White
Write-Host "     0 8 * * * /usr/local/bin/php /home/{user}/crm.crestaraadvisorygroup.com/api/cron_reminders.php >> /home/{user}/cron_reminders.log 2>&1" -ForegroundColor Yellow
Write-Host "`nDeployment package ready!" -ForegroundColor Green
