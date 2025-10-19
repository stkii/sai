# Project Architecture

## データフロー

ユーザーの操作から分析結果が表示されるまでのデータの流れは以下の通りです。

```mermaid
flowchart TD
    A["Frontend<br/>(React UI)"] -->|"1. Analysis Request<br/>(with data)"| B["Backend<br/>(Tauri/Rust)"]
    B -->|"2. Execute R script<br/>as external command"| C["Analysis Engine<br/>(R)"]
    C -->|"3. Output analysis result<br/>as JSON"| B
    B -->|"4. Return result<br/>to frontend"| A
    A -->|"5. Update UI and<br/>display result"| D["User"]
```

## シーケンス図（ハッピーパス）

ユーザー操作から結果表示までの具体的なIPCのやり取り。

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend (React UI)
    participant T as Backend (Tauri/Rust)
    participant R as Analysis Engine (R/cli.R)
    participant S as Temp Store
    participant V as Result Viewer (Webview)

    U->>F: 「実行」をクリック
    F->>T: invoke build_numeric_dataset(path, sheet, variables)
    T-->>F: dataset (Map<String, Array<number|null>>)

    F->>T: invoke run_r_analysis_with_dataset(analysis, dataset, timeoutMs, order?)
    T->>R: Rscript --vanilla cli.R analysis in.json out.json [order]
    R-->>T: JSON (ParsedTable)
    T-->>F: ParsedTable

    F->>T: invoke issue_result_token(result)
    T->>S: store(result, ttl=5m)
    S-->>T: token
    T-->>F: token

    F->>T: invoke open_or_reuse_window("result", "pages/result.html?analysis=...&token=...")

    Note over F,V: 結果ウィンドウが開く（URLにtoken）
    V->>T: invoke consume_result_token(token)
    T->>S: consume(token) -> result
    S-->>T: ParsedTable
    T-->>V: ParsedTable
    V-->>U: テーブル表示
```

## シーケンス図（タイムアウト分岐）

R実行が所定時間内に終わらない場合の分岐。分析パネルは閉じず、エラーを表示して待機します。

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend (React UI)
    participant T as Backend (Tauri/Rust)
    participant R as Analysis Engine (R/cli.R)

    U->>F: 「実行」をクリック
    F->>T: invoke build_numeric_dataset(path, sheet, variables)
    T-->>F: dataset

    F->>T: invoke run_r_analysis_with_dataset(analysis, dataset, timeoutMs, order?)
    T->>R: Rscript --vanilla cli.R analysis in.json out.json [order]

    alt R実行がタイムアウト
      T-->>F: Err("R 実行がタイムアウトしました: <timeout>")
      F-->>U: エラー表示（分析パネルに残留）
      Note over F: 結果ウィンドウは開かない／トークン発行もしない
    end
```

注記:

- タイムアウト値はフロントから `timeoutMs`（ミリ秒）で渡され、Rust側で `Duration` に変換して待機します。
- タイムアウト時は `issue_result_token` や `open_or_reuse_window` は呼ばれないため、結果ビューは開きません。
