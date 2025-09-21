# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React + TypeScript UI, with feature folders under `src/features` and shared utilities in `src/lib`.
- `public/` stores static assets; `public/animation.gif` is recreated by tests and should not be versioned manually.
- `tests/` contains Node-based integration specs compiled to `build-tests/` during CI; keep fixtures small.
- `scripts/` and `config/` power the portable launchers, while `logs/` and `node-portable/` are runtime artifacts that can be regenerated.

## Build, Test, and Development Commands
- `npm install` installs dependencies (CI uses `npm ci`).
- `npm run dev` starts Vite locally at `http://localhost:5173`.
- `npm run build` emits a production bundle in `dist/`; pair with `npm run serve` for smoke checks.
- `npm run test:gif` encodes the sample animation; `npm run test:ai` executes the Stable Diffusion integration; `npm test` runs both.
- `npm run check` runs formatting, lint, typecheck, and the full test suite; use before opening PRs.

## Coding Style & Naming Conventions
- Prettier enforces 2-space indentation, 100-character line width, single quotes, trailing commas, and semicolons; run `npm run format` before large patches.
- ESLint (`eslint.config.mjs`) applies the TypeScript recommended rules to `.ts/.tsx/.mjs`; address warnings instead of suppressing them.
- Use PascalCase for React components, camelCase for utilities, and SCREAMING_SNAKE_CASE only for required constants.

## Testing Guidelines
- Favor integration-style tests similar to `tests/encode_node.mjs`; place new suites beside related source modules.
- Name files with `.test.ts` (or `.mjs` for Node-only) and ensure they run under the Node 20 environment bundled here.
- Regenerate `public/animation.gif` via `npm run test:gif` after encoder changes and confirm `npm run verify` passes.

## Commit & Pull Request Guidelines
- Follow the prevailing imperative mood (`Refactor validator logging...`) with concise subjects under ~60 characters; add detail in the body when behaviour changes.
- Reference issue IDs in the footer when applicable and include testing evidence (command output or GIF diffs) in PR descriptions.
- PRs should link to the relevant launcher or encoder changes, list manual validation, and attach screenshots for UI tweaks.