# TODO: 仮定の検定・信頼区間の追加

本ドキュメントは、分析結果に仮定の検定（前提条件チェック）と信頼区間を追加するための技術的な対応方針をまとめたものである。

---

## 1. 仮定の検定（前提条件チェック）

### 1-1. 相関分析: 正規性検定（Shapiro-Wilk）

Pearson 相関は変数の正規性を仮定する。各変数に対して Shapiro-Wilk 検定を実行し、結果に追加セクションとして表示する。

**R層の変更** (`src-r/R/correlation.R`)

```r
# .CorrTest() 内で各変数の正規性を検定
shapiro_results <- lapply(df, function(col) {
  x <- col[!is.na(col)]
  if (length(x) >= 3 && length(x) <= 5000) shapiro.test(x) else NULL
})
```

- `shapiro.test()` は base R の `stats` パッケージに含まれるため追加パッケージ不要
- n < 3 または n > 5000 の場合はスキップ（Shapiro-Wilk の制約）
- Spearman / Kendall 選択時は正規性検定を省略するか、注記のみとする

**返却値の変更**: `output_kind = "table"` のままでは複数テーブルを返せない。新しい `output_kind = "correlation"` を定義するか、既存の `note` フィールドにテキストとして追加する方法がある。セクション追加の場合は Rust 側に `CorrelationResult` 構造体と対応するハンドラ変更が必要。

**追加セクション例**:

| 変数 | W統計量 | p値 | 判定 |
|------|---------|-----|------|
| age | 0.987 | .142 | 正規性を棄却しない |
| score | 0.923 | .003 | 正規性を棄却 (p < .01) |

### 1-2. 回帰分析: 多重共線性（VIF）・Durbin-Watson

**VIF**: `.ComputeVIFs()` で計算済み、係数テーブルに含まれている。対応不要。

**Durbin-Watson 検定**: 残差の自己相関を検定する。

```r
# base R で実装可能（lmtest パッケージ不要）
residuals <- residuals(fit)
n <- length(residuals)
dw <- sum(diff(residuals)^2) / sum(residuals^2)
```

- DW 統計量のみ算出し、係数テーブルの `note` に追記する方法が最小限の変更で済む
- `lmtest::dwtest()` を使う場合は `lmtest` パッケージの追加が必要（p 値も算出可能）

**対応方針**: DW 統計量をモデル要約セクション（`model_summary`）の行または note に追加する。

### 1-3. 分散分析: 等分散性（Levene 検定）

被験者間要因の等分散性を Levene 検定で確認する。

**選択肢 A: `car` パッケージを追加**

```r
# car::leveneTest() を使用
car::leveneTest(dv ~ factor, data = df)
```

`car` パッケージは現在 renv に含まれていない。追加する場合:

```bash
cd src-r && Rscript -e 'renv::install("car"); renv::snapshot()'
```

**選択肢 B: base R で Levene 検定を自前実装**

```r
# 中央値ベースの Levene 検定（Brown-Forsythe）
.LeveneTest <- function(x, group) {
  grp <- split(x, group)
  z <- unlist(lapply(grp, function(g) abs(g - median(g, na.rm = TRUE))))
  g <- rep(names(grp), sapply(grp, length))
  summary(aov(z ~ g))[[1]][["Pr(>F)"]][1]
}
```

**推奨**: 選択肢 B。依存パッケージを増やさず、Brown-Forsythe 変法（中央値ベース）は正規性に頑健。

**追加セクション例**:

| 要因 | F値 | p値 | 判定 |
|------|-----|-----|------|
| group | 2.34 | .128 | 等分散性を棄却しない |

**返却値の変更**: `AnovaResult` 構造体に `assumptions: Option<ParsedDataTable>` を追加。Rust 側 `anova.rs` ハンドラと `map_sections` の変更が必要。

### 1-4. 因子分析: KMO・Bartlett 検定

因子分析の前提条件として、KMO（Kaiser-Meyer-Olkin）指標と Bartlett の球面性検定を報告する。

```r
# EFAtools パッケージ（すでに導入済み）で計算可能
kmo <- EFAtools::KMO(cor_mtx)
bartlett <- EFAtools::BARTLETT(cor_mtx, n = nrow(df))
```

- `EFAtools` はすでに renv に含まれている
- KMO: 0.6 未満は因子分析に不適（Kaiser の基準）
- Bartlett: 有意であれば相関行列が単位行列でないことを示す

**追加セクション例**:

| 検定 | 統計量 | p値 / 基準 | 判定 |
|------|--------|-----------|------|
| KMO | 0.843 | ≥ 0.6 | 適合 |
| Bartlett | χ²(45) = 312.5 | p < .001 | 有意 |

**返却値の変更**: `FactorResult` 構造体に `assumptions: Option<ParsedDataTable>` を追加。

---

## 2. 信頼区間（95% CI）

### ~~2-1. 相関係数の信頼区間~~ ✅ 対応済み（Pearson のみ）

`correlation.R` にて `stats::cor.test()$conf.int` で Fisher z 変換ベースの CI を算出済み。Spearman / Kendall は未対応（Fisher z の前提を満たさないため）。

~~Fisher の z 変換を用いて各ペアの 95% CI を算出する。~~

```r
# base R で実装可能
.CorCI <- function(r, n, conf_level = 0.95) {
  z <- atanh(r)  # Fisher z-transform
  se <- 1 / sqrt(n - 3)
  z_crit <- qnorm((1 + conf_level) / 2)
  lower <- tanh(z - z_crit * se)
  upper <- tanh(z + z_crit * se)
  list(lower = lower, upper = upper)
}
```

- Pearson 相関のみ適用（Spearman / Kendall は Fisher z 変換の前提を満たさないため省略またはブートストラップ法）
- `cor.test()` を使えば CI も取得可能だが、ペアごとに呼ぶ必要がある

**表示方法**: 相関行列の各セルに `r [lower, upper]` の形式で表示するか、別セクションとして CI 行列を追加する。

### ~~2-2. 回帰係数の信頼区間~~ ✅ 対応済み

`regression.R` にて `stats::confint(fit, level = 0.95)` で 95% CI を算出し、係数テーブルに「95%下限」「95%上限」列として表示済み。

~~```r
# base R の confint() で算出
ci <- confint(fit, level = 0.95)
# → matrix: [変数名, c("2.5 %", "97.5 %")]
```~~

~~**対応方法**: 係数テーブル（`coefficients`）に `95% CI 下限` / `95% CI 上限` の 2 列を追加する。R 側の `.LinearRegressionParsed()` で `confint()` の結果を組み込む。~~

~~Rust 側・フロントエンド側は既存の `ParsedDataTable` の列が増えるだけなので変更不要。~~

### 2-3. 分散分析の効果量の信頼区間

偏η²の 90% CI（慣例的に 90% を使用）を報告する。

```r
# 非心 F 分布を用いた CI
.EtaSqCI <- function(f_val, df1, df2, conf_level = 0.90) {
  ncp_lower <- tryCatch(
    uniroot(function(ncp) pf(f_val, df1, df2, ncp) - (1 - (1 - conf_level) / 2),
            c(0, 1e6))$root, error = function(e) 0)
  ncp_upper <- tryCatch(
    uniroot(function(ncp) pf(f_val, df1, df2, ncp) - (1 - conf_level) / 2,
            c(0, 1e6))$root, error = function(e) 0)
  lower <- ncp_lower / (ncp_lower + df1 + df2 + 1)
  upper <- ncp_upper / (ncp_upper + df1 + df2 + 1)
  list(lower = lower, upper = upper)
}
```

**対応方法**: 分散分析表（`anova_table`）に `CI 下限` / `CI 上限` の 2 列を追加する。

---

## 3. 変更が必要なファイル一覧

### R 層

| ファイル | 変更内容 |
|---------|---------|
| `src-r/R/correlation.R` | Shapiro-Wilk 検定の追加（~~相関係数 CI は対応済み~~） |
| `src-r/R/regression.R` | Durbin-Watson 統計量の追加（~~回帰係数 CI は対応済み~~） |
| `src-r/R/anova.R` | Levene 検定（自前実装）、効果量 CI の追加 |
| `src-r/R/factor.R` | KMO・Bartlett 検定の追加（EFAtools 使用） |
| `src-r/cli.R` | 相関の `output_kind` 変更（セクション追加時） |

### Rust 層

| ファイル | 変更内容 |
|---------|---------|
| `src-tauri/src/domain/analysis/model.rs` | 相関のセクション追加時は `CorrelationResult` 構造体の新設、`AnovaResult` / `FactorResult` に `assumptions` フィールド追加 |
| `src-tauri/src/presentation/commands/run_analysis.rs` | `map_sections` に新セクションのマッピング追加 |

### フロントエンド

| ファイル | 変更内容 |
|---------|---------|
| `src/analysis/methods/correlation/result.tsx` | 複数セクション対応（現在は `getSingleSection` で単一テーブル前提） |
| `src/analysis/methods/anova/result.tsx` | assumptions セクションの表示追加 |
| `src/analysis/methods/factor/result.tsx` | assumptions セクションの表示追加 |

回帰分析は既存の列追加のみでフロントエンド変更不要。

---

## 4. 実装の優先順位

追加パッケージ不要かつ変更範囲が小さいものから着手する。

1. ~~**回帰係数の CI** — `confint()` を呼ぶだけ。R 層のみの変更~~ ✅
2. **因子分析の KMO・Bartlett** — `EFAtools` で即実装可能。Rust に `assumptions` フィールド追加
3. **分散分析の Levene 検定** — base R で自前実装。Rust に `assumptions` フィールド追加
4. **相関の Shapiro-Wilk** — base R で実装可能だが `output_kind` 変更を伴う
5. **回帰の Durbin-Watson** — note 追記なら小規模、セクション追加なら中規模
6. **~~相関係数~~・効果量の CI** — ~~相関係数 CI は Pearson のみ対応済み ✅~~。効果量 CI は未実装
