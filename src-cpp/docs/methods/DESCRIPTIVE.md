# 記述統計

## この文書について

数値1列の記述統計について、返す値、返らない条件、採用する定義とSPSS資料の対応を定めます。エラーの伝え方、浮動小数点の扱い、許容誤差の既定は [数値計算とエラー処理の方針](../NUMERICAL_POLICY.md) に従い、ここには手法固有の判断だけを書きます。

計算の手順と内部の変数名はこの文書の対象外です。実装を読まずに、どの入力でどの値が返り、どの条件で返らないかが判断できることを目的とします。

### SPSS準拠の段階

| 統計量 | 段階 | 残す根拠 |
| --- | --- | --- |
| 平均・標準偏差・最小・最大・歪度・尖度 | B：式一致 | IBM SPSS Statistics Algorithms v32 の `DESCRIPTIVES Algorithms`（PDFの364〜366ページ。PDF先頭を1ページとして数えた位置）に式がある。参照値はRのbase/statsと `psych` の `type = 2` で生成した |
| 中央値 | C：SAI採用仕様 | DESCRIPTIVES章に対応する記述がない。通常の標本中央値を採用する |

SPSS本体での照合は未実施です。段階Aの統計量はありません。資料のPDFは容量と再配布の都合で追跡していないため、出典はページ番号で示します。

## 公開API

`sai::analysis::describe(column, options)` は、数値1列の重みなし記述統計を返します。複数列は列ごとに呼び出します。入力の `sai::core::NumericColumnView` は借用するだけで、変更しません。宣言は `include/sai/analysis/descriptive.hpp` にあります。

```cpp
const sai::analysis::DescriptiveOptions options{.include_skewness = true};
const sai::analysis::DescriptiveResult result = sai::analysis::describe(column, options);
if (result.skewness.has_value()) {
    use(*result.skewness);
}
```

### オプション

| フィールド | 既定 | 意味 |
| --- | --- | --- |
| `include_skewness` | `false` | 歪度を求める |
| `include_kurtosis` | `false` | 尖度を求める |

2つは独立で、片方だけを有効にできます。

### 結果

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `total_count` | `std::size_t` | 欠損行を含む入力行数 |
| `valid_count` | `std::size_t` | 統計量に使った有効行数 |
| `missing_count` | `std::size_t` | 欠損マスクが1の行数 |
| `mean` | `std::optional<double>` | 算術平均 |
| `standard_deviation` | `std::optional<double>` | 標本標準偏差。分母は $`n-1`$ |
| `minimum` / `maximum` | `std::optional<double>` | 最小値・最大値 |
| `median` | `std::optional<double>` | 中央値 |
| `skewness` | `std::optional<double>` | 補正済み歪度 |
| `kurtosis` | `std::optional<double>` | 補正済み超過尖度。正規分布で0 |
| `applied_options` | `DescriptiveOptions` | 今回適用したオプション |
| `diagnostics` | `std::vector<sai::core::Diagnostic>` | 要求した値が返らなかった理由 |

`total_count == valid_count + missing_count` が常に成り立ちます。

## 値が返らない条件

有効行は、欠損マスクが1でない行です。その件数を $`n`$ とします。

| 統計量 | 返る条件 | 満たさないときの診断 |
| --- | --- | --- |
| `mean`・`minimum`・`maximum`・`median` | $`n\ge1`$ | `InsufficientObservations` |
| `standard_deviation` | $`n\ge2`$ | `InsufficientObservations` |
| `skewness` | 要求あり、$`n\ge3`$、標本分散が閾値以上 | `InsufficientObservations`／`VarianceTooSmall` |
| `kurtosis` | 要求あり、$`n\ge4`$、標本分散が閾値以上 | `InsufficientObservations`／`VarianceTooSmall` |

診断の `target` は返らなかったフィールド名、`count` は有効件数 $`n`$ です。

要求しなかった統計量は `std::nullopt` になりますが、診断は出しません。利用者が選ばなかったことは異常ではないためです。したがって診断が空であることは、要求したすべての値が返ったことを意味します。

### 数値表現の限界

定義上は存在しても double で表せない場合は、値を返さずに `NotRepresentable` を記録します。入力の誤りではないので例外にしません。

- 平均が有限でなくなった場合。平均に依存する `standard_deviation`・`skewness`・`kurtosis` も返しません。`minimum`・`maximum`・`median` は平均を使わないので返ります
- 標準偏差がdoubleの範囲を超えた場合、または標本分散が0でないのに標準偏差が0へアンダーフローした場合。`skewness`・`kurtosis` も返しません

いずれも、返せなかったフィールドごとに診断を記録します。他の計算できた統計量は保持します。

## 定義

有効値を $`x_i`$、その件数を $`n`$、平均を $`\bar{x}`$、中心モーメントの和を $`M_r=\sum_i(x_i-\bar{x})^r`$ とします。各有効観測の重みは1です。

```math
\begin{align*}
  \bar{x} &= \frac{1}{n}\sum_i x_i
  \\[8pt]
  s &= \sqrt{\frac{M_2}{n-1}}
  \\[8pt]
  G_1 &= \frac{n M_3}{(n-1)(n-2)s^3}
  \\[8pt]
  G_2 &= \frac{n(n+1)M_4}{(n-1)(n-2)(n-3)s^4}-\frac{3(n-1)^2}{(n-2)(n-3)}
\end{align*}
```

SPSS資料は平均を暫定平均の逐次更新で示していますが、定義として同じ値です。

中央値は通常の標本中央値です。有効値を昇順に並べ、奇数件では中央の値、偶数件では中央2値の平均とします。同順位は区別しません。

### 分散の閾値

標本分散 $`s^2`$ が $`10^{-20}`$ 未満のとき、歪度と尖度を返しません。SPSS資料が定める打ち切りです。

この閾値は標準偏差そのものには適用しません。定数列でも $`n\ge2`$ なら `standard_deviation` は0を返します。

## 欠損と契約違反

欠損マスクが1の行は、そこに入っている値によらず全統計量から除外します。すべての統計量が同じ有効行を使います。マスクを渡さないことは「欠損なし」を意味します。

次の3つは呼び出し元のコードの誤りなので `std::invalid_argument` を投げます。検証は `sai::core::validate` が入口で1度だけ行い、文言は [数値計算とエラー処理の方針](../NUMERICAL_POLICY.md) が定めます。

- 欠損マスクの長さが値と違う
- 欠損マスクに0と1以外がある
- 欠損として印を付けられていない行が有限でない値を持つ

欠損の印がないNaNを黙って欠損として扱いません。SPSSのシステム欠損の内部表現は再現しません。

## 検証

許容誤差は方針の既定（絶対誤差 $`10^{-12}`$ ＋相対誤差 $`10^{-10}`$、件数は完全一致）を使い、この手法では上書きしません。

| 場所 | 内容 |
| --- | --- |
| `tests/unit/descriptive_test.cpp` | 境界条件、欠損、空列、定数列、件数の境界、オプションの独立性、入力を変更しないこと |
| `tests/reference/descriptive_reference_test.cpp` | 保存済みの参照値との照合 |
| `tests/fixtures/descriptive/` | `iris` の数値4列と `airquality` の4列、生成環境と出典 |
| `validation/r/generate_descriptive.R` | 参照値の再生成 |

通常のテスト実行にRは要りません。

### R版との差異

既存のR実装はSPSSの分散の閾値を適用していません。極小分散の列では、R版が歪度・尖度の値を返すのに対し、SAIは返さずに `VarianceTooSmall` を記録します。SAIの採用仕様であり、Rに合わせません。

それ以外の条件では、`psych::describe(..., type = 2)` と同じ標本標準偏差・補正済み歪度・補正済み超過尖度になります。

## 範囲外

重み付き集計、歪度・尖度の標準誤差、平均の標準誤差、表示順、Rustと画面への接続は含みません。
