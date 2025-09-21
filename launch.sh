#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "=== Gif Studio Portable Launch (Unix) ==="
if ! command -v node >/dev/null 2>&1; then
  echo "[!] Node.js is required in PATH on Unix. Please install Node 18+."
  exit 1
fi
if [ ! -f package-lock.json ]; then
  echo "[+] Installing dependencies..."
  npm install
fi
PORT_FILE="config/lastport.txt"
PORT=5173
if [ -f "$PORT_FILE" ]; then PORT="$(cat "$PORT_FILE" || echo 5173)"; fi
mkdir -p config
tries=0
while [ $tries -lt 5 ]; do
  echo "[+] Starting dev server on port $PORT..."
  if PORT=$PORT npm run dev -- --port $PORT --strictPort=false >/dev/null 2>&1 & then
    echo "$PORT" > "$PORT_FILE"
    xdg-open "http://localhost:$PORT" >/dev/null 2>&1 || true
    echo "[+] Launched at http://localhost:$PORT"
    wait
    exit 0
  fi
  tries=$((tries+1))
  PORT=$((PORT+1))
done
echo "[!] Failed to start server after multiple attempts."
exit 1
