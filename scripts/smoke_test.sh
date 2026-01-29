#!/usr/bin/env bash
set -euo pipefail

ASI_ARCH_DIR="${ASI_ARCH_DIR:-./asi-arch}"
ASI_API_URL="${ASI_API_URL:-http://localhost:8000}"
RAG_API_URL="${RAG_API_URL:-http://localhost:8001}"
ASI_PIPELINE_CMD="${ASI_PIPELINE_CMD:-python -m pipeline.run --once --light}"

echo "==> Smoke test: ASI-Arch"

if [ ! -d "${ASI_ARCH_DIR}" ]; then
  echo "ASI-Arch リポジトリが見つかりません: ${ASI_ARCH_DIR}"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl が見つかりません。"
  exit 1
fi

echo "==> API ヘルスチェック: ${ASI_API_URL}/health"
if ! curl -fsS "${ASI_API_URL}/health" >/dev/null; then
  echo "API ヘルスチェックに失敗しました。API が起動しているか確認してください。"
  exit 1
fi

echo "==> RAG ヘルスチェック: ${RAG_API_URL}/health"
if ! curl -fsS "${RAG_API_URL}/health" >/dev/null; then
  echo "RAG API ヘルスチェックに失敗しました。cognition_base が起動しているか確認してください。"
  exit 1
fi

echo "==> パイプライン 1 サイクル実行: ${ASI_PIPELINE_CMD}"
pushd "${ASI_ARCH_DIR}" >/dev/null
if ! ${ASI_PIPELINE_CMD}; then
  echo "パイプライン実行に失敗しました。ASI_PIPELINE_CMD を見直してください。"
  exit 1
fi
popd >/dev/null

echo "==> Smoke test 完了"
