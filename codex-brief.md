# Project: GIFSTUDIO1

## Intent
This application is a **Character Creator with AI image generation and simple GIF creation tools**.  
Pipeline: **prompt → character → images → select → assemble frames → export GIF.**

All future patches, features, and tests must conform to this guiding principle.

---

## Tasks for Codex
Generate a **unified diff patch** (`git diff` format) that applies the following changes:

### 1. Launcher Reliability
- Fix `scripts/launch.ps1`:
  - Ensure `$nodeDir` is always a string, never `System.Object[]`.
  - Remove stray commas (e.g. after `Join-Path`).
  - Add retry logic for `npm ci` (delete `node_modules` if first attempt fails).
- Add `scripts/launch.bat` to wrap the PowerShell launcher.

### 2. Codebase Cleanup
- Remove unused or duplicate files.
- Consolidate scripts under `scripts/`, source under `src/`, tests under `tests/`.
- Update `.gitignore` to include:
  - `logs/`, `*.log`, `node_modules/`, `dist/`, `.vite/`, `public/animation.gif`, `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`.

### 3. Character Domain
- Add `src/domain/character.ts` with schema and `characterToPrompt()` helper.

### 4. State Management
- Add `src/state/store.ts` using Zustand:
  - Holds character, generated images, selected images, loop flag.

### 5. AI Providers
- Add `src/services/ai/index.ts`:
  - Provider abstraction for OpenAI, Stability API, AUTOMATIC1111.
  - Safe stubs: return placeholder images if no API key present.

### 6. GIF Pipeline
- Add `src/services/gif/makeGif.ts` using `gifenc`.
- Export frames to animated GIF with configurable delay & loop.

### 7. UI Components
- `src/components/CharacterForm.tsx` — form for archetype, age, gender, hair, eyes, outfit, vibe, negative prompt.
- `src/components/GenerationGrid.tsx` — grid of generated images with selection.
- `src/components/GifBuilder.tsx` — export selected images to GIF.
- `src/pages/Home.tsx` — glue page: form + generate button + grid + GIF builder.

### 8. Intent Guard
- Add `src/intent.ts` with `APP_INTENT`.
- Add `scripts/verify-intent.mjs` — CI check: fail if intent string missing.

### 9. Tooling
- Add `.eslintrc.cjs` + `.prettierrc.json`.
- Update `package.json` scripts:
  - Keep: `dev`, `build`, `preview`.
  - Add: `typecheck`, `lint`, `format`, `test`, `test:gif`, `simulate`, `verify:intent`.
- Ensure devDependencies include:  
  `eslint`, `prettier`, `@typescript-eslint/*`, `vitest`, `happy-dom`, `gifenc`, `zustand`.

### 10. Testing
- Add `tests/synth-gif-runner.cjs` — writes a tiny GIF to `public/animation.gif`.
- Add `tests/gif.spec.ts` — Vitest check for valid GIF header/trailer.

### 11. CI
- Add `.github/workflows/ci.yml`:
  - Job 1: lint, typecheck, intent guard.
  - Job 2: Windows — build, run synthetic GIF test, upload artifact.

---

## Deliverables
- A single **unified diff patch** that:
  - Updates existing files (`scripts/launch.ps1`, `package.json`, `.gitignore`).
  - Adds new files (`scripts/launch.bat`, `src/`, `tests/`, `.github/workflows/`, configs).
- The patch must apply cleanly with:
  ```powershell
  git apply --reject --whitespace=nowarn gifstudio-refactor.patch
