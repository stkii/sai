# 開発者向けドキュメント

このドキュメントでは、SAI の開発におけるコーディング規約や、分析手法の追加、テストの方法などに関して記述しています。
新機能の提案、バグ報告などについては、[`CONTRIBUTING.md`](https://github.com/stkii/sai/tree/main/docs/CONTRIBUTING.md) を参照してください。

## 分析手法の追加手順

R 層では分析アルゴリズムの記述、ディスパッチの登録を行います。Frontend では、UIの構築と分析手法の登録を行います。原則として、Backend への追記は必要ありません。

1. **R 層** (`src-r/`)
   - `R/<method>.R` を追加 (`.<Method>` / `.<Method>Parsed` / `Run<Method>` の 3 関数構成)
   - `cli.R` の dispatch table に `<method> = list(requires_data = ..., kind = ..., run = Run<Method>)` を追加
   - `cli.R` の `source()` 呼び出しを追加
   - `tests/testthat/test-<method>.R` を追加 (base R との一致 + `n_note` の検証)
2. **Frontend** (`src/`)
   - `shared/types/index.ts` の `Method` union に追加
   - `analysis/methods/<method>/` に `modal.tsx` / `index.tsx` を追加 (`result.tsx` はカスタム表示が必要な場合のみ追加)
   - `analysis/methods/index.ts` の `ANALYSIS_METHODS` に登録
3. **Rust** (`src-tauri/`)
   - **原則として変更不要**。Rust は配管に徹し、未対応メソッドのエラーは R から返る
   - Rust 側で options の正規化や結果の後処理が必要な場合のみ、`services/analysis.rs` に分岐を追加
