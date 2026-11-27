# Fork test run (fork only, not for upstream)

How to test the `develop` state in your own game. This folder only exists in the fork
`Celteron/path-of-levelling-2` on `develop` and is never part of an upstream PR (PR branches start
from `main`). It is a personal test guide, not project documentation.

## 1. Setup

The scripts stop a running PoL2, back up the settings, fetch or update the test build in
`~/pol2-test`, install everything, **build the app like a release** (no dev server, no DevTools; takes
about a minute) and start it. Stop it via the tray icon → Quit or `Ctrl+C` in the terminal. To update,
run the same script again.

**Important:** the test build uses the same settings folder `Path Of Levelling 2` as the installed app.
That is why the script makes a backup; in return your real notes and builds are tested as well.

### SteamOS / Linux

SteamOS has a read-only system and no Node.js. The script still needs neither root nor `pacman`: if
Node.js 22+ is missing, it downloads a pinned Node build (checksum verified) to
`~/.local/share/pol2-test/` and only uses it for itself. SteamOS ships Git, curl, tar and xz.

1. Switch to **Desktop Mode**. Game Mode only shows one window, the overlay is invisible there.
   The script starts the app through XWayland (`--ozone-platform=x11`). As a native Wayland app the
   overlay cannot be clicked through and blocks mouse and keyboard of the game.
2. Open Konsole and paste:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/Celteron/path-of-levelling-2/develop/fork-testing/setup-test.sh -o /tmp/pol2-setup.sh
   bash /tmp/pol2-setup.sh
   ```
   The line `Version:` shows the tested commit. GitHub may serve a new script a few minutes late.
3. Start PoE2 in Desktop Mode through Steam.
4. KDE (SteamOS desktop): create the two window rules from `docs/index.md` → "Additional Linux Setup
   Steps" if not done yet (overlay above the fullscreen game, no flashing taskbar icon). In the
   taskbar rule, also set **Skip switcher: Force, Yes**, so `Alt+Tab` never lands on the overlay.

Other Linux desktops with Wayland/Hyprland: see the window rules in `docs/common-issues.md`.

### Windows

Install [Git](https://git-scm.com) and [Node.js 22 LTS or newer](https://nodejs.org) first. Then in
PowerShell:
```powershell
irm https://raw.githubusercontent.com/Celteron/path-of-levelling-2/develop/fork-testing/setup-test.ps1 -OutFile $env:TEMP\pol2-setup.ps1
powershell -ExecutionPolicy Bypass -File $env:TEMP\pol2-setup.ps1
```

### Restart the test build (without rebuilding)

Quit (tray → Quit or `Ctrl+C`), then start it directly:
- SteamOS/Linux: `~/pol2-test/dist/linux-unpacked/path-of-levelling-2 --ozone-platform=x11`
- Windows: `& "$HOME\pol2-test\dist\win-unpacked\Path Of Levelling 2.exe"`

### Emergency exit

If the overlay blocks mouse or keyboard: `Alt+Tab` to the terminal and `Ctrl+C`. If that does not work,
run `pkill -f pol2-test/` in another console or via SSH.

## 2. The one thing to know

- **In game the overlay ignores the mouse.** To click or hover in a PoL2 window, press `Ctrl+Alt+S`
  first (opens the settings), and `Ctrl+Alt+S` again afterwards.
- Hotkeys: `Ctrl+Alt+N` / `Ctrl+Alt+B` next/previous guide page, `Ctrl+Alt+J` show/hide guide,
  `Ctrl+Alt+A` show/hide all windows, `Ctrl+Alt+S` settings.
- The app reads Client.txt about every 5 seconds, so reactions to zone changes take up to 5 seconds.

## 3. Checklist

Go through it in order, ideally with a new character so the guide fits from the start. For every
failure note: number, what happened, for the guide also the page (e.g. `12 / 136`) and the zone.

**Round 2 (after the 2026-11-27 fixes):** run the setup script again, then retest 1, 4 and 10, test
the new item 19 and the open items 16–18.

### A. Start and login

1. **Overlay hidden at login, also right after starting.** Start the test build while PoE2 is at the
   login or character select screen (and once while you are in game).
   *Expected:* At login/character select no PoL2 windows are visible, not even right after the start.
   In game they appear within a few seconds.
2. **Client.txt found.** `Ctrl+Alt+S`, look at the General page.
   *Expected:* The Client.txt path ends with `logs/Client.txt` (or `logs\Client.txt`), no red error.
   Close with `Ctrl+Alt+S`.
3. **Single instance.** While the test build runs, open a second terminal and run the start command
   from "Restart the test build".
   *Expected:* The command ends by itself after a few seconds, no second overlay appears.

### B. Leveling guide

4. **Guide appears together with the other windows.** Log in a character, do not press any hotkey.
   *Expected:* The guide window appears at the same time as the other PoL2 windows: `Act 1` at the
   top, next to it `→ <target zone>` and the counter `1 / 136`, numbered steps below. Badges like `CP`
   (checkpoint), `WP` (waypoint) or `!` (quest) stand for icons.
5. **Place the window.** `Ctrl+Alt+S`, hover the guide window: a bar appears at the bottom. Click
   `Move/Resize`, drag the window and resize it at the bottom right corner, click `Done`,
   `Ctrl+Alt+S`.
   *Expected:* Moving and resizing work (persistence is checked in step 14).
6. **Advances by itself.** Remember the target zone after `→`, play normally and enter that zone.
   *Expected:* Within 5 seconds the counter goes up by one and the next steps appear.
7. **Stays put.** Enter zones that are not the target (town, side areas).
   *Expected:* Page and counter do not change.
8. **Quick pass.** Enter a target zone with a waypoint and travel on by waypoint right away.
   *Expected:* The guide still advances.
9. **Level recommendation.** Look at the level tracker (`Level Diff …`, `Exp Multi …`).
   *Expected:* In combat zones it also shows `Zone: x | y` (recommended character level, e.g.
   `Zone: 2 | 2` in the Grelwood), not in towns.
10. **Change pages by hotkey.** Without opening the settings, press `Ctrl+Alt+N` (next page), then
    `Ctrl+Alt+B` (previous page) and watch the counter at the top right of the guide window.
    *Expected:* `4 / 136` becomes `5 / 136`, then `4 / 136` again (numbers depend on your progress).
    With the settings open, the `‹` `›` buttons next to the counter do the same.
11. **Show and hide.** Press `Ctrl+Alt+J` twice, then `Ctrl+Alt+A` twice.
    *Expected:* First only the guide disappears and comes back; then all windows disappear and come
    back together.
12. **Optional steps.** `Ctrl+Alt+S`, hover the guide, click `Optional steps`, then click again.
    *Expected:* The grey (optional) steps disappear and the button turns pale; after the second click
    everything is back.
13. **League start.** Turn `League start` off and on again the same way.
    *Expected:* Off (later playthrough) some steps or whole pages disappear; on brings them back. Set it
    to what fits you afterwards (fresh league = on).
14. **Progress is kept.** Play a few pages further, quit the test build (tray → Quit) and restart it.
    *Expected:* Guide on the same page, window at the same position and size.
15. **Restart the guide.** `Ctrl+Alt+S`, hover the guide, `Restart guide`; cancel the dialog first,
    then again and confirm.
    *Expected:* Cancel changes nothing, OK sets the guide to `1 / 136`. Page back to your progress with
    `Ctrl+Alt+N` afterwards.

### C. Other changes

16. **PoB import.** In Path of Building export the build as code or copy a pobb.in link. In PoL2:
    `Ctrl+Alt+S` → Gems → paste into the field next to `Import from PoB` → click. Then paste some
    nonsense and import once more.
    *Expected:* Gem setups appear sorted by level and are only kept after saving. Nonsense shows a red
    error and the old setups stay.
17. **Unsaved changes.** Settings → Act Notes: type something, then click another page on the left.
    *Expected:* A confirmation dialog. Cancel stays on the page, OK discards the change.
18. **No scrollbar (Linux only).** Look at the bottom edge of the screen while the overlay runs.
    *Expected:* No horizontal scrollbar.
19. **Alt+Tab skips the overlay (KDE).** With the "Skip switcher" window rule from setup step 4, press
    `Alt+Tab` in game.
    *Expected:* The switcher goes straight to other windows (browser, terminal), never to the overlay.

## 4. Reporting

- Failed numbers with a short description (guide: page and zone). A screenshot helps.
- On crashes, the log file: Linux/SteamOS `~/.config/Path Of Levelling 2/logs/main.log`,
  Windows `%APPDATA%\Path Of Levelling 2\logs\main.log`.
- Failed setup: the terminal output from the last `==>` line on.

## 5. Back to the normal app

Quit the test build and start the installed app as usual. The test build only adds its own settings,
which the old app ignores. To go back anyway: delete the folder `Path Of Levelling 2` and rename the
newest `Path Of Levelling 2-backup-…` to `Path Of Levelling 2` (Linux/SteamOS in `~/.config`, Windows in
`%APPDATA%`).
