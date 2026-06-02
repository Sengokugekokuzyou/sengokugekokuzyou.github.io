import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const siteDir = path.resolve('site');
const workDir = process.cwd();
const configPath = path.join(siteDir, 'deploy-targets.json');
const newsPath = path.join(siteDir, 'news.json');
const discordPayloadPath = path.join(siteDir, '.deploy-discord-payload.json');
const butlerKey = process.env.BUTLER_API_KEY || '';

if (!butlerKey) {
  throw new Error('BUTLER_API_KEY is not set. Add it as a repository secret.');
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const targets = Array.isArray(config.targets) ? config.targets : [];
const news = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
news.updates = Array.isArray(news.updates) ? news.updates : [];

let changedCount = 0;
const deployedItems = [];

for (const target of targets) {
  if (!target.enabled) {
    console.log(`Skipping disabled target: ${target.id}`);
    continue;
  }
  if (!isConfigured(target)) {
    console.log(`Target is enabled but waiting for repository/itch settings: ${target.id}`);
    continue;
  }

  const gameDir = path.join(workDir, `game-${target.id}`);
  const releaseDir = path.join(workDir, `release-${target.id}`);
  const statePath = path.join(siteDir, target.state_file);

  run(`git clone --depth 1 https://github.com/${target.game_repo}.git ${shellArg(gameDir)}`);
  const currentSha = run(`git -C ${shellArg(gameDir)} rev-parse HEAD`).trim();
  const previousSha = fs.existsSync(statePath) ? fs.readFileSync(statePath, 'utf8').trim() : '';

  if (currentSha === previousSha) {
    console.log(`No new commit for ${target.title}.`);
    continue;
  }

  fs.rmSync(releaseDir, { recursive: true, force: true });
  fs.mkdirSync(releaseDir, { recursive: true });

  const releaseSource = resolveReleaseSource(gameDir);
  if (!releaseSource) {
    console.log(`${target.title} does not contain index.html or dist/index.html; skipping upload until the game build is ready.`);
    continue;
  }

  run([
    'rsync -av',
    "--exclude='.git'",
    "--exclude='.github'",
    "--exclude='README.md'",
    "--exclude='docs'",
    "--exclude='node_modules'",
    "--exclude='package-lock.json'",
    `${shellArg(`${releaseSource}/`)}`,
    `${shellArg(`${releaseDir}/`)}`
  ].join(' '));

  const shortSha = currentSha.slice(0, 7);
  const version = `auto-${shortSha}`;
  run(`butler push ${shellArg(releaseDir)} ${shellArg(`${target.itch_target}:${target.itch_channel}`)} --userversion ${shellArg(version)} --if-changed`);

  const item = addNewsAndDevlog({ target, currentSha, previousSha, shortSha, gameDir });
  deployedItems.push(item);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${currentSha}\n`, 'utf8');
  changedCount += 1;
}

fs.writeFileSync(newsPath, `${JSON.stringify(news, null, 2)}\n`, 'utf8');
if (deployedItems.length > 0) {
  fs.writeFileSync(discordPayloadPath, `${JSON.stringify(deployedItems, null, 2)}\n`, 'utf8');
} else if (fs.existsSync(discordPayloadPath)) {
  fs.rmSync(discordPayloadPath);
}

console.log(`Deployed ${changedCount} changed game(s).`);

function addNewsAndDevlog({ target, currentSha, previousSha, shortSha, gameDir }) {
  const now = new Date().toISOString().slice(0, 10);
  const commitUrl = `https://github.com/${target.game_repo}/commit/${currentSha}`;
  const gameUrl = target.public_url || `https://${target.itch_target.replace('/', '.itch.io/')}`;
  const title = `${target.title}を自動更新しました`;
  const changes = readCommitSummary({ gameDir, previousSha, currentSha });
  const summary = changes.length
    ? `ゲーム本体を更新しました。変更: ${changes.slice(0, 3).join(' / ')}`
    : `ゲーム本体の新しいコミット ${shortSha} を検知し、itch.ioへ自動アップロードしました。`;

  const id = `itch-auto-${target.id}-${shortSha}`;
  const item = {
    id,
    date: now,
    category: 'itch.io自動更新',
    title,
    body: summary,
    url: gameUrl,
    approved: true,
    discord: true,
    source: 'itch-auto',
    game: target.id,
    commit: commitUrl
  };

  news.updates = [item, ...news.updates.filter((entry) => entry.id !== id)];
  writeDevlog({ id, now, target, commitUrl, gameUrl, summary, changes });
  return item;
}

function writeDevlog({ id, now, target, commitUrl, gameUrl, summary, changes }) {
  const devlogsDir = path.join(siteDir, 'devlogs');
  fs.mkdirSync(devlogsDir, { recursive: true });

  const changeLines = changes.length
    ? changes.map((line) => `- ${line}`)
    : [`- ${summary}`];

  const devlog = [
    `# ${target.title}を更新しました`,
    '',
    `公開日: ${now}`,
    `作品: ${target.title}`,
    `対象コミット: ${commitUrl}`,
    `itch.io: ${gameUrl}`,
    '',
    '## 更新内容',
    '',
    ...changeLines,
    '',
    '## 公開メモ',
    '',
    '- GitHub更新を検知し、butlerでitch.ioへ自動アップロードしました。',
    '- HPの更新情報とDiscord通知には自動反映済みです。',
    '- itch.ioのDeveloper Logsへ投稿する場合は、この内容を確認して貼り付けます。',
    ''
  ].join('\n');

  fs.writeFileSync(path.join(devlogsDir, `${id}.md`), devlog, 'utf8');
}

function readCommitSummary({ gameDir, previousSha, currentSha }) {
  if (!previousSha) return [];

  try {
    const log = run(`git -C ${shellArg(gameDir)} log --oneline ${previousSha}..${currentSha}`).trim();
    return log ? log.split('\n').map((line) => line.trim()).filter(Boolean) : [];
  } catch (error) {
    console.log('Could not build commit summary; using fallback text.');
    return [];
  }
}

function resolveReleaseSource(gameDir) {
  const distDir = path.join(gameDir, 'dist');
  if (fs.existsSync(path.join(distDir, 'index.html'))) return distDir;
  if (fs.existsSync(path.join(gameDir, 'index.html'))) return gameDir;
  return '';
}

function isConfigured(target) {
  const required = ['id', 'title', 'game_repo', 'itch_target', 'itch_channel', 'state_file'];
  return required.every((key) => Boolean(target[key]));
}

function run(command) {
  console.log(command.replace(/BUTLER_API_KEY=[^ ]+/g, 'BUTLER_API_KEY=***'));
  return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

function shellArg(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}
