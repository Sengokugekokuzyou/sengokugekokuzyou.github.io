import fs from 'node:fs/promises';
import path from 'node:path';

const siteUrl = (process.env.SITE_URL || 'https://sengokugekokuzyou.github.io').replace(/\/$/, '');
const summaryDate = process.env.SUMMARY_DATE || tokyoDate(new Date());
const days = Number.parseInt(process.env.SUMMARY_DAYS || '7', 10);
const awayDir = process.env.MARKETING_AWAY_DIR || '';
const outputDir = path.join('更新出力', 'マーケティング');
const outputPath = path.join(outputDir, `週次マーケティングサマリー_auto_${summaryDate}.md`);

const endDate = parseDate(summaryDate);
const startDate = addDays(endDate, -(Number.isFinite(days) ? days - 1 : 6));
const period = `${formatDate(startDate)} - ${formatDate(endDate)}`;

const news = await readJson('news.json', { updates: [] });
const updates = Array.isArray(news.updates) ? news.updates : [];
const periodUpdates = updates.filter((item) => inPeriod(item.date, startDate, endDate));
const youtubeUpdates = periodUpdates.filter((item) => item.source === 'youtube' || item.category === 'YouTube');
const appleMusicUpdates = periodUpdates.filter((item) => item.source === 'apple-music' || item.category === '音楽配信');
const distroKidUpdates = periodUpdates.filter((item) => item.source === 'distrokid');
const gameUpdates = periodUpdates.filter((item) => String(item.source || '').includes('itch') || String(item.category || '').includes('itch'));

const pageChecks = await Promise.all([
  checkPage('/', 'トップ'),
  checkPage('/kekkanokeifu.html', '血華の系譜'),
  checkPage('/samurai-cypher.html', 'SAMURAI CYPHER'),
  checkPage('/samurai-breed.html', 'サムライブリード'),
  checkPage('/support.html', '支援・参加')
]);
const adsTxt = await checkPublicText('/ads.txt', 'pub-1454558538565957');
const sitemap = await checkPublicText('/sitemap.xml', 'support.html');

const markdown = buildMarkdown({
  period,
  summaryDate,
  pageChecks,
  adsTxt,
  sitemap,
  youtubeUpdates,
  appleMusicUpdates,
  distroKidUpdates,
  gameUpdates,
  periodUpdates
});

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, markdown, 'utf8');

if (awayDir) {
  await fs.mkdir(awayDir, { recursive: true });
  await fs.writeFile(path.join(awayDir, path.basename(outputPath)), markdown, 'utf8');
}

console.log(`Wrote ${outputPath}`);
if (awayDir) console.log(`Copied ${path.join(awayDir, path.basename(outputPath))}`);

function buildMarkdown(data) {
  const publicOkCount = data.pageChecks.filter((page) => page.publicStatus === 200).length;
  const gaOkCount = data.pageChecks.filter((page) => page.hasGa).length;
  const adsOkCount = data.pageChecks.filter((page) => page.hasAdsense).length;
  const latestYoutube = data.youtubeUpdates[0];
  const latestMusic = data.appleMusicUpdates[0] || data.distroKidUpdates[0];

  return `# 週次マーケティングサマリー

対象期間: ${data.period}
作成日: ${data.summaryDate}
作成者: GitHub Actions / Codex

入力手順: \`docs/weekly-summary-input-guide.md\` を参照

## 先に見る結論

- 自動取得できたもの: news.json更新、公開HPステータス、GA4タグ有無、AdSenseタグ有無、ads.txt、sitemap
- 手入力が必要なもの: GA4の実数、Search Consoleの検索語句、AdSense収益/審査詳細、itch.io閲覧/DL、YouTube Studioの詳細分析
- 今週のYouTube更新: ${data.youtubeUpdates.length}件${latestYoutube ? `（最新: ${latestYoutube.title}）` : ''}
- 今週の音楽配信更新: ${data.appleMusicUpdates.length + data.distroKidUpdates.length}件${latestMusic ? `（最新: ${latestMusic.title}）` : ''}
- 公開HP確認: ${publicOkCount}/${data.pageChecks.length}ページが200
- GA4タグ確認: ${gaOkCount}/${data.pageChecks.length}ページ
- AdSenseタグ確認: ${adsOkCount}/${data.pageChecks.length}ページ
- 次に改善する場所:
- Codexへ依頼する実装:

## HP

参照: GA4 レポート > エンゲージメント > ページとスクリーン

| 項目 | 自動確認 | 数字 | メモ |
| --- | --- | ---: | --- |
${data.pageChecks.map((page) => `| ${page.label} | 公開:${statusText(page.publicStatus)} / GA4:${yesNo(page.hasGa)} / AdSense:${yesNo(page.hasAdsense)} |  | ${page.publicError || ''} |`).join('\n')}
| ads.txt | ${data.adsTxt.ok ? 'OK' : '要確認'} |  | ${data.adsTxt.message} |
| sitemap.xml | ${data.sitemap.ok ? 'OK' : '要確認'} |  | ${data.sitemap.message} |
| itch.io外部リンククリック | 手入力 |  | GA4 external_link_click |
| YouTube外部リンククリック | 手入力 |  | GA4 external_link_click |
| Apple Music / Spotify外部リンククリック | 手入力 |  | GA4 external_link_click |
| Discord外部リンククリック | 手入力 |  | GA4 external_link_click |

## ゲーム

参照: itch.io Dashboard > 各プロジェクト > Analytics

| 作品 | HP表示 | itch閲覧 | DL | 外部クリック | 自動取得メモ |
| --- | ---: | ---: | ---: | ---: | --- |
| 血華の系譜 |  |  |  |  | ${findGameUpdate(data.gameUpdates, 'sengoku-blood') || '手入力'} |
| SAMURAI CYPHER |  |  |  |  | ${findGameUpdate(data.gameUpdates, 'samurai-cypher') || '手入力'} |
| サムライブリード |  |  |  |  | ${findGameUpdate(data.gameUpdates, 'samurai-breed') || '手入力'} |

## YouTube / 音楽

参照: YouTube Studio アナリティクス、Apple Music、Spotify、DistroKid通知

| 項目 | 自動取得 | 数字 | メモ |
| --- | --- | ---: | --- |
| 期間内のYouTube更新件数 | ${data.youtubeUpdates.length}件 |  | ${listTitles(data.youtubeUpdates)} |
| 期間内の音楽配信更新件数 | ${data.appleMusicUpdates.length + data.distroKidUpdates.length}件 |  | ${listTitles([...data.appleMusicUpdates, ...data.distroKidUpdates])} |
| 期間内の総視聴回数 | 手入力 |  | YouTube Studio |
| 主な流入元 | 手入力 |  | YouTube Studio |
| Shortsから本編への導線 | 手入力 |  | YouTube Studio |

## 広告 / 収益化

参照: AdSense サイト、広告、レポート、ポリシーセンター

| 項目 | 状態 | メモ |
| --- | --- | --- |
| AdSenseサイト状態 | 手入力 | AdSense管理画面で確認 |
| ads.txt状態 | ${data.adsTxt.ok ? 'OK' : '要確認'} | ${data.adsTxt.message} |
| 自動広告状態 | タグ確認済み | 実配信はAdSense側の判定 |
| 手動広告枠状態 | タグ確認済み | 血華の系譜下のバナー枠 |
| 白い広告枠の有無 | 手入力 | 実画面確認 |
| 注意点 | クリック誘導禁止 | 表示状態だけ確認 |

## Discord投稿用

\`\`\`text
【週次運用サマリー】
対象期間: ${data.period}

■ HP
公開確認: ${publicOkCount}/${data.pageChecks.length}ページ OK
GA4タグ: ${gaOkCount}/${data.pageChecks.length}ページ OK
AdSenseタグ: ${adsOkCount}/${data.pageChecks.length}ページ OK
ads.txt: ${data.adsTxt.ok ? 'OK' : '要確認'}

■ ゲーム
血華の系譜:
SAMURAI CYPHER:
サムライブリード:
作品別の外部リンククリック:
不具合・要望:

■ YouTube / 音楽
YouTube更新: ${data.youtubeUpdates.length}件
音楽配信更新: ${data.appleMusicUpdates.length + data.distroKidUpdates.length}件

■ 広告 / 収益化
AdSense状態:
広告表示:
注意点:

■ 次にやること
1.
2.
3.
\`\`\`

## 自動取得された更新一覧

${data.periodUpdates.length ? data.periodUpdates.map((item) => `- ${item.date} / ${item.category}: ${item.title}`).join('\n') : '- 期間内のnews.json更新はありません。'}

## 次アクション

1.
2.
3.
`;
}

async function checkPage(pagePath, label) {
  const localPath = pagePath === '/' ? 'index.html' : pagePath.replace(/^\//, '');
  const local = await fs.readFile(localPath, 'utf8').catch(() => '');
  const publicCheck = await checkPublicText(pagePath, '<html');
  return {
    label,
    path: pagePath,
    hasGa: local.includes('G-2LGYYG5ZZS'),
    hasAdsense: local.includes('ca-pub-1454558538565957'),
    publicStatus: publicCheck.status,
    publicError: publicCheck.error || ''
  };
}

async function checkPublicText(pagePath, expected) {
  const url = `${siteUrl}${pagePath}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const text = await response.text();
    return {
      status: response.status,
      ok: response.ok && text.includes(expected),
      message: `${url} status=${response.status} expected=${text.includes(expected) ? 'found' : 'missing'}`
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      message: `${url} fetch failed: ${error.message}`
    };
  }
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function inPeriod(dateText, start, end) {
  if (!dateText) return false;
  const date = parseDate(dateText.slice(0, 10));
  return date >= start && date <= end;
}

function parseDate(dateText) {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date, count) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + count);
  return next;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function tokyoDate(date) {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function yesNo(value) {
  return value ? 'OK' : '要確認';
}

function statusText(status) {
  return status ? String(status) : '取得失敗';
}

function listTitles(items) {
  if (!items.length) return '';
  return items.slice(0, 3).map((item) => item.title).join(' / ');
}

function findGameUpdate(items, gameId) {
  const item = items.find((entry) => String(entry.game || entry.id || '').includes(gameId));
  return item ? `${item.date}: ${item.title}` : '';
}
