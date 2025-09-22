# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`, with feature-focused folders under `src/features` and shared utilities in `src/lib`. Static assets sit in `public/`; the encoder regenerates `public/animation.gif`, so avoid hand-editing it. Node-based integration tests reside in `tests/` and compile to `build-tests/` during CI. Helper tooling and launchers live in `scripts/` and `config/`. Runtime artifacts such as `logs/` and `node-portable/` are disposable and can be regenerated.

## Build, Test, and Development Commands
Install dependencies once with `npm install`. Run the local dev server via `npm run dev` (Vite at http://localhost:5173). Build production assets using `npm run build`, then validate with `npm run preview`. Core quality gates include `npm run lint`, `npm run typecheck`, `npm test` (Vitest), and `npm run test:gif` for encoder verification. `npm run simulate` chains lint, typecheck, test, and GIF validation. Use `npm run verify:intent` before releasing automation changes.

## Coding Style & Naming Conventions
This project pairs React with TypeScript. Prettier enforces 2-space indentation, 100-character line width, single quotes, trailing commas, and semicolons; format large patches with `npm run format`. ESLint (configured in `eslint.config.mjs`) must pass with zero warnings. Use PascalCase for React components, camelCase for utilities and hooks, and SCREAMING_SNAKE_CASE only for required constants or environment markers.

## Testing Guidelines
Vitest runs unit and integration suites; tests execute under the bundled Node 20 runtime. Name new specs `*.test.ts` (or `.mjs` for Node-only scripts) and colocate them near related modules. Keep fixtures small to preserve CI throughput. After encoder changes, regenerate the sample GIF via `npm run test:gif` and ensure `npm run simulate` succeeds before opening a PR.

## Commit & Pull Request Guidelines
Write imperative commit subjects under ~60 characters (e.g., `Refactor frame reorder logic`). Elaborate in the body when behavior changes, referencing issue IDs where applicable. Pull requests should summarize the change, link to relevant launchers or encoder updates, include manual validation steps, and attach screenshots or GIF diffs for UI updates.
