# 戦国下剋上BEATS 公式HP

このリポジトリは、戦国下剋上BEATSの公式HPを公開するための GitHub Pages リポジトリです。

公開URL:

https://sengokugekokuzyou.github.io/

## 公式リンク

- YouTube: https://www.youtube.com/@戦国下剋上BEATS
- YouTube channel ID URL: https://youtube.com/channel/UChtURL_MY58O7nfhmaYOMaw
- Apple Music: https://music.apple.com/us/artist/sengoku-gekokujo-beats/1888867608
- Spotify: https://open.spotify.com/intl-ja/artist/3WQ99kHfRU1IwI7l5dBqVL
- note: https://note.com/shirokurochannel
- X: https://x.com/sirokuro_selbin
- Discord: https://discord.gg/v37VSgrVHC
- itch.io / 血華の系譜: https://sengokugekokujobeats.itch.io/kekkanokeifu
- itch.io / SAMURAI CYPHER: https://sengokugekokujobeats.itch.io/beats-samurai-cypher
- itch.io / サムライブリード - 契りノ血脈 -: https://sengokugekokujobeats.itch.io/samurai-breed

## 作品ページ

- 血華の系譜: `kekkanokeifu.html`
- SAMURAI CYPHER: `samurai-cypher.html`
- サムライブリード - 契りノ血脈 -: `samurai-breed.html`

## 自動化フロー

### YouTube更新

`sync-youtube-updates.yml` がYouTube公開フィードを確認し、新しい動画を `news.json` に追加します。HPのYouTube欄と更新情報欄に反映され、Discord通知にもつながります。

### ゲーム更新とitch.io反映

`auto-deploy-itch-on-game-change.yml` が `deploy-targets.json` に登録されたゲームリポジトリを確認します。変更があればbutlerでitch.ioへアップロードし、`news.json`、`devlogs/`、`.deploy-state/` を更新します。Discord通知はこのワークフロー内から直接送信します。

現在の主な対象:

- `Sengokugekokuzyou/sengoku-blood-`
- `Sengokugekokuzyou/samurai-cypher`
- `Sengokugekokuzyou/samurai-breed`

### Discord告知

手動承認済み更新は `post-approved-update-to-discord.yml` で投稿できます。ゲーム自動デプロイ時は、GitHub Actionsの仕様でワークフロー連鎖が止まらないよう、デプロイワークフローから直接Discordへ投稿します。

## Secrets

値は公開しません。必要なSecret名のみ管理します。

- `DISCORD_WEBHOOK_URL`
- `BUTLER_API_KEY`

## 運用方針

公開物、ZIP、告知、外部リンクの更新は代表者確認後に実施します。自動化対象として明示されたYouTube新着検知、ゲーム更新検知、itch.ioアップロード、Discord通知はこのREADMEのフローに従います。

広告収益化は、AdSense等の審査・広告ID発行・規約確認後に実配信コードを追加します。

アクセス解析はGoogle Analytics 4を全HTMLページに導入済みです。測定IDは `G-2LGYYG5ZZS` です。取得データはページ閲覧、流入元、端末種別、外部リンク遷移などの運営判断に使います。

外部リンクのクリックは `site.js` からGA4イベント `external_link_click` として送信します。主に itch.io、YouTube、Apple Music、Spotify、Discord、GitHub への送客確認に使います。

検索向けの構造化データは、トップページに `WebSite`、各ゲーム作品ページに `VideoGame` を設定しています。Google Search Console導入後の検索理解補助として使います。

## 当面保留

戦国転職血統録の棚卸しと自動化設定は当面保留です。
