# ASI-Arch ローカル起動ガイド（5分で動かす）

このリポジトリは **ASI-Arch をローカルで確実に動かすための補助スクリプト** と、  
**ASI-Arch思想を転用した AIネイティブスターター** を提供します。

> 注意: ASI-Arch 本体は別リポジトリです。先にクローンしてから進めてください。

## 最短5分で起動

### 1. ASI-Arch を用意
```bash
git clone https://github.com/GAIR-NLP/ASI-Arch.git ./asi-arch
```

### 2. 依存関係をセットアップ
```bash
cp .env.example .env
./scripts/setup_local.sh
```

### 3. 依存サービス起動
```bash
./scripts/start_services.sh
```

### 4. API 起動（ASI-Arch の README に従う）
```bash
cd ./asi-arch
# README の API 起動コマンドを実行
```

### 5. スモークテスト
```bash
./scripts/smoke_test.sh
```

## 起動順序（重要）
1. database
2. cognition_base
3. API/pipeline

## よくあるエラー

### Docker が起動していない
```bash
docker info
```
Docker Desktop などを起動してから再実行してください。

### Port 衝突
`8000` / `8001` が他プロセスで使用中だと失敗します。  
`.env` 内の `ASI_API_URL` / `RAG_API_URL` を変更してください。

### CUDA / torch
GPU が無い場合は CPU モードで起動してください。  
`ASI_PIPELINE_CMD` を `--light` / `--cpu` 付きに調整します。

---

# AIネイティブスターター
ASI-Arch の設計思想に沿って **「仮説→実装→実行→評価→学習（記憶更新）」** を回す
最小構成のスターターを `native_ai_starter/` に追加しています。

詳細は `native_ai_starter/README.md` を参照してください。
