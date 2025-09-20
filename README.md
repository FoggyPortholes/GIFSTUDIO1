# Gif Studio — Spicy Pickle (Lite Debug Edition) v1.3.0

This package contains the full app source and one‑click launchers for Windows (PowerShell and BAT).
First run downloads **Node.js portable** automatically, installs dependencies, and opens the app.

## Quick Start
1) Extract this zip to a folder (avoid Desktop if you have strict policies).
2) Double-click **launch.ps1** (or **launch.bat**).
3) Your browser opens at `http://localhost:5173` (or the next free port).
4) In the app, click **Test GIF** to confirm the encoder works.

## Features
- Debug tab with live logs, **Download Logs**, **Download Last GIF**.
- GIF validator (checks header `GIF87a/89a` and trailer `;`).
- Palette fix (first frame includes `{ palette }`).
- One-click launch with transcript logs in `logs/`.
- Auto-downloads Node.js portable v20.17.0 (x64) and **flattens** the folder so `npm.cmd` is found.

## Troubleshooting
- If launch fails, delete the `node-portable/` folder and run `launch.ps1` again.
- If a GIF won’t open in VLC, open it in **Photos** or a **web browser**.
- Use the **Debug** tab to download logs and the raw last GIF for inspection.
