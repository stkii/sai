# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SAI is a GUI-based analysis software designed for psychological research.
It allows users to perform data analysis through point-and-click operations without requiring command-line input.

## Coding Standard & Naming Conventions

- TypeScript
  - Use `interface` for object shapes unless a `type` is required (for example, unions, tuples, mapped types, or primitive aliases).
  - Do not use default exports. Always use named exports.
- Rust
  - Do not use `mod.rs`. Define modules in the `<name>.rs` format.
- C++
  - Always use `override` when overriding a function.
  - Always use `nullptr` instead of `NULL`.
  - Always use `using` type aliases instead of `typedef`.
  - Ensure exception safety with `noexcept`.
  - Prefer `constexpr` over `#define` whenever possible.
  - Prefer unnamed namespaces over `static`.
  - Do not use `int`, except for the standard `main` return type and its `argc` parameter.
  - Do not use `using namespace std`.
  - Do not include C standard library headers.
  - Do not include `bits/stdc++.h`.
  - Do not use C-style casts.
  - Do not use magic numbers.
  - Do not write overly long functions.
  - Do not use inheritance carelessly; consider composition instead.

## Comment rules

Code comments must contain only non-obvious WHYs. Limit comments to information that cannot be inferred from the code itself, such as why a hidden constraint was introduced or why the code behaves in a way that may surprise readers.

Do not include:
- WHATs (anything that is obvious from reading the code)
- Change history
- References to task IDs, etc.

## Dark Patterns Prohibited

### Silent Changes to Analysis Results

Do not implement fallbacks or logic that change a user's analysis results in a way the user did not intend, or without explicit notification.

Example: If `corr_use` is invalid, silently defaulting to `"all.obs"` alters the analysis without user awareness and is prohibited.

## Statistical Output Policy

Analysis results must match SPSS. When an R package's default differs from SPSS, choose the option that reproduces SPSS output (for example, `psych::describe(type = 2)` for skewness/kurtosis, `EFAtools::EFA(type = "SPSS")`), and cover the resulting values with tests in `src-r/tests/testthat/`.

This is a project-wide default, so do not annotate individual call sites with "to match SPSS" comments. When a comment is warranted, state the statistical reason itself (which estimator or formula, and how it differs from the package default) rather than the software being matched.
