// ===== 智能工具 =====

// 保存聊天历史（用于多轮对话）
let _chatHistory = [];

function initTools() {
  _chatHistory = [];

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
      const chatInp = document.getElementById('chat-input');
      if (chatInp) { chatInp.value = pill.dataset.prompt || pill.textContent.trim(); chatInp.focus(); }
    });
  });
}

async function sendChat(inp, container) {
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  inp.style.height = 'auto';

  // 用户消息 DOM
  const userRow = document.createElement('div');
  userRow.className = 'msg-row user';
  userRow.innerHTML = `<div class="msg-bubble user">${_escTool(text)}</div>`;
  container.appendChild(userRow);
  container.scrollTop = container.scrollHeight;

  // 历史
  _chatHistory.push({ role: 'user', content: text });

  // AI 打字中 DOM
  const aiRow = document.createElement('div');
  aiRow.className = 'msg-row';
  aiRow.innerHTML = `
    <div class="msg-avatar"><ion-icon name="sparkles-outline"></ion-icon></div>
    <div class="msg-bubble ai" id="ai-typing">
      <span class="typing-dots"><span></span><span></span><span></span></span>
    </div>`;
  container.appendChild(aiRow);
  container.scrollTop = container.scrollHeight;

  const bubbleEl = aiRow.querySelector('.msg-bubble');
  let fullText = '';

  try {
    await ToolsAPI.chatStream(
      [..._chatHistory],
      (chunk) => {
        // 第一个 chunk 时清空打字动画
        if (bubbleEl.querySelector('.typing-dots')) {
          bubbleEl.innerHTML = '';
        }
        fullText += chunk;
        bubbleEl.innerHTML = _mdToHtml(fullText);
        container.scrollTop = container.scrollHeight;
      },
      () => {
        _chatHistory.push({ role: 'assistant', content: fullText });
      }
    );
  } catch (e) {
    bubbleEl.textContent = `[请求失败] ${e.message}`;
  }
}

// 简单 Markdown 渲染（加粗、行内代码、换行）
function _mdToHtml(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

// ===== 工具演示弹窗逻辑 =====
function openToolModal(toolId, title) {
  const modal   = document.getElementById('tool-demo-modal');
  const titleEl = document.getElementById('tool-modal-title');
  if (!modal) return;

  titleEl.textContent = title;

  ['demo-translate', 'demo-vis', 'demo-cite'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const panel = document.getElementById(toolId);
  if (panel) {
    panel.style.display = toolId === 'demo-vis' ? 'flex' : 'block';
    if (toolId === 'demo-vis') setTimeout(initEcharts, 300);
  }

  modal.classList.add('show');
}

function closeToolModal() {
  const modal = document.getElementById('tool-demo-modal');
  if (modal) modal.classList.remove('show');
  if (echartInstance) { echartInstance.dispose(); echartInstance = null; }
}

// ===================== 翻译（真实 API）=====================
async function demoTranslate() {
  const spinner = document.getElementById('trans-spinner');
  const res     = document.getElementById('trans-res');
  const type    = document.getElementById('trans-type').value;
  const srcText = document.getElementById('trans-src').value.trim();

  if (!srcText) { showToast('请输入需要翻译的文本'); return; }

  spinner.style.display = 'inline-block';
  res.innerHTML = '<div class="trans-placeholder">AI 正在处理，请稍候...</div>';

  try {
    const { data } = await ToolsAPI.translate(srcText, type);
    spinner.style.display = 'none';
    res.innerHTML = _mdToHtml(data.result);
  } catch (e) {
    spinner.style.display = 'none';
    res.innerHTML = `<div class="trans-placeholder" style="color:var(--red-500);">翻译失败：${e.message}</div>`;
  }
}

// ===================== 引用格式转换（真实 API）=====================
async function demoCite() {
  const spinner = document.getElementById('cite-spinner');
  const res     = document.getElementById('cite-res');
  const srcText = document.getElementById('cite-src').value.trim();
  const format  = document.getElementById('cite-format').value;

  if (!srcText) { showToast('请输入 BibTeX 或 RIS 内容'); return; }

  spinner.style.display = 'inline-block';
  res.innerHTML = '<div class="trans-placeholder">正在解析并转换格式...</div>';

  try {
    const { data } = await ToolsAPI.cite(srcText, format);
    spinner.style.display = 'none';
    res.innerHTML = _escTool(data.result);
  } catch (e) {
    spinner.style.display = 'none';
    res.innerHTML = `<div class="trans-placeholder" style="color:var(--red-500);">转换失败：${e.message}</div>`;
  }
}

// ===================== 数据可视化（保留本地演示）=====================
let echartInstance = null;
function initEcharts(type = 'line') {
  const container = document.getElementById('echarts-container');
  if (!container || !window.echarts) return;
  if (echartInstance) echartInstance.dispose();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  echartInstance = echarts.init(container, isDark ? 'dark' : null);

  echartInstance.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { data: ['Model A', 'Model B'] },
    xAxis: { type: 'category', data: ['E1','E2','E3','E4','E5','E6','E7'] },
    yAxis: { type: 'value' },
    series: [
      { name: 'Model A', type, data: [0.72,0.78,0.81,0.84,0.87,0.89,0.91], smooth: true },
      { name: 'Model B', type, data: [0.70,0.74,0.76,0.79,0.81,0.82,0.82], smooth: true },
    ],
  });
}

function demoChartType(type) { initEcharts(type); }
function demoLoadCSV() { showToast('已加载内置示例数据集'); initEcharts('line'); }

window.addEventListener('resize', () => { if (echartInstance) echartInstance.resize(); });

function fillChat(text) {
  const inp = document.getElementById('chat-input');
  if (inp) { inp.value = text; inp.focus(); }
}

function _escTool(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
