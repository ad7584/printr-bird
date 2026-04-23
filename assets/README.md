# Assets folder

Drop your sprite PNGs here in Phase 2.

Expected filenames (matching the generation slots in `src/scenes/PreloadScene.js`):

- `idle.png`
- `flap_up.png`
- `flap_down.png`
- `glide.png`
- `hit.png`
- `dead.png`
- `crown.png`       (bird with crown variant)
- `shield.png`      (bird with shield variant)
- `speed.png`       (bird with speed trail variant)
- `pipe_body.png`
- `pipe_cap.png`
- `pop.png`         ($POP flame pickup)

Then uncomment the load block in `src/scenes/PreloadScene.js` and swap the Bird/Pipe `draw()` calls for sprite swaps.
