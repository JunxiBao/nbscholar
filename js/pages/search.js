// ===== 学术检索 =====

// 存储当前检索结果，用于收藏操作
let _searchResults = [];
let _searchPage    = 1;
const _favoritedIds = new Set(); // 已收藏的 paper_id

function initSearch() {
  // filter-chip 单选
  document.querySelectorAll('.filter-chip[data-group]').forEach(chip => {
    chip.addEventListener('click', function () {
      document.querySelectorAll(`.filter-chip[data-group="${this.dataset.group}"]`)
        .forEach(c => c.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // 搜索按钮
  const btn = document.querySelector('#main-searchbar')?.closest('.search-field')
                ?.querySelector('.btn-primary');
  if (btn) btn.addEventListener('click', () => doSearch(1));

  // 回车搜索
  const inp = document.getElementById('main-searchbar');
  if (inp) inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch(1);
  });

  // 筛选按钮
  const filterBtn = document.querySelector('.btn-secondary.btn-sm.btn-full');
  if (filterBtn) filterBtn.addEventListener('click', () => doSearch(1));

  // 加载更多
  const loadMoreBtn = document.querySelector('[onclick*="加载更多"]');
  if (loadMoreBtn) {
    loadMoreBtn.removeAttribute('onclick');
    loadMoreBtn.addEventListener('click', () => doSearch(_searchPage + 1, true));
  }

  // 如果有默认关键词，自动搜索
  const defaultQ = inp?.value?.trim();
  if (defaultQ) doSearch(1);

  // 加载已收藏 paper_id 集合
  _loadFavoritedIds();
}

async function _loadFavoritedIds() {
  if (!window.FavoritesAPI || !Auth.isLoggedIn()) return;
  try {
    const { data } = await FavoritesAPI.list({ per_page: 200 });
    data.favorites.forEach(f => _favoritedIds.add(f.id));
  } catch {}
}

async function doSearch(page = 1, append = false) {
  const q        = (document.getElementById('main-searchbar')?.value || '').trim();
  const source   = document.querySelector('.filter-chip[data-group="source"].active')?.textContent?.trim() || '';
  const year     = document.querySelector('select:nth-of-type(1)')?.value || '';
  const docType  = document.querySelector('select:nth-of-type(2)')?.value || '';
  const sort     = document.querySelector('select:nth-of-type(4)')?.value || 'relevance';

  if (!q) { showToast('请输入检索关键词'); return; }

  const sortMap  = { '相关度': 'relevance', '引用量': 'citations', '最新发表': 'newest' };
  const sourceMap= { '知网': 'cnki', '万方': 'wanfang', 'PubMed': 'pubmed',
                     'arXiv': 'arxiv', 'WoS': 'wos', 'Scopus': 'scopus' };

  const params = {
    q,
    page,
    per_page: 10,
    sort:   sortMap[sort]     || 'relevance',
    source: sourceMap[source] || '',
  };
  if (year && year !== '全部年份')    params.year = year;
  if (docType && docType !== '全部类型') params.type = docType;

  // 更新结果统计提示
  const countEl = document.querySelector('.col-main span strong');

  if (!append) {
    _searchPage = 1;
    const resultArea = document.querySelector('.col-main');
    if (resultArea) {
      // 插入 loading 骨架
      const existing = resultArea.querySelectorAll('.paper-card');
      existing.forEach(el => el.remove());
    }
    showToast('检索中...');
  }

  try {
    const { data } = await SearchAPI.search(params);
    _searchPage = page;
    _searchResults = append ? [..._searchResults, ...data.papers] : data.papers;

    // 更新总数
    const totalEl = document.querySelector('[style*="text-secondary"] strong');
    if (totalEl) totalEl.textContent = data.total.toLocaleString();

    // 渲染结果
    const resultContainer = document.querySelector('.col-main');
    if (!resultContainer) return;

    if (!append) {
      // 清除旧的 paper-card 和统计行
      resultContainer.querySelectorAll('.paper-card, [style*="padding:16px 16px 32px"]').forEach(el => el.remove());
    }

    // 在统计行后插入文献卡片
    const statsRow = resultContainer.querySelector('[style*="padding:10px 16px"]');
    const insertAfter = statsRow || resultContainer.firstChild;

    data.papers.forEach(paper => {
      const card = _renderPaperCard(paper);
      resultContainer.insertBefore(card, insertAfter?.nextSibling || null);
    });

    // 加载更多按钮
    let loadMoreWrap = resultContainer.querySelector('.load-more-wrap');
    if (!loadMoreWrap) {
      loadMoreWrap = document.createElement('div');
      loadMoreWrap.className = 'load-more-wrap';
      loadMoreWrap.style.cssText = 'padding:16px 16px 32px;text-align:center;';
      resultContainer.appendChild(loadMoreWrap);
    }
    const hasMore = (page * 10) < data.total;
    loadMoreWrap.innerHTML = hasMore
      ? `<button class="btn btn-muted" style="min-width:160px;" id="load-more-btn">加载更多结果</button>`
      : `<p style="font-size:13px;color:var(--text-tertiary);">已显示全部 ${data.total} 条结果</p>`;
    if (hasMore) {
      document.getElementById('load-more-btn')
        ?.addEventListener('click', () => doSearch(_searchPage + 1, true));
    }

    if (!data.papers.length && !append) {
      showToast('未找到相关文献');
    }
  } catch (e) {
    showToast(`检索失败：${e.message}`);
  }
}

function _renderPaperCard(paper) {
  const card = document.createElement('div');
  card.className = 'paper-card fade-up';
  card.dataset.paperId = paper.id;

  const isBookmarked = _favoritedIds.has(paper.id);
  const chipColor = { arXiv: 'chip-red', '知网': 'chip-blue', '万方': 'chip-purple',
                      PubMed: 'chip-amber', WoS: 'chip-green', Scopus: 'chip-gray' };
  const sourceChip = paper.source
    ? `<span class="chip ${chipColor[paper.source] || 'chip-gray'}">${_esc(paper.source)}</span>` : '';
  const ifChip = paper.impact_factor
    ? `<span class="chip chip-green">IF ${paper.impact_factor}</span>` : '';
  const typeChip = paper.doc_type
    ? `<span class="chip chip-gray">${_esc(paper.doc_type)}</span>` : '';

  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${sourceChip}${typeChip}${ifChip}
      </div>
      <button class="fav-btn" data-paper-id="${paper.id}"
        style="background:none;border:none;cursor:pointer;padding:2px;color:var(--text-tertiary);">
        <ion-icon name="${isBookmarked ? 'bookmark' : 'bookmark-outline'}" style="font-size:20px;"></ion-icon>
      </button>
    </div>
    <div class="paper-title">${_esc(paper.title)}</div>
    <div class="paper-meta">
      ${_esc(paper.authors || '')} · <strong>${_esc(paper.journal || '')}</strong> · ${paper.year || ''}
      ${paper.citations ? `<br>引用量 ${paper.citations.toLocaleString()}` : ''}
      ${paper.doi ? ` · DOI: ${_esc(paper.doi)}` : ''}
    </div>
    <div class="paper-abstract">${_esc((paper.abstract || '').slice(0, 200))}${paper.abstract?.length > 200 ? '…' : ''}</div>
    <div class="paper-actions">
      <button class="btn btn-secondary btn-sm ai-summary-btn" data-paper-id="${paper.id}">
        <ion-icon name="sparkles-outline" style="font-size:14px;"></ion-icon>AI 摘要
      </button>
      <button class="btn btn-secondary btn-sm cite-btn" data-paper-id="${paper.id}">
        <ion-icon name="copy-outline" style="font-size:14px;"></ion-icon>引用导出
      </button>
      ${paper.url ? `<button class="btn btn-muted btn-sm" onclick="window.open('${paper.url}', '_blank')">阅读全文</button>` : ''}
    </div>
  `;

  // 收藏按钮
  card.querySelector('.fav-btn').addEventListener('click', async function () {
    if (!Auth.isLoggedIn()) { showToast('请先登录'); return; }
    const pid  = +this.dataset.paperId;
    const icon = this.querySelector('ion-icon');
    if (_favoritedIds.has(pid)) {
      // 取消收藏
      try {
        await FavoritesAPI.removeByPaper(pid);
        _favoritedIds.delete(pid);
        icon.name = 'bookmark-outline';
        showToast('已取消收藏');
        if (window.updateNavFavCount) window.updateNavFavCount();
      } catch (e) { showToast(e.message); }
    } else {
      // 收藏
      try {
        await FavoritesAPI.add(pid);
        _favoritedIds.add(pid);
        icon.name = 'bookmark';
        showToast('已收藏');
        if (window.updateNavFavCount) window.updateNavFavCount();
      } catch (e) { showToast(e.message); }
    }
  });

  // AI 摘要按钮
  card.querySelector('.ai-summary-btn').addEventListener('click', async function () {
    showToast('AI 正在生成摘要...');
    const p = _searchResults.find(r => r.id === +this.dataset.paperId);
    if (!p) return;
    // 切换到工具页并填入
    switchTab('tab-tools');
    setTimeout(() => {
      const chatInp = document.getElementById('chat-input');
      if (chatInp) {
        chatInp.value = `请帮我总结以下论文的核心方法和主要结论：\n\n标题：${p.title}\n\n摘要：${p.abstract}`;
        document.getElementById('chat-send')?.click();
      }
    }, 600);
  });

  // 引用格式导出
  card.querySelector('.cite-btn').addEventListener('click', async function () {
    const p = _searchResults.find(r => r.id === +this.dataset.paperId);
    if (!p) return;
    const rawCite = `${p.authors}. ${p.title}[J]. ${p.journal}, ${p.year}.${p.doi ? ' DOI: ' + p.doi : ''}`;
    try {
      const { data } = await ToolsAPI.cite(rawCite, 'gbt');
      await navigator.clipboard.writeText(data.result);
      showToast('引用已复制（GB/T 7714）');
    } catch {
      // 降级复制
      await navigator.clipboard.writeText(rawCite).catch(() => {});
      showToast('原始引用已复制');
    }
  });

  return card;
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
