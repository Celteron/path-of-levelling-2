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
  `Ctrl+Alt+A` show/hide all windows, `Ctrl+Alt+P` pause/resume the campaign timer, `Ctrl+Alt+S`
  settings.
- The app reads Client.txt about every second, so reactions to zone changes take up to a second.

## 3. Checklist

Go through it in order, ideally with a new character so the guide fits from the start. For every
failure note: number, what happened, for the guide also the page (e.g. `12 / 136`) and the zone.

**Round 5 (2026-11-28, configurable hotkeys and long build names):** run the setup script again
(`Version:` must show `32cf904` or newer) and test 34 and 35. Round 4 passed; 16, 24 and 26 stay
untested for now.

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
9. **Level window.** Look at the level window in a combat zone and in a town.
   *Expected:* Top line like `Lvl 11  Area 12 (−1)  XP 100%`; XP turns yellow when you get less
   experience. In combat zones a second line like `Recommended 12–13+ · Under-levelled` (yellow),
   `On track` (green) or `Over-levelled` (blue). Towns have no second line.
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
    then again and confirm with `Restart`.
    *Expected:* Cancel changes nothing, Restart sets the guide to `1 / 136`. Page back to your progress with
    `Ctrl+Alt+N` afterwards.

### C. Other changes

16. **PoB import.** In Path of Building export the build as code or copy a pobb.in link. In PoL2:
    `Ctrl+Alt+S` → Gems → paste into the field next to `Import from PoB` → click. Then paste some
    nonsense and import once more.
    *Expected:* Gem setups appear sorted by level and are only kept after saving. Nonsense shows a red
    error and the old setups stay.
17. **Unsaved changes, asked inside the overlay.** Settings → Act Notes: type something, then click
    another page on the left.
    *Expected:* A dark dialog appears inside the overlay (no separate KDE window). `Cancel` is
    preselected and keeps the text, `Discard` drops it, `Esc` cancels.
18. **No scrollbar (Linux only).** Look at the bottom edge of the screen while the overlay runs.
    *Expected:* No horizontal scrollbar.
19. **Overlay hides when you leave the game.** First without the "Skip switcher" rule: open and close
    the settings once (`Ctrl+Alt+S` twice), then switch to the browser with `Alt+Tab` or the taskbar.
    *Expected:* The overlay disappears while the browser is in front and comes back with the game.
    If `Alt+Tab` still stops on the overlay, add the "Skip switcher" rule from setup step 4 and retry.
20. **Game gets the keyboard back after the settings.** Open the settings with `Ctrl+Alt+S`, type
    something in a notes field, close them with `Ctrl+Alt+S` and move or use a skill right away.
    *Expected:* Typing in the settings works, and after closing them the game reacts to the keyboard
    immediately without clicking into it.

### D. Window design

21. **Same look for all windows.** `Ctrl+Alt+S`, then hover each PoL2 window once.
    *Expected:* All windows share the dark style of the guide. On hover a bar with `Move/Resize`
    appears at the bottom (for the layout window below it).
22. **Layout window collapses.** Enter a town (no layout), then a zone with layout images.
    *Expected:* In town only a slim line `No layout for this zone`; in the zone the images at full
    size. In Move/Resize mode the window takes its full size, so you can place it.
23. **Zone notes leave the tips to the guide.** Look at the notes window while the guide is shown,
    then hide the guide with `Ctrl+Alt+J`. Optional: write your own zone note in Settings → Zone Notes.
    *Expected:* Guide shown: no zone tip below the zone dropdown (act notes stay). Guide hidden: the
    tip appears. Your own zone note is always shown.
24. **Gem setup names.** Open the dropdown in the gem window.
    *Expected:* Entries read like `Level 1–7`, `Level 8–14`, `Level 15+`.
25. **Window opacity.** Settings → General → `Window opacity`: slide to 40 %, then 100 %. Set your
    favourite, quit and restart the test build.
    *Expected:* The windows become see-through while you slide; after the restart the value is kept.

### E. Fixes from the code cleanup

26. **Builds switch everywhere.** Settings → Gems: `Add build...`, name it `Test`, `Create`. Then
    Settings → Act Notes: select `Default`, then `Test` again. Delete `Test` at the end.
    *Expected:* Each page shows the build you picked; the gem window and the notes window switch with
    it (a new build shows the shipped notes). `Delete Build` is not offered for `Default`.
27. **A new Client.txt path takes effect at once.** Settings → General: type in the Client.txt field.
    Then copy Client.txt next to it as `Client-copy.txt`, enter the copy's path, `Save`, and change
    the zone in the game. Enter the real path again, `Save`, change the zone again.
    *Expected:* The button stays `Save` while typing and says `Saved!` after the click. With the copy
    the overlay does not follow the zone change; with the real path it follows within a second.
28. **Zone without a tip.** Hide the guide (`Ctrl+Alt+J`). In the notes window choose `Act 4`, a zone
    with a tip, then `Ngakanu`.
    *Expected:* Ngakanu shows no zone tip instead of the tip of the zone before.
29. **Notes settings pages.** Open Settings → Act Notes and Zone Notes and type a few lines.
    *Expected:* Both pages look alike, and the note fields grow with their text.

### F. Campaign timer (new)

30. **Timer per act.** With a new character enter The Riverbank (with a character further on press
    `Ctrl+Alt+P` in a campaign zone). Play on into the next act and once back to the previous one.
    *Expected:* The level window shows e.g. `Act 1 4:12 · Total 4:12`, counting every second. On the
    first entry into Act 2 it shows `Act 2 0:00` and the total goes on; going back to Act 1 keeps
    counting on Act 2. The level window is a line taller now; move the gem window if they overlap.
31. **Pauses.** Switch to the browser for half a minute and back. Go to character select for half a
    minute and log in again. Press `Ctrl+Alt+P` twice. Open the settings with `Ctrl+Alt+S`.
    *Expected:* While you are away or at character select the time stands still and `· Paused` is
    shown; it goes on when you are back in the game or enter a zone. `Ctrl+Alt+P` pauses and resumes.
    With the settings open the timer keeps running.
32. **Restart and reset.** Quit the test build (tray → Quit) and start it again. Then `Ctrl+Alt+S`,
    hover the level window, and use `Reset timer`.
    *Expected:* After the start the stored times show with `· Paused` and go on with the next zone (or
    `Ctrl+Alt+P`). On hover the time per act and the buttons appear; `Reset timer` asks first, and
    after `Reset` the timer line disappears until Act 1 or `Ctrl+Alt+P`.
33. **Finished runs and best times.** Let the timer run for a minute, then `Ctrl+Alt+S` → General
    settings: note the `Campaign runs folder` (default `Documents/PoL2`), optionally pick another
    absolute folder and `Save`. Then pretend you reached the endgame town by adding one line to your
    Client.txt (path from the settings), in a terminal:
    `echo '2026/11/27 21:30:00 0 0 [DEBUG Client 0] Generating level 65 area "G_ENDGAME_TOWN" with seed 1' >> "<your Client.txt path>"`
    *Expected:* Within a second the timer line ends with `· Done`. The folder now holds
    `pol2-campaign-runs-poe2.csv` with a header, one row per act and a `Total` row, each with today's
    date and time. Hovering the level window with the settings open shows `· PB …` behind each act.
    Afterwards use `Reset timer` and `Ctrl+Alt+P` to time your character again.

### G. Round 5

34. **Long build names.** Settings → Gems: `Add build...` and paste a long text (e.g. a PoB code)
    into the name field. Then select the build with the PoB code as name from round 4 and use
    `Delete Build`.
    *Expected:* The name field stops at 50 characters. The delete question fits on the screen (a long
    name scrolls inside the dialog), and `Delete` removes the build.
35. **Configurable hotkeys.** Settings → General → Hotkeys: click the timer hotkey and press
    `Ctrl+Alt+K`. Try to give another action `Ctrl+Alt+S`, and press a plain `P`. Close the settings,
    press `Ctrl+Alt+K` and `Ctrl+Alt+P`. Restart the test build, then use `Default` on the timer row.
    *Expected:* While recording the button says `Press keys…` and the hotkeys do nothing; `Escape`
    cancels. `Ctrl+Alt+S` is refused with "Already used for: Show/hide settings", a plain `P` shows a
    hint. `Ctrl+Alt+K` pauses the timer, `Ctrl+Alt+P` no longer does. After the restart `Ctrl+Alt+K`
    is kept; `Default` brings back `Ctrl+Alt+P`.

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
