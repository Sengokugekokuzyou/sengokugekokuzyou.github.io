# 自動化ロードマップ

更新日: 2026-06-06

## 基本方針

自動化は「公開してよい情報」と「代表者だけが見る情報」を分けて進める。

公開向け:

- HP更新情報
- YouTube新着
- Apple Music / DistroKid公開通知
- itch.io開発ログ
- Discordの公開更新情報

代表者専用:

- GA4 / Search Console / AdSense / itch.io数値
- 週次マーケティングサマリー
- X運用診断
- 収益化チェック
- 改善候補リスト

## 優先順位

### 1. 更新情報の自動取得

目的:
公開情報をHPとDiscordへ反映する。

対象:

- YouTube
- Apple Music
- DistroKidメール
- note
- itch.io開発ログ

状態:
YouTube、Apple Music、DistroKidは自動化済み。noteとitch.io開発ログは改善余地あり。

### 2. 代表者専用サマリー

目的:
公開しない運営数値を、代表者だけが確認できる形でまとめる。

対象:

- HPアクセス
- 検索流入
- 広告収益化
- itch.io反応
- YouTube反応
- Discord反応

運用:
公開Discordには投稿しない。専用Webhook `MARKETING_SUMMARY_DISCORD_WEBHOOK_URL` のみ使用する。

### 3. itch.ioページ改善

目的:
来訪者が迷わず「遊ぶ」「Discordに入る」「HPへ戻る」まで進めるようにする。

対象:

- 血華の系譜
- SAMURAI CYPHER
- サムライブリード

運用:
改善稿は `更新出力/最新フォルダ/` と `C:\Users\kurai\Documents\外出先用` に保存する。

### 4. note記事生成

目的:
制作背景と共感を届け、HP/itch/YouTubeへの導線を作る。

方針:
読者の共感を優先し、行間を広めにする。内部ログやエラー記録をそのまま載せない。

### 5. X運用補助

目的:
認知拡大とストレス軽減。

やること:

- 投稿案を作る
- 返信候補を作る
- リンク直貼りを減らす
- プロフィール導線へ逃がす
- フォロー整理は候補リスト化までに留める

やらないこと:

- 自動フォロー解除
- 凍結リスクの高い一括操作

### 6. 収益化チェック

目的:
広告、HP導線、itch導線、YouTube導線を定期的に確認する。

対象:

- AdSenseタグ
- ads.txt
- プライバシーポリシー
- 広告配置
- HPからゲームへの遷移
- itchからHP/Discordへの遷移

## 次に実装する順番

1. note新着の自動取得または半自動登録
2. itch.io改善パックを各作品へ展開
3. 代表者専用週次サマリーを専用Discordへ送る
4. X投稿案を毎日生成する
5. 収益化チェックリストを週次サマリーへ統合する

