async function fetchUpdates() {
  const response = await fetch('news.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`news.json ${response.status}`);
  const data = await response.json();
  return sortUpdates(Array.isArray(data.updates) ? data.updates : []);
}

async function loadUpdates() {
  const list = document.querySelector('[data-updates-list]');
  if (!list) return;

  try {
    const updates = await fetchUpdates();
    const approved = updates.filter((item) => item.approved !== false).slice(0, 6);

    if (!approved.length) {
      list.innerHTML = '<article class="update-item"><p class="update-date">準備中</p><h3>公開できる更新情報はまだありません</h3></article>';
      return;
    }

    list.innerHTML = approved.map((item) => renderUpdateItem(item)).join('');
  } catch (error) {
    list.innerHTML = '<article class="update-item"><p class="update-date">取得失敗</p><h3>更新情報を読み込めませんでした</h3></article>';
  }
}

async function loadLatestYouTube() {
  const container = document.querySelector('[data-latest-youtube]');
  if (!container) return;

  try {
    const updates = await fetchUpdates();
    const latest = updates.find((item) => {
      const category = String(item.category || '').toLowerCase();
      const source = String(item.source || '').toLowerCase();
      const id = String(item.id || '').toLowerCase();
      const url = String(item.url || '').toLowerCase();
      return item.approved !== false && (category.includes('youtube') || source.includes('youtube') || id.startsWith('youtube-') || url.includes('youtu'));
    });

    if (!latest) {
      container.innerHTML = '<h3>新着動画を準備中</h3><p>YouTube更新が入ると、ここに最新動画が表示されます。</p>';
      return;
    }

    const title = escapeHtml(latest.title || '最新YouTube動画');
    const date = escapeHtml(latest.date || '日付未設定');
    const body = escapeHtml(latest.body || '戦国下剋上BEATSの最新動画です。');
    const link = latest.url ? `<a class="text-link" href="${escapeAttribute(latest.url)}">動画を見る</a>` : '';
    container.innerHTML = `<p class="update-date">${date}</p><h3>${title}</h3><p>${body}</p>${link}`;
  } catch (error) {
    container.innerHTML = '<h3>新着動画を読み込めませんでした</h3><p>少し時間を置いて再度確認してください。</p>';
  }
}

function renderUpdateItem(item) {
  const title = escapeHtml(item.title || '更新情報');
  const date = escapeHtml(item.date || '日付未設定');
  const body = escapeHtml(item.body || '');
  const category = escapeHtml(item.category || 'INFO');
  const link = item.url ? `<a href="${escapeAttribute(item.url)}">詳しく見る</a>` : '';
  return `<article class="update-item"><p class="update-date">${date} / ${category}</p><h3>${title}</h3><p>${body}</p>${link}</article>`;
}

function sortUpdates(updates) {
  return [...updates].sort((a, b) => {
    const dateA = Date.parse(`${a.date || '1970-01-01'}T00:00:00Z`);
    const dateB = Date.parse(`${b.date || '1970-01-01'}T00:00:00Z`);
    if (dateA !== dateB) return dateB - dateA;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

function trackExternalLinks() {
  document.querySelectorAll('a[href^="http"]').forEach((link) => {
    link.addEventListener('click', () => {
      if (typeof gtag !== 'function') return;

      const url = new URL(link.href);
      if (url.hostname === window.location.hostname) return;

      gtag('event', 'external_link_click', {
        link_url: link.href,
        link_domain: url.hostname,
        link_text: link.textContent.trim().slice(0, 80),
        transport_type: 'beacon'
      });
    });
  });
}

function ensureTrustNavigation() {
  const links = [
    ['world.html', '世界観'],
    ['kindle.html', 'Kindle出版'],
    ['gekokujo.html', 'GEKOKUJO'],
    ['kekkanokeifu-guide.html', '血華の系譜ガイド'],
    ['production-policy.html', '制作方針'],
    ['about.html', '運営者情報'],
    ['contact.html', 'お問い合わせ'],
    ['privacy.html', 'Privacy']
  ];

  document.querySelectorAll('.footer').forEach((footer) => {
    const existing = new Set([...footer.querySelectorAll('a')].map((link) => link.getAttribute('href')));
    links.forEach(([href, label]) => {
      if (existing.has(href)) return;
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      footer.appendChild(link);
    });
  });
}

loadUpdates();
loadLatestYouTube();
ensureTrustNavigation();
trackExternalLinks();
