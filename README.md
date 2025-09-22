# GIF Studio

A renewed, from-scratch take on GIF Studio with a focused, client-only workflow. Drag in stills, curate a timeline, preview playback, and export a polished GIF without leaving the browser.

## Features

- **Smart frame ingestion** – drag & drop or browse for PNG, JPG, WEBP, and GIF files (GIFs load their first frame).
- **Timeline management** – reorder with one-click bumpers, inspect dimensions, and clear the entire stack instantly.
- **Live preview** – tune playback speed and looping with immediate visual feedback.
- **Configurable export** – choose output dimensions, background colour, and fit mode before encoding with [`gifenc`](https://github.com/mattdesl/gifenc).
- **Zero backends** – every operation happens locally for offline-friendly authoring.

## Getting Started

Install dependencies and choose one of the launch commands below:

```bash
npm install
```

### Launching the app during development

- **Standard Vite server** – run `npm run dev` to boot the development server at http://localhost:5173. The command automatically checks your local Node.js runtime and, if it is older than version 18, falls back to the bundled `node-portable` build (Node 20).
- **Force the portable runtime** – run `node scripts/launch.js dev:vite` to explicitly launch Vite with the repository-managed Node runtime. This is handy on Windows when you do not want to touch a system-wide Node installation.

### Building and previewing production output

```bash
npm run build
npm run preview
```

## Quality Checks

Keep the project healthy with the standard tooling:

```bash
npm run lint
npm run typecheck
npm run test
```

Run `npm run simulate` locally before publishing major encoder or runtime changes to execute the full lint, type-check, unit, and GIF verification chain.

## Project Structure

- `src/features/` – feature-scoped UI and state (studio provider, uploader, timeline, preview, export, and shared UI primitives).
- `src/lib/` – utilities for ID creation, frame ingestion, geometry helpers, and GIF encoding.
- `src/types/` – shared TypeScript models and ambient declarations.
- `public/` – static assets served directly by Vite.

Happy animating!
