# Repository Guidelines

## Overview

SAI is a GUI-based analysis software designed for psychological research.
It allows users to perform data analysis through point-and-click operations without requiring command-line input.

## Mandatory Agent Rules

1. Clarify ambiguous instructions - If user intent is unclear or illogical, ask for confirmation before proceeding.
2. `<!impl>` directive - Direct code implementation allowed only when explicitly requested with this tag. Must clarify any ambiguities first.
3. `<!nocode>` directive - Do not edit code directly when this tag is present.
4. File/folder deletion - Must explain impact and get user consent before deleting.
5. After writing TypeScript, run `pnpm fixall`, `pnpm check`, and `pnpm tsc --noEmit` at the repo root to catch TypeScript errors. After writing Rust, run `cargo +nightly fmt`, `cargo clippy --fix`, and `cargo check` in `src-tauri/` to verify formatting, linting, and errors, then fix any issues found.
6. `<!ref-docs>` directive - When user instructions include this tag, consult the documentation in `docs/llms-txt/` and base your opinions, code, or other work on that material.

## Coding Standard & Naming Conventions

- TypeScript
  - Use `interface` for object shapes unless a `type` is required (for example, unions, tuples, mapped types, or primitive aliases).

## Dark Patterns Prohibited

### Silent Changes to Analysis Results

Do not implement fallbacks or logic that change a user's analysis results in a way the user did not intend, or without explicit notification.

Example: If `corr_use` is invalid, silently defaulting to `"all.obs"` alters the analysis without user awareness and is prohibited.

## Agent Communication Policy

- Thinking (internal reasoning, planning, notes) may be in Japanese or English.
- Conversation (responses to users, comments, explanations) must be in Japanese.
- Exception: Error messages and log excerpts may be quoted verbatim without translation.

## Commit & Pull Request Guidelines

- Commit template: `.github/.gitmessage` (prefixes: `change`, `chore`, `docs`, `feat`, `fix`, `perf`, `refactor`, `release`, `revert`, `test`).
- PRs: include a title and a clear, concise description. In the PR description, group commits by prefix and summarize changes for each prefix.
