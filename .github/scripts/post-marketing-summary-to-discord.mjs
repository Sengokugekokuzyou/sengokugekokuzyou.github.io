import fs from 'node:fs/promises';
import path from 'node:path';

const webhookUrl = process.env.MARKETING_SUMMARY_DISCORD_WEBHOOK_URL;
if (!webhookUrl) {
  console.log('MARKETING_SUMMARY_DISCORD_WEBHOOK_URL is not set. Skipping private marketing summary notification.');
  process.exit(0);
}

const summaryDir = path.join('更新出力', 'マーケティング');
const latest = await findLatestSummary(summaryDir);

if (!latest) {
  console.log('No marketing summary file found. Skipping Discord summary notification.');
  process.exit(0);
}

const markdown = await fs.readFile(latest, 'utf8');
const summary = extractDiscordSummary(markdown);
const payload = {
  username: '専用運営サマリー',
  content: summary
};

const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload)
});

if (!response.ok) {
  const text = await response.text();
  throw new Error(`Discord webhook failed: ${response.status} ${text.slice(0, 200)}`);
}

console.log(`Posted marketing summary notification for ${latest}`);

async function findLatestSummary(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && /^週次マーケティングサマリー.*\.md$/.test(entry.name))
      .map((entry) => path.join(dir, entry.name));
    if (!files.length) return null;
    const stats = await Promise.all(files.map(async (file) => ({ file, stat: await fs.stat(file) })));
    stats.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
    return stats[0].file;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function extractDiscordSummary(markdown) {
  const block = markdown.match(/```text\n([\s\S]*?)\n```/);
  const text = block ? block[1].trim() : markdown.split('\n').slice(0, 24).join('\n').trim();
  const clipped = text.length > 1600 ? `${text.slice(0, 1580)}\n...` : text;
  return [
    '【専用運営サマリー】',
    'HP / ゲーム / YouTube / 音楽配信 / 広告の内部確認です。公開更新情報には出さない内容です。',
    '',
    clipped,
    '',
    '確認: https://sengokugekokuzyou.github.io/'
  ].join('\n');
}
