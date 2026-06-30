#!/usr/bin/env node
// Weekly site health check for Shirokuro Games (sengokugekokuzyou.github.io)
// Hard errors (exit 1): broken internal links, invalid news.json, sitemap <loc>
//   pointing at missing local files, missing AdSense/trust pages.
// Warnings (exit 0): external resources (Amazon books, YouTube thumbnails)
//   that could not be reached — these may fail intermittently and must not
//   break the weekly run.
//
// No external dependencies. Requires Node 18+ (global fetch).

import { readFile, readdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const errors = [];
const warnings = [];
const notes = [];

const REQUIRED_TRUST_PAGES = [
  'index.html',
  'about.html',
  'contact.html',
  'privacy.html',
  'production-policy.html',
];

const EXPECTED_BOOK_ASINS = ['B0H4ZBGFS9', 'B0H42DBNGB', 'B0H26NY9N3'];

async function exists(rel) {
  try {
    await access(path.join(ROOT, rel), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function listHtml() {
  const entries = await readdir(ROOT, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.html'))
    .map((e) => e.name)
    .sort();
}

function extractHrefs(html) {
  const hrefs = [];
  const re = /(?:href|src)\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) hrefs.push(m[1]);
  return hrefs;
}

function isExternal(href) {
  return /^(https?:|mailto:|tel:|data:)/i.test(href);
}

function localTarget(href) {
  // returns the local file path a link points to, or null to skip
  if (!href || isExternal(href)) return null;
  if (href.startsWith('#')) return null; // same-page anchor
  let p = href.split('#')[0].split('?')[0];
  if (p === '' || p === './' || p === '/') return 'index.html';
  p = p.replace(/^\.\//, '').replace(/^\//, '');
  if (p === '') return 'index.html';
  if (p.endsWith('/')) p += 'index.html';
  return p;
}

async function checkInternalLinks() {
  const pages = await listHtml();
  let checked = 0;
  for (const page of pages) {
    const html = await readFile(path.join(ROOT, page), 'utf8');
    const targets = new Set(
      extractHrefs(html).map(localTarget).filter(Boolean)
    );
    for (const t of targets) {
      checked += 1;
      if (!(await exists(t))) {
        errors.push(`Broken internal link: "${t}" referenced in ${page}`);
      }
    }
  }
  notes.push(`Internal links: scanned ${pages.length} pages, ${checked} local targets.`);
}

async function checkNewsJson() {
  if (!(await exists('news.json'))) {
    errors.push('news.json is missing.');
    return null;
  }
  try {
    const data = JSON.parse(await readFile(path.join(ROOT, 'news.json'), 'utf8'));
    if (!Array.isArray(data.updates)) {
      errors.push('news.json: "updates" is not an array.');
      return null;
    }
    notes.push(`news.json: OK, ${data.updates.length} updates.`);
    return data.updates;
  } catch (e) {
    errors.push(`news.json: invalid JSON (${e.message}).`);
    return null;
  }
}

function youtubeIdFromUpdate(item) {
  const url = String(item.url || '');
  const m =
    url.match(/[?&]v=([^&]+)/) ||
    url.match(/youtu\.be\/([^?&/]+)/) ||
    url.match(/\/shorts\/([^?&/]+)/);
  if (m) return m[1];
  const id = String(item.id || '');
  return id.startsWith('youtube-') ? id.slice('youtube-'.length) : '';
}

async function head(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
    if (res.status === 405 || res.status === 403) {
      // some hosts reject HEAD; retry with ranged GET
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { Range: 'bytes=0-0', 'User-Agent': 'Mozilla/5.0 SiteCheckBot' },
      });
    }
    return res.status;
  } finally {
    clearTimeout(t);
  }
}

async function checkYouTubeThumbnails(updates) {
  if (!updates) return;
  const ids = [
    ...new Set(
      updates
        .filter((u) => u.approved !== false)
        .map(youtubeIdFromUpdate)
        .filter(Boolean)
    ),
  ].slice(0, 5); // sample most recent few
  if (!ids.length) {
    notes.push('YouTube thumbnails: no YouTube updates found to check.');
    return;
  }
  for (const id of ids) {
    const url = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    try {
      const status = await head(url);
      if (status >= 200 && status < 400) {
        notes.push(`YouTube thumbnail OK: ${id} (${status}).`);
      } else {
        warnings.push(`YouTube thumbnail not reachable: ${id} (HTTP ${status}).`);
      }
    } catch (e) {
      warnings.push(`YouTube thumbnail check failed: ${id} (${e.message}).`);
    }
  }
}

async function checkBooks() {
  if (!(await exists('kindle.html'))) {
    errors.push('kindle.html (Books page) is missing.');
    return;
  }
  const html = await readFile(path.join(ROOT, 'kindle.html'), 'utf8');
  for (const asin of EXPECTED_BOOK_ASINS) {
    if (!html.includes(asin)) {
      errors.push(`Books: expected Amazon ASIN ${asin} not found in kindle.html.`);
      continue;
    }
    const url = `https://www.amazon.co.jp/dp/${asin}`;
    try {
      const status = await head(url);
      if (status >= 200 && status < 400) {
        notes.push(`Book link OK: ${asin} (${status}).`);
      } else {
        warnings.push(`Book link returned HTTP ${status}: ${url} (Amazon may block bots).`);
      }
    } catch (e) {
      warnings.push(`Book link check failed: ${url} (${e.message}).`);
    }
  }
}

async function checkSitemap() {
  if (!(await exists('sitemap.xml'))) {
    errors.push('sitemap.xml is missing.');
    return;
  }
  const xml = await readFile(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (!locs.length) {
    errors.push('sitemap.xml: no <loc> entries found.');
    return;
  }
  let missing = 0;
  for (const loc of locs) {
    const rel = loc.replace(/^https?:\/\/[^/]+\//, '') || 'index.html';
    const file = rel === '' ? 'index.html' : rel;
    if (!(await exists(file))) {
      errors.push(`sitemap.xml: <loc> points to missing file "${file}" (${loc}).`);
      missing += 1;
    }
  }
  // Pages that exist but are not in the sitemap (informational)
  const pages = await listHtml();
  const inSitemap = new Set(
    locs.map((l) => (l.replace(/^https?:\/\/[^/]+\//, '') || 'index.html'))
  );
  const orphans = pages.filter((p) => !inSitemap.has(p));
  if (orphans.length) {
    warnings.push(`Pages not listed in sitemap.xml: ${orphans.join(', ')}.`);
  }
  notes.push(`sitemap.xml: ${locs.length} entries, ${missing} missing files.`);
}

async function checkTrustPages() {
  for (const page of REQUIRED_TRUST_PAGES) {
    if (!(await exists(page))) {
      errors.push(`AdSense/trust page missing: ${page}.`);
      continue;
    }
    const html = await readFile(path.join(ROOT, page), 'utf8');
    if (html.trim().length < 400) {
      warnings.push(`AdSense/trust page looks too thin: ${page} (${html.length} bytes).`);
    }
  }
  notes.push(`Trust pages: checked ${REQUIRED_TRUST_PAGES.join(', ')}.`);
}

function printReport() {
  const line = '─'.repeat(56);
  console.log(line);
  console.log('Shirokuro Games — Weekly Site Check');
  console.log(line);
  if (notes.length) {
    console.log('\n[Info]');
    notes.forEach((n) => console.log('  • ' + n));
  }
  if (warnings.length) {
    console.log('\n[Warnings] (non-blocking)');
    warnings.forEach((w) => console.log('  ! ' + w));
  }
  if (errors.length) {
    console.log('\n[Errors] (blocking)');
    errors.forEach((e) => console.log('  ✗ ' + e));
  }
  console.log('\n' + line);
  console.log(`Result: ${errors.length} error(s), ${warnings.length} warning(s).`);
  console.log(line);
}

async function main() {
  await checkInternalLinks();
  const updates = await checkNewsJson();
  await checkSitemap();
  await checkTrustPages();
  await checkBooks();
  await checkYouTubeThumbnails(updates);
  printReport();
  if (errors.length) process.exit(1);
}

main().catch((e) => {
  console.error('Site check crashed:', e);
  process.exit(1);
});
