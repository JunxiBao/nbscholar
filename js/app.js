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

  if (tabId === 'tab-home'    && window.initHome)    initHome();
  if (tabId === 'tab-search'  && window.initSearch)  initSearch();
  if (tabId === 'tab-tools'    && window.initTools)    initTools();
  if (tabId === 'tab-data'     && window.initDeposit)  initDeposit();
  if (tabId === 'tab-journal'  && window.initJournal)  initJournal();
  if (tabId === 'tab-training' && window.initTraining) initTraining();
  if (tabId === 'tab-settings' && window.initSettings) initSettings();
  
  // 初始化历史页面事件
  if (tabId === 'tab-history') {
    const clearBtn = document.getElementById('hist-clear-btn');
    if (clearBtn) {
      clearBtn.onclick = async () => {
        if (!confirm('确定要清空所有检索历史吗？')) return;
        try {
          await HistoryAPI.clear();
          showToast('历史已清空');
          document.getElementById('hist-list').innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 16px;gap:12px;color:var(--text-tertiary);">
              <ion-icon name="time-outline" style="font-size:48px;"></ion-icon>
              <p style="font-size:14px;margin:0;">暂无检索记录</p>
            </div>`;
        } catch (e) { showToast('清空失败: ' + e.message); }
      };
    }
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

  // 头像上传逻辑
  const avWrapper = document.getElementById('settings-avatar-wrapper');
  const avInput = document.getElementById('settings-avatar-input');
  if (avWrapper && avInput) {
    avWrapper.onclick = () => avInput.click();
    avInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showToast('图片大小不能超过 5MB');
        e.target.value = '';
        return;
      }
      const img = document.getElementById('settings-crop-img');
      if (img) {
        if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
        img.src = URL.createObjectURL(file);
        document.getElementById('settings-crop-modal').style.display = 'flex';
        if (window.settingsCropper) window.settingsCropper.destroy();
        window.settingsCropper = new Cropper(img, {
          aspectRatio: 1,
          viewMode: 1,
          autoCropArea: 0.85, guides: true, center: true,
          highlight: false, cropBoxMovable: true, cropBoxResizable: true,
        });
      }
    };
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = () => Auth.logout();
  }

  let deleteStep = 0;
  const delBtn = document.getElementById('delete-account-btn');
  const confirmModal = document.getElementById('delete-confirm-modal');
  const titleEl = document.getElementById('delete-modal-title');
  const descEl = document.getElementById('delete-modal-desc');
  const confirmBtn = document.getElementById('delete-modal-confirm-btn');

  window.closeDeleteModal = () => {
    if (confirmModal) confirmModal.style.display = 'none';
  };

  if (delBtn && confirmModal) {
    delBtn.onclick = () => {
      deleteStep = 1;
      titleEl.textContent = '危险操作确认';
      descEl.textContent = '您确定要注销账号并删除所有相关数据吗？此操作不可逆！';
      confirmBtn.textContent = '确定注销';
      confirmModal.style.display = 'flex';
    };
  }

  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      if (deleteStep === 1) {
        deleteStep = 2;
        titleEl.textContent = '最后一次确认';
        descEl.textContent = '注销后将无法找回任何数据，是否继续？';
        confirmBtn.textContent = '狠心注销';
      } else if (deleteStep === 2) {
        window.closeDeleteModal();
        try {
          const res = await Auth.deleteAccount();
          showToast(res.msg || '账号已成功注销');
          setTimeout(() => Auth.logout(), 1500);
        } catch (err) {
          showToast('注销失败：' + err.message);
        }
      }
    };
  }

  // 确保动态加载 settings.html 后渲染数据
  if (window.updateUserInfoUI) window.updateUserInfoUI();
}

window.settingsCropper = null;

window.closeSettingsCropModal = () => {
  document.getElementById('settings-crop-modal').style.display = 'none';
  if (window.settingsCropper) { window.settingsCropper.destroy(); window.settingsCropper = null; }
  const avInput = document.getElementById('settings-avatar-input');
  if (avInput) avInput.value = ''; // clear
};

window.confirmSettingsCrop = async () => {
  if (!window.settingsCropper) return;
  const canvas = window.settingsCropper.getCroppedCanvas({ width: 256, height: 256, fillColor: '#fff' });
  const base64Str = canvas.toDataURL('image/webp', 0.8);
  window.closeSettingsCropModal();
  
  try {
    await Auth.updateProfile({ avatar_url: base64Str });
    showToast('头像已更新');
    if (window.updateUserInfoUI) window.updateUserInfoUI();
  } catch (err) {
    showToast('头像更新失败：' + err.message);
  }
};

// ===== 个人资料修改弹窗逻辑 =====
let currentEditField = null;

window.closeEditModal = () => {
  const m = document.getElementById('edit-profile-modal');
  if (m) m.style.display = 'none';
};

window.openEditModal = (field, title, defaultValue) => {
  currentEditField = field;
  document.getElementById('edit-profile-title').textContent = title;
  const input = document.getElementById('edit-profile-input');
  input.value = defaultValue;
  document.getElementById('edit-profile-modal').style.display = 'flex';
  setTimeout(() => input.focus(), 100);
};

document.getElementById('edit-profile-save-btn')?.addEventListener('click', async () => {
  const val = document.getElementById('edit-profile-input').value.trim();
  if (!val && currentEditField !== 'institution') return showToast('内容不能为空');
  
  if (currentEditField === 'age') {
    if (!/^\d+$/.test(val)) return showToast('年龄必须为数字');
  }

  try {
    await Auth.updateProfile({ [currentEditField]: val });
    showToast('修改成功');
    window.closeEditModal();
    if (window.updateUserInfoUI) window.updateUserInfoUI();
  } catch (err) {
    showToast('修改失败：' + err.message);
  }
});

window.editInstitution = () => {
  const user = Auth.getUser();
  if (user) window.openEditModal('institution', '修改所属机构', user.institution || '');
};

window.editAge = () => {
  const user = Auth.getUser();
  if (user) window.openEditModal('age', '修改年龄', user.age || '');
};

// ===== 修改密码弹窗逻辑 =====
window.closePwdModal = () => {
  const m = document.getElementById('edit-pwd-modal');
  if (m) m.style.display = 'none';
};

window.openPwdModal = () => {
  document.getElementById('edit-new-pwd').value = '';
  document.getElementById('edit-confirm-pwd').value = '';
  document.getElementById('edit-pwd-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('edit-new-pwd').focus(), 100);
};

document.getElementById('edit-pwd-save-btn')?.addEventListener('click', async () => {
  const p1 = document.getElementById('edit-new-pwd').value;
  const p2 = document.getElementById('edit-confirm-pwd').value;
  
  if (!p1 || p1.length < 6) return showToast('新密码长度不能少于 6 位');
  if (p1 !== p2) return showToast('两次输入的密码不一致');
  
  try {
    const res = await Auth.updatePassword(p1);
    showToast(res.msg || '密码修改成功，请重新登录');
    window.closePwdModal();
    setTimeout(() => Auth.logout(), 1500);
  } catch (err) {
    showToast('修改失败：' + err.message);
  }
});

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

// ===== 动态更新用户信息 UI =====
function _generateTextAvatar(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  
  const colors = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#059669', '#ea580c'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  ctx.fillStyle = colors[sum % colors.length];
  ctx.fillRect(0, 0, 120, 120);
  
  ctx.font = 'bold 54px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.charAt(0).toUpperCase(), 60, 64);
  
  return canvas.toDataURL('image/png');
}

window.updateUserInfoUI = function() {
  if (!window.Auth) return;
  const user = Auth.getUser();
  if (!user) return;
  
  const name = user.name || user.account || '用户';
  const inst = user.institution || '未绑定机构';
  
  let avatar = user.avatar_url;
  // 如果保存的是以 /api 开头的相对路径，需要拼接成完整 URL
  if (avatar && avatar.startsWith('/api')) {
    if (typeof API_BASE !== 'undefined') avatar = API_BASE + avatar;
  } else if (!avatar || (!avatar.startsWith('data:') && !avatar.startsWith('http'))) {
    avatar = _generateTextAvatar(name);
  }

  // Sidebar
  const sName = document.getElementById('sidebar-name');
  if (sName) sName.textContent = name;
  const sInst = document.getElementById('sidebar-institution');
  if (sInst) sInst.textContent = inst;
  const sAvatar = document.getElementById('sidebar-avatar');
  if (sAvatar) sAvatar.src = avatar;

  // Home Page
  const hName = document.getElementById('greeting-name');
  if (hName) hName.textContent = name;
  const hInst = document.getElementById('home-institution');
  if (hInst) hInst.textContent = inst;
  const hAvatar = document.getElementById('home-avatar');
  if (hAvatar) hAvatar.src = avatar;

  // Settings Page
  const set_Name = document.getElementById('settings-name');
  if (set_Name) set_Name.textContent = name;
  const set_Inst = document.getElementById('settings-institution');
  if (set_Inst) set_Inst.textContent = inst;
  const set_Age = document.getElementById('settings-age');
  if (set_Age) set_Age.textContent = user.age || '-';
  
  const set_AvImg = document.getElementById('settings-avatar-img');
  const set_AvIcon = document.getElementById('settings-avatar-icon');
  const set_AvWrapper = document.getElementById('settings-avatar-wrapper');
  if (set_AvImg && set_AvIcon && set_AvWrapper) {
    set_AvImg.src = avatar;
    set_AvImg.style.display = 'block';
    set_AvIcon.style.display = 'none';
    set_AvWrapper.style.background = 'transparent';
  }
};

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', async () => {
  // 强制登录拦截：如果未登录，直接跳转到登录页
  if (!window.Auth || !Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
  
  // 每次刷新阻塞式鉴别账号是否还存在且正常，如被注销 api.js 会拦截并抛出错误
  try {
      await UserAPI.getMe();
  } catch (e) {
      return; // 账号异常，停止加载后续页面内容
  }

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
  if (window.updateUserInfoUI) window.updateUserInfoUI();
});

function updateIndicators() {
  if (!currentTab) return;
  // 底部滑块动画
  const indicator = document.getElementById('tab-indicator');
  if (indicator) {
    const tabs = Array.from(document.querySelectorAll('.bottom-tabs .tab-btn'));
    const index = tabs.findIndex(t => t.dataset.tab === currentTab);
    if (index !== -1) {
      const isFirst = !indicator.style.transform;
      if (isFirst) indicator.style.transition = 'none';
      indicator.style.transform = `translateX(${index * 100}%)`;
      indicator.className = `tab-indicator ${currentTab}`;
      if (isFirst) {
        indicator.offsetHeight; // force reflow
        indicator.style.transition = '';
      }
    }
  }

  // 侧边栏滑块动画
  const sidebarIndicator = document.getElementById('sidebar-indicator');
  if (sidebarIndicator) {
    const activeNavItem = document.querySelector(`.nav-item[data-tab="${currentTab}"]`);
    if (activeNavItem) {
      const isFirst = !sidebarIndicator.style.transform;
      if (isFirst) sidebarIndicator.style.transition = 'none';
      sidebarIndicator.style.transform = `translateY(${activeNavItem.offsetTop}px)`;
      sidebarIndicator.style.height = `${activeNavItem.offsetHeight}px`;
      sidebarIndicator.className = `sidebar-indicator ${currentTab}`;
      if (isFirst) {
        sidebarIndicator.offsetHeight; // force reflow
        sidebarIndicator.style.transition = '';
      }
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
