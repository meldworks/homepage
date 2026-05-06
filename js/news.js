/**
 * news.js — お知らせ機能
 *
 *  1. news/news.json を fetch
 *  2. 言語に応じたタイトル / 概要 / 本文を描画
 *  3. 一覧ページ・詳細ページ・トップページのニュースセクションを共通化
 *
 *  ページ側は以下のいずれかの hook 要素を持つだけでOK:
 *   - data-news-list="latest"   : トップページ用（最新N件）
 *   - data-news-list="all"      : 一覧ページ用（全件 + フィルタ）
 *   - data-news-detail          : 詳細ページ用（?id=xxx）
 */

(function newsModule() {

  /* ------------------------------------------------------------------
     ページ言語の判定
     ------------------------------------------------------------------ */
  const LANG = (document.documentElement.lang || 'ja').toLowerCase().startsWith('en') ? 'en' : 'ja';

  /* ------------------------------------------------------------------
     i18n テキスト
     ------------------------------------------------------------------ */
  const T = {
    ja: {
      readMore:    '記事を読む',
      backToList:  '← お知らせ一覧へ',
      external:    '外部サイトを開く',
      filterAll:   'すべて',
      categories:  { news: 'お知らせ', press: 'プレスリリース', event: 'イベント', product: '製品', career: '採用' },
      empty:       '該当する記事がありません。',
      loading:     '読み込み中...',
      notFound:    '指定された記事が見つかりませんでした。',
      published:   '公開日',
    },
    en: {
      readMore:    'Read article',
      backToList:  '← Back to news',
      external:    'Open external site',
      filterAll:   'All',
      categories:  { news: 'News', press: 'Press', event: 'Event', product: 'Product', career: 'Career' },
      empty:       'No matching articles.',
      loading:     'Loading...',
      notFound:    'The requested article was not found.',
      published:   'Published',
    },
  }[LANG];

  /* ------------------------------------------------------------------
     データ取得
     ------------------------------------------------------------------ */
  // 各ページからの相対パス調整：document.baseURI を基準に news/news.json を解決
  function newsJsonUrl() {
    // ページの場所に応じて相対パスを決定
    const path = window.location.pathname;
    if (path.startsWith('/en/news/') || path.startsWith('/pages/news/')) return '../../news/news.json';
    if (path.startsWith('/en/')      || path.startsWith('/pages/'))      return '../news/news.json';
    return 'news/news.json';
  }

  function detailUrl(id) {
    const path = window.location.pathname;
    const isEn = LANG === 'en';
    // どのページからでも詳細ページへ移動できるよう、ルート起点の絶対パスで返す
    const base = isEn ? '/en/news/article.html' : '/pages/news/article.html';
    return base + '?id=' + encodeURIComponent(id);
  }

  function listUrl() {
    return LANG === 'en' ? '/en/news.html' : '/pages/news.html';
  }

  let cachedData = null;
  function loadNews() {
    if (cachedData) return Promise.resolve(cachedData);
    return fetch(newsJsonUrl(), { cache: 'no-cache' })
      .then(r => r.json())
      .then(data => {
        const items = (data.items || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        cachedData = items;
        return items;
      });
  }

  /* ------------------------------------------------------------------
     HTML escape
     ------------------------------------------------------------------ */
  function esc(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ------------------------------------------------------------------
     最小 Markdown レンダラー
       見出し / 段落 / 強調 / リンク / 画像 / リスト / hr / コードインライン
     ------------------------------------------------------------------ */
  function renderMarkdown(md) {
    if (!md) return '';
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let para = [];
    let list = null; // {type:'ul'|'ol', items:[]}

    function flushPara() {
      if (para.length) {
        out.push('<p>' + inline(para.join(' ').trim()) + '</p>');
        para = [];
      }
    }
    function flushList() {
      if (list) {
        out.push('<' + list.type + '>' + list.items.map(i => '<li>' + inline(i) + '</li>').join('') + '</' + list.type + '>');
        list = null;
      }
    }

    for (const raw of lines) {
      const line = raw.replace(/\s+$/, '');

      if (!line.trim()) { flushPara(); flushList(); continue; }

      // 見出し
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) { flushPara(); flushList();
        const lvl = h[1].length;
        out.push('<h' + lvl + '>' + inline(h[2]) + '</h' + lvl + '>');
        continue;
      }

      // hr
      if (/^---+$/.test(line.trim())) { flushPara(); flushList(); out.push('<hr>'); continue; }

      // unordered list
      const ul = line.match(/^[-*]\s+(.*)$/);
      if (ul) { flushPara();
        if (!list || list.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; }
        list.items.push(ul[1]);
        continue;
      }
      // ordered list
      const ol = line.match(/^\d+\.\s+(.*)$/);
      if (ol) { flushPara();
        if (!list || list.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; }
        list.items.push(ol[1]);
        continue;
      }

      flushList();
      para.push(line);
    }
    flushPara(); flushList();
    return out.join('\n');
  }

  function inline(text) {
    // まずHTMLエスケープしてから、Markdown記法を順番に変換
    let s = esc(text);
    // 画像 ![alt](url)
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) =>
      '<img src="' + url + '" alt="' + alt + '" loading="lazy">');
    // リンク [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
      const ext = /^https?:/.test(u);
      return '<a href="' + u + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + t + '</a>';
    });
    // 太字 **text**
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // 斜体 *text*
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // インラインコード `code`
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    return s;
  }

  /* ------------------------------------------------------------------
     共通：日付フォーマット
     ------------------------------------------------------------------ */
  function formatDate(iso) {
    if (!iso) return '';
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso;
    return m[1] + '.' + m[2] + '.' + m[3];
  }

  /* ------------------------------------------------------------------
     カードHTML（一覧・トップ共通）
     ------------------------------------------------------------------ */
  function cardHtml(item) {
    const title   = (item.title   && item.title[LANG])   || (item.title && item.title.ja)   || '';
    const summary = (item.summary && item.summary[LANG]) || (item.summary && item.summary.ja) || '';
    const cat     = T.categories[item.category] || item.category || '';
    const isExt   = !!item.external_url;
    const href    = isExt ? item.external_url : detailUrl(item.id);
    const target  = isExt ? ' target="_blank" rel="noopener noreferrer"' : '';
    const cover   = item.cover_image ? '<div class="news-cover"><img src="' + item.cover_image + '" alt="" loading="lazy"></div>' : '';

    const linkClass = 'news-card-link' + (item.cover_image ? '' : ' no-cover');
    return ''
      + '<article class="news-card">'
      +   '<a class="' + linkClass + '" href="' + esc(href) + '"' + target + '>'
      +     cover
      +     '<div class="news-card-body">'
      +       '<div class="news-meta">'
      +         '<time class="news-date" datetime="' + esc(item.date) + '">' + esc(formatDate(item.date)) + '</time>'
      +         '<span class="news-category news-cat-' + esc(item.category) + '">' + esc(cat) + '</span>'
      +       '</div>'
      +       '<h3 class="news-title">' + esc(title) + (isExt ? ' <span class="ext-arrow">↗</span>' : '') + '</h3>'
      +       (summary ? '<p class="news-summary">' + esc(summary) + '</p>' : '')
      +     '</div>'
      +   '</a>'
      + '</article>';
  }

  /* ------------------------------------------------------------------
     コンパクトな一行リスト（トップページ用）
     ------------------------------------------------------------------ */
  function rowHtml(item) {
    const title  = (item.title && item.title[LANG]) || (item.title && item.title.ja) || '';
    const cat    = T.categories[item.category] || item.category || '';
    const isExt  = !!item.external_url;
    const href   = isExt ? item.external_url : detailUrl(item.id);
    const target = isExt ? ' target="_blank" rel="noopener noreferrer"' : '';

    return ''
      + '<li class="news-row">'
      +   '<a class="news-row-link" href="' + esc(href) + '"' + target + '>'
      +     '<time class="news-row-date" datetime="' + esc(item.date) + '">' + esc(formatDate(item.date)) + '</time>'
      +     '<span class="news-row-category news-cat-' + esc(item.category) + '">' + esc(cat) + '</span>'
      +     '<span class="news-row-title">' + esc(title) + (isExt ? ' <span class="ext-arrow">↗</span>' : '') + '</span>'
      +   '</a>'
      + '</li>';
  }

  /* ------------------------------------------------------------------
     トップページ用：最新N件
     ------------------------------------------------------------------ */
  function initLatest(el) {
    const limit = parseInt(el.dataset.limit, 10) || 3;
    el.innerHTML = '<p class="news-loading">' + T.loading + '</p>';
    loadNews().then(items => {
      const latest = items.slice(0, limit);
      if (!latest.length) { el.innerHTML = '<p class="news-empty">' + T.empty + '</p>'; return; }
      el.innerHTML = '<ul class="news-rows">' + latest.map(rowHtml).join('') + '</ul>';
    }).catch(err => {
      console.error('[news] failed to load:', err);
      el.innerHTML = '<p class="news-empty">' + T.empty + '</p>';
    });
  }

  /* ------------------------------------------------------------------
     一覧ページ：全件 + カテゴリフィルタ
     ------------------------------------------------------------------ */
  function initAll(el) {
    el.innerHTML = '<p class="news-loading">' + T.loading + '</p>';
    loadNews().then(items => {
      const cats = Array.from(new Set(items.map(i => i.category))).filter(Boolean);

      const filterHtml = ''
        + '<div class="news-filter" role="tablist">'
        +   '<button class="news-filter-btn active" data-cat="" type="button">' + T.filterAll + '</button>'
        +   cats.map(c => '<button class="news-filter-btn" data-cat="' + esc(c) + '" type="button">' + esc(T.categories[c] || c) + '</button>').join('')
        + '</div>';

      const listHtml = '<div class="news-list">' + items.map(cardHtml).join('') + '</div>';

      el.innerHTML = filterHtml + listHtml;

      // フィルタ動作
      el.querySelectorAll('.news-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          el.querySelectorAll('.news-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const cat = btn.dataset.cat;
          let visibleCount = 0;
          el.querySelectorAll('.news-card').forEach(card => {
            const cardCat = card.querySelector('.news-category');
            const match = !cat || (cardCat && cardCat.classList.contains('news-cat-' + cat));
            card.style.display = match ? '' : 'none';
            if (match) visibleCount++;
          });
          let empty = el.querySelector('.news-empty');
          if (!visibleCount) {
            if (!empty) {
              empty = document.createElement('p');
              empty.className = 'news-empty';
              empty.textContent = T.empty;
              el.querySelector('.news-list').appendChild(empty);
            }
          } else if (empty) {
            empty.remove();
          }
        });
      });

      if (!items.length) el.innerHTML = '<p class="news-empty">' + T.empty + '</p>';
    }).catch(err => {
      console.error('[news] failed to load:', err);
      el.innerHTML = '<p class="news-empty">' + T.empty + '</p>';
    });
  }

  /* ------------------------------------------------------------------
     詳細ページ：?id=xxx で1件表示
     ------------------------------------------------------------------ */
  function initDetail(el) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    el.innerHTML = '<p class="news-loading">' + T.loading + '</p>';

    loadNews().then(items => {
      const item = items.find(i => i.id === id);
      if (!item) {
        el.innerHTML = '<p class="news-empty">' + T.notFound + '</p>'
          + '<p style="margin-top:24px;"><a href="' + listUrl() + '" class="link-arrow">' + T.backToList + '</a></p>';
        return;
      }

      const title   = (item.title   && item.title[LANG])   || (item.title && item.title.ja)   || '';
      const summary = (item.summary && item.summary[LANG]) || '';
      const body    = (item.body    && item.body[LANG])    || '';
      const cat     = T.categories[item.category] || item.category || '';

      // ページタイトル更新
      document.title = title + ' | meldworks';

      const cover  = item.cover_image ? '<div class="news-detail-cover"><img src="' + item.cover_image + '" alt=""></div>' : '';
      const extBtn = item.external_url
        ? '<p style="margin-top:32px;"><a href="' + esc(item.external_url) + '" target="_blank" rel="noopener noreferrer" class="btn-primary">' + T.external + ' ↗</a></p>'
        : '';

      el.innerHTML = ''
        + '<article class="news-detail">'
        +   '<div class="news-meta">'
        +     '<time class="news-date" datetime="' + esc(item.date) + '">' + esc(formatDate(item.date)) + '</time>'
        +     '<span class="news-category news-cat-' + esc(item.category) + '">' + esc(cat) + '</span>'
        +   '</div>'
        +   '<h1 class="news-detail-title">' + esc(title) + '</h1>'
        +   (summary ? '<p class="news-detail-summary">' + esc(summary) + '</p>' : '')
        +   cover
        +   '<div class="news-body">' + renderMarkdown(body) + '</div>'
        +   extBtn
        +   '<p style="margin-top:48px;"><a href="' + listUrl() + '" class="link-arrow">' + T.backToList + '</a></p>'
        + '</article>';

      // 言語トグルが同じ記事の他言語ページに遷移するようにURLを書き換え
      document.querySelectorAll('.nav-lang-btn').forEach(a => {
        try {
          const u = new URL(a.getAttribute('href'), window.location.href);
          if (/\/news\/article\.html$/.test(u.pathname)) {
            u.searchParams.set('id', id);
            a.setAttribute('href', u.pathname + u.search);
          }
        } catch (_) { /* noop */ }
      });
    }).catch(err => {
      console.error('[news] failed to load:', err);
      el.innerHTML = '<p class="news-empty">' + T.notFound + '</p>';
    });
  }

  /* ------------------------------------------------------------------
     エントリポイント
     ------------------------------------------------------------------ */
  function start() {
    document.querySelectorAll('[data-news-list="latest"]').forEach(initLatest);
    document.querySelectorAll('[data-news-list="all"]').forEach(initAll);
    document.querySelectorAll('[data-news-detail]').forEach(initDetail);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
