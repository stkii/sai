<h1 align="center">SAI</h1>

心理学研究のために設計された、GUI ベースの分析ソフトウェアです。コマンド入力を必要とせず、クリック操作だけでデータ分析を行うことができます。

> [!IMPORTANT]
> 分析結果の解釈および妥当性の確認は利用者の責任で行なってください。仕様は予告なく変更されることがあります。
>
> - 分析手法などの機能は段階的に追加予定です
> - 動作確認は macOS のみで実施しています

### SAI の特長

- **分析条件の記録**：どのデータに、どんな設定で、どの分析を実行したかを自動で記録し、結果を後から確認することができます。
- **コマンド不要**：データの読み込みから分析実行・結果の確認までクリック操作のみで完結します。


## 機能一覧

### 統計分析

> [!NOTE]
>
> ステータスについて `🚧 In progress` の分析は、実行可能ですが開発中のものです。
> `✅ Available` であっても、拡張の可能性があります。

実行することのできる分析手法の一覧です。

<table>
  <thead>
    <tr>
      <th>分析</th>
      <th>説明</th>
      <th>ステータス</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>記述統計</td>
      <td>平均値や標準偏差などの記述統計量を算出します</td>
      <td>🚧 In progress</td>
    </tr>
    <tr>
      <td>相関</td>
      <td>相関係数を算出し相関の検定を行います</td>
      <td>✅ Available</td>
    </tr>
    <tr>
      <td>回帰</td>
      <td>線形モデルをあてはめ回帰分析を行います</td>
      <td>✅ Available</td>
    </tr>
    <tr>
      <td>分散分析</td>
      <td>分散分析を行います</td>
      <td>🚧 In progress</td>
    </tr>
    <tr>
      <td>因子分析</td>
      <td>因子分析を行います</td>
      <td>🚧 In progress</td>
    </tr>
    <tr>
      <td>信頼性</td>
      <td>Cronbach の alpha 係数を算出します</td>
      <td>🚧 In progress</td>
    </tr>
    <tr>
      <td>...</td>
      <td>...</td>
      <td>...</td>
    </tr>
  </tbody>
</table>

### その他の機能

- **検出力分析**：一定の効果量と検出力を得るために必要なサンプルサイズを算出します
- **分析ログ**：実行した分析を自動で記録し、後から結果を参照することができます（分析データの各値は保持しません）

## 分析アルゴリズム

原則として、Rの標準パッケージ（ `base`、`stats` ）と、SAIで定義した前処理および分析フローを使用します。ただし、以下の分析については外部のパッケージを使用しています。

<table>
  <thead>
    <tr>
      <th>分析</th>
      <th>パッケージ</th>
      <th>使用理由</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>全ての分析</td>
      <td>
        <a href="https://cran.r-project.org/web/packages/jsonlite/index.html">jsonlite</a>
      </td>
      <td>アプリ内におけるデータの受け渡し</td>
    </tr>
    <tr>
      <td>因子分析</td>
      <td>
        <a href="https://cran.r-project.org/web/packages/EFAtools/index.html">EFAtools</a>
      </td>
      <td>因子の回転</td>
    </tr>
    <tr>
      <td>検出力分析</td>
      <td>
        <a href="https://cran.r-project.org/web/packages/pwr/index.html">pwr</a>
      </td>
      <td>当該分析のアルゴリズム</td>
    </tr>
  </tbody>
</table>

## クイックスタート

リポジトリからクローンして起動するために、以下が必要です。

- Git
- Node.js
- pnpm
- R

上記が利用可能な状態で、以下の手順に従ってセットアップを完了し、起動してください。

```bash
# ========== インストールと初回セットアップ ==========
git clone https://github.com/stkii/sai.git

cd sai/ && pnpm install

cd src-r/ && RENV_PROFILE=default Rscript -e 'renv::restore()'

# ========== 起動 ==========
pnpm start
```

## ライセンス

このプロジェクトは [GPL-3.0](https://github.com/stkii/sai/blob/main/LICENSE) で公開しています。
