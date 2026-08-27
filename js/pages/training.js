// ===== 培训 =====
function initTraining() {
  document.querySelectorAll('.enroll-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      btn.innerHTML = '✓ 已报名';
      btn.style.cssText += 'background:var(--green-600)!important;cursor:default;opacity:1;';
      btn.disabled = true;
      showToast('报名成功！已添加至我的日程');
    });
  });

  document.querySelectorAll('.filter-chip[data-group]').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll(`.filter-chip[data-group="${this.dataset.group}"]`)
        .forEach(c => c.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

