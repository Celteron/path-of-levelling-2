# Fork-Testlauf (nur im Fork, nicht für Upstream)

Anleitung, um den Stand von `develop` im eigenen Spiel zu testen. Dieser Ordner existiert nur im Fork
`Celteron/path-of-levelling-2` auf `develop` und gehört in keinen Upstream-PR (PR-Branches entstehen
aus `main`).

## 1. Setup

Die Skripte beenden ein laufendes PoL2, sichern die Einstellungen, holen bzw. aktualisieren die
Testversion in `~/pol2-test`, installieren alles und starten die App mit `npm run dev`. Das Terminal
bleibt offen, solange getestet wird; beenden mit `Ctrl+C`. Für ein Update dasselbe Skript erneut
ausführen.

**Wichtig:** Die Testversion nutzt denselben Einstellungsordner `Path Of Levelling 2` wie die
installierte App. Deshalb das Backup; dafür werden die echten Notizen und Builds gleich mitgetestet.

### SteamOS / Linux

SteamOS hat ein schreibgeschütztes System und kein Node.js. Das Skript braucht trotzdem kein Root und
kein `pacman`: Fehlt Node.js 22+, lädt es eine fest gepinnte Node-Version (Prüfsumme wird geprüft)
nach `~/.local/share/pol2-test/` und nutzt sie nur für sich selbst. Git, curl, tar und xz bringt SteamOS mit.

1. In den **Desktop-Modus** wechseln. Im Spielmodus (Gaming Mode) zeigt SteamOS nur ein Fenster an,
   das Overlay ist dort unsichtbar.
2. Konsole (Konsole-App) öffnen und einfügen:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/Celteron/path-of-levelling-2/develop/fork-testing/setup-test.sh -o /tmp/pol2-setup.sh
   bash /tmp/pol2-setup.sh
   ```
3. PoE2 im Desktop-Modus über Steam starten.

Andere Linux-Desktops mit Wayland/Hyprland: Fensterregeln aus `docs/common-issues.md` beachten.

### Windows

Vorher [Git](https://git-scm.com) und [Node.js 22 LTS oder neuer](https://nodejs.org) installieren.
Dann in PowerShell:
```powershell
irm https://raw.githubusercontent.com/Celteron/path-of-levelling-2/develop/fork-testing/setup-test.ps1 -OutFile $env:TEMP\pol2-setup.ps1
powershell -ExecutionPolicy Bypass -File $env:TEMP\pol2-setup.ps1
```

### Testversion neu starten

Im Terminal `Ctrl+C`, dann `cd ~/pol2-test && npm run dev` (SteamOS: vorher
`export PATH="$HOME/.local/share/pol2-test/node-v22.23.2/bin:$PATH"`, falls das Skript Node geladen hat;
einfacher ist, das Setup-Skript erneut auszuführen).

## 2. Das eine, was man wissen muss

- **Im Spiel ignoriert das Overlay die Maus.** Für Klicks oder Hover in einem PoL2-Fenster zuerst
  `Ctrl+Alt+S` drücken (Settings öffnen), danach wieder `Ctrl+Alt+S`.
- Hotkeys: `Ctrl+Alt+N` / `Ctrl+Alt+B` Guide vor/zurück, `Ctrl+Alt+J` Guide ein/aus,
  `Ctrl+Alt+A` alle Fenster ein/aus, `Ctrl+Alt+S` Settings.
- Die App liest die Client.txt etwa alle 5 Sekunden. Reaktionen auf Zonenwechsel kommen also mit
  bis zu 5 Sekunden Verzögerung.

## 3. Checkliste

Der Reihe nach durchgehen. Am besten mit einem neuen Charakter, dann passt der Guide von Anfang an.
Bei jedem Fehler notieren: Nummer, was passiert ist, beim Guide zusätzlich die Seite (z. B. `12 / 136`)
und die Zone.

### A. Start und Login

1. **Overlay im Login versteckt.** PoE2 starten und im Login-Bildschirm, danach in der
   Charakterauswahl warten.
   *Erwartet:* Keine PoL2-Fenster sichtbar.
2. **Client.txt gefunden.** `Ctrl+Alt+S`, Seite General ansehen.
   *Erwartet:* Das Feld für den Client.txt-Pfad endet auf `logs/Client.txt` (bzw. `logs\Client.txt`),
   keine rote Fehlermeldung. Danach `Ctrl+Alt+S` zum Schließen.
3. **Nur eine Instanz.** Während die Testversion läuft, ein zweites Terminal öffnen:
   `cd ~/pol2-test && npx electron .` (SteamOS mit geladenem Node: erst den `export PATH=…` von oben).
   *Erwartet:* Der Befehl endet nach wenigen Sekunden von selbst, es erscheint kein zweites Overlay.

### B. Leveling-Guide

4. **Guide erscheint.** Charakter einloggen.
   *Erwartet:* Die Overlay-Fenster erscheinen. Das Guide-Fenster zeigt oben `Act 1`, rechts daneben
   `→ <Zielzone>` und den Zähler `1 / 136`, darunter nummerierte Schritte. Kürzel wie `CP`
   (Checkpoint), `WP` (Waypoint) oder `!` (Quest) sind Platzhalter für Symbole.
5. **Fenster platzieren.** `Ctrl+Alt+S`, Maus über das Guide-Fenster: unten erscheint eine Leiste.
   Dort `Move/Resize` klicken, Fenster ziehen und an der Ecke rechts unten die Größe ändern,
   `Done` klicken, `Ctrl+Alt+S`.
   *Erwartet:* Verschieben und Größe ändern klappen (Prüfung nach Neustart in Schritt 14).
6. **Automatisch weiter.** Die Zielzone hinter `→` merken, normal spielen und diese Zone betreten.
   *Erwartet:* Spätestens nach 5 Sekunden springt der Zähler um eins weiter und die nächsten Schritte
   erscheinen.
7. **Bleibt stehen.** Zwischendurch Zonen betreten, die nicht das Ziel sind (z. B. Stadt, Nebengebiet).
   *Erwartet:* Seite und Zähler ändern sich nicht.
8. **Kurzer Durchgang.** Eine Zielzone mit Waypoint betreten und sofort per Waypoint weiterreisen.
   *Erwartet:* Der Guide springt trotzdem weiter.
9. **Level-Empfehlung.** Den Level-Tracker ansehen (`Level Diff …`, `Exp Multi …`).
   *Erwartet:* In Kampfgebieten steht zusätzlich `Zone: x | y` (empfohlenes Charakterlevel, z. B.
   `Zone: 2 | 2` im Grelwood), in Städten nicht.
10. **Blättern.** `Ctrl+Alt+N`, danach `Ctrl+Alt+B`.
    *Erwartet:* Zähler eins vor, dann wieder zurück.
11. **Ein- und ausblenden.** `Ctrl+Alt+J` zweimal, danach `Ctrl+Alt+A` zweimal.
    *Erwartet:* Erst verschwindet nur der Guide und kommt wieder; dann verschwinden alle Fenster
    gemeinsam und kommen gemeinsam wieder.
12. **Optionale Schritte.** `Ctrl+Alt+S`, Maus über den Guide, `Optional steps` klicken; nochmal klicken.
    *Erwartet:* Die grauen (optionalen) Schritte verschwinden und der Button wird blass; beim zweiten
    Klick ist alles wieder da.
13. **League Start.** Ebenso `League start` aus- und wieder einschalten.
    *Erwartet:* Ausgeschaltet (späterer Durchlauf) fallen einzelne Schritte oder ganze Seiten weg;
    eingeschaltet ist alles wieder da. Danach auf die passende Einstellung stellen
    (frische Liga = an).
14. **Fortschritt bleibt.** Testversion beenden (`Ctrl+C` im Terminal) und neu starten (siehe oben).
    *Erwartet:* Guide auf derselben Seite, Fenster an derselben Position und in derselben Größe.
15. **Guide neu beginnen.** `Ctrl+Alt+S`, Maus über den Guide, `Restart guide`; im Dialog erst
    Abbrechen, dann nochmal und OK.
    *Erwartet:* Abbrechen ändert nichts, OK setzt auf `1 / 136`. Danach mit `Ctrl+Alt+N` zur
    aktuellen Seite zurückblättern.

### C. Übrige Änderungen

16. **PoB-Import.** In Path of Building einen Build als Code exportieren oder einen pobb.in-Link
    kopieren. In PoL2: `Ctrl+Alt+S` → Gems → in das Feld neben `Import from PoB` einfügen → klicken.
    Zusätzlich einmal Unsinn einfügen und importieren.
    *Erwartet:* Die Gem-Setups erscheinen nach Level sortiert und werden erst mit Speichern übernommen.
    Bei Unsinn erscheint eine rote Fehlermeldung und die alten Setups bleiben.
17. **Ungespeicherte Änderungen.** Settings → Act Notes: etwas tippen, dann links eine andere Seite
    anklicken.
    *Erwartet:* Rückfrage wegen ungespeicherter Änderungen. Abbrechen bleibt auf der Seite,
    OK verwirft die Änderung.
18. **Kein Scrollbalken (nur Linux).** Unteren Bildschirmrand ansehen, während das Overlay läuft.
    *Erwartet:* Kein horizontaler Scrollbalken.

## 4. Ergebnis melden

- Nummern mit Fehler plus kurze Beschreibung (Guide: Seite und Zone).
- Bei Abstürzen die Log-Datei: Linux/SteamOS `~/.config/Path Of Levelling 2/logs/main.log`,
  Windows `%APPDATA%\Path Of Levelling 2\logs\main.log`.
- Fehlgeschlagenes Setup: die Terminal-Ausgabe ab der letzten `==>`-Zeile.

## 5. Zurück zur normalen App

Terminal mit `Ctrl+C` beenden und die installierte App wie gewohnt starten. Die Testversion ergänzt
nur eigene Einstellungen, die die alte App ignoriert. Wer trotzdem zurück will: den Ordner
`Path Of Levelling 2` löschen und das neueste `Path Of Levelling 2-backup-…` in
`Path Of Levelling 2` umbenennen (Linux/SteamOS unter `~/.config`, Windows unter `%APPDATA%`).
