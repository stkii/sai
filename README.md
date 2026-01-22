<h1 align="center">SAI</h1>

心理学研究のために設計された、GUI ベースの分析ソフトウェアです。コマンド入力を必要とせず、クリック操作だけでデータ分析を行うことができます。

> [!IMPORTANT]
> 分析結果の解釈および妥当性の確認は利用者の責任で行なってください。また、仕様は予告なく変更されることがあります。
>
> - 分析手法などの機能は段階的に追加予定です
> - 動作確認は macOS のみで実施しています

## SAI の特長

- **再現性の確保**：どのデータに、どんな設定で、どの分析を実行したかを自動で記録し、後から確認することができます。
- **コマンド不要**：データの読み込みから分析実行・結果確認までをクリック操作で完結します。

## 利用可能な分析

実行することのできる分析手法の一覧です。

<table>
  <thead>
    <tr>
      <th>分析</th>
      <th>説明</th>
      <th>状態</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>記述統計</td>
      <td>平均値や標準偏差などの記述統計量を算出します</td>
      <td>✅ Available</td>
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
      <td>📝 Planned</td>
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
