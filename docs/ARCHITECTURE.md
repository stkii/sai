# Architecture

SAI の全体像をまとめた文書です。どこに何があるのか、処理がどう流れるのかをつかむことを目的としています。

## 設計の出発点

### ユーザー機能

1. ファイルの読込 (CSV / XLSX / XLS / SAV)
2. クリック操作だけでの分析の実行 (記述統計・相関・回帰・因子・信頼性・分散分析・距離・多次元尺度構成法・検出力分析)
3. 分析結果の表示
4. 過去の分析履歴の参照
5. 派生列の作成 (逆転項目)

### 制約

- データビューと結果ビューは、常に同時に見えている必要があります。タブで切り替えて片方が隠れる構成にはしません
- ソロ開発で、スコープは固定されている前提です
- R は心理統計の事実上の標準であり、ほかのものには置き換えられません

### 採用した判断

| 判断 | 内容 |
|---|---|
| 単一ウィンドウの 2 ペイン | 左にデータ、右に結果と履歴のタブを置く |
| 3 つの層 | Frontend (React)、Backend (Rust / Tauri)、R 層 (Rscript) |
| Backend は commands / services / infra の 3 層 | trait による抽象化はしない。services が infra の具象を直接持つ (YAGNI) |
| Frontend はフラットな構造 | 機能ごとのフォルダ (`data` / `analysis` / `result`) をトップレベルに並べる |
| 履歴は単一の JSONL に追記するだけ | フィルタやページングはまだ入れていない |

## 設計原則

| 原則 | 内容 |
|---|---|
| 単一責任 | 各モジュールは一つの目的だけを持つ |
| 依存方向の固定 | 上位の層から下位の層へ、一方向にだけ依存する |
| ドメインの言葉で命名 | 型・フラグ・フォルダの名前には、統計や研究で使う言葉を使う |
| 契約は型で守る | 層の間の約束は、規約文書ではなく型で表す |
| 黙った変換の禁止 | 入力の解釈、強制的な型変換、既定値の補完をしたときは、エラー・`n_note`・トーストのいずれかで必ずユーザーに伝える (`CLAUDE.md`) |
| メソッド固有のロジックは R に閉じる | Rust は受け渡しに徹し、Frontend は UI だけを担う |
| YAGNI | 将来必要になるかもしれない柔軟性を、先回りして作らない |

## UI レイアウト

```
┌────────────────────────────────────────────────────────────┐
│ SAI  [データセットを開く] [分析▼]                          │
├──────────────────────╥─────────────────────────────────────┤
│ データ               ║ Tabs: [結果] [履歴]                 │
├──────────────────────╢─────────────────────────────────────┤
│  データプレビュー    ║   Result / History Pane             │
│  (仮想スクロール)    ║                                     │
└──────────────────────╨─────────────────────────────────────┘
                       ↑ スプリッタ (ドラッグ / ← → キーで幅を変更)
```

- 左のペインには、常にデータのプレビューを表示します。変数の選択はここではなく、分析ごとのモーダルで行います
- 中央のペインは、結果と履歴をタブで切り替えます。新しい結果が追加されると、自動で「結果」タブに切り替わります

## 全体構成

```
Frontend (src/)              Backend (src-tauri/src/)          R 層 (src-r/)
React + Chakra UI            Rust + Tauri                      Rscript
────────────────────────     ───────────────────────────       ─────────────────
UI・入力モーダル        ─invoke→  commands → services → infra  ─一時 JSON→  cli.R
結果表示・履歴                  (受け渡しのみ)                    └ R/<method>.R
```

- Frontend と Rust の間は Tauri の `invoke()` による JSON、Rust と R の間は一時 JSON ファイルでやり取りします
- 全メソッドで共通する結果の形は `AnalysisResult.sections` です。画面表示にも、将来のエクスポートにも同じものを使います

### Frontend (`src/`)

```
src/
├── main.tsx / App.tsx / Header.tsx
├── data/        # 左ペイン: データの表示・読込・変数の作成
├── analysis/    # 分析の実行: メニュー・モーダル・実行処理
│   └── methods/<method>/   # 分析ごとに modal.tsx と index.tsx (必要なら result.tsx も)
├── result/      # 中央ペイン: 結果の表示と履歴
└── shared/      # ui/ (共通部品)・ipc/ (Tauri とのやり取り)・types/・format.ts
```

- 依存は `App / Header → 機能フォルダ → shared` の向きにだけ流れます
- 機能フォルダどうしが直接依存することは、原則として禁止です。例外は、公開されている hook (`useDataset`, `useResult`)、読み取り専用の registry (`findMethod`)、`shared/types/` にある共通の型だけです
- Tauri との通信は、`shared/ipc/` だけが行います
- 分析メソッドは `defineMethod()` で組み立て、`ANALYSIS_METHODS` に登録します。メニューやモーダルのホストは、個々のメソッドの中身を知りません
- 変数の作成も同じ仕組みで、`VARIABLE_KINDS` に登録します (今は `reverse` だけです)
- `variables` は、R に渡す列の集合です。options が列名を参照するときは、その列も含めてください。含めなかった列は Rust 側で取り除かれ、R からは見えません

### Backend (`src-tauri/src/`)

```
src-tauri/src/
├── lib.rs / bootstrap.rs    # 起動とコマンドの登録 / AppState の生成と結線
├── commands/                # Tauri コマンド (薄い変換層): dataset, analysis, history
├── services/                # ビジネスロジック: dataset, analysis, history
├── infra/                   # 外部システム: r/ (Rscript), reader/ (csv, excel, spss), cache/, store/
└── models.rs                # 共通の型
```

- 依存は `commands → services → infra` の向きで、共通の型は `models.rs` に置きます
- Rust は受け渡しに徹します。メソッドを実行できるかどうかは、R の dispatch table (`cli.R`) だけが決めます。Rust 側にメソッド名の一覧はありません
- R の実行は 120 秒で打ち切ります。R を呼ぶ commands は `spawn_blocking` で動かすため、UI は固まりません
- 開発中は `src-r/` のスクリプトを、配布版は Tauri のリソースに入った `r/` のスクリプトを使います。配布版は同梱したパッケージだけで動き、renv の復元やアプリ内への書き込みはしません

### R 層 (`src-r/`)

```
src-r/
├── cli.R           # 分析のエントリ。dispatch table でメソッドを決める
├── read_sav.R      # SPSS (.sav) を読み込むエントリ
├── transform.R     # 派生列 (逆転項目) を計算するエントリ
├── R/              # entry.R, common.R, <method>.R (describe, correlation, regression, ...)
├── tests/          # testthat。dev profile でだけ実行する
└── renv.lock       # 本番用の lockfile
```

- 1 つのメソッドは 1 つのファイルに書き、`.<Method>` (計算)、`.<Method>Parsed` (表への変換)、`Run<Method>` (エントリ) の 3 つの関数に分けます
- 必要なパッケージが足りないときは、すぐに停止します。自動ではインストールしません
- 欠測の除外や数値にできない値などで、有効なサンプルサイズが期待とずれるときは、`n_note` で必ずユーザーに伝えます
- 統計の出力は SPSS との一致を目指します。一致しない場合は、その理由を記録します (`CLAUDE.md`)

## 分析実行フロー

```
Frontend                     Rust                              R
─────────────────────────────────────────────────────────────────────────
AnalysisModalHost → useRunAnalysis
  runAnalysis({datasetKey, method, variables, options})
        │ invoke('run_analysis')
        ▼
                     AnalysisService::run
                       ├ datasetKey あり → cache から列を取り出す (variables)
                       └ null           → 空のテーブル
                     RRunner::run ─ temp input.json ─┐
                                                     ▼
                                              cli.R
                                                ├ dispatch[method] でメソッドを決める
                                                ├ Run<Method>(df, options)
                                                │    → {sections, n, n_note}
                                                └ 数値にできなかった値を n_note に加える
                     AnalysisResult ◀─ temp output.json ─┘
        ◀ camelCase (nNote)
ResultContext.addResult
  └ 履歴に残す分析なら、appendHistory() で JSONL に追記
```

データセットを使わない分析 (検出力分析) は、`datasetKey: null` で同じ経路を通ります。この結果は履歴に残しません。

## 新しい分析メソッドの追加

R 層 (`R/<method>.R` と dispatch table) と Frontend (`analysis/methods/<method>/` と登録) に追加します。Rust は、原則として変更しません。手順は [DEVELOPING.md](./DEVELOPING.md) を参照してください。

## 将来の拡張

| 拡張 | 影響する層 | 構造の変更 |
|---|---|---|
| 分析メソッドの追加 | R / analysis/methods | 不要 |
| 派生列の変換の追加 (合計得点 など) | R (`transform.R`) / data/ui | 不要。`kind` の分岐と UI を足すだけ |
| 結果のエクスポート (PDF / CSV) | `services/export.rs` を追加 | services を 1 つ足すだけ |
| 複数データセットの同時保持 | `infra/cache/` を拡張 | cache のキーを拡張するだけ |
| 履歴のフィルタ・ページング | `services/history.rs` と `commands/history.rs` を拡張 | API を 1 つ足すだけ |
| R 本体の同梱 | `infra/r/runner.rs` と `scripts/prepare-r-resources.mjs` | **要対応**。R のパッケージとスクリプトは同梱済みだが、R 本体は利用者が別途インストールする必要がある。しかもビルド時と同じ R の版・CPU でなければならない。macOS 以外への配布も未対応 |
| マルチユーザー対応 | 全層 | **要再設計**。今の設計はシングルユーザーを前提にしている |
