# 更新情報の自動反映

公式HPとDiscord告知は `news.json` を基準に運用します。

## 仕組み

- HP: `site.js` が `news.json` を読み込み、`approved` が `false` ではない更新情報を表示する。
- Discord: GitHub Actions が `news.json` 更新時に動き、`approved: true` かつ `discord: true` の最新項目を投稿する。
- Webhook URLやトークンはリポジトリに書かず、GitHub Secretsに保存する。

## 更新情報の追加例

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

## GitHub Secrets設定

Discord投稿を有効化するには、GitHubリポジトリの設定で以下を追加します。

- Repository: `Sengokugekokuzyou/sengokugekokuzyou.github.io`
- Settings > Secrets and variables > Actions > New repository secret
- Name: `DISCORD_WEBHOOK_URL`
- Value: Discordの投稿先チャンネルWebhook URL

## 注意

公開チャンネルへの自動投稿は、代表者確認済みの内容だけにします。
Webhook URL、APIキー、トークンは絶対にREADMEやJSONへ書きません。
