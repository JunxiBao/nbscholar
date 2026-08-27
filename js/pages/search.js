// ===== 检索 =====
function initSearch() {
  document.querySelectorAll('.filter-chip[data-group]').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll(`.filter-chip[data-group="${this.dataset.group}"]`)
        .forEach(c => c.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

