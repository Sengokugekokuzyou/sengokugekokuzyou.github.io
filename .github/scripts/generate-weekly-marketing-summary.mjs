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

const googleTokenResult = await getGoogleAccessToken();
const accessToken = googleTokenResult.accessToken;
const googleSkipReason = googleTokenResult.message || 'Google OAuth secrets are not configured.';
const ga4 = accessToken ? await fetchGa4Summary(accessToken, startDate, endDate) : skipped(googleSkipReason);
const searchConsole = accessToken ? await fetchSearchConsoleSummary(accessToken, startDate, endDate) : skipped(googleSkipReason);
const youtubeAnalytics = accessToken ? await fetchYouTubeAnalyticsSummary(accessToken, startDate, endDate) : skipped(googleSkipReason);
const adsense = accessToken ? await fetchAdsenseSummary(accessToken, startDate, endDate) : skipped(googleSkipReason);

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
  periodUpdates,
  ga4,
  searchConsole,
  youtubeAnalytics,
  adsense
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

## 先に見る結論

- 自動取得できたもの: news.json更新、公開HPステータス、GA4タグ有無、AdSenseタグ有無、ads.txt、sitemap${data.ga4.ok ? '、GA4実数' : ''}${data.searchConsole.ok ? '、Search Console検索データ' : ''}${data.youtubeAnalytics.ok ? '、YouTube Analytics' : ''}${data.adsense.ok ? '、AdSense API' : ''}
- 追加設定が必要なもの: ${missingAutoSources(data)}
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
${data.pageChecks.map((page) => `| ${page.label} | 公開:${statusText(page.publicStatus)} / GA4:${yesNo(page.hasGa)} / AdSense:${yesNo(page.hasAdsense)} | ${pageViewsFor(data.ga4, page.path)} | ${page.publicError || ''} |`).join('\n')}
| ads.txt | ${data.adsTxt.ok ? 'OK' : '要確認'} |  | ${data.adsTxt.message} |
| sitemap.xml | ${data.sitemap.ok ? 'OK' : '要確認'} |  | ${data.sitemap.message} |
| GA4合計 | ${data.ga4.ok ? 'OK' : '要確認'} | ${data.ga4.ok ? data.ga4.totals.screenPageViews : ''} | ${data.ga4.message} |
| Search Console合計 | ${data.searchConsole.ok ? 'OK' : '要確認'} | ${data.searchConsole.ok ? `${data.searchConsole.totals.clicks}クリック / ${data.searchConsole.totals.impressions}表示` : ''} | ${data.searchConsole.message} |

## 検索流入

| 検索語 | クリック | 表示 | CTR | 平均順位 |
| --- | ---: | ---: | ---: | ---: |
${searchRows(data.searchConsole)}

## ゲーム

参照: itch.io Dashboard > 各プロジェクト > Analytics

| 作品 | HP表示 | itch閲覧 | DL | 外部クリック | 自動取得メモ |
| --- | ---: | ---: | ---: | ---: | --- |
| 血華の系譜 | ${pageViewsFor(data.ga4, '/kekkanokeifu.html')} |  |  | ${externalEventsFor(data.ga4, 'kekkanokeifu')} | ${findGameUpdate(data.gameUpdates, 'sengoku-blood') || 'itch側は手動確認'} |
| SAMURAI CYPHER | ${pageViewsFor(data.ga4, '/samurai-cypher.html')} |  |  | ${externalEventsFor(data.ga4, 'samurai-cypher')} | ${findGameUpdate(data.gameUpdates, 'samurai-cypher') || 'itch側は手動確認'} |
| サムライブリード | ${pageViewsFor(data.ga4, '/samurai-breed.html')} |  |  | ${externalEventsFor(data.ga4, 'samurai-breed')} | ${findGameUpdate(data.gameUpdates, 'samurai-breed') || 'itch側は手動確認'} |

## YouTube / 音楽

参照: YouTube Studio アナリティクス、Apple Music、Spotify、DistroKid通知

| 項目 | 自動取得 | 数字 | メモ |
| --- | --- | ---: | --- |
| 期間内のYouTube更新件数 | ${data.youtubeUpdates.length}件 |  | ${listTitles(data.youtubeUpdates)} |
| 期間内の音楽配信更新件数 | ${data.appleMusicUpdates.length + data.distroKidUpdates.length}件 |  | ${listTitles([...data.appleMusicUpdates, ...data.distroKidUpdates])} |
| 期間内のYouTube視聴回数 | ${data.youtubeAnalytics.ok ? 'OK' : '要確認'} | ${data.youtubeAnalytics.ok ? data.youtubeAnalytics.totals.views : ''} | ${data.youtubeAnalytics.message} |
| 期間内の総再生時間（分） | ${data.youtubeAnalytics.ok ? 'OK' : '要確認'} | ${data.youtubeAnalytics.ok ? data.youtubeAnalytics.totals.estimatedMinutesWatched : ''} | YouTube Analytics API |
| 主な流入元 | ${data.youtubeAnalytics.ok ? 'OK' : '要確認'} |  | ${youtubeRows(data.youtubeAnalytics)} |

## 広告 / 収益化

参照: AdSense サイト、広告、レポート、ポリシーセンター

| 項目 | 状態 | メモ |
| --- | --- | --- |
| AdSense API | ${data.adsense.ok ? 'OK' : '要確認'} | ${data.adsense.message} |
| 推定収益 | ${data.adsense.ok ? data.adsense.estimatedEarnings : ''} | AdSense API |
| ads.txt状態 | ${data.adsTxt.ok ? 'OK' : '要確認'} | ${data.adsTxt.message} |
| 自動広告タグ | タグ確認済み | 実配信はAdSense側の判定 |
| 手動広告枠状態 | タグ確認済み | 血華の系譜下のバナー枠 |
| 白い広告枠の有無 | 手動確認 | 実画面確認 |
| 注意ロス | クリック誘導禁止 | 表示状態だけ確認 |

## Discord投稿用

\`\`\`text
【週次運用サマリー】対象期間: ${data.period}

■ HP
公開確認: ${publicOkCount}/${data.pageChecks.length}ページ OK
GA4タグ: ${gaOkCount}/${data.pageChecks.length}ページ OK
AdSenseタグ: ${adsOkCount}/${data.pageChecks.length}ページ OK
GA4表示: ${data.ga4.ok ? `${data.ga4.totals.screenPageViews} PV` : '要確認'}
Search Console: ${data.searchConsole.ok ? `${data.searchConsole.totals.clicks}クリック / ${data.searchConsole.totals.impressions}表示` : '要確認'}
ads.txt: ${data.adsTxt.ok ? 'OK' : '要確認'}

■ ゲーム
血華の系譜 HP表示: ${pageViewsFor(data.ga4, '/kekkanokeifu.html')}
SAMURAI CYPHER HP表示: ${pageViewsFor(data.ga4, '/samurai-cypher.html')}
サムライブリード HP表示: ${pageViewsFor(data.ga4, '/samurai-breed.html')}
不具合・要改善:

■ YouTube / 音楽
YouTube更新: ${data.youtubeUpdates.length}件
音楽配信更新: ${data.appleMusicUpdates.length + data.distroKidUpdates.length}件
YouTube視聴: ${data.youtubeAnalytics.ok ? `${data.youtubeAnalytics.totals.views}回` : '要確認'}

■ 広告 / 収益化
AdSense API: ${data.adsense.ok ? 'OK' : '要確認'}
推定収益: ${data.adsense.ok ? data.adsense.estimatedEarnings : '要確認'}

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
    const response = await fetchWithTimeout(url);
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

async function getGoogleAccessToken() {
  const clientId = cleanSecret(process.env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = cleanSecret(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  const refreshToken = cleanSecret(process.env.GOOGLE_OAUTH_REFRESH_TOKEN);
  if (!clientId || !clientSecret || !refreshToken) {
    return { accessToken: null, message: 'Google OAuth secrets are not configured.' };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  const response = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  const json = await response.json();
  if (!response.ok) {
    return {
      accessToken: null,
      message: `Google token refresh failed: ${json.error || response.status}`
    };
  }
  return { accessToken: json.access_token, message: '' };
}

async function fetchGa4Summary(accessToken, start, end) {
  const propertyId = cleanSecret(process.env.GA4_PROPERTY_ID) || '539915731';
  const body = {
    dateRanges: [{ startDate: formatDate(start), endDate: formatDate(end) }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'eventCount' }
    ],
    limit: 50
  };
  try {
    const response = await fetchWithTimeout(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: googleHeaders(accessToken),
      body: JSON.stringify(body)
    });
    const json = await response.json();
    if (!response.ok) return failed(`GA4 API error: ${json.error?.message || response.status}`);
    const rows = (json.rows || []).map((row) => ({
      path: row.dimensionValues?.[0]?.value || '',
      screenPageViews: numberValue(row.metricValues?.[0]?.value),
      activeUsers: numberValue(row.metricValues?.[1]?.value),
      sessions: numberValue(row.metricValues?.[2]?.value),
      eventCount: numberValue(row.metricValues?.[3]?.value)
    }));
    return {
      ok: true,
      message: `GA4 property ${propertyId}`,
      rows,
      totals: {
        screenPageViews: sum(rows, 'screenPageViews'),
        activeUsers: sum(rows, 'activeUsers'),
        sessions: sum(rows, 'sessions'),
        eventCount: sum(rows, 'eventCount')
      }
    };
  } catch (error) {
    return failed(`GA4 fetch failed: ${error.message}`);
  }
}

async function fetchSearchConsoleSummary(accessToken, start, end) {
  const searchSite = cleanSecret(process.env.SEARCH_CONSOLE_SITE_URL) || `${siteUrl}/`;
  const body = {
    startDate: formatDate(start),
    endDate: formatDate(end),
    dimensions: ['query'],
    rowLimit: 10
  };
  try {
    const response = await fetchWithTimeout(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(searchSite)}/searchAnalytics/query`, {
      method: 'POST',
      headers: googleHeaders(accessToken),
      body: JSON.stringify(body)
    });
    const json = await response.json();
    if (!response.ok) return failed(`Search Console API error: ${json.error?.message || response.status}`);
    const rows = (json.rows || []).map((row) => ({
      query: row.keys?.[0] || '',
      clicks: numberValue(row.clicks),
      impressions: numberValue(row.impressions),
      ctr: numberValue(row.ctr),
      position: numberValue(row.position)
    }));
    return {
      ok: true,
      message: searchSite,
      rows,
      totals: {
        clicks: sum(rows, 'clicks'),
        impressions: sum(rows, 'impressions')
      }
    };
  } catch (error) {
    return failed(`Search Console fetch failed: ${error.message}`);
  }
}

async function fetchYouTubeAnalyticsSummary(accessToken, start, end) {
  const params = new URLSearchParams({
    ids: process.env.YOUTUBE_ANALYTICS_IDS || 'channel==MINE',
    startDate: formatDate(start),
    endDate: formatDate(end),
    metrics: 'views,estimatedMinutesWatched,averageViewDuration',
    dimensions: 'insightTrafficSourceType',
    sort: '-views',
    maxResults: '10'
  });
  try {
    const response = await fetchWithTimeout(`https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`, {
      headers: { authorization: `Bearer ${accessToken}` }
    });
    const json = await response.json();
    if (!response.ok) return failed(`YouTube Analytics API error: ${json.error?.message || response.status}`);
    const rows = (json.rows || []).map((row) => ({
      source: row[0] || '',
      views: numberValue(row[1]),
      estimatedMinutesWatched: numberValue(row[2]),
      averageViewDuration: numberValue(row[3])
    }));
    return {
      ok: true,
      message: 'YouTube Analytics API',
      rows,
      totals: {
        views: sum(rows, 'views'),
        estimatedMinutesWatched: sum(rows, 'estimatedMinutesWatched')
      }
    };
  } catch (error) {
    return failed(`YouTube Analytics fetch failed: ${error.message}`);
  }
}

async function fetchAdsenseSummary(accessToken, start, end) {
  try {
    const accountResponse = await fetchWithTimeout('https://adsense.googleapis.com/v2/accounts', {
      headers: { authorization: `Bearer ${accessToken}` }
    });
    const accountJson = await accountResponse.json();
    if (!accountResponse.ok) return failed(`AdSense API error: ${accountJson.error?.message || accountResponse.status}`);
    const account = accountJson.accounts?.[0]?.name;
    if (!account) return failed('AdSense account was not found for this Google login.');
    const params = new URLSearchParams({
      dateRange: 'CUSTOM',
      'startDate.year': String(start.getUTCFullYear()),
      'startDate.month': String(start.getUTCMonth() + 1),
      'startDate.day': String(start.getUTCDate()),
      'endDate.year': String(end.getUTCFullYear()),
      'endDate.month': String(end.getUTCMonth() + 1),
      'endDate.day': String(end.getUTCDate()),
      metrics: 'ESTIMATED_EARNINGS'
    });
    const reportResponse = await fetchWithTimeout(`https://adsense.googleapis.com/v2/${account}/reports:generate?${params.toString()}`, {
      headers: { authorization: `Bearer ${accessToken}` }
    });
    const reportJson = await reportResponse.json();
    if (!reportResponse.ok) return failed(`AdSense report error: ${reportJson.error?.message || reportResponse.status}`);
    const value = reportJson.totals?.cells?.[0]?.value || reportJson.rows?.[0]?.cells?.[0]?.value || '';
    return {
      ok: true,
      message: account,
      estimatedEarnings: value || '0'
    };
  } catch (error) {
    return failed(`AdSense fetch failed: ${error.message}`);
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.FETCH_TIMEOUT_MS || 15000));
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function googleHeaders(accessToken) {
  return {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json'
  };
}

function cleanSecret(value) {
  if (!value) return '';
  let next = String(value).trim();
  if ((next.startsWith('"') && next.endsWith('"')) || (next.startsWith("'") && next.endsWith("'"))) {
    next = next.slice(1, -1).trim();
  }
  return next;
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

function pageViewsFor(ga4, pagePath) {
  if (!ga4.ok) return '';
  const normalized = pagePath === '/' ? '/' : pagePath;
  const row = ga4.rows.find((item) => item.path === normalized || item.path.endsWith(normalized));
  return row ? String(row.screenPageViews) : '0';
}

function externalEventsFor(ga4, keyword) {
  if (!ga4.ok) return '';
  const row = ga4.rows.find((item) => item.path.includes(keyword));
  return row ? String(row.eventCount) : '';
}

function searchRows(searchConsole) {
  if (!searchConsole.ok || !searchConsole.rows.length) return '|  |  |  |  |  |';
  return searchConsole.rows.map((row) => `| ${row.query} | ${row.clicks} | ${row.impressions} | ${(row.ctr * 100).toFixed(1)}% | ${row.position.toFixed(1)} |`).join('\n');
}

function youtubeRows(youtubeAnalytics) {
  if (!youtubeAnalytics.ok || !youtubeAnalytics.rows.length) return youtubeAnalytics.message;
  return youtubeAnalytics.rows.slice(0, 3).map((row) => `${row.source}:${row.views}回`).join(' / ');
}

function missingAutoSources(data) {
  const missing = [];
  if (!data.ga4.ok) missing.push('GA4実数');
  if (!data.searchConsole.ok) missing.push('Search Console検索語');
  if (!data.youtubeAnalytics.ok) missing.push('YouTube Studio詳細');
  if (!data.adsense.ok) missing.push('AdSense収益');
  missing.push('itch.io閲覧/DL');
  return missing.join('、');
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + numberValue(row[key]), 0);
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function skipped(message) {
  return { ok: false, message, rows: [], totals: {} };
}

function failed(message) {
  return { ok: false, message, rows: [], totals: {} };
}

