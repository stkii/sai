# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SAI is a GUI-based statistical analysis desktop application for psychology research. Built with **Tauri v2 (Rust backend) + React/TypeScript (frontend) + R (statistical computation)**. Users perform analyses (descriptive statistics, correlation, regression, factor analysis) via click-only interaction — no command-line input required.

## Development Commands

```bash
pnpm install                # Install frontend dependencies
pnpm start                  # Launch Tauri dev mode (builds Rust + starts Vite dev server)
pnpm dev                    # Vite dev server only (no Tauri)
pnpm build                  # TypeScript check + Vite production build
pnpm ts                     # TypeScript type-check only (tsc --noEmit)
pnpm check                  # Biome lint + format check
pnpm fixall                 # Biome auto-fix (lint + format + import sorting)
pnpm lint                   # Biome lint with auto-fix
pnpm format                 # Biome format with auto-fix
```

R environment setup (one-time, from `src-r/` directory):
```bash
cd src-r/ && RENV_PROFILE=default Rscript -e 'renv::restore()'
```

Rust backend (from `src-tauri/`):
```bash
cargo build                 # Build Rust backend
cargo check                 # Type-check Rust backend
```

## Architecture

### Three-Layer Structure

```
src/          → React/TypeScript frontend (Vite)
src-tauri/    → Rust backend (Tauri v2, clean architecture)
src-r/        → R scripts for statistical computation
```

### Frontend (`src/`)

- **UI framework**: Chakra UI v3 + MUI (partial)
- **Linter/Formatter**: Biome (indent: 2 spaces, single quotes, line width 100)
- **Two windows**: `DataWindow` (main data view) and `ResultWindow` (analysis results), each with its own entry point HTML
- **IPC**: `src/ipc.ts` — `TauriIpc` class wraps all `invoke()` calls to Rust backend

**Analysis module** (`src/analysis/`):
- `types.ts` — **Single source of truth** for `SUPPORTED_ANALYSIS_TYPES` and core analysis types
- `methods/<method>/` — Each analysis method has 3 files: `modal.tsx` (input UI), `result.tsx` (result display), `index.tsx` (assembles `MethodModule`)
- `methods/contracts.ts` — `MethodModule` interface that all methods implement (`renderModal`, `renderResult`, `buildExportSections`)
- `methods/index.ts` — `ANALYSIS_METHODS` registry; adding a method here auto-registers it in both windows
- `runtime/runner.ts` — Dataset caching + analysis execution orchestration

### Rust Backend (`src-tauri/src/`)

Clean architecture with 4 layers:
- **`domain/`** — Core models (`analysis/model.rs`, `method.rs`, `rule.rs`), input types (`input/numeric.rs`, `table.rs`)
- **`usecase/`** — Business logic. `analysis/service.rs` orchestrates analysis runs. `analysis/handlers/` contains per-method normalization and post-processing
- **`infra/`** — External integrations. `r/runner.rs` spawns `Rscript` with temp JSON files for data exchange. `cache/` stores parsed datasets. `reader/` handles CSV/XLSX parsing
- **`presentation/`** — Tauri commands exposed to frontend via `invoke()`. Commands: `build_numeric_dataset`, `run_analysis`, `parse_table`, `get_sheets`

**Analysis execution flow**: Frontend `invoke('run_analysis')` → Rust `AnalysisService.run_analysis()` → handler normalizes options → `run_r_analysis()` spawns `Rscript src-r/cli.R` with JSON temp files → parses JSON output back

### R Layer (`src-r/`)

- `cli.R` — Entry point called by Rust via `Rscript`
- `R/` — Analysis functions (`describe.R`, `correlation.R`, `regression.R`, `factor.R`, etc.)
- Uses `renv` for dependency management with `RENV_PROFILE=default`
- External packages: `EFAtools` (factor analysis), `pwr` (power analysis), `jsonlite` (JSON I/O)

## Adding a New Analysis Method

Adding a method requires changes across all three layers: R, Rust, and Frontend.

### R Layer (`src-r/`)

1. **`src-r/R/<method>.R`** — Statistical computation. Each R module follows a 3-function pattern:
   - `.<Method>(df, ...)` — Raw statistical computation (calls `aov()`, `cor()`, etc.)
   - `.<Method>Parsed(res)` — Converts result into `list(headers, rows, note?)` (`ParsedDataTable`-compatible structure)
   - `Run<Method>(df, ...)` — Entry point called by the CLI dispatcher. Validates arguments, calls `.<Method>()`, then `.<Method>Parsed()`
2. **`src-r/R/error.R`** — Add a module-load error code (`ERR-9xx`) to `ERR_MESSAGES`
3. **`src-r/cli.R`** — Two changes:
   - Add `.LoadModule(r_dir, "<method>.R", "ERR-9xx")` in the module-loading section
   - Add an entry to `.BuildAnalysisSpecs()` dispatch table. Each entry has: `output_kind`, `requires_numeric`, `options`, `run`

### Rust Backend (`src-tauri/src/`)

4. **`domain/analysis/method.rs`** — Add a `Method` constant AND a `FromStr::from_str` match arm (both required)
5. **`usecase/analysis/handlers/<method>.rs`** — Implement `AnalysisMethodHandler` trait. At minimum, `normalize_options` is required. Override `post_process` if the method needs result transformation
6. **`usecase/analysis/handlers.rs`** — Add `mod <method>` and a branch in `resolve_handler`

### Frontend (`src/`)

7. **`src/analysis/types.ts`** — Add key to `SUPPORTED_ANALYSIS_TYPES` array (single source of truth)
8. **`src/analysis/methods/<method>/modal.tsx`** — Input UI. Use `ModalProps<TOptions>` where `TOptions extends AnalysisOptions`. Call `onExecute(variables, options, datasetKind?)` on submit. Pass `'string_mixed'` as the third argument only when categorical variables are present
9. **`src/analysis/methods/<method>/result.tsx`** — Result display. Implement `render<Method>Result` (renders `AnalysisResult.sections`) and `build<Method>ExportSections` (for export). Use `getSingleSection(result)` utility for single-table results
10. **`src/analysis/methods/<method>/index.tsx`** — Assemble `MethodModule<'key'>` binding `definition` (key + label), `renderModal`, `renderResult`, `buildExportSections`
11. **`src/analysis/methods/index.ts`** — Add to `ANALYSIS_METHODS` array and re-exports. Registration here auto-registers in both DataWindow and ResultWindow

### Dataset Types

- **NumericDataset** — All columns are `f64`. Used by: descriptive, correlation, regression, factor, reliability
- **StringMixedDataset** — All columns stored as strings. Used when categorical variables (e.g. `"male"`, `"control"`) are present. Triggered by passing `'string_mixed'` as the third argument to `onExecute` in the modal

### Verification

After adding, run:
```bash
cd src-tauri && cargo check
cd .. && pnpm fixall && pnpm check && pnpm ts
```

## Sample Size Notes (`n_note`)

When displaying the effective sample size (`n`) in analysis results, certain conditions require a user-facing note (`n_note`) to prevent silent misrepresentation of the data. These notes are generated in the R layer and flow through Rust to the frontend via the `n_note` field.

### Required notes

The following cases **must** display a note to the user. Omitting these notes is a dark pattern (see `AGENTS.md`).

| Condition | Note text | Applies to |
|-----------|-----------|------------|
| Listwise deletion removed rows (`n < nrow(df)`) | `リストワイズ削除により、X件の観測が除外されました` | correlation (`complete.obs`), factor (`complete.obs`), regression, reliability, anova |
| Pairwise deletion | `ペアワイズ削除のため、変数ペアごとにサンプルサイズが異なる場合があります` | correlation (`pairwise.complete.obs`), factor (`pairwise.complete.obs`) |
| Repeated measures design | `反復測定デザインのため、サンプルサイズは総観測数（被験者数 × 条件数）です` | anova (within-subjects) |

### Implementation

- Each R `Run*` function sets `parsed$n` (effective sample size) and optionally `parsed$n_note` (user-facing caveat)
- `cli.R` `.BuildOutputPayload()` extracts both fields and places them at the top level of the JSON payload
- Rust `parse_analysis_output()` extracts `n` and `n_note` before deserializing `AnalysisResult`
- The note is stored in `AnalysisLogRecord.n_note` and displayed in `AnalysisLogDetail` as orange text below the sample size

### Adding new notes

When adding a new analysis method or modifying NA handling, check whether the reported `n` could differ from what the user expects. If so, set `parsed$n_note` in the R `Run*` function. See the existing implementations in `correlation.R`, `factor.R`, `regression.R`, `reliability.R`, and `anova.R` for examples.

## Key Conventions

- All user-facing text is in Japanese
- Commit messages use conventional format: `feat:`, `fix:`, `chore:` (in Japanese)
- The `AnalysisResult.sections` model is the universal shape for all analysis outputs (both display and export)
- Option types are scoped to each method's `modal.tsx`, extending `AnalysisOptions`
- Frontend-Rust data exchange uses JSON via Tauri `invoke()`; Rust-R data exchange uses temporary JSON files
