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
        if(data.code === 0) {
            localStorage.setItem('adminToken', data.data.token);
            localStorage.setItem('adminInfo', JSON.stringify(data.data.admin));
            showToast('登录成功', 'success');
            checkAdminAuth();
        } else {
            showToast((data.msg || '操作失败'), 'error');
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
        if(data.code === 0) {
            showToast((data.msg || '操作失败'), 'success');
            toggleAdminAuthMode('login');
        } else {
            showToast((data.msg || '操作失败'), 'error');
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
        if(data.code === 0) {
            renderEventsList(data.data.events);
        } else if (data.code === 401) {
            logoutAdmin();
        } else {
            showToast((data.msg || '操作失败'), 'error');
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

function renderEventsList(events) {
    const main = document.getElementById('main-content');
    let html = `
      <div class="page-1col" style="max-width:760px; margin:0 auto; padding-bottom:32px;">
        <div class="section-label fade-up">已发布培训活动 <span style="font-weight:400;color:var(--text-secondary);">共 ${events.length} 场</span></div>
        <div class="list-group fade-up d1">
    `;
    
    if(events.length === 0) {
        html += `
            <div style="padding:48px 16px; text-align:center; color:var(--text-tertiary);">
                <ion-icon name="calendar-outline" style="font-size:40px; color:var(--text-tertiary); margin-bottom:8px; display:block; margin-left:auto; margin-right:auto;"></ion-icon>
                <div style="font-size:14px; font-weight:500; color:var(--text-secondary);">暂无已发布的培训活动</div>
                <button class="btn btn-primary btn-sm" onclick="switchTab('tab-admin-create')" style="margin-top:16px;">
                    <ion-icon name="add-outline"></ion-icon> 立即发布活动
                </button>
            </div>`;
    }
    
    events.forEach((e) => {
        html += `
            <div class="list-row" style="flex-wrap:wrap; padding:14px 16px; gap:12px;">
                <div class="list-icon" style="background:var(--blue-500);">
                    <ion-icon name="school-outline"></ion-icon>
                </div>
                <div class="list-text">
                    <div class="list-title" style="font-weight:600;">${e.title}</div>
                    <div class="list-subtitle">${e.speaker || '暂未指定主讲人'} ${e.affiliation ? `(${e.affiliation})` : ''} · ${e.event_date}</div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">报名人数：${e.enrolled_cnt} / ${e.capacity} 人 · 形式：${e.event_type || '线上直播'}</div>
                </div>
                <span class="chip chip-blue" style="margin-left:auto;">${e.event_type || '培训'}</span>
                <div style="width:100%; display:flex; gap:8px; margin-top:4px;">
                    <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="viewEnrollments(${e.id})"><ion-icon name="list-outline"></ion-icon> 报名名单</button>
                    <button class="btn btn-secondary btn-sm" style="flex:1; color:var(--red-500);" onclick="deleteEvent(${e.id})"><ion-icon name="trash-outline"></ion-icon> 删除活动</button>
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
      </div>
    `;
    main.innerHTML = html;
}

function renderCreateForm() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="page-1col" style="max-width:760px; margin:0 auto; padding-bottom:32px;">
        <div class="section-label fade-up">发布新培训活动</div>
        <div style="margin:0 16px;background:var(--bg-primary);border-radius:var(--r-lg);padding:20px;box-shadow:var(--shadow-sm);border:1px solid var(--separator);" class="fade-up d1">
          <div style="margin-bottom:14px;">
            <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">活动标题 *</label>
            <input type="text" id="ce-title" placeholder="输入活动标题..." style="width:100%;border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px 12px;font-size:14px;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-secondary);outline:none;box-sizing:border-box;" />
          </div>

          <div style="display:flex; gap:12px; margin-bottom:14px;">
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">主讲人</label>
              <input type="text" id="ce-speaker" placeholder="主讲人姓名" style="width:100%;border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px 12px;font-size:14px;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-secondary);outline:none;box-sizing:border-box;" />
            </div>
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">机构</label>
              <input type="text" id="ce-affil" placeholder="所属机构" style="width:100%;border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px 12px;font-size:14px;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-secondary);outline:none;box-sizing:border-box;" />
            </div>
          </div>

          <div style="display:flex; gap:12px; margin-bottom:14px;">
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">日期时间 *</label>
              <input type="datetime-local" id="ce-date" style="width:100%;border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px 12px;font-size:14px;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-secondary);outline:none;box-sizing:border-box;" />
            </div>
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">人数上限</label>
              <input type="number" id="ce-capacity" value="100" style="width:100%;border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px 12px;font-size:14px;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-secondary);outline:none;box-sizing:border-box;" />
            </div>
          </div>

          <div style="margin-bottom:14px;">
            <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">活动形式</label>
            <select id="ce-type" style="width:100%;padding:10px 12px;">
              <option value="线上直播">线上直播</option>
              <option value="线下讲座">线下讲座</option>
              <option value="录播课程">录播课程</option>
              <option value="工作坊">工作坊</option>
            </select>
          </div>

          <div style="margin-bottom:20px;">
            <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">活动描述</label>
            <textarea id="ce-desc" placeholder="输入活动详细描述..." style="width:100%;border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px 12px;font-size:14px;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-secondary);outline:none;box-sizing:border-box;resize:none;height:90px;line-height:1.6;"></textarea>
          </div>

          <button onclick="submitCreateEvent()" class="btn btn-primary btn-full">
            <ion-icon name="send-outline" style="font-size:16px;"></ion-icon>
            发布培训活动
          </button>
        </div>
      </div>
    `;
}

async function submitCreateEvent() {
    const payload = {
        title: document.getElementById('ce-title').value.trim(),
        speaker: document.getElementById('ce-speaker').value.trim(),
        affiliation: document.getElementById('ce-affil').value.trim(),
        event_date: document.getElementById('ce-date').value.replace('T', ' '),
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
        if(data.code === 0) {
            showToast('发布成功', 'success');
            switchTab('tab-admin-events');
        } else {
            showToast((data.msg || '操作失败'), 'error');
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

async function deleteEvent(id) {
    const isOk = await showConfirm('确认删除', '确定要删除该活动吗？此操作不可恢复。');
    if(!isOk) return;
    try {
        const res = await fetch(`${API_BASE}/api/admin/training/${id}`, {
            method: 'DELETE',
            headers: {'Authorization': 'Bearer ' + localStorage.getItem('adminToken')}
        });
        const data = await res.json();
        if(data.code === 0) {
            showToast('删除成功', 'success');
            loadAdminEvents();
        } else {
            showToast((data.msg || '操作失败'), 'error');
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
        if(data.code === 0) {
            const main = document.getElementById('main-content');
            let html = `
              <!-- 顶部信息区域 -->
              <div class="fade-up d1" style="background:var(--bg-elevated); border-bottom:1px solid var(--separator); padding:24px; margin:-24px -24px 24px -24px;">
                <div style="max-width:1000px; margin:0 auto;">
                  <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
                      <button onclick="loadAdminEvents()" class="btn btn-outline" style="padding:4px 8px; font-size:18px;"><ion-icon name="arrow-back-outline"></ion-icon></button>
                      <h2 style="font-size:24px; font-weight:700; color:var(--text-primary); margin:0; letter-spacing:-0.5px;">报名名单</h2>
                  </div>
                  <p style="font-size:14px; color:var(--text-secondary); margin:0;">${data.data.event.title}</p>
                </div>
              </div>
                <div class="fade-up d2" style="max-width:1000px; margin:0 auto;">
                    <div class="paper-card" style="padding:0; overflow:hidden;">
                        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:14px;">
                            <thead style="background:var(--bg-header); border-bottom:1px solid var(--border-color);">
                                <tr>
                                    <th style="padding:16px; font-weight:600; color:var(--text-secondary);">姓名</th>
                                    <th style="padding:16px; font-weight:600; color:var(--text-secondary);">账号</th>
                                    <th style="padding:16px; font-weight:600; color:var(--text-secondary);">机构</th>
                                    <th style="padding:16px; font-weight:600; color:var(--text-secondary);">报名时间</th>
                                    <th style="padding:16px; font-weight:600; color:var(--text-secondary);">状态</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            if(data.data.enrollments.length === 0) {
                html += `<tr><td colspan="5" style="padding:40px; text-align:center; color:var(--text-tertiary);">
                    <ion-icon name="folder-open-outline" style="font-size:32px; display:block; margin:0 auto 8px; color:var(--text-tertiary);"></ion-icon>
                    暂无报名记录
                </td></tr>`;
            } else {
                data.data.enrollments.forEach(en => {
                    html += `
                                <tr style="border-bottom:1px solid var(--border-color);">
                                    <td style="padding:16px; color:var(--text-primary); font-weight:500;">${en.name}</td>
                                    <td style="padding:16px; color:var(--text-secondary);">${en.account}</td>
                                    <td style="padding:16px; color:var(--text-secondary);">${en.institution}</td>
                                    <td style="padding:16px; color:var(--text-secondary);">${en.created_at}</td>
                                    <td style="padding:16px;"><span class="chip ${en.status === 'enrolled' ? 'chip-green' : 'chip-red'}">${en.status === 'enrolled' ? '已报名' : '已取消'}</span></td>
                                </tr>
                    `;
                });
            }
            
            html += `</tbody></table></div></div>`;
            main.innerHTML = html;
        } else {
            showToast((data.msg || '操作失败'), 'error');
        }
    } catch(e) {
        showToast('网络错误', 'error');
    }
}

// Init
checkAdminAuth();
