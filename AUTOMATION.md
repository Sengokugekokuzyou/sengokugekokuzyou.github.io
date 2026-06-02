# 更新情報・アップロード・開発ログ運用

この公式HPリポジトリは、戦国下剋上BEATSの更新情報、Discord通知、itch.ioアップロード、開発ログ下書きをまとめて管理します。

## 現在の自動化

- HP: `site.js` が `news.json` を読み込み、`approved: false` ではない更新情報を表示します。
- Discord: `news.json` に `approved: true` かつ `discord: true` の新規更新が入ると通知します。
- YouTube: `sync-youtube-updates.yml` が公開フィードを確認し、新着動画を `news.json` に追加します。
- Apple Music: `sync-apple-music-updates.yml` が配信リリースを確認し、新着を `news.json` に追加します。
- DistroKidメール: `sync-distrokid-email.yml` が配信完了・公開・ストア反映系メールを確認し、定型文で `news.json` に追加します。
- itch.io: `auto-deploy-itch-on-game-change.yml` が登録済みゲームを確認し、変更があればbutlerでアップロードします。
- devlogs: itch.io Developer Logs用の下書きを `devlogs/` に自動生成します。

Webhook URL、API key、トークンはリポジトリへ書きません。GitHub Secrets / Variables で管理します。

## 自動アップロード対象

自動アップロード対象は `deploy-targets.json` で管理します。

現在の有効対象:

- 血華の系譜
  - repo: `Sengokugekokuzyou/sengoku-blood-`
  - itch: `sengokugekokujobeats/kekkanokeifu:html5`
- 戦国下剋上BEATS - SAMURAI CYPHER -
  - repo: `Sengokugekokuzyou/samurai-cypher`
  - itch: `sengokugekokujobeats/beats-samurai-cypher:html5`
- サムライブリード - 契りノ血脈 -
  - repo: `Sengokugekokuzyou/samurai-breed`
  - itch: `sengokugekokujobeats/samurai-breed:html5`

待機対象:

- 戦国転職血統録
  - repo / itch先が未確定のため `enabled: false`

## 自動アップロードの流れ

`Auto deploy itch.io on game changes` が毎時1回、または手動実行で動きます。

1. `deploy-targets.json` の `enabled: true` の作品を確認する。
2. 対象ゲームリポジトリをcloneする。
3. 前回アップロード済みのSHAと現在SHAを比較する。
4. 変更がなければ何もしない。
5. `dist/index.html` があれば `dist/` をアップロード対象にする。
6. `dist/index.html` がなければ、リポジトリ直下の `index.html` を基準にアップロード対象にする。
7. `index.html` が見つからなければ、その作品はスキップする。
8. butlerでitch.ioのHTML5 channelへアップロードする。
9. `news.json` にHP/Discord用の更新情報を追加する。
10. `devlogs/` にitch.io Developer Logs用の下書きを作る。
11. `.deploy-state/*.sha` を最新SHAへ更新する。
12. Discordへ更新通知を投稿する。

## 開発ログ運用

itch.io本体のDeveloper Logsは、現時点では自動投稿ではなく下書き生成までを自動化します。

生成される内容:

- タイトル
- 公開日
- 対象作品
- 対象コミット
- itch.io URL
- 更新内容
- 公開メモ

itch.ioへ開発ログを投稿する場合は、`devlogs/*.md` の内容を確認してから手動で貼り付けます。

## 手動アップロード

`Deploy game to itch.io and log update` ワークフローを手動実行すると、任意のゲームリポジトリ、itch target、バージョン名、告知文でアップロードできます。

既定値は血華の系譜です。

- game_repo: `Sengokugekokuzyou/sengoku-blood-`
- itch_target: `sengokugekokujobeats/kekkanokeifu`
- channel: `html5`

## Secrets

必要なSecret:

- `BUTLER_API_KEY`
- `DISCORD_WEBHOOK_URL`
- `DISTROKID_IMAP_HOST`
- `DISTROKID_IMAP_PORT`
- `DISTROKID_IMAP_USER`: DistroKid登録メールを受信しているメールアカウント
- `DISTROKID_IMAP_PASSWORD`

必要なVariable:

- `YOUTUBE_CHANNEL_ID`
- 任意: `YOUTUBE_CHANNEL_HANDLE`
- 任意: `APPLE_MUSIC_ARTIST_ID`
- 任意: `APPLE_MUSIC_COUNTRY`
- 任意: `APPLE_MUSIC_INITIAL_IMPORT_LIMIT`
- 任意: `APPLE_MUSIC_UPDATE_LIMIT`
- 任意: `APPLE_MUSIC_ARTIST_URL`
- 任意: `SPOTIFY_ARTIST_URL`
- 任意: `DISTROKID_IMAP_MAILBOX`
- 任意: `DISTROKID_EMAIL_SINCE_DAYS`
- 任意: `DISTROKID_EMAIL_MAX_MESSAGES`
- 任意: `DISTROKID_EMAIL_MATCH_TERMS`

## 更新情報の手動追加例

`news.json` の `updates` 配列の先頭に追加します。

```json
{
  "id": "2026-06-02-example",
  "date": "2026-06-02",
  "category": "ゲーム更新",
  "title": "血華の系譜を更新しました",
  "body": "表示調整とゲーム体験の改善を行いました。",
  "url": "https://sengokugekokujobeats.itch.io/kekkanokeifu",
  "approved": true,
  "discord": true,
  "source": "manual"
}
```

## 承認フラグ

- `approved: true`: HP表示対象
- `approved: false`: 下書き。HPに表示しない
- `discord: true`: Discord通知対象
- `discord: false`: HP表示のみ

## 注意

- Webhook URL、API key、トークンはREADME、JSON、チャットへ貼りません。
- 自動アップロードは `deploy-targets.json` で `enabled: true` の作品だけ動きます。
- repo / itch target が空の作品は事故防止のため無効化します。
