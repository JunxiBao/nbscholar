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
    if (currentSuperTab === tabId) return;
    currentSuperTab = tabId;
    
    // 更新导航样式
    document.getElementById('tab-btn-pending').classList.toggle('active', tabId === 'pending');
    document.getElementById('tab-btn-history').classList.toggle('active', tabId === 'history');
    
    // 切换内容区域
    document.getElementById('section-pending').style.display = tabId === 'pending' ? 'block' : 'none';
    document.getElementById('section-history').style.display = tabId === 'history' ? 'block' : 'none';
    
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
    if(admins.length === 0) {
        container.innerHTML = `
            <div class="fade-up d4" style="grid-column: 1/-1; padding:60px 20px; text-align:center; background:var(--bg-elevated); border-radius:12px; border:1px dashed var(--border-color);">
                <ion-icon name="folder-open-outline" style="font-size:48px; color:var(--text-tertiary); margin-bottom:16px; display:block; margin-left:auto; margin-right:auto;"></ion-icon>
                <div style="font-size:16px; font-weight:600; color:var(--text-primary); margin-bottom:4px;">暂无账号</div>
                <div style="font-size:13px; color:var(--text-secondary);">目前没有待审批或已拒绝的管理员申请</div>
            </div>`;
        return;
    }
    
    let html = '';
    admins.forEach((a, i) => {
        let statusBadge = '';
        if(a.status === 'pending') {
            statusBadge = `<span class="chip chip-blue">待审批</span>`;
        } else if (a.status === 'rejected') {
            statusBadge = `<span class="chip chip-red">已拒绝</span>`;
        }
        
        const actionButtons = a.status === 'pending' ? `
                <button class="btn btn-primary" onclick="approveAdmin(${a.id}, 'approved')" style="flex:1;"><ion-icon name="checkmark-circle-outline"></ion-icon>同意</button>
                <button class="btn btn-outline" onclick="approveAdmin(${a.id}, 'rejected')" style="flex:1;"><ion-icon name="close-circle-outline"></ion-icon>拒绝</button>
            ` : `<div style="text-align:center; width:100%; color:var(--text-tertiary); font-size:14px;">${a.status==='approved'?'已同意':'已拒绝'}</div>`;
            
            // 使用交错动画
            const animDelay = (i % 5) + 1;
            
            html += `
            <div class="paper-card fade-up d${animDelay}" style="display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:40px; height:40px; border-radius:50%; background:var(--blue-50); color:var(--blue-600); display:flex; align-items:center; justify-content:center; font-size:20px;">
                            <ion-icon name="person-outline"></ion-icon>
                        </div>
                        <div>
                            <h3 style="font-size:16px; font-weight:600; margin:0; color:var(--text-primary);">${a.account}</h3>
                            <div style="font-size:12px; color:var(--text-tertiary); margin-top:2px;">${a.created_at}</div>
                        </div>
                    </div>
                    ${statusBadge}
                </div>
                ${a.remark ? `<div style="background:var(--bg-base); padding:8px 12px; border-radius:8px; font-size:13px; color:var(--text-secondary); border-left:3px solid var(--blue-500);"><ion-icon name="chatbox-ellipses-outline" style="vertical-align:text-bottom; margin-right:4px;"></ion-icon>${a.remark}</div>` : ''}
                <div style="display:flex; gap:12px; margin-top:8px;">
                    ${actionButtons}
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
    if(admins.length === 0) {
        container.innerHTML = `
            <div class="fade-up d4" style="grid-column: 1/-1; padding:60px 20px; text-align:center; background:var(--bg-elevated); border-radius:12px; border:1px dashed var(--border-color, #E5E5EA);">
                <ion-icon name="time-outline" style="font-size:48px; color:var(--text-tertiary); margin-bottom:16px; display:block; margin-left:auto; margin-right:auto;"></ion-icon>
                <div style="font-size:16px; font-weight:600; color:var(--text-primary); margin-bottom:4px;">暂无记录</div>
                <div style="font-size:13px; color:var(--text-secondary);">暂无任何审批通过或拒绝的管理员记录</div>
            </div>`;
        return;
    }
    
    let html = '';
    admins.forEach((a, i) => {
        let statusBadge = a.status === 'approved' 
            ? `<span class="chip chip-green">已同意</span>`
            : `<span class="chip chip-red">已拒绝</span>`;
        
        const actionButtons = `
            <button class="btn btn-outline" onclick="revokeApproval(${a.id})" style="flex:1;"><ion-icon name="arrow-undo-outline"></ion-icon>撤回重审</button>
        `;
            
        const animDelay = (i % 5) + 1;
        html += `
        <div class="paper-card fade-up d${animDelay}" style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="width:40px; height:40px; border-radius:50%; background:var(--bg-base); color:var(--text-primary); display:flex; align-items:center; justify-content:center; font-size:20px;">
                        <ion-icon name="person-outline"></ion-icon>
                    </div>
                    <div>
                        <h3 style="font-size:16px; font-weight:600; margin:0; color:var(--text-primary);">${a.account}</h3>
                        <div style="font-size:12px; color:var(--text-tertiary); margin-top:2px;">处理时间: ${a.updated_at || a.created_at}</div>
                    </div>
                </div>
                ${statusBadge}
            </div>
            ${a.remark ? `<div style="background:var(--bg-base); padding:8px 12px; border-radius:8px; font-size:13px; color:var(--text-secondary); border-left:3px solid var(--blue-500);"><ion-icon name="chatbox-ellipses-outline" style="vertical-align:text-bottom; margin-right:4px;"></ion-icon>${a.remark}</div>` : ''}
            <div style="display:flex; gap:12px; margin-top:8px;">
                ${actionButtons}
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
