// ===== 期刊投稿 =====
function initJournal() {
  // 面板切换
  document.getElementById('journal-segment')?.addEventListener('ionChange', e => {
    const v = e.detail.value;
    ['match', 'guide', 'check'].forEach(id => {
      const el = document.getElementById('panel-' + id);
      if (el) el.style.display = v === id ? 'block' : 'none';
    });
    if (v === 'guide') _loadJournalGuide();
  });

  // 智能选刊
  document.getElementById('journal-match-btn')?.addEventListener('click', _doJournalMatch);

  // 期刊指南搜索框
  document.querySelector('#panel-guide input[type="text"]')
    ?.addEventListener('input', function () {
      _loadJournalGuide(this.value.trim());
    });

  // 期刊指南领域筛选
  document.querySelectorAll('#panel-guide .filter-chip').forEach(chip => {
    chip.addEventListener('click', function () {
      document.querySelectorAll('#panel-guide .filter-chip')
        .forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      const q = document.querySelector('#panel-guide input[type="text"]')?.value?.trim() || '';
      _loadJournalGuide(q, this.textContent.trim() === '全部学科' ? '' : this.textContent.trim());
    });
  });

  // 格式预检：上传
  const uploadArea = document.getElementById('upload-area');
  if (uploadArea) {
    uploadArea.addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.docx,.tex,.pdf';
      inp.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        uploadArea.innerHTML = `
          <ion-icon name="document-text-outline" style="font-size:40px;color:var(--green-600);"></ion-icon>
          <h4>${file.name}</h4>
          <p>${(file.size / 1024 / 1024).toFixed(2)} MB · 格式预检就绪</p>
        `;
        showToast(`文件 ${file.name} 已加载，点击"开始预检"`);
      };
      inp.click();
    });
  }
}

async function _doJournalMatch() {
  const titleEl    = document.querySelector('#panel-match input[type="text"]');
  const abstractEl = document.querySelector('#panel-match textarea');
  const ifSel      = document.querySelectorAll('#panel-match select')[0];

  const title    = titleEl?.value?.trim() || '';
  const abstract = abstractEl?.value?.trim() || '';

  if (!title && !abstract) { showToast('请输入论文标题或摘要'); return; }

  const loading   = document.getElementById('match-loading');
  const resultDiv = document.getElementById('match-result');
  if (loading)   loading.style.display = 'flex';
  if (resultDiv) resultDiv.style.display = 'none';

  const ifMap = { '不限': 0, 'IF > 5': 5, 'IF 2–5': 2, 'IF 1–2': 1 };
  const ifMin = ifMap[ifSel?.value] || 0;

  try {
    const { data } = await JournalAPI.match(title, abstract, { if_min: ifMin });
    if (loading)   loading.style.display = 'none';
    if (resultDiv) {
      resultDiv.style.display = 'block';
      _renderMatchResults(data.matches);
    }
    if (data.warn) showToast(data.warn);
  } catch (e) {
    if (loading) loading.style.display = 'none';
    showToast(`选刊失败：${e.message}`);
  }
}

function _renderMatchResults(matches) {
  const resultDiv = document.getElementById('match-result');
  if (!resultDiv) return;

  const countEl = resultDiv.querySelector('span[style*="font-weight:400"]');
  if (countEl) countEl.textContent = `共 ${matches.length} 个匹配`;

  const listEl = resultDiv.querySelector('[style*="border-radius"]');
  if (!listEl) return;

  listEl.innerHTML = matches.map(j => {
    const scoreColor = j.match_score >= 90 ? 'chip-green' : j.match_score >= 75 ? 'chip-amber' : 'chip-gray';
    const bgColor = '#EFF6FF';
    return `
      <div class="list-row" onclick="${j.url ? `window.open('${j.url}','_blank')` : `showToast('查看 ${_esc(j.name)} 投稿指南')`}">
        <div style="width:40px;height:40px;border-radius:var(--r-md);background:${bgColor};
          display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;font-weight:700;">
          ${j.logo_char || j.name.slice(0, 1)}
        </div>
        <div class="list-text">
          <div class="list-title">${_esc(j.name)}</div>
          <div class="list-subtitle">
            ${_esc(j.publisher || '')} · IF: ${j.impact_factor || 'N/A'} · ${j.quartile || ''} · 
            审稿 ${j.review_weeks || '?'} · ${j.page_charge || ''}
          </div>
          ${j.reason ? `<div style="font-size:11px;color:var(--text-tertiary);margin-top:2px;">${_esc(j.reason)}</div>` : ''}
        </div>
        <span class="chip ${scoreColor}" style="flex-shrink:0;">${j.match_score}%</span>
        <ion-icon name="chevron-forward" class="list-chevron"></ion-icon>
      </div>
    `;
  }).join('');
}

async function _loadJournalGuide(q = '', field = '') {
  const listEl = document.querySelector('#panel-guide [style*="overflow:hidden"]');
  if (!listEl) return;

  listEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px;">加载中...</div>';

  try {
    const params = { per_page: 20 };
    if (q)     params.q = q;
    if (field) params.field = field;
    const { data } = await JournalAPI.list(params);

    listEl.innerHTML = data.journals.map(j => {
      const charBg = ['#1C1C1E','#DC2626','#D97706','#2563EB','#7C3AED','#059669'];
      const bg     = charBg[j.id % charBg.length];
      return `
        <div class="list-row" onclick="${j.url ? `window.open('${j.url}','_blank')` : `showToast('查看 ${_esc(j.name)} 投稿指南')`}">
          <div style="width:40px;height:40px;border-radius:var(--r-md);background:${bg};
            display:flex;align-items:center;justify-content:center;flex-shrink:0;
            font-size:${j.logo_char?.length > 1 ? '13px' : '18px'};color:white;font-weight:700;">
            ${_esc(j.logo_char || j.name.slice(0,1))}
          </div>
          <div class="list-text">
            <div class="list-title">${_esc(j.name)}</div>
            <div class="list-subtitle">IF: ${j.impact_factor || 'N/A'} · ${_esc(j.field || '')} · 审稿 ${j.review_weeks || '?'}</div>
          </div>
          <ion-icon name="chevron-forward" class="list-chevron"></ion-icon>
        </div>
      `;
    }).join('');

    if (!data.journals.length) {
      listEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px;">未找到匹配期刊</div>';
    }
  } catch (e) {
    listEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px;">加载失败：${e.message}</div>`;
  }
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
