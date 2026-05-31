async function loadUpdates() {
  const list = document.querySelector('[data-updates-list]');
  if (!list) return;

  try {
    const response = await fetch('news.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`news.json ${response.status}`);
    const data = await response.json();
    const updates = Array.isArray(data.updates) ? data.updates : [];
    const approved = updates.filter((item) => item.approved !== false).slice(0, 6);

    if (!approved.length) {
      list.innerHTML = '<article class="update-item"><p class="update-date">準備中</p><h3>公開できる更新情報はまだありません</h3></article>';
      return;
    }

    list.innerHTML = approved.map((item) => {
      const title = escapeHtml(item.title || '更新情報');
      const date = escapeHtml(item.date || '日付未設定');
      const body = escapeHtml(item.body || '');
      const category = escapeHtml(item.category || 'INFO');
      const link = item.url ? `<a href="${escapeAttribute(item.url)}">詳しく見る</a>` : '';
      return `<article class="update-item"><p class="update-date">${date} / ${category}</p><h3>${title}</h3><p>${body}</p>${link}</article>`;
    }).join('');
  } catch (error) {
    list.innerHTML = '<article class="update-item"><p class="update-date">取得失敗</p><h3>更新情報を読み込めませんでした</h3></article>';
  }
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

loadUpdates();
