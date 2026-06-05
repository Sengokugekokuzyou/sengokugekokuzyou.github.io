# マーケティング自動取得 API 設定メモ

公式HPの週次マーケティングサマリーは、公開情報に加えて Google API の認証情報がある場合だけ実数を自動取得する。

## 現在の取得状態

- GA4: 自動取得対応済み
- Search Console: 自動取得対応済み
- YouTube Analytics: スクリプト対応済み。Google Cloud 側で YouTube Analytics API を有効化すると取得できる
- AdSense: スクリプト対応済み。Google Cloud 側で AdSense Management API を有効化すると取得できる
- itch.io: APIの公開範囲が限られるため、現時点では手動確認

## Google Cloud で有効化する API

プロジェクト: `sengoku-beats-analytics`

1. YouTube Analytics API
   - Google Cloud > API とサービス > ライブラリ
   - `YouTube Analytics API` を検索して有効化
2. AdSense Management API
   - Google Cloud > API とサービス > ライブラリ
   - `AdSense Management API` を検索して有効化

## GitHub Actions Secrets

リポジトリ:
`Sengokugekokuzyou/sengokugekokuzyou.github.io`

場所:
Settings > Secrets and variables > Actions > Repository secrets

追加する Secret:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`
- `GA4_PROPERTY_ID`
- `SEARCH_CONSOLE_SITE_URL`

ローカルで認証が終わると、`google-oauth-token.local.json` に上記の値が保存される。このファイルは `.gitignore` で保護されており、GitHubへコミットしない。

## 既定値

- `GA4_PROPERTY_ID`: `539915731`
- `SEARCH_CONSOLE_SITE_URL`: `https://sengokugekokuzyou.github.io/`

## セキュリティ注意

- OAuthクライアントシークレットやリフレッシュトークンはチャットに貼らない
- 画面共有やスクショにシークレットが映った場合は、Google CloudでOAuthクライアントを作り直すか、シークレットを再生成する
- GitHub Secretsへ登録後も、ローカルの `google-oauth-token.local.json` は必要なときだけ保管する

