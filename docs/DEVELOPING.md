# 開発者向けドキュメント

このドキュメントでは、SAI の開発におけるコーディング規約や、分析手法の追加、テストの方法などに関して記述しています。

## コーディング規約

**TypeScript**

- オブジェクトの定義には、原則として `interface` を使用してください。`Union` / `Tuple` / `Map` やプリミティブ型のエイリアスなど、`type` でなければ表現できない場合にのみ `type` を使用してください。

**Rust**

- `mod.rs` ではなく、モジュールは `<name>.rs` の形式で定義してください。

コミット前に、必ず以下のコマンドでフォーマッターとリンターを実行してください

```zsh
# TypeScript (from root)
pnpm fixall

# Rust (from src-tauri)
cargo +nightly fmt
cargo clippy --fix
```

## 分析手法の追加・編集

### RStudioの利用

Rscriptをテストするにあたって、RStudioの利用を推奨しています（強制するものではありません）。[renv profiles](https://rstudio.github.io/renv/articles/profiles.html) を利用することで、本番用とは別に開発用の環境を立てることができます。RStudio のコンソールから、

```r
> renv::activate(profile = "dev")
```

を実行することで、`renv/profiles/dev` が作成されます。デフォルト（本番用）の環境には

```r
> renv::activate(profile = "default")
```

を実行することで戻ることができます。

R 層（`src-r`）では分析アルゴリズムの記述、ディスパッチの登録を行います。Frontend では、UIの構築と分析手法の登録を行います。原則として、Backend への追記は必要ありません。

### 分析手法の追加手順

1. **R 層** (`src-r/`)
   - `R/<method>.R` を追加します (`.<Method>` / `.<Method>Parsed` / `Run<Method>` の 3 関数構成)
   - `cli.R` に `source()` と dispatch table のエントリを追加します
   - options が列名を参照する場合は、その列が `df` にあるかを `Run<Method>` の冒頭で検証します
   - `tests/testthat/test-<method>.R` を追加します (base R との一致 + `n_note` の検証)
2. **Frontend** (`src/`)
   - `shared/types/index.ts` の `Method` union にキーを追加します
   - `analysis/methods/<method>/modal.tsx` に入力 UI と `format<Method>Options()` を実装します
   - options 型は `type` で定義して export します
   - `analysis/methods/<method>/index.tsx` で `defineMethod<'<method>', XxxOptions>({...})` を組み立てて export します (`result.tsx` はカスタム表示が必要な場合のみ)
   - `onExecute` の第 1 引数には、R へ射影する列を漏れなく渡します (options が参照する列も含める)
   - `analysis/methods/index.ts` の `ANALYSIS_METHODS` に登録します
3. **Rust** (`src-tauri/`)
   - **原則として変更不要**。Rust は R との受け渡しをするだけで、対応していないメソッドが指定された場合のエラーも R 側から返ってきます
   - options の整形や結果の加工を Rust 側で行いたい場合のみ、`services/analysis.rs` に処理を追加してください

## 配布版のビルド

`pnpm tauri build` は、画面のビルド前に `pnpm prepare:r` を実行します。default profile の `src-r/renv.lock` と導入済みパッケージの版を照合し、R スクリプトとパッケージの実体を `src-tauri/resources/r/` に生成します。renv のキャッシュへのリンク、開発用データ、テストは同梱しません。パッケージが不足している場合は `src-r/` で`RENV_PROFILE=default Rscript -e 'renv::restore()'` を先に実行してください。

配布版は Tauri のリソースディレクトリにある `r/` を参照します。R 本体は別途必要です。同梱したコンパイル済みパッケージに合わせて、ビルド時と同じ R の版・CPU・OS、およびパッケージが必要とするシステムライブラリを使用してください。異なる R の版・CPU では、条件を表示して解析を停止します。ビルド時・実行時とも、`SAI_RSCRIPT` で使用する Rscript の場所を指定できます。macOS では PATH に加えて CRAN R と Homebrew の標準配置先も検索します。配布版では同梱パッケージを使い、起動時の `renv::restore()` やアプリ内への書込みは行いません。

R から Rust を通って画面へ注意書きが届くことは、次の結合テストで確認できます。

```zsh
cd src-tauri
RENV_CONFIG_SANDBOX_ENABLED=false RENV_PROFILE=default cargo test --lib real_r_notes_reach_the_frontend -- --ignored
```

`pnpm prepare:r` の後なら、移動後の同梱 R による解析・逆転項目作成・SAV読込みと、
同時の変数作成も含めて次のコマンドで検証できます。

```zsh
RENV_CONFIG_SANDBOX_ENABLED=false RENV_PROFILE=default cargo test --lib -- --include-ignored
```

`SAI_TEST_R_RESOURCES` に `.app/Contents/Resources/r` の絶対パスを指定すると、
ビルドで生成した `.app` の内容を移動テストに使用できます。
