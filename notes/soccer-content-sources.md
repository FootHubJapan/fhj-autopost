# サッカー領域の投稿ネタ別データソース案

このメモは「試合結果・移籍ニュース・ハイライト要約・放送予定・チーム別ニュース」を、
**個人運用**と**商用運用**の両方を見据えて整理したものです。

## 1. 試合結果
### 個人運用で始めやすい
- **BBC Sport Football RSS**
  - 公式: https://feeds.bbci.co.uk/sport/football/rss.xml
- **ESPN Soccer RSS**
  - 公式: https://www.espn.com/espn/rss/soccer/news

### 商用運用で安定させやすい
- **Football-Data.org API**
  - 試合結果・順位表などをAPIで取得可能
  - 商用利用はプラン要確認
- **API-FOOTBALL (rapidapi含む)**
  - 試合結果/日程/チーム/選手をAPIで取得
  - 商用は有料プラン前提

## 2. 移籍ニュース / 年俸 / 市場価値
### 個人運用で始めやすい
- **RSSで移籍ニュースを拾う**
  - 主要メディア（BBC/ESPN/Sky等）の移籍カテゴリRSS
  - RSSがない場合は「公式記事のRSS提供元」を優先

### 商用運用で注意が必要
- **Transfer系のデータは権利が厳しいケースが多い**
  - 商用は**契約前提**でデータ提供元を確保するのが安全
  - 無断スクレイピングは避ける

## 3. ハイライト要約
### 個人運用で始めやすい
- **試合速報記事の要約**
  - RSS記事本文 → 要約生成

### 商用運用で注意が必要
- **映像ハイライトの要約は二次利用に注意**
  - 公式動画/スポーツメディアの要約は**利用規約**を要確認

## 4. 放送予定 / 試合スケジュール
### 個人運用で始めやすい
- **リーグ公式サイトやクラブ公式サイトのRSS/カレンダー**
  - 公式日程のRSSやiCalが公開されている場合はそれを使う

### 商用運用で安定させやすい
- **API提供ベンダーのスケジュールデータ**
  - API-FOOTBALL
  - Football-Data.org

## 5. チーム別ニュース
### 個人運用で始めやすい
- **クラブ公式サイトのRSS**
  - 公式ニュースがRSSで配信されていれば最優先

### 商用運用で注意が必要
- **公式クラブのコンテンツは権利管理が厳格**
  - 利用規約を確認し、引用ルールに準拠

---

## feeds.json 用のカテゴリ別ID例
以下は `config/feeds.json` に追加するときの**カテゴリ整理の例**です。
同じカテゴリに複数のRSSを入れると、投稿パック側で混在しやすくなるので、
**カテゴリごとにIDプレフィックスを揃える**のがおすすめです。

```json
{
  "feeds": [
    { "id": "result_bbc", "name": "BBC Football Results", "url": "https://feeds.bbci.co.uk/sport/football/rss.xml" },
    { "id": "result_espn", "name": "ESPN Soccer News", "url": "https://www.espn.com/espn/rss/soccer/news" },
    { "id": "transfer_bbc", "name": "BBC Football Transfers", "url": "https://feeds.bbci.co.uk/sport/football/rss.xml" },
    { "id": "schedule_league", "name": "League Schedule", "url": "https://example.com/league/schedule.rss" },
    { "id": "team_club", "name": "Club Official News", "url": "https://example.com/club/news.rss" }
  ]
}
```

> `schedule_league` や `team_club` は例示のため、実運用では**公式RSS/iCal**のURLに差し替えてください。

## 最短で進めるための実装ルート
1. **RSS中心でまずは個人運用フローを作る**
2. **反応の良いカテゴリを確定**
3. **商用にするカテゴリだけ、API契約/ライセンスで補強**

---

## ベストプラクティス（最小構成）
- **カテゴリは1つから開始**: まずは「ニュース」だけに絞って運用フローを安定させる
- **IDにカテゴリ接頭辞**: `news_espn` のようにカテゴリが分かるIDにする
- **投稿文はテンプレ固定**: 例) `タイトル + 要約1行 + URL`
- **商用化の前に権利確認**: 移籍/ハイライト/放送予定は特に注意

---

## 補足: このリポジトリでの使い方
- `config/feeds.json` にRSSを追加するだけで試せます。
- 商用化する場合は、ライセンス明記のデータ提供元へ移行するのが安全です。
