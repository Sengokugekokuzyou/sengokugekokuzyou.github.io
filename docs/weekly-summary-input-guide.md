# 週次サマリー 数字入力ガイド

この手順書は、週次マーケティングサマリーへ数字を入れるための確認順です。

対象ファイル:

- `templates/weekly-marketing-summary.md`
- `更新出力/マーケティング/週次マーケティングサマリー_YYYY-MM-DD.md`
- `C:\Users\kurai\Documents\外出先用\マーケティング\週次マーケティングサマリー_YYYY-MM-DD.md`

## 1. Google Analytics 4

見る場所:

- レポート
- エンゲージメント
- ページとスクリーン

入力する欄:

- トップページ表示回数
- 血華の系譜ページ表示回数
- SAMURAI CYPHERページ表示回数
- サムライブリードページ表示回数
- 支援・参加ページ表示回数

見るURL:

| ページ | URL / パス |
| --- | --- |
| トップ | `/` |
| 血華の系譜 | `/kekkanokeifu.html` |
| SAMURAI CYPHER | `/samurai-cypher.html` |
| サムライブリード | `/samurai-breed.html` |
| 支援・参加 | `/support.html` |

外部リンククリックを見る場所:

- レポート
- エンゲージメント
- イベント
- `external_link_click`

入力する欄:

- itch.io外部リンククリック
- YouTube外部リンククリック
- Apple Music / Spotify外部リンククリック
- Discord外部リンククリック

## 2. Google Search Console

見る場所:

- 検索パフォーマンス
- ページ
- クエリ

入力する欄:

- 主な流入
- 検索で伸びたページ
- クリックが少ないが表示回数が多いページ

判断:

- 表示回数が多くクリックが少ない場合は、ページタイトル、説明文、OGPを改善候補にする
- 血華の系譜、SAMURAI CYPHER、サムライブリードのどれが検索されているかを見る

## 3. Google AdSense

見る場所:

- サイト
- 広告
- レポート
- ポリシーセンター

入力する欄:

- AdSenseサイト状態
- ads.txt状態
- 自動広告状態
- 手動広告枠状態
- 白い広告枠の有無
- 注意点

判断:

- サイトが審査中なら、広告が出なくても異常ではない
- 準備完了なのに白枠が続く場合は、広告枠サイズ、広告除外、ポリシーセンターを確認する
- クリック誘導は絶対に書かない

## 4. itch.io

見る場所:

- Dashboard
- 各プロジェクト
- Analytics

入力する欄:

| 作品 | itch.ioページ |
| --- | --- |
| 血華の系譜 | `https://sengokugekokujobeats.itch.io/kekkanokeifu` |
| SAMURAI CYPHER | `https://sengokugekokujobeats.itch.io/beats-samurai-cypher` |
| サムライブリード | `https://sengokugekokujobeats.itch.io/samurai-breed` |

見る数字:

- 閲覧数
- ダウンロード数
- 参照元

判断:

- HP表示が多くitch閲覧が少ない場合は、HP内の遊ぶボタンを見直す
- itch閲覧が多くDLが少ない場合は、itchページの説明、スクショ、導入文を改善する

## 5. YouTube Studio

見る場所:

- アナリティクス
- コンテンツ
- 視聴者があなたの動画を見つけた方法

入力する欄:

- 期間内の総視聴回数
- 伸びた動画
- 主な流入元
- Shortsから本編への導線

判断:

- 関連動画やブラウジング機能が多い場合は、タイトルとサムネの方向性を伸ばす
- チャンネルページ流入が増えている場合は、HPとDiscordへの導線を見直す

## 6. 音楽配信 / DistroKid

見る場所:

- Apple Musicアーティストページ
- Spotifyアーティストページ
- DistroKid通知メール
- `news.json`

入力する欄:

- Apple Music新着
- Spotify導線
- DistroKid通知
- 新着・配信状況

判断:

- 配信開始通知が来たら、HP更新情報とDiscord通知に反映されているか確認する
- DistroKidメール本文はそのまま公開しない

## 7. Discord

見る場所:

- 更新情報チャンネル
- 自動通知の投稿
- 感想、要望、不具合報告

入力する欄:

- 自動通知成功
- 不具合・要望
- 次にやること

判断:

- 要望が複数回出たものは次回更新候補
- 不具合報告はゲーム別に分ける

## 入力後の流れ

1. `週次マーケティングサマリー_YYYY-MM-DD.md` に数字を入れる
2. Discord投稿用ブロックを整える
3. 実装変更が必要なものだけCodexに依頼する
4. 同じファイルを `更新出力/マーケティング/` と `C:\Users\kurai\Documents\外出先用\マーケティング` の両方に残す

