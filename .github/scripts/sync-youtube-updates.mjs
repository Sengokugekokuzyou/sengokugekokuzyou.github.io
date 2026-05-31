import fs from 'node:fs/promises';

const channelId = process.env.YOUTUBE_CHANNEL_ID || '';
const channelHandle = process.env.YOUTUBE_CHANNEL_HANDLE || '';
const newsPath = 'news.json';

if (!channelId) {
  console.log('YOUTUBE_CHANNEL_ID is not set. Skipping YouTube sync.');
  process.exit(0);
}

const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
const response = await fetch(feedUrl);
if (!response.ok) {
  throw new Error(`Failed to fetch YouTube feed: ${response.status} ${response.statusText}`);
}

const xml = await response.text();
const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => parseEntry(match[1]));
const usableEntries = entries.filter((entry) => entry.videoId && entry.title && entry.published).slice(0, 5);

const news = JSON.parse(await fs.readFile(newsPath, 'utf8'));
const updates = Array.isArray(news.updates) ? news.updates : [];
const existingIds = new Set(updates.map((item) => item.id));
const newUpdates = [];

for (const entry of usableEntries.reverse()) {
  const id = `youtube-${entry.videoId}`;
  if (existingIds.has(id)) continue;

  newUpdates.unshift({
    id,
    date: entry.published.slice(0, 10),
    category: 'YouTube',
    title: `YouTube更新: ${entry.title}`,
    body: `新しい動画を公開しました。${channelHandle ? `チャンネル: ${channelHandle}` : ''}`.trim(),
    url: `https://www.youtube.com/watch?v=${entry.videoId}`,
    approved: true,
    discord: true,
    source: 'youtube'
  });
}

if (!newUpdates.length) {
  console.log('No new YouTube updates.');
  process.exit(0);
}

news.updates = [...newUpdates, ...updates];
await fs.writeFile(newsPath, `${JSON.stringify(news, null, 2)}\n`, 'utf8');
console.log(`Added ${newUpdates.length} YouTube update(s).`);

function parseEntry(xmlText) {
  return {
    videoId: readTag(xmlText, 'yt:videoId'),
    title: decodeXml(readTag(xmlText, 'title')),
    published: readTag(xmlText, 'published')
  };
}

function readTag(xmlText, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = xmlText.match(new RegExp(`<${escaped}>([\\s\\S]*?)<\\/${escaped}>`));
  return match ? match[1].trim() : '';
}

function decodeXml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}
