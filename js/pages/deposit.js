// ===== 数据存缴 =====
let depositStep = 1;

function initDeposit() {
  depositStep = 1;
  updateWizard();

  document.getElementById('deposit-next')?.addEventListener('click', () => {
    if (depositStep < 4) {
      depositStep++;
      updateWizard();
    } else {
      // 最后一步：提交存缴申请
      _submitDeposit();
    }
  });

  document.getElementById('deposit-prev')?.addEventListener('click', () => {
    if (depositStep > 1) { depositStep--; updateWizard(); }
  });

  // 问卷选项单选
  document.querySelectorAll('.quiz-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      opt.closest('.quiz-options').querySelectorAll('.quiz-opt')
        .forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      // 根据选择更新推荐平台（仅 Step 1）
      if (depositStep === 1) _updateRecommendedPlatforms();
    });
  });
}

function updateWizard() {
  document.querySelectorAll('.w-step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 === depositStep)    s.classList.add('active');
    else if (i + 1 < depositStep) s.classList.add('done');
  });

  document.querySelectorAll('.deposit-panel').forEach((p, i) => {
    p.style.display = i + 1 === depositStep ? 'block' : 'none';
  });

  const prev = document.getElementById('deposit-prev');
  const next = document.getElementById('deposit-next');
  if (prev) prev.disabled = depositStep === 1;
  if (next) next.textContent = depositStep === 4 ? '提交存缴申请' : '下一步 →';
}

function _updateRecommendedPlatforms() {
  // 根据数据类型和密级动态调整推荐平台（规则引擎）
  const dataType = document.querySelector('.quiz-wrap:nth-of-type(1) .quiz-opt.selected')?.textContent?.trim() || '';
  const openLevel = document.querySelector('.quiz-wrap:nth-of-type(2) .quiz-opt.selected')?.textContent?.trim() || '';
  const field = document.querySelector('.quiz-wrap:nth-of-type(3) .quiz-opt.selected')?.textContent?.trim() || '';

  const platformList = document.querySelector('[style*="推荐存缴平台"] ~ div .list-row:first-child .list-subtitle');
  // 简单规则：受控访问推荐国内平台，完全开放推荐 Zenodo
  if (platformList) {
    if (openLevel.includes('受控')) {
      platformList.textContent = '匹配度 98% · 支持受控访问 · 符合国家政策';
    } else if (openLevel.includes('完全开放')) {
      platformList.textContent = '匹配度 88% · 国际认可 · 开放数据优先';
    }
  }
}

async function _submitDeposit() {
  if (!Auth.isLoggedIn()) {
    showToast('请先登录后再提交存缴申请');
    return;
  }
  // 收集表单信息（简化演示）
  const dataType  = document.querySelector('.quiz-wrap:nth-of-type(1) .quiz-opt.selected')?.textContent?.trim() || '';
  const openLevel = document.querySelector('.quiz-wrap:nth-of-type(2) .quiz-opt.selected')?.textContent?.trim() || '';
  const field     = document.querySelector('.quiz-wrap:nth-of-type(3) .quiz-opt.selected')?.textContent?.trim() || '';

  showToast('存缴申请已提交，等待平台审核（预计 3–5 个工作日）');

  // 重置向导
  setTimeout(() => {
    depositStep = 1;
    updateWizard();
  }, 2000);
}
