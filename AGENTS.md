# Repository Guidelines

## Project Structure & Module Organization
- `src/` React + TypeScript UI (components in `src/components/*`, pages in `src/pages/*` named `*Page.tsx`).
- `pages/` Vite HTML entry points (`analysis.html`, `result.html`, `table.html`).
- `src-tauri/` Tauri (Rust) backend; config in `src-tauri/tauri.conf.json`.
- `src-r/` R analysis engine (CLI `src-r/cli.R`, deps via `renv`); sample data in `src-r/datasets/`.
- `docs/` architecture and developer notes. `dist/` is generated output.

## Commands
- Build web assets: `pnpm build`
- Type check only: `pnpm exec tsc -p tsconfig.json --noEmit`
- Lint and format check: `pnpm check` (checks linting and formatting without modifying files)
- Run linting: `pnpm lint` (runs Biome linting and writes fixes to files)
- Run formatting: `pnpm format` (runs Biome formatting and writes to files)

## Coding Style & Naming Conventions
- TypeScript: Biome enforced. Run `pnpm lint`.
  - 2-space indent, line width 110, single quotes, ES5 trailing commas.
  - Components `PascalCase.tsx`; pages `*Page.tsx`; prefer explicit types (`strict: true`).
- Rust: Format with `cargo +nightly fmt` using `src-tauri/rustfmt.toml` (edition 2024, 4 spaces, vertical imports). Idiomatic `snake_case` for items.
- R: See `docs/rules/styleguide-r.md`. Functions `UpperCamelCase`, other identifiers `snake_case`, always qualify calls (`pkg::fn`).

## Testing Guidelines
- No automated tests yet. Include manual verification steps in PRs.
- If adding tests: Vitest (TS), `cargo test` (Rust), `testthat` (R). Coverage not enforced.

## Commit & Pull Request Guidelines
- Commit template: `.github/.gitmessage` (prefixes: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `release`, `revert`, `change`).
- PRs: clear description, linked issues, screenshots/GIFs for UI changes, repro/verify steps, and scope label (frontend/rust/r).

## Security & Configuration Tips
- Do not commit secrets. Restore R deps with `R -q -e "renv::restore()"`.
- For device debugging, set `TAURI_DEV_HOST` (see `vite.config.ts`).
