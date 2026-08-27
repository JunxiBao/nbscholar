// ===== 甬学阁 — 路由 & 交互 v3 =====

const PAGE_TITLES = {
  'tab-home':     '首页概览',
  'tab-search':   '学术资源检索',
  'tab-tools':    '智能工具',
  'tab-data':     '数据存缴指引',
  'tab-journal':  '期刊投稿服务',
  'tab-training': '公益培训报名',
};

const ROUTES = {
  'tab-home':     'pages/home.html',
  'tab-search':   'pages/search.html',
  'tab-tools':    'pages/tools.html',
  'tab-data':     'pages/data-deposit.html',
  'tab-journal':  'pages/journal.html',
  'tab-training': 'pages/training.html',
};

let currentTab = 'tab-home';
const cache = {};

// ===== 页面加载 =====
async function loadPage(tabId) {
  const content = document.getElementById('main-content');
  content.style.opacity = '0';

  try {
    const html = cache[tabId] ?? await (await fetch(ROUTES[tabId])).text();
    cache[tabId] = html;
    content.innerHTML = html;
    requestAnimationFrame(() => {
      content.style.transition = 'opacity 0.18s ease';
      content.style.opacity = '1';
      initPage(tabId);
    });
  } catch {
    content.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:50vh;gap:12px;color:var(--text-secondary);">
        <ion-icon name="cloud-offline-outline" style="font-size:48px;color:var(--text-tertiary);"></ion-icon>
        <p style="font-size:14px;margin:0;">页面加载失败，请确认本地服务器已启动</p>
        <button class="btn btn-secondary btn-sm" onclick="loadPage('${tabId}')">重试</button>
      </div>`;
    content.style.opacity = '1';
  }
}

// ===== 标签切换 =====
// 平台：ios 用 filled 图标激活态，android 同样切换，web 不切换
const PLATFORM = document.documentElement.getAttribute('data-platform') || 'web';
const USE_FILLED_ICONS = PLATFORM === 'ios' || PLATFORM === 'android';

function switchTab(tabId) {
  if (tabId === currentTab) return;
  currentTab = tabId;

  // 侧边栏高亮
  document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabId);
  });

  // 底部标签高亮 + 图标切换
  document.querySelectorAll('.tab-btn[data-tab]').forEach(el => {
    const isActive = el.dataset.tab === tabId;
    el.classList.toggle('active', isActive);

    if (USE_FILLED_ICONS) {
      const icon = el.querySelector('ion-icon');
      if (icon) {
        // iOS: filled 图标激活（更直观）
        // Android MD3: filled 图标激活（规范要求）
        icon.name = isActive
          ? (el.dataset.iconFilled   || el.dataset.iconOutline)
          : (el.dataset.iconOutline  || icon.name);
      }
    }
  });

  // 更新顶栏标题
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = PAGE_TITLES[tabId] ?? '';

  // 移动端关闭侧边栏
  if (window.innerWidth < 900) closeSidebar?.();

  loadPage(tabId);
}

// ===== 页面初始化分发 =====
function initPage(tabId) {
  // 通用可导航元素
  document.querySelectorAll('[data-navigate]').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.navigate), { once: true });
  });

  switch (tabId) {
    case 'tab-home':     initHome(); break;
    case 'tab-search':   initSearch(); break;
    case 'tab-tools':    initTools(); break;
    case 'tab-data':     initDeposit(); break;
    case 'tab-journal':  initJournal(); break;
    case 'tab-training': initTraining(); break;
  }
}

// ===== 首页 =====
function initHome() {
  // 数字滚动动画
  document.querySelectorAll('.stat-val[data-to]').forEach(el => {
    const target = +el.dataset.to;
    const start = performance.now();
    const dur = 900;
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.floor(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  const inp = document.getElementById('hero-search');
  const btn = document.getElementById('hero-search-btn');
  if (btn) btn.addEventListener('click', () => switchTab('tab-search'));
  if (inp) inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') switchTab('tab-search');
  });
}

// ===== 检索 =====
function initSearch() {
  document.querySelectorAll('.filter-chip[data-group]').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll(`.filter-chip[data-group="${this.dataset.group}"]`)
        .forEach(c => c.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

// ===== 智能工具 =====
function initTools() {
  const send = document.getElementById('chat-send');
  const inp  = document.getElementById('chat-input');
  const msgs = document.getElementById('chat-messages');

  if (send && inp) {
    send.addEventListener('click', () => sendChat(inp, msgs));
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(inp, msgs); }
    });
  }

  // 快捷提示词
  document.querySelectorAll('.shortcut-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const inp = document.getElementById('chat-input');
      if (inp) { inp.value = pill.dataset.prompt || pill.textContent.trim(); inp.focus(); }
    });
  });
}

function sendChat(inp, container) {
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';

  // 用户消息
  const userRow = document.createElement('div');
  userRow.className = 'msg-row user';
  userRow.innerHTML = `<div class="msg-bubble user">${escapeHtml(text)}</div>`;
  container.appendChild(userRow);

  // AI 打字中
  const aiRow = document.createElement('div');
  aiRow.className = 'msg-row';
  aiRow.innerHTML = `
    <div class="msg-avatar"><ion-icon name="sparkles-outline"></ion-icon></div>
    <div class="msg-bubble ai">
      <span class="typing-dots"><span></span><span></span><span></span></span>
    </div>`;
  container.appendChild(aiRow);
  container.scrollTop = container.scrollHeight;

  setTimeout(() => {
    aiRow.querySelector('.msg-bubble').textContent = '正在分析相关文献内容，请稍候...';
    container.scrollTop = container.scrollHeight;
  }, 1600);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ===== 数据存缴 =====
let depositStep = 2;

function initDeposit() {
  updateWizard();
  document.getElementById('deposit-next')?.addEventListener('click', () => {
    if (depositStep < 4) { depositStep++; updateWizard(); }
    else showToast('已提交存缴申请，等待平台审核');
  });
  document.getElementById('deposit-prev')?.addEventListener('click', () => {
    if (depositStep > 1) { depositStep--; updateWizard(); }
  });

  document.querySelectorAll('.quiz-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      opt.closest('.quiz-options').querySelectorAll('.quiz-opt')
        .forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
}

function updateWizard() {
  document.querySelectorAll('.w-step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 === depositStep)     s.classList.add('active');
    else if (i + 1 < depositStep)  s.classList.add('done');
  });

  const prev = document.getElementById('deposit-prev');
  const next = document.getElementById('deposit-next');
  if (prev) prev.disabled = depositStep === 1;
  if (next) next.textContent = depositStep === 4 ? '提交存缴' : '下一步 →';
}

// ===== 期刊投稿 =====
function initJournal() {
  document.getElementById('journal-match-btn')?.addEventListener('click', () => {
    const loading = document.getElementById('match-loading');
    const result  = document.getElementById('match-result');
    if (loading) loading.style.display = 'flex';
    if (result)  result.style.display  = 'none';
    setTimeout(() => {
      if (loading) loading.style.display = 'none';
      if (result)  result.style.display  = 'block';
    }, 2000);
  });

  document.getElementById('journal-segment')?.addEventListener('ionChange', e => {
    const v = e.detail.value;
    ['match','guide','check'].forEach(id => {
      const el = document.getElementById('panel-' + id);
      if (el) el.style.display = v === id ? 'block' : 'none';
    });
  });
}

// ===== 培训 =====
function initTraining() {
  document.querySelectorAll('.enroll-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      btn.innerHTML = '✓ 已报名';
      btn.style.cssText += 'background:var(--green-600)!important;cursor:default;opacity:1;';
      btn.disabled = true;
      showToast('报名成功！已添加至我的日程');
    });
  });

  document.querySelectorAll('.filter-chip[data-group]').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll(`.filter-chip[data-group="${this.dataset.group}"]`)
        .forEach(c => c.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

// ===== Toast =====
function showToast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'fadeUp 0.2s ease';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, duration);
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  // 侧边栏导航
  document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.tab));
  });
  // 底部标签
  document.querySelectorAll('.tab-btn[data-tab]').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.tab));
  });
  // 加载首页
  loadPage('tab-home');
});
