// ===== 智能工具 =====
function initTools() {
  const send = document.getElementById('chat-send');
  const inp  = document.getElementById('chat-input');
  const msgs = document.getElementById('chat-messages');

  if (send && inp) {
    send.addEventListener('click', () => sendChat(inp, msgs));
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(inp, msgs); }
    });
  }

  // 快捷提示词
  document.querySelectorAll('.shortcut-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const inp = document.getElementById('chat-input');
      if (inp) { inp.value = pill.dataset.prompt || pill.textContent.trim(); inp.focus(); }
    });
  });
}

function sendChat(inp, container) {
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';

  // 用户消息
  const userRow = document.createElement('div');
  userRow.className = 'msg-row user';
  userRow.innerHTML = `<div class="msg-bubble user">${escapeHtml(text)}</div>`;
  container.appendChild(userRow);

  // AI 打字中
  const aiRow = document.createElement('div');
  aiRow.className = 'msg-row';
  aiRow.innerHTML = `
    <div class="msg-avatar"><ion-icon name="sparkles-outline"></ion-icon></div>
    <div class="msg-bubble ai">
      <span class="typing-dots"><span></span><span></span><span></span></span>
    </div>`;
  container.appendChild(aiRow);
  container.scrollTop = container.scrollHeight;

  setTimeout(() => {
    aiRow.querySelector('.msg-bubble').textContent = '正在分析相关文献内容，请稍候...';
    container.scrollTop = container.scrollHeight;
  }, 1600);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}


// ===== 工具演示逻辑 =====
function openToolModal(toolId, title) {
  const modal = document.getElementById("tool-demo-modal");
  const titleEl = document.getElementById("tool-modal-title");
  if (!modal) return;
  
  titleEl.textContent = title;
  
  // Hide all panels
  document.getElementById("demo-translate").style.display = "none";
  document.getElementById("demo-vis").style.display = "none";
  document.getElementById("demo-cite").style.display = "none";
  
  // Show target panel
  const panel = document.getElementById(toolId);
  if (panel) {
    if (toolId === "demo-vis") {
      panel.style.display = "flex";
      // Need a slight delay for echarts to get correct dimensions when modal opens
      setTimeout(initEcharts, 300);
    } else {
      panel.style.display = "block";
    }
  }
  
  modal.classList.add("show");
}

function closeToolModal() {
  const modal = document.getElementById("tool-demo-modal");
  if (modal) modal.classList.remove("show");
  if (echartInstance) {
    echartInstance.dispose();
    echartInstance = null;
  }
}

// 1. 翻译演示
function demoTranslate() {
  const spinner = document.getElementById("trans-spinner");
  const res = document.getElementById("trans-res");
  const type = document.getElementById("trans-type").value;
  
  spinner.style.display = "inline-block";
  res.innerHTML = "<div class=\"trans-placeholder\">AI 正在处理，请稍候...</div>";
  
  setTimeout(() => {
    spinner.style.display = "none";
    let text = "";
    if (type === "zh2en") {
      text = "This paper proposes a multi-head self-attention model incorporating domain knowledge for the precise extraction of entities and relations in Chinese medical texts.";
    } else if (type === "en2zh") {
      text = "该研究展现了显著的跨领域泛化能力，为未来的临床应用奠定了基础。";
    } else {
      text = "本文提出了一种融合领域知识的多头自注意力模型，以实现对中文医学文本中实体和关系的高精度抽取。该方法有效降低了噪声干扰，提升了整体性能。";
    }
    res.innerHTML = text;
  }, 1200);
}

// 2. 数据可视化演示
let echartInstance = null;
function initEcharts(type = "line") {
  const container = document.getElementById("echarts-container");
  if (!container || !window.echarts) return;
  
  if (echartInstance) {
    echartInstance.dispose();
  }
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  echartInstance = echarts.init(container, isDark ? 'dark' : null);
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: "axis" },
    legend: { 
      data: ["Model A", "Model B"]
    },
    xAxis: { 
      type: "category", 
      data: ["Epoch 1", "Epoch 2", "Epoch 3", "Epoch 4", "Epoch 5", "Epoch 6", "Epoch 7"]
    },
    yAxis: { 
      type: "value"
    },
    series: [
      { name: "Model A", type: type, data: [0.72, 0.78, 0.81, 0.84, 0.87, 0.89, 0.91], smooth: true },
      { name: "Model B", type: type, data: [0.70, 0.74, 0.76, 0.79, 0.81, 0.82, 0.82], smooth: true }
    ]
  };
  
  echartInstance.setOption(option);
}

function demoChartType(type) {
  initEcharts(type);
}

function demoLoadCSV() {
  showToast("已加载内置示例数据集 (Performance.csv)");
  initEcharts("line");
}

// Handle window resize for echarts
window.addEventListener("resize", () => {
  if (echartInstance) echartInstance.resize();
});

// 3. 引用转换演示
function demoCite() {
  const spinner = document.getElementById("cite-spinner");
  const res = document.getElementById("cite-res");
  const format = document.getElementById("cite-format").value;
  
  spinner.style.display = "inline-block";
  res.innerHTML = "<div class=\"trans-placeholder\">正在解析并转换格式...</div>";
  
  setTimeout(() => {
    spinner.style.display = "none";
    let text = "";
    if (format === "gbt") {
      text = "[1] VASWANI A, SHAZEER N, PARMAR N, et al. Attention is all you need[J]. Advances in neural information processing systems, 2017, 30.";
    } else if (format === "apa") {
      text = "Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., ... & Polosukhin, I. (2017). Attention is all you need. <i>Advances in neural information processing systems</i>, 30.";
    } else {
      text = "Vaswani, Ashish, et al. \"Attention is all you need.\" <i>Advances in neural information processing systems</i> 30 (2017).";
    }
    res.innerHTML = text;
  }, 1000);
}
