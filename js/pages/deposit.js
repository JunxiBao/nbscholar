// ===== 数据存缴 =====
let depositStep = 2;

function initDeposit() {
  updateWizard();
  document.getElementById('deposit-next')?.addEventListener('click', () => {
    if (depositStep < 4) { depositStep++; updateWizard(); }
    else showToast('已提交存缴申请，等待平台审核');
  });
  document.getElementById('deposit-prev')?.addEventListener('click', () => {
    if (depositStep > 1) { depositStep--; updateWizard(); }
  });

  document.querySelectorAll('.quiz-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      opt.closest('.quiz-options').querySelectorAll('.quiz-opt')
        .forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
}

function updateWizard() {
  document.querySelectorAll('.w-step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 === depositStep)     s.classList.add('active');
    else if (i + 1 < depositStep)  s.classList.add('done');
  });

  document.querySelectorAll('.deposit-panel').forEach((p, i) => {
    if (i + 1 === depositStep) p.style.display = 'block';
    else p.style.display = 'none';
  });

  const prev = document.getElementById('deposit-prev');
  const next = document.getElementById('deposit-next');
  if (prev) prev.disabled = depositStep === 1;
  if (next) next.textContent = depositStep === 4 ? '提交存缴' : '下一步 →';
}

