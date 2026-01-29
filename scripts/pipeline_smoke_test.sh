#!/usr/bin/env bash
set -euo pipefail

if ! command -v python >/dev/null 2>&1; then
  echo "python が見つかりません。"
  exit 1
fi

echo "==> Pipeline smoke test"
python apps/pipeline/cli.py collect --topic schedule --date today --region JP
python apps/pipeline/cli.py validate --topic schedule --region JP
python apps/pipeline/cli.py compose --topic schedule --channel x --format 1 --mode full
python apps/pipeline/cli.py publish --topic schedule --channel x --mode dry-run
echo "==> Pipeline smoke test 完了"
