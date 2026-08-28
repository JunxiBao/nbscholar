// ===== 甬学阁 — 路由 & 交互 v3 =====

const PAGE_TITLES = {
  'tab-home':     '首页概览',
  'tab-search':   '学术资源检索',
  'tab-tools':    '智能工具',
  'tab-data':     '数据存缴指引',
  'tab-journal':  '期刊投稿服务',
  'tab-training': '公益培训报名',
  'tab-favorites': '收藏夹',
  'tab-history': '检索历史',
  'tab-settings': '偏好设置',
};

const ROUTES = {
  'tab-home':     'pages/home.html',
  'tab-search':   'pages/search.html',
  'tab-tools':    'pages/tools.html',
  'tab-data':     'pages/data-deposit.html',
  'tab-journal':  'pages/journal.html',
  'tab-training': 'pages/training.html',
  'tab-favorites': 'pages/favorites.html',
  'tab-history': 'pages/history.html',
  'tab-settings': 'pages/settings.html',
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

  updateIndicators();

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
    case 'tab-settings': initSettings(); break;
  }
}

function initSettings() {
  const select = document.getElementById('theme-select');
  if (select) {
    select.value = localStorage.getItem('theme') || 'system';
    select.addEventListener('change', (e) => {
      if (window.setTheme) {
        window.setTheme(e.target.value);
      }
    });
  }
}

// ===== 侧边栏收藏数更新 =====
window.updateNavFavCount = async function() {
  const countEl = document.getElementById('nav-fav-count');
  if (!countEl) return;
  if (!window.Auth || !Auth.isLoggedIn()) {
    countEl.style.display = 'none';
    return;
  }
  try {
    const { data } = await FavoritesAPI.list({ limit: 1 });
    if (data.total > 0) {
      countEl.textContent = data.total;
      countEl.style.display = 'inline-flex';
    } else {
      countEl.style.display = 'none';
    }
  } catch (e) {
    countEl.style.display = 'none';
  }
};

// ===== Toast =====
function showToast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'toastFadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
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
  // 加载首页并触发高亮动画
  currentTab = null;
  switchTab('tab-home');
  
  if (window.updateNavFavCount) window.updateNavFavCount();
});

function updateIndicators() {
  if (!currentTab) return;
  // 底部滑块动画
  const indicator = document.getElementById('tab-indicator');
  if (indicator) {
    const tabs = Array.from(document.querySelectorAll('.bottom-tabs .tab-btn'));
    const index = tabs.findIndex(t => t.dataset.tab === currentTab);
    if (index !== -1) {
      indicator.style.transform = `translateX(${index * 100}%)`;
      indicator.className = `tab-indicator ${currentTab}`;
    }
  }

  // 侧边栏滑块动画
  const sidebarIndicator = document.getElementById('sidebar-indicator');
  if (sidebarIndicator) {
    const activeNavItem = document.querySelector(`.nav-item[data-tab="${currentTab}"]`);
    if (activeNavItem) {
      sidebarIndicator.style.transform = `translateY(${activeNavItem.offsetTop}px)`;
      sidebarIndicator.style.height = `${activeNavItem.offsetHeight}px`;
      sidebarIndicator.className = `sidebar-indicator ${currentTab}`;
    }
  }
}

window.addEventListener('load', updateIndicators);
window.addEventListener('resize', updateIndicators);

// ===== Popover Logic =====
function toggleUserPopover(event) {
  const popover = document.getElementById('user-popover');
  if (!popover) return;
  if (event) {
    event.stopPropagation();
    
    if (popover.classList.contains('show')) {
      popover.classList.remove('show');
      return;
    }
    
    const rect = event.currentTarget.getBoundingClientRect();
    popover.classList.add('show'); // Add show class first to get dimensions
    const popWidth = popover.offsetWidth || 150;
    
    let leftPos = rect.left;
    if (leftPos + popWidth > window.innerWidth) {
      leftPos = window.innerWidth - popWidth - 16;
    }
    
    popover.style.top = (rect.bottom + 16) + 'px'; // Increased gap from menu bar
    popover.style.left = leftPos + 'px';
  } else {
    popover.classList.remove('show');
  }
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-popover') && !e.target.closest('.avatar') && !e.target.closest('.sidebar-user')) {
    const popover = document.getElementById('user-popover');
    if (popover) popover.classList.remove('show');
  }
});
