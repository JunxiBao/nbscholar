const API_BASE_LOGIN = 'http://localhost:5000';

const container = document.getElementById('cardFlipContainer');
const front     = document.getElementById('cardFront');
const back      = document.getElementById('cardBack');
let currentModule = 'login';
let cropper       = null;
let _croppedDataUrl = '';   // 保存裁剪后的 base64 头像

// ===== 卡片高度同步 =====
function syncCardHeight() {
  container.style.height = (currentModule === 'register'
    ? back.offsetHeight : front.offsetHeight) + 'px';
}
window.addEventListener('DOMContentLoaded', syncCardHeight);
window.addEventListener('load', syncCardHeight);
window.addEventListener('resize', syncCardHeight);

// ===== 登录/注册卡片翻转 =====
function toggleModule(target) {
  currentModule = target;
  container.style.height = (target === 'register'
    ? back.offsetHeight : front.offsetHeight) + 'px';
  target === 'register'
    ? container.classList.add('flipped')
    : container.classList.remove('flipped');
}

// ===== 登录 =====
document.addEventListener('DOMContentLoaded', () => {
  // 登录表单
  const loginForm = document.querySelector('#cardFront form');
  if (loginForm) {
    loginForm.removeAttribute('action');
    loginForm.removeAttribute('method');
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const account  = loginForm.querySelector('input[type="text"]').value.trim();
      const password = loginForm.querySelector('input[type="password"]').value;
      const btn      = loginForm.querySelector('.btn-submit');
      btn.disabled = true;
      btn.querySelector('span').textContent = '登录中...';
      try {
        await _apiLogin(account, password);
        window.location.href = 'index.html';
      } catch (err) {
        _showLoginToast(err.message || '登录失败');
        btn.disabled = false;
        btn.querySelector('span').textContent = '登录';
      }
    });
  }

  // 注册表单
  const regForm = document.querySelector('#cardBack form');
  if (regForm) {
    regForm.removeAttribute('action');
    regForm.removeAttribute('method');
    regForm.removeAttribute('onsubmit');
    regForm.addEventListener('submit', async e => {
      e.preventDefault();
      const account  = regForm.querySelector('input[type="text"]').value.trim();
      const pwd      = document.getElementById('regPassword').value;
      const confirm  = document.getElementById('regConfirmPassword').value;
      if (pwd !== confirm) { _showLoginToast('两次密码不一致'); return; }
      if (pwd.length < 6)  { _showLoginToast('密码至少 6 位'); return; }

      const institution = document.getElementById('regInstitution')?.value?.trim() || '';
      const age         = regForm.querySelector('input[type="number"]')?.value || null;
      const gender      = regForm.querySelector('select')?.value || '';

      const btn = regForm.querySelector('.btn-submit');
      btn.disabled = true;
      btn.querySelector('span').textContent = '注册中...';

      try {
        await _apiRegister({ account, password: pwd, institution, age, gender,
                             avatar_url: _croppedDataUrl });
        window.location.href = 'index.html';
      } catch (err) {
        _showLoginToast(err.message || '注册失败');
        btn.disabled = false;
        btn.querySelector('span').textContent = '注册并进入系统';
      }
    });
  }
});

async function _apiLogin(account, password) {
  const res  = await fetch(`${API_BASE_LOGIN}/api/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ account, password }),
  });
  const data = await res.json();
  if (!res.ok || data.code !== 0) throw new Error(data.msg || '登录失败');
  localStorage.setItem('nbscholar_token', data.data.token);
  localStorage.setItem('nbscholar_user',  JSON.stringify(data.data.user));
}

async function _apiRegister(payload) {
  const res  = await fetch(`${API_BASE_LOGIN}/api/auth/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data.code !== 0) throw new Error(data.msg || '注册失败');
  localStorage.setItem('nbscholar_token', data.data.token);
  localStorage.setItem('nbscholar_user',  JSON.stringify(data.data.user));
}

// ===== 注册校验（旧接口兼容） =====
function validateRegister(e) {
  const pwd     = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirmPassword').value;
  if (pwd !== confirm) {
    e.preventDefault();
    _showLoginToast('两次密码不一致');
    return false;
  }
  return true;
}

// ===== 密码显隐 =====
function togglePasswordVisibility(inputId, toggleBtn) {
  const input = document.getElementById(inputId);
  const icon  = toggleBtn.querySelector('ion-icon');
  if (input.type === 'password') {
    input.type = 'text';  icon.name = 'eye-outline';
  } else {
    input.type = 'password'; icon.name = 'eye-off-outline';
  }
}

// ===== Logo 主题切换 =====
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const logoImgs    = document.querySelectorAll('.login-logo');
function updateLogo(e) {
  const src   = e.matches ? 'statics/images/darkicon.png' : 'statics/images/lighticon.png';
  const scale = e.matches ? 'scale(1.2)' : 'scale(1)';
  logoImgs.forEach(img => { img.src = src; img.style.transform = scale; });
}
prefersDark.addEventListener('change', updateLogo);
updateLogo(prefersDark);

// ===== 头像裁剪 =====
function previewAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过 5MB');
    event.target.value = '';
    return;
  }
  const img = document.getElementById('imageToCrop');
  if (img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
  img.src = URL.createObjectURL(file);
  document.getElementById('cropModal').style.display = 'flex';
  if (cropper) { cropper.destroy(); cropper = null; }
  cropper = new Cropper(img, {
    aspectRatio: 1, viewMode: 1, dragMode: 'move',
    autoCropArea: 0.85, guides: true, center: true,
    highlight: false, cropBoxMovable: true, cropBoxResizable: true,
  });
}

function closeCropModal() {
  document.getElementById('cropModal').style.display = 'none';
  if (cropper) { cropper.destroy(); cropper = null; }
  document.getElementById('avatarInput').value = '';
}

function confirmCrop() {
  if (!cropper) return;
  const canvas = cropper.getCroppedCanvas({ width: 256, height: 256,
    imageSmoothingEnabled: true, imageSmoothingQuality: 'high', fillColor: '#fff' });
  _croppedDataUrl = canvas.toDataURL('image/webp', 0.8);
  const img  = document.getElementById('avatarImg');
  const icon = document.querySelector('.avatar-preview ion-icon');
  img.src    = _croppedDataUrl;
  img.style.display  = 'block';
  icon.style.display = 'none';
  closeCropModal();
  setTimeout(syncCardHeight, 50);
}

// ===== Toast（登录页简化版）=====
function _showLoginToast(msg) {
  let el = document.getElementById('login-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'login-toast';
    el.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);'
      + 'background:#FFFFFF;color:#111827;padding:14px 28px;border-radius:24px;'
      + 'font-size:14px;font-weight:600;z-index:9999;pointer-events:none;opacity:0;transition:opacity 0.2s, transform 0.2s;'
      + 'box-shadow:0 12px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08);'
      + 'display:flex;align-items:center;gap:8px;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 3000);
}
