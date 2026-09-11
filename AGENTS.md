# Repository Guidelines

## Overview

SAI is a GUI-based analysis software designed for psychological research.
It allows users to perform data analysis through point-and-click operations without requiring command-line input.

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
