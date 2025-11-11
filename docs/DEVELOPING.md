# 開発者向けドキュメント

> このドキュメントはベータ版開発中の内容を反映しています。内容が大きく変更されることがあります。

## `src-r`（Rプロジェクト）

開発で用いるライブラリや依存関係が、本番環境の `renv/` や `renv/lock` に混入しないように、以下のコマンドで環境を切り替えることができます。詳細は以下の URL を参照してください。

- https://rstudio.github.io/renv/articles/profiles.html

```bash
# 開発環境
renv::activate(profile = "dev")

# 本番環境
renv::activate(profile = "default")
```

## Git

### ブランチ戦略

<table>
  <tr>
    <th>ブランチ</th>
    <th>説明</th>
  </tr>
  <tr>
    <td><code>main</code></td>
    <td>
      原則として直接の編集はしない<br>
      実際に稼働させるコードを保管するブランチ
    </td>
  </tr>
  <tr>
    <td><code>dev</code></td>
    <td>
      開発時の集約先となる
      <ul>
        <li><code>main</code> から派生させる</li>
        <li>beta 版開発中は<code>dev-beta</code> を使用</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td><code>feature</code></td>
    <td>
      特定の機能や作業で使用する
      <ul>
        <li><code>dev</code> から派生させる</li>
        <li><code>feature-{name}</code> の形式で作成する</li>
        <li>作業が完了したら <code>dev</code> へマージ</li>
      </ul>
    </td>
  </tr>
</table>

### コミットルール

**必ずリンターとフォーマッターを実行してから push してください**。

```bash
# ---------- TypeScript ----------
# Check problems
pnpm check

# Lint and Format files in src/ directory
pnpm lint
pnpm format

# ---------- Rust ----------
# build check
cargo check

# Format (nightly is required)
cargo +nightly fmt
```

コミットメッセージは `.github/.gitmessage` にある[テンプレート](https://github.com/stkii/sai/blob/main/.github/.gitmessage)に従って作成してください。必要に応じて、以下のコマンドでコミットメッセージ作成時にテンプレートを表示することができます。

## エディター・IDE

### Cursor / VSCode (Optional)

設定ファイルを [`.vscode/`](https://github.com/stkii/sai/blob/main/.vscode) にバンドルしています。フォーマッタや参照パスの設定は、チームで統一したい設定です。
rust-analyzer の一部の設定（e.g., proc-macro）は、開発環境やメモリ容量に応じて削除・編集してください。

### RStudio (Optional)

`src-r/` の開発について、以下の手順から `RStudio` で作業することができます。`RStudio` 本体はインストールされており使用可能であることを前提としています。

- RStudio を起動し `src-r/` を既存のプロジェクトとして開く
- `renv::restore()` を実行
- `renv::status()` を実行して状態確認
  - `No issues found -- the project is in a consistent state` と出力されればOK
