#!/usr/bin/env bash
# Sets up and starts the PoL2 fork test build (branch develop) on Linux, including SteamOS.
# Needs no root: if Node.js 22+ is missing, a pinned Node build is downloaded into the
# user's home (SteamOS has a read-only system and no Node). See fork-testing/README.md.
#
# Env overrides: POL2_TEST_DIR (default ~/pol2-test), POL2_NO_START=1 (set up only).
set -euo pipefail

NODE_VERSION="22.23.2"
NODE_SHA256="d60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307" # linux-x64.tar.xz
REPO_URL="https://github.com/Celteron/path-of-levelling-2.git"
TEST_DIR="${POL2_TEST_DIR:-$HOME/pol2-test}"
NODE_DIR="$HOME/.local/share/pol2-test/node-v$NODE_VERSION"

step() { printf '\n==> %s\n' "$1"; }
fail() { printf '\nFEHLER: %s\n' "$1" >&2; exit 1; }

step "Werkzeuge pruefen"
for tool in git curl tar xz sha256sum; do
	command -v "$tool" >/dev/null || fail "$tool fehlt"
done
[ "$(uname -m)" = "x86_64" ] || fail "nur x86_64 wird unterstuetzt"

step "Node.js pruefen"
node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
if [ -x "$NODE_DIR/bin/node" ]; then
	export PATH="$NODE_DIR/bin:$PATH"
fi
if ! command -v node >/dev/null || [ "$(node_major)" -lt 22 ]; then
	echo "Kein Node.js 22+ gefunden, lade Node $NODE_VERSION nach $NODE_DIR (ohne Root)"
	tmp="$(mktemp -d)"
	trap 'rm -rf "$tmp"' EXIT
	archive="node-v$NODE_VERSION-linux-x64.tar.xz"
	curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/$archive" -o "$tmp/$archive"
	echo "$NODE_SHA256  $tmp/$archive" | sha256sum -c --quiet || fail "Pruefsumme von Node stimmt nicht"
	mkdir -p "$NODE_DIR"
	tar -xJf "$tmp/$archive" -C "$NODE_DIR" --strip-components=1
	export PATH="$NODE_DIR/bin:$PATH"
fi
echo "Node $(node --version), npm $(npm --version)"

step "Laufendes PoL2 beenden"
# Installed app (AppImage) and earlier test runs share the app name and would block the test build.
# Match only real app processes: a broad name pattern would also hit shells whose command line
# contains the repo URL.
stopped=0
pkill -f -i 'levelling[^ /]*\.appimage|/\.mount_path' && stopped=1
pkill -f "$TEST_DIR/node_modules/" && stopped=1
if [ "$stopped" = 1 ]; then sleep 2; else echo "nichts zu beenden"; fi

step "Einstellungen sichern"
settings="$HOME/.config/Path Of Levelling 2"
if [ -d "$settings" ]; then
	backup="$settings-backup-$(date +%Y%m%d-%H%M%S)"
	cp -r "$settings" "$backup"
	echo "Backup: $backup"
else
	echo "keine Einstellungen vorhanden"
fi

step "Testversion holen"
if [ -d "$TEST_DIR/.git" ]; then
	git -C "$TEST_DIR" switch develop
	git -C "$TEST_DIR" pull --ff-only
else
	git clone -b develop "$REPO_URL" "$TEST_DIR"
fi
cd "$TEST_DIR"
git log -1 --format='Stand: %h %s'

step "Abhaengigkeiten installieren"
# npm 11.6+/12 only runs install scripts of allowed packages; Electron needs its download script
echo "allow-scripts=electron,electron-overlay-window,esbuild" > .npmrc
npm ci --no-audit --no-fund

if [ "${POL2_NO_START:-}" = "1" ]; then
	step "Fertig (ohne Start)"
	exit 0
fi

step "Testversion starten (beenden mit Ctrl+C)"
npm run dev
