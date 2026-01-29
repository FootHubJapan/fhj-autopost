# 環境変数の設定方法

## 方法1: ターミナルで直接設定（推奨・簡単）

現在開いているターミナルで、以下のコマンドを実行：

```bash
export DRIVE_FOLDER_ID="1dBIj3R8kbv00btJMX4OAIfY8x6ZcRfMd"
export SPREADSHEET_ID="1VeypuBvnyLO70JG2wY0Y78rMSnOe0lpR8VoZbQmc_XY"
```

**注意**: この方法は、**そのターミナルセッションでのみ有効**です。
ターミナルを閉じると設定が消えます。

## 方法2: .env ファイルで設定（永続的）

プロジェクト直下に `.env` ファイルを作成：

```bash
# .env ファイルを作成
cat > .env << 'ENVEOF'
DRIVE_FOLDER_ID=1dBIj3R8kbv00btJMX4OAIfY8x6ZcRfMd
SPREADSHEET_ID=1VeypuBvnyLO70JG2wY0Y78rMSnOe0lpR8VoZbQmc_XY
ENVEOF
```

ただし、現在のスクリプトは `.env` ファイルを自動読み込みしていないので、
この方法を使う場合は `dotenv` パッケージが必要です。

## 方法3: シェル設定ファイルに追加（永続的）

`~/.zshrc` に追加（Macのデフォルトシェルがzshの場合）：

```bash
echo 'export DRIVE_FOLDER_ID="1dBIj3R8kbv00btJMX4OAIfY8x6ZcRfMd"' >> ~/.zshrc
echo 'export SPREADSHEET_ID="1VeypuBvnyLO70JG2wY0Y78rMSnOe0lpR8VoZbQmc_XY"' >> ~/.zshrc
source ~/.zshrc
```

## 推奨: 方法1（ターミナルで直接設定）

今すぐ実行するなら、**方法1が最も簡単**です。

ターミナルで以下を実行：

```bash
export DRIVE_FOLDER_ID="1dBIj3R8kbv00btJMX4OAIfY8x6ZcRfMd"
export SPREADSHEET_ID="1VeypuBvnyLO70JG2wY0Y78rMSnOe0lpR8VoZbQmc_XY"
```

設定が完了したら、確認：

```bash
echo $DRIVE_FOLDER_ID
echo $SPREADSHEET_ID
```

両方とも値が表示されればOKです。

その後、`npm run sync` を実行できます。

