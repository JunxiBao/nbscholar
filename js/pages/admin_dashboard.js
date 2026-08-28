// js/pages/admin_dashboard.js

let _editId = null;

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

function toggleAdminAuthMode(mode) {
    const container = document.getElementById('cardFlipContainer');
    const front = document.getElementById('admin-login-form');
    const back = document.getElementById('admin-register-form');

    if(mode === 'register') {
        container.classList.add('flipped');
        container.style.height = back.offsetHeight + 'px';
    } else {
        container.classList.remove('flipped');
        container.style.height = front.offsetHeight + 'px';
    }
}

// Init height on load
window.addEventListener('load', () => {
    const container = document.getElementById('cardFlipContainer');
    const front = document.getElementById('admin-login-form');
    if(container && front) {
        container.style.height = front.offsetHeight + 'px';
    }
});

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
        if(data.code === 200) {
            localStorage.setItem('adminToken', data.data.token);
            localStorage.setItem('adminInfo', JSON.stringify(data.data.admin));
            showToast('登录成功', 'success');
            checkAdminAuth();
        } else {
            showToast(data.message, 'error');
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

async function doAdminRegister() {
    const acc = document.getElementById('admin-reg-account').value.trim();
    const pwd = document.getElementById('admin-reg-pwd').value;
    const pwd2 = document.getElementById('admin-reg-pwd2').value;
    const remark = document.getElementById('admin-reg-remark').value.trim();
    
    if(!acc || !pwd) return showToast('请填写必填信息', 'error');
    if(pwd !== pwd2) return showToast('两次输入的密码不一致', 'error');
    
    try {
        const res = await fetch(`${API_BASE}/api/admin_auth/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({account: acc, password: pwd, remark: remark})
        });
        const data = await res.json();
        if(data.code === 200) {
            showToast(data.message, 'success');
            toggleAdminAuthMode('login');
        } else {
            showToast(data.message, 'error');
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

function logoutAdmin() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    checkAdminAuth();
}

function checkAdminAuth() {
    const token = localStorage.getItem('adminToken');
    if(token) {
        document.getElementById('auth-layer').style.display = 'none';
        document.getElementById('app-shell').style.display = 'flex';
        loadAdminEvents();
    } else {
        document.getElementById('auth-layer').style.display = 'flex';
        document.getElementById('app-shell').style.display = 'none';
    }
}

// ---------------------------------
// Dashboard Logic
// ---------------------------------
function switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.nav-item[data-tab="${tabId}"]`).classList.add('active');
    
    if(tabId === 'tab-admin-events') loadAdminEvents();
    if(tabId === 'tab-admin-create') renderCreateForm();
}

document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.tab));
});

async function loadAdminEvents() {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div style="padding:20px;">加载中...</div>';
    
    try {
        const res = await fetch(`${API_BASE}/api/admin/training`, {
            headers: {'Authorization': 'Bearer ' + localStorage.getItem('adminToken')}
        });
        const data = await res.json();
        if(data.code === 200) {
            renderEventsList(data.data.events);
        } else if (data.code === 401) {
            logoutAdmin();
        } else {
            showToast(data.message, 'error');
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

function renderEventsList(events) {
    const main = document.getElementById('main-content');
    let html = `
        <div style="padding:20px; max-width:1000px; margin:0 auto;">
            <h2 style="font-size:24px; font-weight:700; margin-bottom:20px;">已发布的活动</h2>
            <div style="display:grid; gap:16px;">
    `;
    
    if(events.length === 0) {
        html += `<div style="padding:40px; text-align:center; color:var(--text-sub); background:var(--card-bg); border-radius:12px;">暂无活动</div>`;
    }
    
    events.forEach(e => {
        html += `
            <div style="background:var(--card-bg); border-radius:12px; padding:20px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <div>
                    <h3 style="font-size:18px; font-weight:600; margin-bottom:8px;">${e.title}</h3>
                    <div style="font-size:14px; color:var(--text-sub); display:flex; gap:16px;">
                        <span><ion-icon name="time-outline" style="vertical-align:-2px;"></ion-icon> ${e.event_date}</span>
                        <span><ion-icon name="people-outline" style="vertical-align:-2px;"></ion-icon> 报名: ${e.enrolled_cnt} / ${e.capacity}</span>
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button onclick="viewEnrollments(${e.id})" style="padding:8px 16px; border-radius:6px; background:var(--bg-base); border:1px solid var(--border-color); color:var(--text-main); cursor:pointer;">报名名单</button>
                    <button onclick="deleteEvent(${e.id})" style="padding:8px 16px; border-radius:6px; background:#FEE2E2; border:none; color:#DC2626; cursor:pointer;">删除</button>
                </div>
            </div>
        `;
    });
    
    html += `</div></div>`;
    main.innerHTML = html;
}

function renderCreateForm() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div style="padding:20px; max-width:800px; margin:0 auto;">
            <h2 style="font-size:24px; font-weight:700; margin-bottom:20px;">发布新活动</h2>
            <div style="background:var(--card-bg); padding:24px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                
                <div style="margin-bottom:16px;">
                    <label style="display:block; margin-bottom:8px; font-weight:500;">活动标题 *</label>
                    <input type="text" id="ce-title" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-base); color:var(--text-main);">
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                    <div>
                        <label style="display:block; margin-bottom:8px; font-weight:500;">主讲人</label>
                        <input type="text" id="ce-speaker" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-base); color:var(--text-main);">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:8px; font-weight:500;">机构</label>
                        <input type="text" id="ce-affil" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-base); color:var(--text-main);">
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                    <div>
                        <label style="display:block; margin-bottom:8px; font-weight:500;">日期时间 * (YYYY-MM-DD HH:MM)</label>
                        <input type="text" id="ce-date" placeholder="2026-09-01 14:00" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-base); color:var(--text-main);">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:8px; font-weight:500;">名额限制</label>
                        <input type="number" id="ce-capacity" value="100" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-base); color:var(--text-main);">
                    </div>
                </div>

                <div style="margin-bottom:16px;">
                    <label style="display:block; margin-bottom:8px; font-weight:500;">活动类型</label>
                    <select id="ce-type" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-base); color:var(--text-main);">
                        <option value="线上会议">线上会议</option>
                        <option value="线下讲座">线下讲座</option>
                    </select>
                </div>

                <div style="margin-bottom:24px;">
                    <label style="display:block; margin-bottom:8px; font-weight:500;">详情描述</label>
                    <textarea id="ce-desc" rows="4" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-base); color:var(--text-main);"></textarea>
                </div>

                <button onclick="submitCreateEvent()" style="background:var(--brand-color); color:#fff; padding:12px 24px; border:none; border-radius:8px; font-weight:600; cursor:pointer;">发布活动</button>
            </div>
        </div>
    `;
}

async function submitCreateEvent() {
    const payload = {
        title: document.getElementById('ce-title').value.trim(),
        speaker: document.getElementById('ce-speaker').value.trim(),
        affiliation: document.getElementById('ce-affil').value.trim(),
        event_date: document.getElementById('ce-date').value.trim(),
        capacity: document.getElementById('ce-capacity').value,
        event_type: document.getElementById('ce-type').value,
        description: document.getElementById('ce-desc').value.trim()
    };
    
    if(!payload.title || !payload.event_date) return showToast('请填写必填项', 'error');

    try {
        const res = await fetch(`${API_BASE}/api/admin/training`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.code === 200) {
            showToast('发布成功', 'success');
            switchTab('tab-admin-events');
        } else {
            showToast(data.message, 'error');
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

async function deleteEvent(id) {
    if(!confirm('确定要删除该活动吗？此操作不可恢复。')) return;
    try {
        const res = await fetch(`${API_BASE}/api/admin/training/${id}`, {
            method: 'DELETE',
            headers: {'Authorization': 'Bearer ' + localStorage.getItem('adminToken')}
        });
        const data = await res.json();
        if(data.code === 200) {
            showToast('删除成功', 'success');
            loadAdminEvents();
        } else {
            showToast(data.message, 'error');
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

async function viewEnrollments(eventId) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/training/${eventId}/enrollments`, {
            headers: {'Authorization': 'Bearer ' + localStorage.getItem('adminToken')}
        });
        const data = await res.json();
        if(data.code === 200) {
            const main = document.getElementById('main-content');
            let html = `
                <div style="padding:20px; max-width:1000px; margin:0 auto;">
                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
                        <button onclick="loadAdminEvents()" style="background:none; border:none; color:var(--brand-color); cursor:pointer; font-size:24px; padding:0;"><ion-icon name="arrow-back-outline"></ion-icon></button>
                        <h2 style="font-size:24px; font-weight:700; margin:0;">报名名单 - ${data.data.event.title}</h2>
                    </div>
                    <div style="background:var(--card-bg); border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05); overflow:hidden;">
                        <table style="width:100%; border-collapse:collapse; text-align:left;">
                            <thead style="background:var(--bg-base); border-bottom:1px solid var(--border-color);">
                                <tr>
                                    <th style="padding:16px;">姓名</th>
                                    <th style="padding:16px;">账号</th>
                                    <th style="padding:16px;">机构</th>
                                    <th style="padding:16px;">报名时间</th>
                                    <th style="padding:16px;">状态</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            if(data.data.enrollments.length === 0) {
                html += `<tr><td colspan="5" style="padding:24px; text-align:center; color:var(--text-sub);">暂无报名记录</td></tr>`;
            } else {
                data.data.enrollments.forEach(en => {
                    html += `
                        <tr style="border-bottom:1px solid var(--border-color);">
                            <td style="padding:16px;">${en.user.name || '未填'}</td>
                            <td style="padding:16px;">${en.user.account}</td>
                            <td style="padding:16px;">${en.user.institution || '-'}</td>
                            <td style="padding:16px;">${en.enrolled_at}</td>
                            <td style="padding:16px;">
                                <span style="padding:4px 8px; border-radius:4px; font-size:12px; background:#D1FAE5; color:#065F46;">已报名</span>
                            </td>
                        </tr>
                    `;
                });
            }
            
            html += `</tbody></table></div></div>`;
            main.innerHTML = html;
        } else {
            showToast(data.message, 'error');
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

// Init
checkAdminAuth();
