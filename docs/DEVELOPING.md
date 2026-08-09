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
