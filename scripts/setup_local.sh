#!/usr/bin/env bash
set -euo pipefail

ASI_ARCH_DIR="${ASI_ARCH_DIR:-./asi-arch}"
ASI_ENV_NAME="${ASI_ENV_NAME:-asi-arch}"
ASI_PYTHON_VERSION="${ASI_PYTHON_VERSION:-3.10}"

echo "==> ASI-Arch setup (dir: ${ASI_ARCH_DIR}, env: ${ASI_ENV_NAME})"

if ! command -v conda >/dev/null 2>&1; then
  echo "conda が見つかりません。Miniconda/Anaconda をインストールしてください。"
  exit 1
fi

if [ ! -d "${ASI_ARCH_DIR}" ]; then
  echo "ASI-Arch リポジトリが見つかりません: ${ASI_ARCH_DIR}"
  echo "例: git clone https://github.com/GAIR-NLP/ASI-Arch.git ${ASI_ARCH_DIR}"
  exit 1
fi

pushd "${ASI_ARCH_DIR}" >/dev/null

if conda env list | grep -q "${ASI_ENV_NAME}"; then
  echo "conda env '${ASI_ENV_NAME}' は既に存在します。"
else
  echo "conda env '${ASI_ENV_NAME}' を作成します (python=${ASI_PYTHON_VERSION})"
  conda create -y -n "${ASI_ENV_NAME}" "python=${ASI_PYTHON_VERSION}"
fi

echo "conda 環境を有効化して依存関係をインストールします。"
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate "${ASI_ENV_NAME}"

if [ -f "environment.yml" ]; then
  echo "environment.yml を検出。conda env update を実行します。"
  conda env update -n "${ASI_ENV_NAME}" -f environment.yml
elif [ -f "requirements.txt" ]; then
  echo "requirements.txt を検出。pip install を実行します。"
  pip install -r requirements.txt
else
  echo "依存ファイルが見つかりません。README の手順を確認してください。"
  exit 1
fi

echo "==> セットアップ完了"
popd >/dev/null
