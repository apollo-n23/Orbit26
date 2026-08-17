# Launch-prep power-up terminal assets

Imagine-generated sprites for the Prepare for launch **power-up** sub-task
(`LaunchPrepScene.tsx`). Keyed with `scripts/key_launch_prep_power.py`.

HTML labels, status copy, and charge percentages stay HTML — never baked
into the sprites. Brand colours: navy `#00538A`, gold `#FFC627`,
cyan `#00B2E2`.

| File | Role |
|------|------|
| `public/LaunchPrepPowerTerminal.png` | Wide brushed-steel CRT bezel with an empty glass well and a cyan power LED. CSS stretches it behind the terminal UI. |
| `public/LaunchPrepPowerCover.png` | Isolated glossy red hinged safety cover (hinge at the top, lift tab at the bottom). CSS `rotateX` opens it. |
| `public/LaunchPrepPowerToggleOff.png` | Aircraft bat-handle toggle, handle down, lamp dark. |
| `public/LaunchPrepPowerToggleOn.png` | Same housing, handle up, cyan lamp lit. |
| `public/LaunchPrepPowerIconAvionics.png` | HUD pictogram — circuit chip + traces + satellite pip. |
| `public/LaunchPrepPowerIconFlight.png` | HUD pictogram — stacked boards + chevron. |
| `public/LaunchPrepPowerIconTelemetry.png` | HUD pictogram — dish + radio arcs. |
| `public/LaunchPrepPowerIconRange.png` | HUD pictogram — shield + radar sweep. |

URL pattern:

```ts
`${import.meta.env.BASE_URL}LaunchPrepPowerCover.png?v=1`
```
