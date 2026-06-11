import { promises as fs } from 'node:fs';

const channelId = process.env.YOUTUBE_CHANNEL_ID || '';
const channelHandle = process.env.YOUTUBE_CHANNEL_HANDLE || '';
const newsPath = 'news.json';
const discordPayloadPath = 'youtube-discord-payload.json';
const nowIso = new Date().toISOString();

if (!channelId) {
  console.log('YOUTUBE_CHANNEL_ID is not set. Skipping YouTube sync.');
  await writeDiscordPayload({ skip: true, reason: 'YOUTUBE_CHANNEL_ID is not set.' });
  process.exit(0);
}

const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;

let response;
try {
  response = await fetchWithRetry(feedUrl, 3);
} catch (error) {
  console.log(`YouTube feed request failed after retries. Skipping until next schedule. ${error?.message || error}`);
  await writeDiscordPayload({ skip: true, reason: 'YouTube feed request failed.' });
  process.exit(0);
}

if (!response.ok) {
  console.log(`YouTube feed unavailable after retries: ${response.status} ${response.statusText}. Skipping until next schedule.`);
  await writeDiscordPayload({ skip: true, reason: `YouTube feed unavailable: ${response.status}` });
  process.exit(0);
}

const xml = await response.text();
const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => ({
  id: decodeXml(matchText(entry, /<yt:videoId>([\s\S]*?)<\/yt:videoId>/)),
  title: decodeXml(matchText(entry, /<title>([\s\S]*?)<\/title>/)),
  url: decodeXml(matchText(entry, /<link rel="alternate" href="([\s\S]*?)"\/>/)),
  published: decodeXml(matchText(entry, /<published>([\s\S]*?)<\/published>/)),
})).filter((entry) => entry.id && entry.title && entry.url);

if (entries.length === 0) {
  console.log('No YouTube entries found in feed.');
  await writeDiscordPayload({ skip: true, reason: 'No YouTube entries found.' });
  process.exit(0);
}

const news = JSON.parse(await fs.readFile(newsPath, 'utf8'));
const updates = Array.isArray(news.updates) ? news.updates : [];
const existingIds = new Set(updates.map((item) => item.id));
const latestExistingYouTubeDate = getLatestExistingYouTubeDate(updates);
const newUpdates = entries
  .filter((entry) => !existingIds.has(`youtube-${entry.id}`))
  .filter((entry) => !latestExistingYouTubeDate || entry.published.slice(0, 10) >= latestExistingYouTubeDate)
  .map((entry) => ({
    id: `youtube-${entry.id}`,
    date: entry.published.slice(0, 10),
    category: 'YouTube',
    title: `YouTube更新: ${entry.title}`,
    body: `${channelHandle || '戦国下剋上BEATS'} のYouTubeに新しい動画を公開しました。`,
    url: entry.url,
    approved: true,
    discord: true,
    discordPostedAt: nowIso,
  }));

if (newUpdates.length === 0) {
  const pendingDiscordUpdate = findPendingDiscordUpdate(updates);
  if (pendingDiscordUpdate) {
    pendingDiscordUpdate.discordPostedAt = nowIso;
    news.updates = sortUpdates(updates);
    await fs.writeFile(newsPath, `${JSON.stringify(news, null, 2)}\n`, 'utf8');
    await writeDiscordPayload(buildDiscordPayload([pendingDiscordUpdate]));
    console.log(`Prepared pending Discord notification for ${pendingDiscordUpdate.id}.`);
    process.exit(0);
  }

  news.updates = sortUpdates(updates);
  await fs.writeFile(newsPath, `${JSON.stringify(news, null, 2)}\n`, 'utf8');
  console.log('No new YouTube updates.');
  await writeDiscordPayload({ skip: true, reason: 'No new YouTube updates.' });
  process.exit(0);
}

news.updates = sortUpdates([...newUpdates, ...updates]);
await fs.writeFile(newsPath, `${JSON.stringify(news, null, 2)}\n`, 'utf8');
await writeDiscordPayload(buildDiscordPayload(newUpdates));
console.log(`Added ${newUpdates.length} YouTube update(s).`);

function matchText(text, regex) {
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchWithRetry(url, attempts) {
  let lastResponse;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const currentResponse = await fetch(url);
      if (currentResponse.ok) {
        return currentResponse;
      }
      lastResponse = currentResponse;
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts) {
      await delay(2000 * attempt);
    }
  }

  if (lastResponse) {
    return lastResponse;
  }
  throw lastError || new Error('Unknown YouTube feed fetch failure.');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeDiscordPayload(payload) {
  await fs.writeFile(discordPayloadPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function buildDiscordPayload(items) {
  const latest = items[0];
  const additionalCount = items.length - 1;
  const lines = [
    `**${latest.title}**`,
    `日付: ${latest.date}`,
    `分類: ${latest.category}`,
    latest.body,
    latest.url,
  ];

  if (additionalCount > 0) {
    lines.push(`ほか ${additionalCount} 件のYouTube更新もHPへ反映しました。`);
  }

  return { content: lines.filter(Boolean).join('\n') };
}

function findPendingDiscordUpdate(updates) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return updates.find((item) => {
    if (item.category !== 'YouTube' || item.discord !== true || item.discordPostedAt) {
      return false;
    }
    if (!item.date || Number.isNaN(Date.parse(`${item.date}T00:00:00Z`))) {
      return false;
    }
    return Date.parse(`${item.date}T00:00:00Z`) >= cutoff;
  });
}

function getLatestExistingYouTubeDate(updates) {
  const dates = updates
    .filter((item) => item.category === 'YouTube' || String(item.id || '').startsWith('youtube-'))
    .map((item) => item.date)
    .filter(Boolean)
    .sort()
    .reverse();
  return dates[0] || null;
}

function sortUpdates(updates) {
  return [...updates].sort((a, b) => {
    const dateA = Date.parse(`${a.date || '1970-01-01'}T00:00:00Z`);
    const dateB = Date.parse(`${b.date || '1970-01-01'}T00:00:00Z`);
    if (dateA !== dateB) return dateB - dateA;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });
}
