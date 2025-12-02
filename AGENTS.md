# Repository Guidelines

## Project Overview

This is a desktop application named "SAI" for statistical analysis. It is built using a modern stack:

- **Frontend:** The user interface is built with [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/), styled with [Tailwind CSS](https://tailwindcss.com/), and bundled with [Vite](https://vitejs.dev/).
- **Backend:** The backend is written in [Rust](https://www.rust-lang.org/) and uses the [Tauri](https://tauri.app/) framework to create a cross-platform desktop application.
- **Analysis Engine:** Statistical computations are performed by an [R](https://www.r-project.org/) engine. The Rust backend communicates with the R engine by executing R scripts.

Additional documentation for Tauri can be found in `.dev/docs/llms-txt/tauri-llms.txt`.

## Commands

- Build web assets: `pnpm build`
- Type check only: `pnpm exec tsc -p tsconfig.json --noEmit`
- Lint and format check: `pnpm check` (checks linting and formatting without modifying files)
- Format the rust code: `cd src-tauri/ && cargo +nightly fmt`
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

## Agent Communication Policy

- Thinking (internal reasoning, planning, notes) may be in Japanese or English.
- Conversation (responses to users, comments, explanations) must be in Japanese.
- Exception: Error messages and log excerpts may be quoted verbatim without translation.
