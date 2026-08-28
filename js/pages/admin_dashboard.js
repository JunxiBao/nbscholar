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
        updateUserInfoUI();
        loadAdminEvents();
        setTimeout(updateIndicators, 100);
    } else {
        document.getElementById('auth-layer').style.display = 'flex';
        document.getElementById('app-shell').style.display = 'none';
    }
}

// ---------------------------------
// Dashboard Logic
// ---------------------------------
let currentTab = 'tab-admin-events';

function switchTab(tabId) {
    if (currentTab === tabId && tabId !== 'tab-admin-events') return;
    currentTab = tabId;
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tabId);
    });
    
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
    
    const topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle) {
        topbarTitle.textContent = tabId === 'tab-admin-events' ? '已发布活动' : '发布新活动';
    }
    
    updateIndicators();
    
    if(tabId === 'tab-admin-events') loadAdminEvents();
    if(tabId === 'tab-admin-create') renderCreateForm();
}

document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.tab));
});
document.querySelectorAll('.tab-btn[data-tab]').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.tab));
});

async function loadAdminEvents() {
    const container = document.getElementById('admin-tab-content');
    if (!container) return;
    container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-tertiary);">加载活动列表中...</div>';
    
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
            container.innerHTML = `<div style="color:#EF4444; padding:20px; text-align:center;">${(data.msg || '操作失败')}</div>`;
        }
    } catch(e) {
        showToast('网络错误', 'error');
        container.innerHTML = '<div style="color:#EF4444; padding:20px; text-align:center;">网络连接错误</div>';
    }
}

function renderEventsList(events) {
    const container = document.getElementById('admin-tab-content');
    if (!container) return;

    const totalEnrollments = events.reduce((sum, e) => sum + (e.enrolled_cnt || 0), 0);

    let html = `
      <!-- 统计面板 -->
      <div class="stat-row fade-up d1" style="padding-top:16px;">
        <div class="stat-card">
          <div class="stat-val" style="color:var(--blue-600);">${events.length}</div>
          <div class="stat-lbl">已发布活动</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" style="color:var(--green-600);">${totalEnrollments}</div>
          <div class="stat-lbl">累计报名人次</div>
        </div>
      </div>

      <div class="section-label fade-up d2">已发布活动列表 <span style="font-weight:400;color:var(--text-secondary);">共 ${events.length} 场</span></div>
      <div id="events-list-container">
    `;
    
    if(events.length === 0) {
        html += `
            <div class="paper-card fade-up d3" style="text-align:center; padding:48px 16px; color:var(--text-tertiary);">
                <ion-icon name="calendar-outline" style="font-size:44px; color:var(--text-tertiary); margin-bottom:8px; display:block; margin-left:auto; margin-right:auto;"></ion-icon>
                <div style="font-size:15px; font-weight:600; color:var(--text-primary);">暂无已发布的培训活动</div>
                <div style="font-size:13px; color:var(--text-secondary); margin-top:4px;">点击上方“发布新活动”即可创建</div>
                <button class="btn btn-primary btn-sm" onclick="switchTab('tab-admin-create')" style="margin-top:16px;">
                    <ion-icon name="add-outline"></ion-icon> 立即发布活动
                </button>
            </div>`;
    }
    
    events.forEach((e, i) => {
        let day = '15', month = '9';
        if (e.event_date) {
            const parts = e.event_date.split(' ')[0].split('-');
            if (parts.length === 3) {
                month = parseInt(parts[1], 10);
                day = parseInt(parts[2], 10);
            }
        }
        const animDelay = (i % 4) + 1;
        html += `
            <div class="event-card fade-up d${animDelay}">
                <div class="event-stripe" style="background:${e.color || 'var(--blue-600)'};"></div>
                <div class="event-body">
                    <div class="event-date-row">
                        <div class="event-date-box" style="background:${e.color || 'var(--blue-600)'};">
                            <div class="event-day">${day}</div>
                            <div class="event-month">${month}月</div>
                        </div>
                        <div style="flex:1;">
                            <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${e.event_date}</div>
                            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">形式：${e.event_type || '线上直播'}</div>
                        </div>
                        <span class="chip chip-blue">${e.event_type || '培训'}</span>
                    </div>
                    <div class="event-title" style="font-size:16px;font-weight:600;margin-bottom:8px;">${e.title}</div>
                    <div class="event-info">
                        <span><ion-icon name="person-outline"></ion-icon> ${e.speaker || '暂未指定主讲人'} ${e.affiliation ? `(${e.affiliation})` : ''}</span>
                        <span><ion-icon name="people-outline"></ion-icon> ${e.enrolled_cnt} / ${e.capacity} 人已报名</span>
                    </div>
                    <div style="display:flex;gap:10px;margin-top:14px;">
                        <button class="btn btn-primary btn-sm" style="flex:1;" onclick="viewEnrollments(${e.id})"><ion-icon name="list-outline"></ion-icon> 报名名单 (${e.enrolled_cnt})</button>
                        <button class="btn btn-muted btn-sm" style="color:var(--red-500);" onclick="deleteEvent(${e.id})"><ion-icon name="trash-outline"></ion-icon> 删除活动</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
    `;
    container.innerHTML = html;
}

function renderCreateForm() {
    const container = document.getElementById('admin-tab-content');
    if (!container) return;
    container.innerHTML = `
        <div class="section-label fade-up d1">发布新培训活动</div>
        <div style="margin:0 16px;background:var(--bg-elevated);border-radius:var(--r-lg);padding:24px;box-shadow:var(--shadow-sm);border:1px solid var(--separator);" class="fade-up d2">
          <div style="margin-bottom:14px;">
            <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">活动标题 *</label>
            <input type="text" id="ce-title" placeholder="输入活动标题..." style="width:100%;border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px 12px;font-size:14px;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-input);outline:none;box-sizing:border-box;" />
          </div>

          <div style="display:flex; gap:12px; margin-bottom:14px;">
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">主讲人</label>
              <input type="text" id="ce-speaker" placeholder="主讲人姓名" style="width:100%;border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px 12px;font-size:14px;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-input);outline:none;box-sizing:border-box;" />
            </div>
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">机构</label>
              <input type="text" id="ce-affil" placeholder="所属机构" style="width:100%;border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px 12px;font-size:14px;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-input);outline:none;box-sizing:border-box;" />
            </div>
          </div>

          <div style="display:flex; gap:12px; margin-bottom:14px;">
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">活动日期 *</label>
              <input type="date" id="ce-date" style="width:100%;border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px 12px;font-size:14px;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-input);outline:none;box-sizing:border-box;" />
            </div>
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">开始时间 *</label>
              <input type="time" id="ce-time" value="14:00" style="width:100%;border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px 12px;font-size:14px;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-input);outline:none;box-sizing:border-box;" />
            </div>
          </div>

          <div style="display:flex; gap:12px; margin-bottom:14px;">
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">活动形式</label>
              <select id="ce-type" style="width:100%;border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px 12px;font-size:14px;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-input);outline:none;box-sizing:border-box;">
                <option value="线上直播">线上直播</option>
                <option value="线下讲座">线下讲座</option>
                <option value="录播课程">录播课程</option>
                <option value="工作坊">工作坊</option>
              </select>
            </div>
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">人数上限</label>
              <input type="number" id="ce-capacity" value="100" style="width:100%;border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px 12px;font-size:14px;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-input);outline:none;box-sizing:border-box;" />
            </div>
          </div>

          <div style="margin-bottom:20px;">
            <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">活动描述</label>
            <textarea id="ce-desc" placeholder="输入活动详细描述..." style="width:100%;border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px 12px;font-size:14px;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-input);outline:none;box-sizing:border-box;resize:none;height:90px;line-height:1.6;"></textarea>
          </div>

          <button onclick="submitCreateEvent()" class="btn btn-primary btn-full">
            <ion-icon name="send-outline" style="font-size:16px;"></ion-icon>
            发布培训活动
          </button>
        </div>
    `;
}

async function submitCreateEvent() {
    const dateVal = document.getElementById('ce-date').value.trim();
    const timeVal = document.getElementById('ce-time').value.trim() || '00:00';
    
    if(!dateVal) return showToast('请选择活动日期', 'error');

    const payload = {
        title: document.getElementById('ce-title').value.trim(),
        speaker: document.getElementById('ce-speaker').value.trim(),
        affiliation: document.getElementById('ce-affil').value.trim(),
        event_date: `${dateVal} ${timeVal}`,
        capacity: document.getElementById('ce-capacity').value,
        event_type: document.getElementById('ce-type').value,
        description: document.getElementById('ce-desc').value.trim()
    };
    
    if(!payload.title) return showToast('请填写活动标题', 'error');

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
        const infoStr = localStorage.getItem('adminInfo');
        if(!infoStr) return;
        const user = JSON.parse(infoStr);
        const name = user.account || '管理员';
        const inst = '系统管理';
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
  if (!currentTab) return;
  const indicator = document.getElementById('tab-indicator');
  if (indicator) {
    const tabs = Array.from(document.querySelectorAll('.bottom-tabs .tab-btn'));
    const index = tabs.findIndex(t => t.dataset.tab === currentTab);
    if (index !== -1) {
      indicator.style.transform = `translateX(${index * 100}%)`;
    }
  }
  const sidebarIndicator = document.getElementById('sidebar-indicator');
  if (sidebarIndicator) {
    const activeNavItem = document.querySelector(`.nav-item[data-tab="${currentTab}"]`);
    if (activeNavItem) {
      sidebarIndicator.style.transform = `translateY(${activeNavItem.offsetTop}px)`;
      sidebarIndicator.style.height = `${activeNavItem.offsetHeight}px`;
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
