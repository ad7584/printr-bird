# PWA icons

The PWA manifest references these files (see `vite.config.js`):

| File | Size | Purpose |
|---|---|---|
| `icon-192.png` | 192×192 | Home screen icon (Android, low-DPI) |
| `icon-512.png` | 512×512 | Home screen icon (Android, high-DPI) |
| `maskable-512.png` | 512×512 | Adaptive icon (Android). Safe zone: 80% center. |
| `apple-touch-icon-180.png` | 180×180 | iOS home screen |

**Until the designer provides these PNGs, the PWA will still install**, but icons will fall back to the browser default or SVG favicon. Home screen will look unbranded.

## Quick path — generate from a single source image

1. Drop a 1024×1024 PNG at `public/icon-source.png` (designer can use the bird from `public/favicon.svg` or supply a fresh one)
2. From the frontend repo: `npm run pwa:icons`
3. All the required sizes will be generated into `public/icons/`

That command wraps `@vite-pwa/assets-generator` with the `minimal-2023` preset, which outputs exactly the files listed above.

## If you want to hand-author each size

Drop the four PNG files listed in the table above into this directory. Sizes must match exactly. For the **maskable** variant, keep all important content inside the center 80% circle (the rest may be cropped by Android launchers).
