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
        container.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-sub); background:var(--card-bg); border-radius:12px;">暂无待审批或已拒绝账号</div>`;
        return;
    }
    
    let html = '';
    admins.forEach(a => {
        let statusBadge = '';
        if(a.status === 'pending') {
            statusBadge = `<span style="padding:4px 8px; border-radius:4px; font-size:12px; background:#FEF3C7; color:#B45309;">待审批</span>`;
        } else if (a.status === 'rejected') {
            statusBadge = `<span style="padding:4px 8px; border-radius:4px; font-size:12px; background:#FEE2E2; color:#DC2626;">已拒绝</span>`;
        }
        
        const actionButtons = a.status === 'pending' ? `
                <button class="btn btn-primary" onclick="approveAdmin(${a.id}, 'approved')" style="flex:1;">同意</button>
                <button class="btn btn-muted" onclick="approveAdmin(${a.id}, 'rejected')" style="flex:1; background:var(--bg-base); color:var(--text-main);">拒绝</button>
            ` : `<div style="text-align:center; width:100%; color:var(--text-sub);">${a.status==='approved'?'已同意':'已拒绝'}</div>`;
            
            html += `
            <div style="background:var(--bg-elevated); padding:16px; border-radius:12px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
                        <h3 style="font-size:18px; font-weight:600; margin:0;">${a.account}</h3>
                        ${statusBadge}
                    </div>
                    <div style="font-size:14px; color:var(--text-sub); display:flex; flex-direction:column; gap:4px;">
                        <span>申请时间: ${a.created_at}</span>
                        ${a.remark ? `<span style="background:var(--bg-base); padding:8px; border-radius:6px; margin-top:4px; font-style:italic;">备注: ${a.remark}</span>` : ''}
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    ${actionButtons}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function approveAdmin(id, status) {
    if(!confirm(`确定要${status==='approved'?'同意':'拒绝'}该管理员的申请吗？`)) return;
    
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
