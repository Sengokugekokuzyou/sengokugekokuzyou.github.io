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

### Apple Music更新

`sync-apple-music-updates.yml` がApple Music / iTunes公開APIを確認し、新しい配信リリースを `news.json` に追加します。HPの更新情報欄に反映され、Discord通知にもつながります。公開日が未来の配信予定は、公開日を迎えるまで通知しません。

初回実行時は過去リリースを大量通知しないよう、既定では最新1件だけを取り込みます。以後は `.music-release-state/apple-music.json` に記録した既知リリースとの差分だけを通知します。

Spotify Web APIは2026年のSpotify Developer仕様変更により、Development ModeでPremiumアカウントが必要です。Premiumを使わない間はSpotify APIでの自動検知は保留し、Apple Musicの検知結果にSpotifyアーティストページの導線を併記します。

### DistroKidメール更新

`sync-distrokid-email.yml` がDistroKid登録アカウント宛に届くメールをIMAPで確認し、配信完了・公開・ストア反映系のメールだけを `news.json` に追加します。メール本文をそのまま公開せず、公式HP/Discord向けの定型文に変換します。

エラー、修正依頼、支払い、拒否、権利確認などのメールは公開対象外です。公開通知は全自動で、見栄えと事故防止のために安全な件名パターンだけを採用します。

DistroKid登録に使っているメールアカウントがGitHubや普段使いのアカウントと違う場合は、その受信メールボックスのIMAP情報を `DISTROKID_IMAP_*` Secrets に設定します。DistroKidメールの件名表記が変わる場合は、`DISTROKID_EMAIL_MATCH_TERMS` に件名や差出人に含まれる語句をカンマ区切りで設定します。

### ゲーム更新とitch.io反映

itch.ioへの自動アップロードは停止中です。ゲーム更新は、最新版一式とitch.io開発ログ用テキストを `更新出力/最新フォルダ/` と `C:\Users\kurai\Documents\外出先用` に出力し、代表者確認後に手動で反映します。

現在の主な対象:

- `Sengokugekokuzyou/sengoku-blood-`
- `Sengokugekokuzyou/samurai-cypher`
- `Sengokugekokuzyou/samurai-breed`

血華の系譜で決めた「最新版出力 → 外出先用フォルダへ同梱 → itch.io開発ログ下書き生成 → 代表者確認 → 手動反映」の運用は、上記3作品すべてに展開します。

戦国転職血統録は `deploy-targets.json` に待機枠だけ残し、repo / itch先が未確定のため `enabled: false` にしています。

### Discord告知

手動承認済み更新は `post-approved-update-to-discord.yml` で投稿できます。ゲーム自動デプロイ時は、GitHub Actionsの仕様でワークフロー連鎖が止まらないよう、デプロイワークフローから直接Discordへ投稿します。

### 運用ダッシュボード

週次の確認項目、KPI、Discordサマリー下書きは `docs/marketing-dashboard.md` にまとめます。GA4、Search Console、AdSense、itch.io、YouTube Studio、Discordの数字はまずこの形式に集約し、実装変更が必要なものだけ作業化します。

週次サマリーは `templates/weekly-marketing-summary.md` を元に作成し、`更新出力/マーケティング/` と `C:\Users\kurai\Documents\外出先用\マーケティング` の両方に保存します。

## Secrets

値は公開しません。必要なSecret名のみ管理します。

- `DISCORD_WEBHOOK_URL`
- `BUTLER_API_KEY`
- `DISTROKID_IMAP_HOST`
- `DISTROKID_IMAP_PORT`
- `DISTROKID_IMAP_USER`: DistroKid登録メールを受信しているメールアカウント
- `DISTROKID_IMAP_PASSWORD`

## Variables

- `YOUTUBE_CHANNEL_ID`
- `YOUTUBE_CHANNEL_HANDLE`
- `APPLE_MUSIC_ARTIST_ID`
- `APPLE_MUSIC_COUNTRY`
- `APPLE_MUSIC_INITIAL_IMPORT_LIMIT`
- `APPLE_MUSIC_UPDATE_LIMIT`
- `APPLE_MUSIC_ARTIST_URL`
- `SPOTIFY_ARTIST_URL`
- `DISTROKID_IMAP_MAILBOX`
- `DISTROKID_EMAIL_SINCE_DAYS`
- `DISTROKID_EMAIL_MAX_MESSAGES`
- `DISTROKID_EMAIL_MATCH_TERMS`

## 運用方針

公開物、ZIP、告知、外部リンクの更新は代表者確認後に実施します。YouTube新着検知、ゲーム更新検知、Discord通知はこのREADMEのフローに従います。

itch.ioへの自動アップロードは停止します。ゲーム更新後は、最新版一式を `更新出力/最新フォルダ/` と `C:\Users\kurai\Documents\外出先用` に出力します。`C:\Users\kurai\Documents\外出先用` には、itch.io開発ログ用の `itch-devlog.md` と更新情報も必ず同梱します。Claude Codeへ直接指示した場合も同じ形式で出力します。詳細は `docs/game-release-output-policy.md` と `templates/itch-devlog-template.md` を参照します。

広告収益化は、AdSense等の審査・広告ID発行・規約確認後に実配信コードを追加します。導入後は、誤クリック防止、ポリシー更新、ads.txt、プライバシーポリシーの整合性を確認して運用します。

Google AdSenseは自動広告コードを公式HPのHTMLページに導入済みです。Publisher IDは `pub-1454558538565957`、`ads.txt` も同IDで設定しています。血華の系譜のゲーム本体には、ホーム画面のヘッダー下と合戦リザルト画面下部に限定して広告枠を導入しています。プレイ中の操作ボタン、選択UI、固定フッター付近には広告を置かない方針です。

アクセス解析はGoogle Analytics 4を全HTMLページに導入済みです。測定IDは `G-2LGYYG5ZZS` です。取得データはページ閲覧、流入元、端末種別、外部リンク遷移などの運営判断に使います。

外部リンクのクリックは `site.js` からGA4イベント `external_link_click` として送信します。主に itch.io、YouTube、Apple Music、Spotify、Discord、GitHub への送客確認に使います。

検索向けの構造化データは、トップページに `WebSite`、各ゲーム作品ページに `VideoGame` を設定しています。Google Search Console導入後の検索理解補助として使います。

## 当面保留

戦国転職血統録の棚卸しと自動化設定は当面保留です。
