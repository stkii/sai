# Project Architecture

## データフロー

ユーザーの操作から分析結果が表示されるまでのデータの流れは以下の通りです。

```mermaid
flowchart TD
    D["User"] -->|"Select file/sheet<br/>and variables"| A["Frontend<br/>(React UI)"]
    A -->|"1. Request dataset<br/>(path, sheet, variables)"| B["Backend<br/>(Tauri/Rust)"]
    B -->|"2. Read Excel & build<br/>numeric dataset (headers preserved)"| A
    A -->|"3. Request analysis<br/>(dataset, options)"| B
    B -->|"4. Execute R script<br/>as external command"| C["Analysis Engine<br/>(R/cli.R)"]
    C -->|"5. Output analysis result<br/>as JSON (ParsedTable)"| B
    B -->|"6. Return result<br/>to frontend (ParsedTable)"| A
    A -->|"7. Update UI and<br/>display result"| D
```

## シーケンス図

ユーザー操作から結果表示までの具体的な IPC のやり取り。

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

    F->>T: invoke run_r_analysis_with_dataset(analysis, dataset, timeoutMs, optionsJson?)
    T->>R: Rscript --vanilla cli.R analysis in.json out.json [order]
    R-->>T: JSON (ParsedTable)
    T-->>F: ParsedTable

    F->>T: invoke issue_result_token(result)
    T->>S: store(result, ttl=5m)
    S-->>T: token
    T-->>F: token

    Note over F: token/metadataをpayloadにまとめる（localStorageにもバックアップ）

    F->>T: invoke open_or_reuse_window("result", "pages/result.html", payload)
    T-->>F: emit("result:load", payload)

    Note over F,V: payload経由で結果ウィンドウを初期化
    V->>T: invoke consume_result_token(payload.token)
    T->>S: consume(token) -> result
    S-->>T: ParsedTable
    T-->>V: ParsedTable
    V-->>U: テーブル表示
```

## シーケンス図（タイムアウト）

R 実行が所定時間内に終わらない場合の分岐。分析パネルは閉じず、エラーを表示して待機します。

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend (React UI)
    participant T as Backend (Tauri/Rust)
    participant R as Analysis Engine (R/cli.R)

    U->>F: 「実行」をクリック
    F->>T: invoke build_numeric_dataset(path, sheet, variables)
    T-->>F: dataset

    F->>T: invoke run_r_analysis_with_dataset(analysis, dataset, timeoutMs, optionsJson?)
    T->>R: Rscript --vanilla cli.R analysis in.json out.json [extra]

    alt R実行がタイムアウト
      T-->>F: Err("R 実行がタイムアウトしました: <timeout>")
      F-->>U: エラー表示（分析パネルに残留）
      Note over F: 結果ウィンドウは開かない／トークン発行もしない
    end
```

注記:

- タイムアウト値はフロントから `timeoutMs`（ミリ秒）で渡され、Rust 側で `Duration` に変換して待機します。
- タイムアウト時は結果ウィンドウを開かず、分析パネルにエラーを表示して待機します。

## 詳細仕様

本ドキュメントは全体の構造とIPCの流れに限定します。  
データ表現（`ParsedTable` / 数値dataset / ヘッダ一貫性）、値表現の規約、分析オプション JSON の渡し方などの詳細は `docs/DATA_ENGINE_POLICY.md` を参照してください。
