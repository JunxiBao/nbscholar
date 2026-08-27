// ===== 期刊投稿 =====
function initJournal() {
  document.getElementById('journal-match-btn')?.addEventListener('click', () => {
    const loading = document.getElementById('match-loading');
    const result  = document.getElementById('match-result');
    if (loading) loading.style.display = 'flex';
    if (result)  result.style.display  = 'none';
    setTimeout(() => {
      if (loading) loading.style.display = 'none';
      if (result)  result.style.display  = 'block';
    }, 2000);
  });

  document.getElementById('journal-segment')?.addEventListener('ionChange', e => {
    const v = e.detail.value;
    ['match','guide','check'].forEach(id => {
      const el = document.getElementById('panel-' + id);
      if (el) el.style.display = v === id ? 'block' : 'none';
    });
  });
}

