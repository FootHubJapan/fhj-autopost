#!/usr/bin/env bash
set -euo pipefail

ASI_ARCH_DIR="${ASI_ARCH_DIR:-./asi-arch}"

if [ ! -d "${ASI_ARCH_DIR}" ]; then
  echo "ASI-Arch リポジトリが見つかりません: ${ASI_ARCH_DIR}"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker が見つかりません。Docker をインストールしてください。"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker デーモンが起動していません。"
  exit 1
fi

pushd "${ASI_ARCH_DIR}" >/dev/null

COMPOSE_FILE=""
if [ -f "docker-compose.yml" ]; then
  COMPOSE_FILE="docker-compose.yml"
elif [ -f "docker-compose.yaml" ]; then
  COMPOSE_FILE="docker-compose.yaml"
else
  echo "docker-compose ファイルが見つかりません。"
  exit 1
fi

echo "==> docker compose 起動 (${COMPOSE_FILE})"
docker compose -f "${COMPOSE_FILE}" up -d database cognition_base || {
  echo "docker compose 起動に失敗しました。サービス名を確認してください。"
  exit 1
}

echo "==> API 起動 (別ターミナルで) :"
echo "cd ${ASI_ARCH_DIR} && <API起動コマンド>"
echo "README の起動手順に従って API を起動してください。"

popd >/dev/null
