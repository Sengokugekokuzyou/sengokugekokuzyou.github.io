import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const siteDir = path.resolve('site');
const workDir = process.cwd();
const configPath = path.join(siteDir, 'deploy-targets.json');
const newsPath = path.join(siteDir, 'news.json');
const butlerKey = process.env.BUTLER_API_KEY || '';

if (!butlerKey) {
  throw new Error('BUTLER_API_KEY is not set. Add it as a repository secret.');
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const targets = Array.isArray(config.targets) ? config.targets : [];
let news = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
news.updates = Array.isArray(news.updates) ? news.updates : [];
let changedCount = 0;

for (const target of targets) {
  if (!target.enabled) {
    console.log(`Skipping disabled target: ${target.id}`);
    continue;
  }
  if (!isConfigured(target)) {
    console.log(`Target is ON but waiting for repository/itch settings: ${target.id}`);
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
  run(`rsync -av --exclude='.git' --exclude='.github' --exclude='README.md' --exclude='docs' ${shellArg(`${gameDir}/`)} ${shellArg(`${releaseDir}/`)}`);

  if (!fs.existsSync(path.join(releaseDir, 'index.html'))) {
    console.log(`${target.title} does not contain index.html; skipping upload until the game build is ready.`);
    continue;
  }

  const shortSha = currentSha.slice(0, 7);
  const version = `auto-${shortSha}`;
  run(`butler push ${shellArg(releaseDir)} ${shellArg(`${target.itch_target}:${target.itch_channel}`)} --userversion ${shellArg(version)} --if-changed`);

  addNewsAndDevlog({ target, currentSha, previousSha, shortSha, gameDir });
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${currentSha}\n`, 'utf8');
  changedCount += 1;
}

fs.writeFileSync(newsPath, `${JSON.stringify(news, null, 2)}\n`, 'utf8');
console.log(`Deployed ${changedCount} changed game(s).`);

function addNewsAndDevlog({ target, currentSha, previousSha, shortSha, gameDir }) {
  const now = new Date().toISOString().slice(0, 10);
  const title = `${target.title}を自動更新しました`;
  const commitUrl = `https://github.com/${target.game_repo}/commit/${currentSha}`;
  const gameUrl = target.public_url || `https://${target.itch_target.replace('/', '.itch.io/')}`;
  let summary = `ゲーム本体の新しいコミット ${shortSha} を検知し、itch.ioへ自動アップロードしました。`;

  try {
    if (previousSha) {
      const log = run(`git -C ${shellArg(gameDir)} log --oneline ${previousSha}..${currentSha}`).trim();
      if (log) summary = `ゲーム本体を更新しました。変更: ${log.split('\n').slice(0, 3).join(' / ')}`;
    }
  } catch (error) {
    console.log(`Could not build commit summary for ${target.id}; using fallback text.`);
  }

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

  const devlogsDir = path.join(siteDir, 'devlogs');
  fs.mkdirSync(devlogsDir, { recursive: true });
  const devlog = [
    `# ${title}`,
    '',
    `公開日: ${now}`,
    `作品: ${target.title}`,
    `対象コミット: ${commitUrl}`,
    `itch.io: ${gameUrl}`,
    '',
    '## 更新内容',
    '',
    summary,
    '',
    '## 公開メモ',
    '',
    '- HPとDiscordには自動反映済み。',
    '- itch.ioのDeveloper Logsへ投稿する場合は、この内容を確認して貼り付ける。',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(devlogsDir, `${id}.md`), devlog, 'utf8');
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
