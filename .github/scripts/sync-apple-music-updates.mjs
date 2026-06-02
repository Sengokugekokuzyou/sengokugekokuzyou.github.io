import fs from 'node:fs/promises';

const artistId = process.env.APPLE_MUSIC_ARTIST_ID || '1888867608';
const country = process.env.APPLE_MUSIC_COUNTRY || 'JP';
const initialImportLimit = Number.parseInt(process.env.APPLE_MUSIC_INITIAL_IMPORT_LIMIT || '1', 10);
const updateLimit = Number.parseInt(process.env.APPLE_MUSIC_UPDATE_LIMIT || '10', 10);
const spotifyArtistUrl = process.env.SPOTIFY_ARTIST_URL || 'https://open.spotify.com/intl-ja/artist/3WQ99kHfRU1IwI7l5dBqVL';
const newsPath = 'news.json';
const statePath = '.music-release-state/apple-music.json';
const today = process.env.APPLE_MUSIC_TODAY || new Date().toISOString().slice(0, 10);

if (!artistId) {
  console.log('APPLE_MUSIC_ARTIST_ID is not set. Skipping Apple Music sync.');
  process.exit(0);
}

const lookupUrl = new URL('https://itunes.apple.com/lookup');
lookupUrl.searchParams.set('id', artistId);
lookupUrl.searchParams.set('entity', 'album');
lookupUrl.searchParams.set('limit', '100');
lookupUrl.searchParams.set('country', country);

const response = await fetch(lookupUrl);
if (!response.ok) {
  throw new Error(`Failed to fetch Apple Music lookup: ${response.status} ${response.statusText}`);
}

const payload = await response.json();
const releases = (Array.isArray(payload.results) ? payload.results : [])
  .filter((item) => item.wrapperType === 'collection' && item.collectionId && item.collectionName)
  .map((item) => ({
    id: String(item.collectionId),
    name: item.collectionName,
    date: normalizeDate(item.releaseDate),
    url: item.collectionViewUrl || `https://music.apple.com/artist/${artistId}`,
    artworkUrl: item.artworkUrl100 || '',
    collectionType: item.collectionType || 'Album'
  }))
  .filter((release) => release.date <= today)
  .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

if (!releases.length) {
  console.log('No Apple Music releases found.');
  process.exit(0);
}

const news = JSON.parse(await fs.readFile(newsPath, 'utf8'));
const updates = Array.isArray(news.updates) ? news.updates : [];
const existingNewsIds = new Set(updates.map((item) => item.id));
const previousState = await readJsonIfExists(statePath, { knownReleaseIds: [] });
const knownReleaseIds = new Set(Array.isArray(previousState.knownReleaseIds) ? previousState.knownReleaseIds.map(String) : []);
const hasState = knownReleaseIds.size > 0;
const candidates = releases.filter((release) => !knownReleaseIds.has(release.id));
const limit = hasState ? updateLimit : initialImportLimit;
const newUpdates = [];

for (const release of candidates.slice(0, Math.max(0, limit)).reverse()) {
  const id = `apple-music-${release.id}`;
  if (existingNewsIds.has(id)) continue;

  newUpdates.unshift({
    id,
    date: release.date,
    category: '音楽配信',
    title: `配信リリース: ${release.name}`,
    body: buildBody(),
    url: release.url,
    approved: true,
    discord: true,
    source: 'apple-music',
    artist: 'Sengoku Gekokujo BEATS',
    releaseId: release.id,
    releaseType: release.collectionType,
    artworkUrl: release.artworkUrl,
    spotifyArtistUrl
  });
}

news.updates = [...newUpdates, ...updates];

await fs.mkdir(dirname(statePath), { recursive: true });
await fs.writeFile(statePath, `${JSON.stringify({
  artistId,
  country,
  checkedAt: new Date().toISOString(),
  knownReleaseIds: releases.map((release) => release.id)
}, null, 2)}\n`, 'utf8');

if (!newUpdates.length) {
  console.log('No new Apple Music updates.');
  process.exit(0);
}

await fs.writeFile(newsPath, `${JSON.stringify(news, null, 2)}\n`, 'utf8');
console.log(`Added ${newUpdates.length} Apple Music update(s).`);

function normalizeDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function buildBody() {
  const lines = ['Apple Musicで配信リリースを確認しました。'];
  if (spotifyArtistUrl) {
    lines.push(`Spotifyでも配信状況を確認できます: ${spotifyArtistUrl}`);
  }
  return lines.join('\n');
}

async function readJsonIfExists(path, fallback) {
  try {
    return JSON.parse(await fs.readFile(path, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function dirname(path) {
  const index = path.lastIndexOf('/');
  return index === -1 ? '.' : path.slice(0, index);
}
