#!/usr/bin/env bash
# Builds and starts the PoL2 fork test build (branch develop) on Linux, including SteamOS.
# Fork-only helper for test runs, never part of an upstream PR. See fork-testing/README.md.
#
# The app is built like a release (unpacked, no dev server, no DevTools) and started through
# XWayland: on Wayland the overlay cannot be clicked through and blocks the game.
# Needs no root: if Node.js 22+ is missing, a pinned Node build is downloaded into the
# user's home (SteamOS has a read-only system and no Node).
#
# Env overrides: POL2_TEST_DIR (default ~/pol2-test), POL2_NO_START=1 (build only).
set -euo pipefail

NODE_VERSION="22.23.2"
NODE_SHA256="d60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307" # linux-x64.tar.xz
REPO_URL="https://github.com/Celteron/path-of-levelling-2.git"
TEST_DIR="${POL2_TEST_DIR:-$HOME/pol2-test}"
NODE_DIR="$HOME/.local/share/pol2-test/node-v$NODE_VERSION"
APP="$TEST_DIR/dist/linux-unpacked/path-of-levelling-2"

step() { printf '\n==> %s\n' "$1"; }
fail() { printf '\nERROR: %s\n' "$1" >&2; exit 1; }

step "Checking tools"
for tool in git curl tar xz sha256sum; do
	command -v "$tool" >/dev/null || fail "$tool is missing"
done
[ "$(uname -m)" = "x86_64" ] || fail "only x86_64 is supported"

step "Checking Node.js"
node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
if [ -x "$NODE_DIR/bin/node" ]; then
	export PATH="$NODE_DIR/bin:$PATH"
fi
if ! command -v node >/dev/null || [ "$(node_major)" -lt 22 ]; then
	echo "No Node.js 22+ found, downloading Node $NODE_VERSION to $NODE_DIR (no root needed)"
	tmp="$(mktemp -d)"
	trap 'rm -rf "$tmp"' EXIT
	archive="node-v$NODE_VERSION-linux-x64.tar.xz"
	curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/$archive" -o "$tmp/$archive"
	echo "$NODE_SHA256  $tmp/$archive" | sha256sum -c --quiet || fail "Node download checksum mismatch"
	mkdir -p "$NODE_DIR"
	tar -xJf "$tmp/$archive" -C "$NODE_DIR" --strip-components=1
	export PATH="$NODE_DIR/bin:$PATH"
fi
echo "Node $(node --version), npm $(npm --version)"

step "Stopping running PoL2"
# Installed app (AppImage) and earlier test runs share the app name and would block the test build.
# Command line patterns alone also match shells that merely mention a path or the repo URL, so
# shells are skipped by process name.
stopped=0
stop_matching() {
	local pid comm
	for pid in $(pgrep -f -i "$1" || true); do
		[ "$pid" = "$$" ] && continue
		comm="$(cat "/proc/$pid/comm" 2>/dev/null)" || continue
		case "$comm" in bash | sh | dash | zsh | fish | pgrep) continue ;; esac
		kill "$pid" 2>/dev/null && stopped=1 && echo "stopped: $comm ($pid)"
	done
}
stop_matching 'levelling[^ /]*\.appimage|/\.mount_path'
stop_matching "$TEST_DIR/(node_modules|dist)/"
if [ "$stopped" = 1 ]; then sleep 2; else echo "nothing running"; fi

step "Backing up settings"
settings="$HOME/.config/Path Of Levelling 2"
if [ -d "$settings" ]; then
	backup="$settings-backup-$(date +%Y%m%d-%H%M%S)"
	cp -r "$settings" "$backup"
	echo "Backup: $backup"
else
	echo "no settings yet"
fi

step "Fetching test build"
if [ -d "$TEST_DIR/.git" ]; then
	git -C "$TEST_DIR" switch develop
	git -C "$TEST_DIR" pull --ff-only
else
	git clone -b develop "$REPO_URL" "$TEST_DIR"
fi
cd "$TEST_DIR"
git log -1 --format='Version: %h %s'

step "Installing dependencies"
# npm 11.6+/12 only runs install scripts of allowed packages; Electron needs its download script.
# The blocked electron-winstaller script is only used for Windows installers and can stay blocked.
echo "allow-scripts=electron,electron-overlay-window,esbuild" > .npmrc
npm ci --no-audit --no-fund --loglevel=error

step "Building the app (like a release, takes about a minute)"
npm run --silent transpile:electron
npm run --silent build > /dev/null
# -p never: never publish. npmRebuild=false: the overlay module ships prebuilt binaries and
# SteamOS has no compiler.
npx --yes electron-builder --linux dir --x64 -p never -c.npmRebuild=false > /dev/null
[ -x "$APP" ] || fail "build did not produce $APP"

if [ "${POL2_NO_START:-}" = "1" ]; then
	step "Done (not started)"
	exit 0
fi

step "Starting test build (stop with Ctrl+C or tray icon > Quit)"
exec "$APP" --ozone-platform=x11
