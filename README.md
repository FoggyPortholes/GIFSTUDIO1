# Gif Studio — Spicy Pickle (Lite Debug Edition) v1.3.1

This package contains the full app source and one-click launchers for Windows (PowerShell and BAT), plus a Unix launcher.
First run downloads **Node.js portable** automatically, installs dependencies, and opens the app.

## Quick Start
1) Extract this zip to a folder (avoid Desktop if you have strict policies).
2) Windows: double-click **launch.ps1** (or **launch.bat**).  
   macOS/Linux: run `./launch.sh` (Node.js 18+ required in PATH).
3) Your browser opens at `http://localhost:5173` (or the next free port).
4) In the app, click **Test GIF** to confirm the encoder works.  
   CI also runs `npm run test:gif` to create `public/animation.gif`.

## Features
- Debug tab with live logs, **Download Logs**, **Download Last GIF**.
- GIF validator (checks header `GIF87a/89a` and trailer `;`).
- Palette fix (first frame includes `{ palette }`).
- One-click launch with transcript logs in `logs/` (created if missing)
- Unix launcher (`launch.sh`)
- CI: test/build on pushes; release zip on tags `v*.*.*`
- `npm run test:gif` encodes a synthetic animation in Node and saves it to `public/animation.gif`.
- Auto-downloads Node.js portable v20.17.0 (x64) and **flattens** the folder so `npm.cmd` is found.

## Testing

```bash
npm install
npm run build
npm run test:gif
```

The Node test writes `public/animation.gif` which you can inspect in any image viewer.

## Troubleshooting
- If launch fails, delete the `node-portable/` folder and run `launch.ps1` again.
- If a GIF won’t open in VLC, open it in **Photos** or a **web browser**.
- Use the **Debug** tab to download logs and the raw last GIF for inspection.
