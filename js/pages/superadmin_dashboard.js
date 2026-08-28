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
            // 检查是否为超级管理员
            if (data.data.admin.role !== 'super_admin') {
                return showToast('无权访问超级管理控制台', 'error');
            }
            localStorage.setItem('superAdminToken', data.data.token);
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
    checkAdminAuth();
}

function checkAdminAuth() {
    const token = localStorage.getItem('superAdminToken');
    if(token) {
        document.getElementById('auth-layer').style.display = 'none';
        document.getElementById('app-shell').style.display = 'flex';
        loadPendingAdmins();
    } else {
        document.getElementById('auth-layer').style.display = 'flex';
        document.getElementById('app-shell').style.display = 'none';
    }
}

// ---------------------------------
// Dashboard Logic
// ---------------------------------
let currentSuperTab = 'pending';

function switchSuperTab(tabId) {
    currentSuperTab = tabId;
    
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
                <button class="btn btn-muted btn-sm btn-full" onclick="revokeApproval(${a.id})"><ion-icon name="arrow-undo-outline"></ion-icon> 撤回并重审</button>
            </div>
        </div>
        `;
    });
    container.innerHTML = html;
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
            loadHistoryAdmins();
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
            loadPendingAdmins();
        } else {
            showToast((data.msg || '操作失败'), 'error');
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

// Init
checkAdminAuth();
