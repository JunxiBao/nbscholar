  // ===== 平台检测 =====
  (function detectPlatform() {
    const ua = navigator.userAgent;
    // Capacitor 原生信息
    const cap = window.Capacitor;
    let platform = 'android'; // 网页端默认 Android MD3 风格

    if (cap) {
      // Capacitor 封装模式：直接读取平台
      platform = cap.getPlatform?.() || cap.platform || 'web';
    } else {
      // 纯 Web UA 检测
      if (/iPhone|iPad|iPod/.test(ua)) platform = 'ios';
      else if (/Android/.test(ua)) platform = 'android';
    }

    // 写入 html 属性（CSS 选择器依据）
    document.documentElement.setAttribute('data-platform', platform);

    // iOS 配置邨底安全区颜色
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (platform === 'ios') {
      // Safari 状态栏
      document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.remove();
      const cap1 = document.createElement('meta');
      cap1.name = 'apple-mobile-web-app-capable';
      cap1.content = 'yes';
      document.head.appendChild(cap1);
      const cap2 = document.createElement('meta');
      cap2.name = 'apple-mobile-web-app-status-bar-style';
      cap2.content = 'default';
      document.head.appendChild(cap2);
    }

    // Android 注入 MD3 涟漪事件
    if (platform === 'android') {
      document.addEventListener('click', function(e) {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        // 创建涟漪元素
        const ripple = document.createElement('span');
        ripple.className = 'md-ripple';
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 0.6;
        ripple.style.cssText = `
          width: ${size}px; height: ${size}px;
          left: ${e.clientX - rect.left - size/2}px;
          top:  ${e.clientY - rect.top  - size/2}px;
        `;
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
      }, true);
    }

    console.log('[甬学阁] Platform:', platform);
  })();

  // ===== 主题管理 =====
  function applyTheme(theme) {
    const activeTheme = theme || localStorage.getItem('theme') || 'system';
    let isDark = false;
    if (activeTheme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = activeTheme === 'dark';
    }
    
    const html = document.documentElement;
    const fav = document.getElementById('favicon');
    
    if (isDark) {
      html.setAttribute('data-theme', 'dark');
      if (fav) fav.href = 'statics/images/darkicon.png?v=3';
    } else {
      html.setAttribute('data-theme', 'light');
      if (fav) fav.href = 'statics/images/lighticon.png?v=3';
    }
    
    // Sync the select dropdown if it exists in the DOM
    const select = document.getElementById('theme-select');
    if (select) {
      select.value = activeTheme;
    }
  }

  window.setTheme = function(theme) {
    localStorage.setItem('theme', theme);
    if (!document.startViewTransition) {
      applyTheme(theme);
      return;
    }
    document.startViewTransition(() => {
      applyTheme(theme);
    });
  };

  // 立即初始化当前主题
  applyTheme(localStorage.getItem('theme') || 'system');

  // 监听系统深浅色切换
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = localStorage.getItem('theme') || 'system';
    if (current === 'system') {
      applyTheme('system');
    }
  });

  // ===== 移动端侧边栏 =====
  function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    sb.classList.toggle('open');
    ov.classList.toggle('show');
  }

  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
  }

  // UI 更新
  function updateMobileUI() {
    const isMobile = window.innerWidth < 900;
    const avatar = document.getElementById('mobile-avatar');
    if (avatar) avatar.style.display = 'block'; // Always show
  }

  updateMobileUI();
  window.addEventListener('resize', updateMobileUI);


