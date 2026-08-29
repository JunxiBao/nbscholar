// js/pages/superadmin_dashboard.js

const API_BASE = 'http://localhost:5000';

function showToast(msg, type='info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.color = '#fff';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '500';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    
    if(type === 'success') toast.style.background = '#10B981';
    else if(type === 'error') toast.style.background = '#EF4444';
    else toast.style.background = '#3B82F6';
    
    toast.textContent = msg;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.showConfirm = function(title, msg) {
    return new Promise(resolve => {
        const overlay = document.getElementById('custom-confirm-overlay');
        document.getElementById('custom-confirm-title').textContent = title;
        document.getElementById('custom-confirm-msg').textContent = msg;
        
        const btnOk = document.getElementById('custom-confirm-ok');
        const btnCancel = document.getElementById('custom-confirm-cancel');
        
        const cleanup = () => {
            overlay.style.display = 'none';
            btnOk.onclick = null;
            btnCancel.onclick = null;
        };
        
        btnOk.onclick = () => { cleanup(); resolve(true); };
        btnCancel.onclick = () => { cleanup(); resolve(false); };
        
        overlay.style.display = 'flex';
    });
};

// ---------------------------------
// Auth Logic
// ---------------------------------
function togglePasswordVisibility(inputId, toggleBtn) {
  const input = document.getElementById(inputId);
  const icon  = toggleBtn.querySelector('ion-icon');
  if (input.type === 'password') {
    input.type = 'text';  icon.name = 'eye-outline';
  } else {
    input.type = 'password'; icon.name = 'eye-off-outline';
  }
}

async function doAdminLogin() {
    const acc = document.getElementById('admin-login-account').value.trim();
    const pwd = document.getElementById('admin-login-pwd').value;
    if(!acc || !pwd) return showToast('请输入账号和密码', 'error');
    
    try {
        const res = await fetch(`${API_BASE}/api/admin_auth/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({account: acc, password: pwd})
        });
        const data = await res.json();
        if(data.code === 0) {
            if (data.data.admin.role !== 'super_admin') {
                return showToast('无权访问超级管理控制台', 'error');
            }
            localStorage.setItem('superAdminToken', data.data.token);
            localStorage.setItem('superAdminInfo', JSON.stringify(data.data.admin));
            showToast('登录成功', 'success');
            checkAdminAuth();
        } else {
            showToast((data.msg || '操作失败'), 'error');
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

function logoutAdmin() {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminInfo');
    checkAdminAuth();
}

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

let _authTimeout = null;

function checkAdminAuth() {
    const token = localStorage.getItem('superAdminToken');
    if(token) {
        const payload = parseJwt(token);
        if (payload && payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            const remain = payload.exp - now;
            if (remain <= 0) {
                logoutAdmin();
                showToast('登录已过期，请重新登录', 'error');
                return;
            } else {
                if (_authTimeout) clearTimeout(_authTimeout);
                _authTimeout = setTimeout(() => {
                    logoutAdmin();
                    showToast('登录状态已过期，请重新登录', 'error');
                }, remain * 1000);
            }
        }

        document.getElementById('auth-layer').style.display = 'none';
        document.getElementById('app-shell').style.display = 'flex';
        updateUserInfoUI();
        loadDashboardData();
        setTimeout(updateIndicators, 100);
    } else {
        if (_authTimeout) clearTimeout(_authTimeout);
        document.getElementById('auth-layer').style.display = 'flex';
        document.getElementById('app-shell').style.display = 'none';
    }
}

async function loadDashboardData() {
    // 优先并行拉取待审批和历史统计，确保所有数据统计即时显示
    await Promise.all([
        loadPendingAdmins(),
        fetchHistoryStats()
    ]);
}

async function fetchHistoryStats() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/history`, {
            headers: {'Authorization': 'Bearer ' + localStorage.getItem('superAdminToken')}
        });
        const data = await res.json();
        if(data.code === 0) {
            const statHistory = document.getElementById('stat-history-cnt');
            if (statHistory) statHistory.textContent = data.data.admins.length;
            if (currentSuperTab === 'history') {
                renderHistoryList(data.data.admins);
            }
        }
    } catch(e) {
        console.error('Fetch history stats error:', e);
    }
}

// ---------------------------------
// Dashboard Logic
// ---------------------------------
let currentSuperTab = 'pending';

function switchSuperTab(tabId) {
    currentSuperTab = tabId;
    
    // 更新侧边栏导航高亮
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tabId);
    });

    // 更新底部导航高亮
    document.querySelectorAll('.bottom-tabs .tab-btn').forEach(el => {
        const isActive = el.dataset.tab === tabId;
        el.classList.toggle('active', isActive);
        const icon = el.querySelector('ion-icon');
        if (icon) {
            icon.name = isActive
                ? (el.dataset.iconFilled || el.dataset.iconOutline)
                : (el.dataset.iconOutline || icon.name);
        }
    });
    
    // 更新顶部标题
    const topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle) {
        topbarTitle.textContent = tabId === 'pending' ? '待审批申请' : '审批记录';
    }
    
    // 切换内容区域
    const secPending = document.getElementById('section-pending');
    const secHistory = document.getElementById('section-history');
    if (secPending) secPending.style.display = tabId === 'pending' ? 'block' : 'none';
    if (secHistory) secHistory.style.display = tabId === 'history' ? 'block' : 'none';
    
    if (tabId === 'pending') {
        loadPendingAdmins();
    } else {
        loadHistoryAdmins();
    }
    
    updateIndicators();
}

async function loadPendingAdmins() {
    const container = document.getElementById('pending-list');
    container.innerHTML = '<div style="padding:20px; color:var(--text-sub);">加载中...</div>';
    
    try {
        const res = await fetch(`${API_BASE}/api/admin/pending`, {
            headers: {'Authorization': 'Bearer ' + localStorage.getItem('superAdminToken')}
        });
        const data = await res.json();
        if(data.code === 0) {
            renderPendingList(data.data.admins);
        } else if (data.code === 401) {
            logoutAdmin();
        } else {
            showToast((data.msg || '操作失败'), 'error');
            container.innerHTML = `<div style="color:#EF4444;">${(data.msg || '操作失败')}</div>`;
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

function renderPendingList(admins) {
    const container = document.getElementById('pending-list');
    const label = document.getElementById('pending-count-label');
    const statPending = document.getElementById('stat-pending-cnt');
    if (statPending) statPending.textContent = admins.length;
    if (label) label.textContent = `共 ${admins.length} 条`;

    if(admins.length === 0) {
        container.innerHTML = `
            <div class="paper-card fade-up d3" style="text-align:center; padding:48px 16px; color:var(--text-tertiary);">
                <ion-icon name="checkmark-done-circle-outline" style="font-size:44px; color:var(--green-500); margin-bottom:8px; display:block; margin-left:auto; margin-right:auto;"></ion-icon>
                <div style="font-size:15px; font-weight:600; color:var(--text-primary);">全部处理完毕</div>
                <div style="font-size:13px; color:var(--text-secondary); margin-top:4px;">当前暂无待审批的管理员申请</div>
            </div>`;
        return;
    }
    
    let html = '';
    admins.forEach((a, i) => {
        const animDelay = (i % 4) + 1;
        html += `
        <div class="paper-card fade-up d${animDelay}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div class="list-icon" style="background:var(--blue-500);width:38px;height:38px;border-radius:50%;">
                        <ion-icon name="person-outline"></ion-icon>
                    </div>
                    <div>
                        <div style="font-size:15px;font-weight:600;color:var(--text-primary);">${a.account}</div>
                        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">申请时间 · ${a.created_at}</div>
                    </div>
                </div>
                <span class="chip chip-blue">待审批</span>
            </div>
            ${a.remark ? `<div style="font-size:13px;color:var(--text-secondary);background:var(--bg-input);padding:8px 12px;border-radius:var(--r-md);margin:10px 0;line-height:1.5;">申请备注：${a.remark}</div>` : ''}
            <div class="paper-actions" style="margin-top:12px;">
                <button class="btn btn-primary btn-sm" style="flex:1;" onclick="approveAdmin(${a.id}, 'approved')"><ion-icon name="checkmark-outline"></ion-icon> 同意申请</button>
                <button class="btn btn-muted btn-sm" style="flex:1;" onclick="approveAdmin(${a.id}, 'rejected')"><ion-icon name="close-outline"></ion-icon> 拒绝申请</button>
            </div>
        </div>
        `;
    });
    container.innerHTML = html;
}

async function loadHistoryAdmins() {
    const container = document.getElementById('history-list');
    container.innerHTML = '<div style="grid-column:1/-1; padding:20px; text-align:center; color:var(--text-tertiary);">加载中...</div>';
    
    try {
        const res = await fetch(`${API_BASE}/api/admin/history`, {
            headers: {'Authorization': 'Bearer ' + localStorage.getItem('superAdminToken')}
        });
        const data = await res.json();
        if(data.code === 0) {
            renderHistoryList(data.data.admins);
        } else if (data.code === 401) {
            logoutAdmin();
        } else {
            showToast((data.msg || '操作失败'), 'error');
            container.innerHTML = `<div style="grid-column:1/-1; color:#EF4444; text-align:center;">${(data.msg || '操作失败')}</div>`;
        }
    } catch(e) {
        showToast('网络错误', 'error');
        container.innerHTML = `<div style="grid-column:1/-1; color:#EF4444; text-align:center;">网络错误</div>`;
    }
}

function renderHistoryList(admins) {
    const container = document.getElementById('history-list');
    const label = document.getElementById('history-count-label');
    const statHistory = document.getElementById('stat-history-cnt');
    if (statHistory) statHistory.textContent = admins.length;
    if (label) label.textContent = `共 ${admins.length} 条`;

    if(admins.length === 0) {
        container.innerHTML = `
            <div class="paper-card fade-up d3" style="text-align:center; padding:48px 16px; color:var(--text-tertiary);">
                <ion-icon name="time-outline" style="font-size:44px; color:var(--text-tertiary); margin-bottom:8px; display:block; margin-left:auto; margin-right:auto;"></ion-icon>
                <div style="font-size:15px; font-weight:600; color:var(--text-primary);">暂无历史审批记录</div>
                <div style="font-size:13px; color:var(--text-secondary); margin-top:4px;">处理过的申请将展示在此处</div>
            </div>`;
        return;
    }
    
    let html = '';
    admins.forEach((a, i) => {
        const isApproved = a.status === 'approved';
        const animDelay = (i % 4) + 1;
        html += `
        <div class="paper-card fade-up d${animDelay}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div class="list-icon" style="background:${isApproved ? 'var(--green-500)' : 'var(--red-500)'};width:38px;height:38px;border-radius:50%;">
                        <ion-icon name="${isApproved ? 'checkmark-outline' : 'close-outline'}"></ion-icon>
                    </div>
                    <div>
                        <div style="font-size:15px;font-weight:600;color:var(--text-primary);">${a.account}</div>
                        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">处理时间 · ${a.created_at}</div>
                    </div>
                </div>
                <span class="chip ${isApproved ? 'chip-green' : 'chip-red'}">${isApproved ? '已同意' : '已拒绝'}</span>
            </div>
            ${a.remark ? `<div style="font-size:13px;color:var(--text-secondary);background:var(--bg-input);padding:8px 12px;border-radius:var(--r-md);margin:10px 0;line-height:1.5;">申请备注：${a.remark}</div>` : ''}
            <div class="paper-actions" style="margin-top:12px;">
                <button class="btn btn-muted btn-sm" style="flex:1;" onclick="revokeApproval(${a.id})"><ion-icon name="arrow-undo-outline"></ion-icon> 撤回重审</button>
                <button class="btn btn-muted btn-sm" style="flex:1; color:var(--red-500);" onclick="deleteAdminAccount(${a.id})"><ion-icon name="trash-outline"></ion-icon> 注销账号</button>
            </div>
        </div>
        `;
    });
    container.innerHTML = html;
}

async function deleteAdminAccount(id) {
    const isOk = await showConfirm('确认注销', '注销后该账号将从数据库彻底删除，无法再登录。确定注销吗？');
    if(!isOk) return;
    
    try {
        const res = await fetch(`${API_BASE}/api/admin/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('superAdminToken')
            }
        });
        const data = await res.json();
        if(data.code === 0) {
            showToast('账号已彻底注销', 'success');
            loadDashboardData();
        } else {
            showToast((data.msg || '操作失败'), 'error');
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

async function revokeApproval(id) {
    const isOk = await showConfirm('确认撤回', '撤回后该申请将回到“待审批”列表，确定撤回吗？');
    if(!isOk) return;
    
    try {
        const res = await fetch(`${API_BASE}/api/admin/approve/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('superAdminToken')
            },
            body: JSON.stringify({status: 'pending'})
        });
        const data = await res.json();
        if(data.code === 0) {
            showToast('已撤回至待审批', 'success');
            loadDashboardData();
        } else {
            showToast((data.msg || '操作失败'), 'error');
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

async function approveAdmin(id, status) {
    const isOk = await showConfirm('确认审批', `确定要${status==='approved'?'同意':'拒绝'}该管理员的申请吗？`);
    if(!isOk) return;
    
    try {
        const res = await fetch(`${API_BASE}/api/admin/approve/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('superAdminToken')
            },
            body: JSON.stringify({status: status})
        });
        const data = await res.json();
        if(data.code === 0) {
            showToast(`已${status==='approved'?'同意':'拒绝'}`, 'success');
            loadDashboardData();
        } else {
            showToast((data.msg || '操作失败'), 'error');
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

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

function updateUserInfoUI() {
    try {
        const infoStr = localStorage.getItem('superAdminInfo');
        if(!infoStr) return;
        const user = JSON.parse(infoStr);
        const name = user.account || '超级管理员';
        const inst = '系统核心';
        let avatar = user.avatar_url;
        if (avatar && avatar.startsWith('/api')) {
            avatar = API_BASE + avatar;
        } else if (!avatar || (!avatar.startsWith('data:') && !avatar.startsWith('http'))) {
            avatar = _generateTextAvatar(name);
        }
        const sName = document.getElementById('sidebar-name');
        if (sName) sName.textContent = name;
        const sInst = document.getElementById('sidebar-institution');
        if (sInst) sInst.textContent = inst;
        const sAvatar = document.getElementById('sidebar-avatar');
        if (sAvatar) sAvatar.src = avatar;
    } catch(e) {}
}

function updateIndicators() {
  if (!currentSuperTab) return;
  const indicator = document.getElementById('tab-indicator');
  if (indicator) {
    const tabs = Array.from(document.querySelectorAll('.bottom-tabs .tab-btn'));
    const index = tabs.findIndex(t => t.dataset.tab === currentSuperTab);
    if (index !== -1) {
      indicator.style.transform = `translateX(${index * 100}%)`;
      indicator.className = `tab-indicator ${currentSuperTab}`;
    }
  }
  const sidebarIndicator = document.getElementById('sidebar-indicator');
  if (sidebarIndicator) {
    const activeNavItem = document.querySelector(`.nav-item[data-tab="${currentSuperTab}"]`);
    if (activeNavItem) {
      sidebarIndicator.style.transform = `translateY(${activeNavItem.offsetTop}px)`;
      sidebarIndicator.style.height = `${activeNavItem.offsetHeight}px`;
      sidebarIndicator.className = `sidebar-indicator ${currentSuperTab}`;
    }
  }
}
window.addEventListener('load', updateIndicators);
window.addEventListener('resize', updateIndicators);

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
    popover.classList.add('show');
    const popWidth = popover.offsetWidth || 150;
    let leftPos = rect.left;
    if (leftPos + popWidth > window.innerWidth) {
      leftPos = window.innerWidth - popWidth - 16;
    }
    popover.style.top = (rect.bottom + 16) + 'px';
    popover.style.left = leftPos + 'px';
  } else {
    popover.classList.remove('show');
  }
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-popover') && !e.target.closest('.avatar') && !e.target.closest('.sidebar-user') && !e.target.closest('#mobile-avatar-btn')) {
    const popover = document.getElementById('user-popover');
    if (popover) popover.classList.remove('show');
  }
});

// Init
checkAdminAuth();

// ===== 移动端侧边栏 =====
window.toggleSidebar = function() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if(sb && ov) {
        sb.classList.toggle('open');
        ov.classList.toggle('show');
    }
}
window.closeSidebar = function() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if(sb && ov) {
        sb.classList.remove('open');
        ov.classList.remove('show');
    }
}
