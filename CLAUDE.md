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
cd src-r/ && RENV_PROFILE=default Rscript -e 'renv::restore()'   # 本番 (アプリ実行用)
cd src-r/ && RENV_PROFILE=dev Rscript -e 'renv::restore()'       # テスト用 (testthat 入り)
```

R 層のテスト (dev profile で実行。本番 `renv.lock` に testthat は入らない):
```bash
cd src-r/ && RENV_PROFILE=dev Rscript tests/run_all.R
```

Rust backend (from `src-tauri/`):
```bash
cargo build                 # Build Rust backend
cargo check                 # Type-check Rust backend
```

## Architecture

詳細は `docs/ARCHITECTURE.md` が **正典**。本ファイルは Claude Code 向けの作業ガイドとして要点を抜粋する。

### Three-Layer Structure

```
src/          → React/TypeScript frontend (Vite)
src-tauri/    → Rust backend (Tauri v2)
src-r/        → R scripts for statistical computation
```

### Frontend (`src/`)

- **UI framework**: Chakra UI v3
- **Linter/Formatter**: Biome (indent: 2 spaces, single quotes, line width 100)
- **Single window / 2-pane + AI slide-in**: 左ペインに `DataPane`、中央ペインに結果/履歴タブ、右ペインに `ChatPane`（オンデマンド・⚠️ Phase 4 未着手のプレースホルダ）。エントリは `index.html` → `src/main.tsx` → `App.tsx`
- **State**: `DatasetContext`（読み込んだデータセットの summary）と `ResultContext`（分析結果リスト + currentId + 履歴永続化）を React Context で共有
- **IPC**: `src/shared/ipc/` 配下の関数（`runAnalysis`, `loadDataset`, `loadHistory` 等）が Tauri `invoke()` をラップ
- **機能フォルダ構造**: 各機能は `ui/` (view・操作フロー) + `state/` (Context・hook) の 2 階層。`flow/` 専用フォルダは持たない

**Analysis module** (`src/analysis/`):
- `methods/<method>/` — 各メソッドは原則 2 ファイル: `modal.tsx`（入力 UI）/ `index.tsx`（`MethodModule` 組立）。共通の `<SectionsView>` で結果表示が足りる場合はそれだけで完結する
- `methods/<method>/result.tsx` — **オプション**。結果表示をカスタマイズしたい場合のみ追加し、`index.tsx` の `renderResult` にバインドする。未指定なら `ResultPane` が `<SectionsView result={result} />` でフォールバック描画する
- `methods/contracts.ts` — `MethodModule` interface（`renderModal` 必須、`renderResult` / `formatOptions` オプショナル）。`formatOptions` は `ResultMetadata` の「設定」行をモーダルの選択肢ラベルで整形する（未指定なら内部値をそのまま並べる汎用フォーマット）
- `methods/index.ts` — `ANALYSIS_METHODS` レジストリ。配列に push するだけでヘッダーメニューと結果表示に自動登録
- `ui/AnalysisModalHost.tsx` — モーダル開閉・データセット参照・`runAnalysis` 呼出・結果を `ResultContext` に追加するフローオーナー
- 横断的な分析系の型 (`Method`, `AnalysisResult` 等) は `src/shared/types/index.ts` に集約

### Rust Backend (`src-tauri/src/`)

3 層構造（`commands/` → `services/` → `infra/` + `models.rs` 共通型）:
- **`commands/`** — Tauri コマンド（薄い変換層）。`dataset.rs` / `analysis.rs` / `history.rs`
- **`services/`** — ビジネスロジック。`analysis.rs` は完全な配管に徹し、メソッド名のホワイトリストは持たない (`dataset_key.is_some()` で列射影 / 空テーブルを分岐するだけ)
- **`infra/`** — `r/runner.rs` は `Rscript` を temp JSON でやり取り、`cache/dataset_cache.rs` でパース済みデータセットを保持、`reader/` で CSV/XLSX パース、`store/history_store.rs` で履歴 JSONL を永続化
- **`bootstrap.rs`** — `AppState`（cache, dataset/analysis/history service の DI 配線）。services は infra の具象を直保有 (trait 抽象なし)
- **`models.rs`** — `ParsedTable`, `AnalysisResult`, `HistoryRecord` 等の共通型

登録済みコマンド: `get_sheets`, `load_dataset`, `run_analysis`, `load_history`, `append_history`, `clear_history`, `remove_history`

**Analysis execution flow**: Frontend `invoke('run_analysis')` → `AnalysisService::run()` がデータセットキャッシュから列を射影 (またはスキップ) → `RRunner::run()` が `Rscript src-r/cli.R <input.json> <output.json>` を起動 → R の dispatch table がメソッドを解決して実行 → 結果を `AnalysisResult` にパースして返却。未対応メソッドのエラーは **R 層が返す**

### R Layer (`src-r/`)

- `cli.R` — Rust から呼ばれるエントリ。入力 JSON を読み、`dispatch` table でメソッドを解決して `Run<Method>(df, options)` を呼出
- `R/` — `common.R` の共通ヘルパに加え、`describe.R` / `correlation.R` / `regression.R` / `reliability.R` / `factor.R` / `anova.R` / `power.R`
- `renv` で依存管理（`src-r/.Rprofile` で activate）
- 主な外部パッケージ: `EFAtools`（因子分析）, `jsonlite`（JSON I/O）。パワー分析は base R の `stats::power.t.test` / `power.anova.test` / `power.prop.test` を使用（外部パッケージなし）
- `tests/` — testthat によるテスト。`tests/testthat/test-<method>.R`（`Run<Method>` を直接呼ぶ関数テスト）+ `test-cli.R`（`cli.R` の E2E）。**dev profile**（`RENV_PROFILE=dev`、lockfile は `renv/profiles/dev/renv.lock`）で実行し、testthat は本番 `renv.lock` に入らない（`.renvignore` が `tests/` をスキャン除外、dev 依存は `DESCRIPTION` の `Config/renv/profiles/dev/dependencies` で宣言）。RStudio からは `testthat::test_dir("tests/testthat")` / `testthat::test_file(...)`

## Adding a New Analysis Method

2 層 (R / Frontend) のみで完結。Rust は原則変更不要。

### 1. R 層 (`src-r/`)

1. **`src-r/R/<method>.R`** を新規作成。慣例的に 3 関数構成:
   - `.<Method>(df, ...)` — 生の統計計算（`cor()`, `aov()` 等を呼ぶ）
   - `.<Method>Parsed(res)` — 結果を `list(headers, rows, note?)`（フロントの `AnalysisTable` 互換）に変換
   - `Run<Method>(df, options)` — エントリ。引数検証 → 上記 2 関数呼出 → `list(sections, n, n_note)` を返却
2. **`src-r/cli.R`** に 2 行追加:
   - `source(file.path(r_dir, "<method>.R"))` を module-loading 部に追記
   - `dispatch` list に `<method> = list(requires_data = TRUE/FALSE, kind = "numeric"/"mixed"/"none", run = Run<Method>)` を追加
3. **`src-r/tests/testthat/test-<method>.R`** を追加。正解値は base R の素の実装（`lm` / `cor.test` 等）か定義式の手計算と照合する。`n_note` が必要なメソッドは注記のテストも必ず入れる

### 2. Frontend (`src/`)

3. **`src/shared/types/index.ts`** — `Method` union 型に `'<method>'` を追加
4. **`src/analysis/methods/<method>/modal.tsx`** — 入力 UI。`ModalProps` を受け取り、submit 時に `onExecute(variables, options)` を呼ぶ。options を持つメソッドは、選択肢ラベル定数を使って「設定」行を整形する `format<Method>Options(options): string | null` もここに定義する（内部値をユーザーに見せない）
5. **`src/analysis/methods/<method>/index.tsx`** — `MethodModule<'<method>'>` を組み立てて export。`definition` に `key` + `label`、`renderModal`（+ options があれば `formatOptions`）をバインド
6. (オプション) **`src/analysis/methods/<method>/result.tsx`** — 結果表示をカスタマイズしたい場合のみ追加。`{ result: AnalysisResult }` を受け取り、`index.tsx` で `renderResult` にバインドする。未指定なら `ResultPane` が `<SectionsView result={result} />` でフォールバック描画する
7. **`src/analysis/methods/index.ts`** の `ANALYSIS_METHODS` 配列に `<method>Module` を追加

### 3. Rust Backend (原則不要)

Rust 側のメソッドホワイトリストは廃止済み。未対応メソッドのエラーは R 層が返す。Rust 側で options の正規化や結果の後処理が必要な場合のみ、`services/analysis.rs` に分岐を追加する。

### Dataset Types

データセットの kind は **`cli.R` の dispatch table** で `kind = "numeric" | "mixed" | "none"` として宣言する（フロントから渡すのではない）:

- **`numeric`** — 全列を数値化（`.AsNumericDf`）。Describe / Correlation / Regression / Reliability / Factor で使用
- **`mixed`** — 文字列列を保持（`.AsMixedDf`）。Anova の要因（カテゴリ変数）で必要
- **`none`** — データセット不要（standalone）。Power Analysis のみ

### Verification

追加後に以下を全部通す:
```bash
cd src-tauri && cargo check
cd .. && pnpm fixall && pnpm check && pnpm ts
cd src-r && RENV_PROFILE=dev Rscript tests/run_all.R
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

- 各 R `Run*` 関数が `parsed$n`（有効標本サイズ）と任意で `parsed$n_note`（注記文字列）を返す
- `cli.R` 末尾の `payload` 組立で両フィールドを JSON top-level に配置
- Rust の `AnalysisResult { sections, n, n_note }` として serde で受け、フロントへは camelCase（`nNote`）で配信
- 履歴レコード `HistoryRecord.result.nNote` として保存される

> **表示位置**: `n` と `nNote` は `src/result/ui/ResultMetadata.tsx` (結果見出しカード) で表示される。`n` は灰色、`nNote` はオレンジ。テーブルが多い結果（因子分析等）で埋もれないよう、`SectionsView` (結果ペイン本体) には表示しない。新メソッドが `n_note` を生成すれば追加配線なしで表示される。

### Adding new notes

新メソッドを追加する、または NA 処理を変更する際は、表示する `n` がユーザーの期待値と乖離しうるかを必ず判定し、乖離する場合は R 側で `parsed$n_note` を設定する。実装例は `correlation.R` / `factor.R` / `regression.R` / `reliability.R` / `anova.R` を参照。

## Key Conventions

- ユーザー向け文言はすべて日本語
- コミットメッセージは conventional format（`feat:`, `fix:`, `chore:` 等）+ 日本語本文
- `AnalysisResult.sections` がすべての分析出力の共通形（表示・将来のエクスポートに兼用）
- option 型は各メソッドの `modal.tsx` 内でローカル定義し、`AnalysisOptions = Record<string, unknown>` を満たす形で `onExecute` に渡す
- Frontend ↔ Rust は Tauri `invoke()` で JSON 経由、Rust ↔ R は temp JSON ファイル経由
- 依存方向: `App → 機能フォルダ → shared`。機能間 import は **types のみ** が原則（詳細は `docs/ARCHITECTURE.md`）
