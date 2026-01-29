# Native AI Starter

ASI-Arch の設計思想（仮説→実装→実行→評価→学習/記憶）を、  
**1コマンドで動く最小構成**としてまとめたスターターです。

## 1コマンド デモ
```bash
python native_ai_starter/demo.py "今週のKPIレポートを作って"
```

### 出力
- `native_ai_starter/output/report.md`
- `native_ai_starter/state/memory.sqlite`

## 構成
- Planner: 目標→タスク分解→実行計画
- Builder: 計画に沿ってレポート生成
- Critic: 評価スコア + 改善点、閾値未満なら最大2回リライト
- Memory: SQLite（MongoDB があればそちら優先）
- Knowledge: RAG API（あれば）→無ければ `docs/` の簡易検索

## 環境変数
`.env.example` を参照してください。

| 変数 | 役割 |
| --- | --- |
| RAG_API_URL | cognition_base のRAG API URL |
| MONGO_URL | MongoDB 接続URL |

## フォールバック
- RAG API が使えない場合は `docs/` を簡易検索します。
- MongoDB が使えない場合は SQLite に保存します。
