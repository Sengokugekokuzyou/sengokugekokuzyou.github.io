# 更新情報の自動反映

公式HPとDiscord告知は `news.json` を基準に運用します。

## 仕組み

- HP: `site.js` が `news.json` を読み込み、`approved` が `false` ではない更新情報を表示する。
- Discord: GitHub Actions が `news.json` 更新時に動き、`approved: true` かつ `discord: true` の新規項目を投稿する。
- YouTube: GitHub Actions がYouTubeの公開フィードを定期確認し、新着動画を `news.json` に追加する。
- itch.io: 手動実行のGitHub Actionsでゲームをbutlerアップロードし、HP/Discord用の更新情報と開発ログ下書きを作る。
- Webhook URLやトークンはリポジトリに書かず、GitHub Secrets / Variables に保存する。

## itch.ioアップロード自動化

`Deploy game to itch.io and log update` ワークフローを手動実行すると、以下をまとめて行います。

1. 指定したゲーム用GitHubリポジトリを取得する。
2. releaseフォルダを作る。
3. butlerでitch.ioへアップロードする。
4. `news.json` に更新情報を追加する。
5. `devlogs/` にitch.io開発ログ用の下書きを作る。
6. `news.json` 更新により、HPとDiscordへ告知が流れる。

既定値は `血華の系譜` 用です。

- game_repo: `Sengokugekokuzyou/sengoku-blood-`
- itch_target: `sengokugekokujobeats/kekkanokeifu`
- channel: `html5`

### itch.io Secrets設定

アップロードを有効化するには、GitHubリポジトリの設定で以下を追加します。

- Repository: `Sengokugekokuzyou/sengokugekokuzyou.github.io`
- Settings > Secrets and variables > Actions > New repository secret
- Name: `BUTLER_API_KEY`
- Value: itch.ioのAPI key

API keyはitch.ioのアカウント設定から発行します。キーは絶対にチャットやREADMEへ貼りません。

### 手動実行時の入力

- version: `v2.3.1` のような公開バージョン
- title: Discord/HPに出す更新タイトル
- body: 更新内容の要約

itch.io本体のDeveloper Logsは、公式APIで自動投稿する専用エンドポイントが確認できないため、現時点では下書きを自動生成し、内容確認後に手動投稿します。

## YouTube自動発信

対象チャンネル:

- URL: https://youtube.com/channel/UChtURL_MY58O7nfhmaYOMaw
- Channel ID: `UChtURL_MY58O7nfhmaYOMaw`

`sync-youtube-updates.yml` が毎時1回、YouTubeの公開フィードを確認します。新しい動画があれば `news.json` に以下の形式で追加されます。

```json
{
  "id": "youtube-VIDEO_ID",
  "date": "2026-06-01",
  "category": "YouTube",
  "title": "YouTube更新: 動画タイトル",
  "body": "新しい動画を公開しました。チャンネル: @戦国下剋上BEATS",
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "approved": true,
  "discord": true,
  "source": "youtube"
}
```

この追加コミットにより、HPの更新情報欄へ表示され、Discord投稿ワークフローも動きます。

## YouTube Variables設定

チャンネルIDはワークフローに既定値として設定済みです。変更したい場合だけ、GitHubリポジトリの設定で以下を追加します。

- Repository: `Sengokugekokuzyou/sengokugekokuzyou.github.io`
- Settings > Secrets and variables > Actions > Variables > New repository variable
- Name: `YOUTUBE_CHANNEL_ID`
- Value: YouTubeチャンネルID

任意で以下も変更できます。

- Name: `YOUTUBE_CHANNEL_HANDLE`
- Value: `@戦国下剋上BEATS`

## 更新情報の手動追加例

`news.json` の `updates` 配列の先頭に追加します。

```json
{
  "id": "2026-06-01-example",
  "date": "2026-06-01",
  "category": "ゲーム更新",
  "title": "血華の系譜を更新しました",
  "body": "バランス調整と表示修正を行いました。",
  "url": "https://sengokugekokujobeats.itch.io/kekkanokeifu",
  "approved": true,
  "discord": true
}
```

## 承認フラグ

- `approved: true`: HP表示とDiscord投稿の対象。
- `approved: false`: 下書き。HPには表示しない。Discordにも投稿しない。
- `discord: true`: Discord投稿対象。
- `discord: false`: HPだけ表示する。

## Discord Secrets設定

Discord投稿を有効化するには、GitHubリポジトリの設定で以下を追加します。

- Repository: `Sengokugekokuzyou/sengokugekokuzyou.github.io`
- Settings > Secrets and variables > Actions > New repository secret
- Name: `DISCORD_WEBHOOK_URL`
- Value: Discordの投稿先チャンネルWebhook URL

## 注意

Webhook URL、APIキー、トークンは絶対にREADMEやJSONへ書きません。
YouTube自動発信は、公開済み動画だけを対象にします。
itch.ioのアップロードは代表者確認後に手動実行します。
