# Builds and starts the PoL2 fork test build (branch develop) on Windows.
# Fork-only helper for test runs, never part of an upstream PR. See fork-testing/README.md.
# The app is built like a release (unpacked, no dev server, no DevTools).
# Needs Git and Node.js 22+ (https://git-scm.com, https://nodejs.org).
# Env overrides: POL2_TEST_DIR (default ~\pol2-test), POL2_NO_START=1 (build only).
$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/Celteron/path-of-levelling-2.git"
$TestDir = if ($env:POL2_TEST_DIR) { $env:POL2_TEST_DIR } else { Join-Path $HOME "pol2-test" }
$App = Join-Path $TestDir "dist\win-unpacked\Path Of Levelling 2.exe"

function Step($text) { Write-Host "`n==> $text" }
function Invoke-Checked { & $args[0] $args[1..($args.Count - 1)]; if ($LASTEXITCODE) { throw "$($args -join ' ') failed" } }

Step "Checking tools"
foreach ($tool in "git", "node", "npm") {
	if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "$tool is missing, please install it" }
}
$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 22) { throw "Node $nodeMajor is too old, 22 or newer is needed" }
Write-Host "Node $(node --version), npm $(npm --version)"

Step "Stopping running PoL2"
# Installed app and earlier test runs share the app name and would block the test build
$running = Get-Process -Name "Path Of Levelling 2", "electron" -ErrorAction SilentlyContinue |
	Where-Object { $_.Name -eq "Path Of Levelling 2" -or $_.Path -like "*pol2-test*" }
if ($running) { $running | Stop-Process; Start-Sleep -Seconds 2; Write-Host "stopped: $($running.Count) process(es)" }
else { Write-Host "nothing running" }

Step "Backing up settings"
$settings = Join-Path $env:APPDATA "Path Of Levelling 2"
if (Test-Path $settings) {
	$backup = "$settings-backup-$(Get-Date -Format yyyyMMdd-HHmmss)"
	Copy-Item $settings $backup -Recurse
	Write-Host "Backup: $backup"
} else {
	Write-Host "no settings yet"
}

Step "Fetching test build"
if (Test-Path (Join-Path $TestDir ".git")) {
	Invoke-Checked git -C $TestDir switch develop
	Invoke-Checked git -C $TestDir pull --ff-only
} else {
	Invoke-Checked git clone -b develop $RepoUrl $TestDir
}
Set-Location $TestDir
git log -1 --format="Version: %h %s"

Step "Installing dependencies"
# npm 11.6+/12 only runs install scripts of allowed packages; Electron needs its download script
"allow-scripts=electron,electron-overlay-window,esbuild" | Set-Content .npmrc
Invoke-Checked npm ci --no-audit --no-fund --loglevel=error

Step "Building the app (like a release, takes about a minute)"
Invoke-Checked npm run --silent transpile:electron
Invoke-Checked npm run --silent build
# -p never: never publish. npmRebuild=false: the overlay module ships prebuilt binaries
Invoke-Checked npx --yes electron-builder --win dir --x64 -p never -c.npmRebuild=false
if (-not (Test-Path $App)) { throw "build did not produce $App" }

if ($env:POL2_NO_START -eq "1") { Step "Done (not started)"; exit 0 }

Step "Starting test build (stop with tray icon > Quit)"
Start-Process $App
