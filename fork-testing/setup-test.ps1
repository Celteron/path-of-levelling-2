# Sets up and starts the PoL2 fork test build (branch develop) on Windows. See fork-testing/README.md.
# Needs Git and Node.js 22+ (https://git-scm.com, https://nodejs.org).
# Env overrides: POL2_TEST_DIR (default ~\pol2-test), POL2_NO_START=1 (set up only).
$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/Celteron/path-of-levelling-2.git"
$TestDir = if ($env:POL2_TEST_DIR) { $env:POL2_TEST_DIR } else { Join-Path $HOME "pol2-test" }

function Step($text) { Write-Host "`n==> $text" }
function Invoke-Checked { & $args[0] $args[1..($args.Count - 1)]; if ($LASTEXITCODE) { throw "$($args -join ' ') ist fehlgeschlagen" } }

Step "Werkzeuge pruefen"
foreach ($tool in "git", "node", "npm") {
	if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "$tool fehlt, bitte installieren" }
}
$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 22) { throw "Node $nodeMajor ist zu alt, mindestens 22 noetig" }
Write-Host "Node $(node --version), npm $(npm --version)"

Step "Laufendes PoL2 beenden"
# Installed app and earlier test runs share the app name and would block the test build
Get-Process -Name "Path Of Levelling 2" -ErrorAction SilentlyContinue | Stop-Process
Get-Process -Name "electron" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*pol2-test*" } | Stop-Process

Step "Einstellungen sichern"
$settings = Join-Path $env:APPDATA "Path Of Levelling 2"
if (Test-Path $settings) {
	$backup = "$settings-backup-$(Get-Date -Format yyyyMMdd-HHmmss)"
	Copy-Item $settings $backup -Recurse
	Write-Host "Backup: $backup"
} else {
	Write-Host "keine Einstellungen vorhanden"
}

Step "Testversion holen"
if (Test-Path (Join-Path $TestDir ".git")) {
	Invoke-Checked git -C $TestDir switch develop
	Invoke-Checked git -C $TestDir pull --ff-only
} else {
	Invoke-Checked git clone -b develop $RepoUrl $TestDir
}
Set-Location $TestDir
git log -1 --format="Stand: %h %s"

Step "Abhaengigkeiten installieren"
# npm 11.6+/12 only runs install scripts of allowed packages; Electron needs its download script
"allow-scripts=electron,electron-overlay-window,esbuild" | Set-Content .npmrc
Invoke-Checked npm ci --no-audit --no-fund

if ($env:POL2_NO_START -eq "1") { Step "Fertig (ohne Start)"; exit 0 }

Step "Testversion starten (beenden mit Ctrl+C)"
npm run dev
