# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SAI is a GUI-based analysis software designed for psychological research.
It allows users to perform data analysis through point-and-click operations without requiring command-line input.

## Mandatory Agent Rules

1. Clarify ambiguous instructions - If user intent is unclear or illogical, ask for confirmation before proceeding.
2. `<!impl>` directive - Direct code implementation allowed only when explicitly requested with this tag. Must clarify any ambiguities first.
3. `<!nocode>` directive - Do not edit code directly when this tag is present.
4. File/folder deletion - Must explain impact and get user consent before deleting.
5. After writing TypeScript, run `pnpm fixall`, `pnpm check`, and `pnpm ts` at the repo root to catch TypeScript errors. After writing Rust, run `cargo +nightly fmt`, `cargo clippy --fix`, and `cargo check` in `src-tauri/` to verify formatting, linting, and errors, then fix any issues found.
6. `<!ref-docs>` directive - When user instructions include this tag, consult the documentation in `docs/llms-txt/` and base your opinions, code, or other work on that material.
7. `cli.R` の JSON ペイロードは引数で渡された `output_path` ファイルにのみ書き出す。stdout/stderr は Rust 側で捕捉のうえ破棄するため (失敗時のみ stderr がエラーメッセージとして利用される)、`renv` の activate メッセージや `library()` の startup message を抑制する必要はない。Rscript 起動時は `--vanilla` を使わず (`--no-init-file` が `.Rprofile` を読まないため renv が activate されない)、`--no-save --no-restore` で workspace の持ち込み/書き出しのみ抑止し、cwd を `src-r/` に固定して `.Rprofile` を発見させること。

## Coding Standard & Naming Conventions

- TypeScript
  - Use `interface` for object shapes unless a `type` is required (for example, unions, tuples, mapped types, or primitive aliases).
  - Do not use default exports. Always use named exports.
- Rust
  - Do not use `mod.rs`. Define modules in the `<name>.rs` format.

## Dark Patterns Prohibited

### Silent Changes to Analysis Results

Do not implement fallbacks or logic that change a user's analysis results in a way the user did not intend, or without explicit notification.

Example: If `corr_use` is invalid, silently defaulting to `"all.obs"` alters the analysis without user awareness and is prohibited.

## Project-Specific Review Notes

- Power analysis results are intentionally not persisted in the analysis log. Treat this as the current product specification, not a defect, unless the user explicitly asks to change that behavior.

## Agent Communication Policy

- Thinking (internal reasoning, planning, notes) may be in Japanese or English.
- Conversation (responses to users, comments, explanations) must be in Japanese.
- Exception: Error messages and log excerpts may be quoted verbatim without translation.
