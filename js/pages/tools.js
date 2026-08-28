// ===== 智能工具 =====

let _chatHistory = [];
let _currentSessionId = null;

async function initTools() {
  _chatHistory = [];
  _currentSessionId = null;

  const send = document.getElementById('chat-send');
  const inp  = document.getElementById('chat-input');
  const msgs = document.getElementById('chat-messages');

  if (send && inp) {
    send.onclick = () => sendChat(inp, msgs);
    inp.onkeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(inp, msgs); }
    };
  }

  // 快捷提示词
  document.querySelectorAll('.shortcut-pill').forEach(pill => {
    pill.onclick = () => {
      const chatInp = document.getElementById('chat-input');
      if (chatInp) { chatInp.value = pill.dataset.prompt || pill.textContent.trim(); chatInp.focus(); }
    };
  });
}

window.openHistoryModal = async () => {
  if (!Auth.isLoggedIn()) return showToast('请先登录后使用历史记录功能');
  document.getElementById('chat-history-modal').style.display = 'flex';
  await loadChatSessions();
};

window.closeHistoryModal = () => {
  const m = document.getElementById('chat-history-modal');
  if (m) m.style.display = 'none';
};

async function loadChatSessions() {
  const listEl = document.getElementById('chat-history-list');
  if (!listEl) return;
  try {
    const res = await ToolsAPI.getChatSessions();
    const sessions = res.data || [];
    if (sessions.length === 0) {
      listEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-tertiary); font-size:13px;">暂无历史记录</div>';
      return;
    }
    
    listEl.innerHTML = sessions.map(s => `
      <div class="chat-session-item ${_currentSessionId === s.id ? 'active' : ''}" onclick="loadChatHistory(${s.id})">
        <div class="chat-session-title" title="${_escTool(s.title)}">
          <ion-icon name="chatbubble-outline" style="margin-right:6px;"></ion-icon>
          ${_escTool(s.title)}
        </div>
        <div class="chat-session-del" onclick="deleteChatSession(event, ${s.id})">
          <ion-icon name="trash-outline"></ion-icon>
        </div>
      </div>
    `).join('');
  } catch (e) {
    listEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--red-500); font-size:13px;">加载失败</div>';
  }
}

async function loadChatHistory(id) {
  _currentSessionId = id;
  const msgsContainer = document.getElementById('chat-messages');
  msgsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-tertiary);">加载中...</div>';
  
  const shortcuts = document.getElementById('chat-shortcuts-container');
  if (shortcuts) shortcuts.style.display = 'none';

  try {
    const res = await ToolsAPI.getChatHistory(id);
    const msgs = res.data || [];
    _chatHistory = msgs.map(m => ({ role: m.role, content: m.content }));
    
    msgsContainer.innerHTML = '';
    msgs.forEach(m => {
      const row = document.createElement('div');
      row.className = m.role === 'user' ? 'msg-row user' : 'msg-row';
      if (m.role === 'user') {
        row.innerHTML = `<div class="msg-bubble user">${_escTool(m.content)}</div>`;
      } else {
        row.innerHTML = `
          <div class="msg-avatar"><ion-icon name="sparkles-outline"></ion-icon></div>
          <div class="msg-bubble ai">${_mdToHtml(m.content)}</div>
        `;
      }
      msgsContainer.appendChild(row);
    });
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
    window.closeHistoryModal();
  } catch (e) {
    msgsContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--red-500);">加载失败：${e.message}</div>`;
  }
}

window.newChat = () => {
  _currentSessionId = null;
  _chatHistory = [];
  const msgsContainer = document.getElementById('chat-messages');
  if (msgsContainer) {
    msgsContainer.innerHTML = `
      <div class="msg-row">
        <div class="msg-avatar"><ion-icon name="sparkles-outline"></ion-icon></div>
        <div class="msg-bubble ai">
          您好！我是您的科研 AI 助手。您可以粘贴文献内容让我生成摘要、提取数据，或者直接提问。
        </div>
      </div>
    `;
  }
  const shortcuts = document.getElementById('chat-shortcuts-container');
  if (shortcuts) shortcuts.style.display = 'flex';
  window.closeHistoryModal();
};

window.deleteChatSession = async (e, id) => {
  e.stopPropagation();
  if (!confirm('确定删除该历史对话吗？')) return;
  try {
    await ToolsAPI.deleteChatSession(id);
    if (_currentSessionId === id) window.newChat();
    else loadChatSessions();
  } catch (err) {
    showToast('删除失败：' + err.message);
  }
};

async function sendChat(inp, container) {
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  inp.style.height = 'auto';

  const shortcuts = document.getElementById('chat-shortcuts-container');
  if (shortcuts) shortcuts.style.display = 'none';

  const userRow = document.createElement('div');
  userRow.className = 'msg-row user';
  userRow.innerHTML = `<div class="msg-bubble user">${_escTool(text)}</div>`;
  container.appendChild(userRow);
  container.scrollTop = container.scrollHeight;

  _chatHistory.push({ role: 'user', content: text });

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
      _currentSessionId,
      (chunk, newSessionId) => {
        if (newSessionId) {
          _currentSessionId = newSessionId;
          setTimeout(loadChatSessions, 2500); // Wait for title summarization
        }
        if (chunk) {
          if (bubbleEl.querySelector('.typing-dots')) bubbleEl.innerHTML = '';
          fullText += chunk;
          bubbleEl.innerHTML = _mdToHtml(fullText);
          container.scrollTop = container.scrollHeight;
        }
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

// ===================== 数据可视化 =====================
let echartInstance = null;
let _visData = null;

function initEcharts(type = 'line', data = null) {
  const container = document.getElementById('echarts-container');
  if (!container || !window.echarts) return;
  if (echartInstance) echartInstance.dispose();

  if (data) _visData = data;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  echartInstance = echarts.init(container, isDark ? 'dark' : null);

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { data: _visData ? _visData.legend : [] },
    toolbox: {
      show: true,
      feature: {
        restore: { show: true, title: '还原视图' },
        saveAsImage: { 
          show: true, 
          title: '导出图片',
          excludeComponents: ['toolbox', 'dataZoom']
        }
      }
    },
    dataZoom: [
      { type: 'inside' },
      { type: 'slider', bottom: 10 }
    ],
    xAxis: { type: 'category', data: _visData ? _visData.xAxis : [] },
    yAxis: { type: 'value' },
    series: _visData ? _visData.series.map(s => ({ ...s, type, smooth: true })) : [],
  };
  
  if (!_visData) {
    option.title = { text: '请上传 CSV 数据以生成图表', left: 'center', top: 'center', textStyle: { color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 'normal' } };
  }

  echartInstance.setOption(option);
}

function demoChartType(type) { initEcharts(type); }

function handleCSVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) {
      showToast('CSV 文件格式错误或数据为空');
      return;
    }
    const headers = lines[0].split(',');
    const legend = headers.slice(1);
    const xAxis = [];
    const series = legend.map(name => ({ name, data: [] }));

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      xAxis.push(parts[0]);
      for (let j = 1; j < parts.length; j++) {
        if (series[j-1]) {
          series[j-1].data.push(parseFloat(parts[j]) || 0);
        }
      }
    }
    initEcharts('line', { legend, xAxis, series });
    showToast('CSV 数据加载成功');
  };
  reader.readAsText(file);
  event.target.value = '';
}

function handleCiteUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const input = document.getElementById('cite-src');
    if (input) input.value = e.target.result;
    showToast('引用文件加载成功');
  };
  reader.readAsText(file);
  event.target.value = '';
}

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
