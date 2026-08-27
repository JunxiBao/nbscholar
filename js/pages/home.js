// ===== 首页 =====
function initHome() {
  const hour = new Date().getHours();
  let greeting = '晚上好';
  if (hour >= 5 && hour < 12) greeting = '早上好';
  else if (hour >= 12 && hour < 14) greeting = '中午好';
  else if (hour >= 14 && hour < 18) greeting = '下午好';
  const greetingEl = document.getElementById('greeting-text');
  if (greetingEl) greetingEl.textContent = greeting;

  // 数字滚动动画
  document.querySelectorAll('.stat-val[data-to]').forEach(el => {
    const target = +el.dataset.to;
    const start = performance.now();
    const dur = 900;
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.floor(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  const inp = document.getElementById('hero-search');
  const btn = document.getElementById('hero-search-btn');
  if (btn) btn.addEventListener('click', () => switchTab('tab-search'));
  if (inp) inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') switchTab('tab-search');
  });
}

