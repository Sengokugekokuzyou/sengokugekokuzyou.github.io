# 更新情報の自動反映

公式HPとDiscord告知は `news.json` を基準に運用します。

## 仕組み

- HP: `site.js` が `news.json` を読み込み、`approved` が `false` ではない更新情報を表示する。
- Discord: GitHub Actions が `news.json` 更新時に動き、`approved: true` かつ `discord: true` の新規項目を投稿する。
- YouTube: GitHub Actions がYouTubeの公開フィードを定期確認し、新着動画を `news.json` に追加する。
- itch.io: GitHub Actionsで登録済みゲームをbutlerアップロードし、HP/Discord用の更新情報と開発ログ下書きを作る。
- Webhook URLやトークンはリポジトリに書かず、GitHub Secrets / Variables に保存する。

## ゲーム全作品の自動検知

自動アップロード対象は `deploy-targets.json` で管理します。

現在の登録状況:

- `血華の系譜`: 有効。`Sengokugekokuzyou/sengoku-blood-` から `sengokugekokujobeats/kekkanokeifu:html5` へ自動アップロード。
- `SAMURAI CYPHER`: 登録枠あり。GitHubリポジトリとitch.io先が決まったら有効化。
- `戦国転職血統録`: 登録枠あり。GitHubリポジトリとitch.io先が決まったら有効化。
- `契りノ血脈 CHIGIRI`: 登録枠あり。GitHubリポジトリとitch.io先が決まったら有効化。

`Auto deploy itch.io on game changes` が毎時1回、`deploy-targets.json` の `enabled: true` の作品を全部確認します。

前回アップロード済みのコミットと違う場合だけ、以下を実行します。

1. ゲーム本体を取得する。
2. releaseフォルダを作る。
3. butlerで対象のitch.io channelへアップロードする。
4. `news.json` に更新情報を追加する。
5. `devlogs/` にitch.io開発ログ用の下書きを作る。
6. `.deploy-state/*.sha` を最新コミットに更新する。
7. `news.json` 更新により、HPとDiscordへ告知が流れる。

つまり「GitHubに上がっているゲーム更新」は全部拾える構造です。まだGitHub/itch.ioの対応表が空の作品は、事故防止のため自動アップロードしません。

## itch.io手動アップロード

`Deploy game to itch.io and log update` ワークフローを手動実行すると、任意のバージョン名と告知文でアップロードできます。

既定値は `血華の系譜` 用です。

- game_repo: `Sengokugekokuzyou/sengoku-blood-`
- itch_target: `sengokugekokujobeats/kekkanokeifu`
- channel: `html5`

## itch.io Secrets設定

アップロードを有効化するには、GitHubリポジトリの設定で以下を追加します。

- Repository: `Sengokugekokuzyou/sengokugekokuzyou.github.io`
- Settings > Secrets and variables > Actions > New repository secret
- Name: `BUTLER_API_KEY`
- Value: itch.ioのAPI key

API keyはitch.ioのアカウント設定から発行します。キーは絶対にチャットやREADMEへ貼りません。

## 開発ログ

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
完全自動アップロードは `deploy-targets.json` で `enabled: true` の作品だけ動きます。
