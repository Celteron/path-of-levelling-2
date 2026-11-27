# Common Issues (Bugs pending fixes)

## My Client.txt path is correct, but I still get an error!
This is likely caused by the Client.txt itself not existing, i.e. the Client.txt has been deleted and has not been generated yet. It should generate when you enter any zone in game, after that you can paste and save the path again to re-check.

## One of the overlay windows disappeared offscreen!
This should be impossible now, if you experience this issue you can raise an issue at [Github Issues](https://github.com/Kami-Guru/path-of-levelling-2/issues). In the meantime, you can reset the window locations by closing the app and deleting either the `poe1-gameSettings.json` or `poe2-gameSettings.json` in the user data folder, which should be located at either of:

Windows: `C:\users\<your user>\AppData\Local\Path of Levelling 2\`  
Linux: `~/.config/Path Of Levelling 2/`
## The overlay opens in its own window or blurs the game on Hyprland
Hyprland needs window rules for the overlay (thanks to the report in [#19](https://github.com/Kami-Guru/path-of-levelling-2/issues/19)):

```
windowrule {
  name = pol2-pin
  match:class = Path Of Levelling 2
  pin = true
  float = true
  no_blur = on
  opacity = 1.0 override 1.0 override
  no_initial_focus = true
  no_focus = true
}
```

To interact with the settings (`Ctrl+Alt+S`), comment out `no_focus = true`. While it is commented out the game does not receive keyboard input, so remove the comment again afterwards.
