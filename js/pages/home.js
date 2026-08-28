// ===== 首页 =====
function initHome() {
  // 问候语
  const hour = new Date().getHours();
  let greeting = '晚上好';
  if (hour >= 5 && hour < 12)      greeting = '早上好';
  else if (hour >= 12 && hour < 14) greeting = '中午好';
  else if (hour >= 14 && hour < 18) greeting = '下午好';
  const greetingEl = document.getElementById('greeting-text');
  if (greetingEl) greetingEl.textContent = greeting;

  // 渲染动态用户信息
  if (window.updateUserInfoUI) window.updateUserInfoUI();

  // 搜索跳转
  const inp = document.getElementById('hero-search');
  const btn = document.getElementById('hero-search-btn');
  if (btn) btn.addEventListener('click', () => switchTab('tab-search'));
  if (inp) inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') switchTab('tab-search');
  });

  // 从 API 加载统计数据
  _loadHomeStats();
  // 加载最近检索
  _loadRecentHistory();
  // 加载收藏预览
  _loadFavoritesPreview();
  // 加载近期日程
  _loadEnrolledEvents();
}

// 数字滚动动画
function _animateStat(el, target) {
  const dur   = 900;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.floor(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function _loadHomeStats() {
  if (!window.UserAPI || !Auth.isLoggedIn()) return;

  try {
    const { data } = await UserAPI.getStats();
    const map = {
      history_count:    0,
      favorites_count:  1,
      enrollment_count: 2,
    };
    const cards = document.querySelectorAll('.stat-val');
    Object.entries(map).forEach(([key, idx]) => {
      if (cards[idx] && data[key] !== undefined) {
        _animateStat(cards[idx], data[key]);
      }
    });
  } catch (e) {
    // 保持占位动画，不影响界面
    console.warn('Stats load failed:', e.message);
  }
}

async function _loadRecentHistory() {
  if (!window.HistoryAPI || !Auth.isLoggedIn()) return;

  try {
    const { data } = await HistoryAPI.list({ limit: 3 });
    const container = document.querySelector('.list-group.fade-up.d3');
    if (!container || !data.history.length) return;

    container.innerHTML = data.history.map(h => `
      <div class="list-row" onclick="switchTab('tab-search')">
        <ion-icon name="time-outline" style="color:var(--text-tertiary);font-size:18px;flex-shrink:0;"></ion-icon>
        <div class="list-text"><div class="list-title">${_esc(h.keyword)}</div></div>
        <ion-icon name="chevron-forward" class="list-chevron"></ion-icon>
      </div>
    `).join('');
  } catch (e) {
    console.warn('History load failed:', e.message);
  }
}

async function _loadFavoritesPreview() {
  if (!window.FavoritesAPI || !Auth.isLoggedIn()) return;

  try {
    const { data } = await FavoritesAPI.list({ limit: 1 });
    const sec = document.querySelector('.section-label.fade-up.d4 .section-label-action');
    if (sec && data.total) sec.textContent = `全部 ${data.total} 篇`;

    const card = document.querySelector('.paper-card.fade-up.d4');
    if (!card || !data.favorites.length) return;

    const fav = data.favorites[0];
    card.innerHTML = `
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <span class="chip chip-blue">${_esc(fav.source || '文献')}</span>
        ${fav.impact_factor ? `<span class="chip chip-green">IF ${fav.impact_factor}</span>` : ''}
      </div>
      <div class="paper-title">${_esc(fav.title)}</div>
      <div class="paper-meta">${_esc(fav.authors || '')} · ${_esc(fav.journal || '')} · ${fav.year || ''}</div>
      <div class="paper-abstract">${_esc((fav.abstract || '').slice(0, 100))}…</div>
      <div class="paper-actions">
        <button class="btn btn-muted btn-sm" onclick="switchTab('tab-favorites')">查看收藏夹</button>
      </div>
    `;
  } catch (e) {
    console.warn('Favorites preview load failed:', e.message);
  }
}

function _esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function _loadEnrolledEvents() {
  if (!window.TrainingAPI || !Auth.isLoggedIn()) return;
  const container = document.getElementById('home-enrolled-events');
  if (!container) return;

  try {
    const { data } = await TrainingAPI.myEvents();
    if (!data.enrollments || data.enrollments.length === 0) {
      container.innerHTML = `<div style="text-align:center; display:flex; align-items:center; justify-content:center; min-height:100px; font-size:13px; color:var(--text-tertiary);">暂无近期日程安排</div>`;
      return;
    }

    // 只展示最近的 3 个
    const topEvents = data.enrollments.slice(0, 3);
    let html = '';
    
    topEvents.forEach(ev => {
      const dt = new Date(ev.start_time);
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      const hh = String(dt.getHours()).padStart(2, '0');
      const mm = String(dt.getMinutes()).padStart(2, '0');
      const timeStr = `${m}/${d} ${hh}:${mm}`;
      
      let iconName = 'videocam-outline';
      if (ev.event_type && !ev.event_type.includes('线上')) {
        iconName = 'location-outline';
      }

      html += `
        <div class="list-row" onclick="switchTab('tab-training')">
          <div class="list-icon" style="background:${ev.color || 'var(--blue-600)'};"><ion-icon name="${iconName}"></ion-icon></div>
          <div class="list-text">
            <div class="list-title" style="font-size:14px;">${_esc(ev.title)}</div>
            <div class="list-subtitle">${timeStr} · ${_esc(ev.platform || ev.location || '未知地点')}</div>
          </div>
          <span class="chip chip-green" style="font-size:11px;">已报名</span>
        </div>
      `;
    });
    
    container.innerHTML = html;
  } catch (e) {
    console.warn('Enrolled events load failed:', e.message);
    container.innerHTML = `<div style="text-align:center; padding:30px; font-size:13px; color:var(--text-tertiary);">加载失败</div>`;
  }
}
