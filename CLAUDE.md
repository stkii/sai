# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SAI is a Tauri-based desktop application for statistical analysis, combining TypeScript/React frontend, Rust backend, and R for statistical computations.

## Development Commands

### Development

```bash
pnpm dev          # Start Vite dev server
pnpm tauri dev    # Start Tauri development mode (launches desktop app)
```

### Build

```bash
pnpm build        # Build frontend (TypeScript compilation + Vite build)
cargo check       # Build backend (Rust compilation)
```

### Linting/Formatting

```bash
pnpm prettier src/ --write  # Format src directory
cargo +nightly fmt          # format src-tauri directory
```

## Important Development Rules (from .cursor/rules/base.mdc)

**Always follow these principles**:

1. **Clarify ambiguous instructions** - If user intent is unclear or illogical, ask for confirmation before proceeding
2. **`<!impl>` directive** - Direct code implementation allowed only when explicitly requested with this tag. Must clarify any ambiguities first.
3. **`<!nocode>` directive** - Do not edit code directly when this tag is present
4. **File/folder deletion** - Must explain impact and get user consent before deleting
5. **Renaming functions/variables** - Requires user approval for each change

## Document

Additional documentation is available in the `.dev` and `docs/` directory:

- `.dev/docs/llms-txt/` - Framework and library specifications (e.g., `tauri-llms.txt`) - **refer to these when working with specific frameworks**
- `ARCHITECTURE.md` - High-level project architecture overview
- `DEVELOPING.md` - Development setup and workflow

## Common Gotchas

1. **Column order preservation**: `build_numeric_dataset` preserves Excel header order, not UI selection order (see `r.rs:115-122`)
2. **Window recreation logic**: Analysis/result windows are always recreated to avoid stale state/token issues
3. **R subprocess timeout**: Default configured in frontend, enforced via `wait-timeout` in Rust
4. **Temporary token expiry**: Result tokens expire after 5 minutes (see `commands.rs:140`)
5. **R script path resolution**: Falls back through multiple relative paths if `SAI_R_CLI` env var not set
