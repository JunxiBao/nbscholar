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

// ===== 工具演示跳转逻辑 =====
function openToolModal(toolId, title) {
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  if (toolId === 'demo-translate') {
    window.location.href = `pages/tool-translate.html?theme=${theme}`;
  } else if (toolId === 'demo-vis') {
    window.location.href = `pages/tool-vis.html?theme=${theme}`;
  } else if (toolId === 'demo-cite') {
    window.location.href = `pages/tool-cite.html?theme=${theme}`;
  }
}



function fillChat(text) {
  const inp = document.getElementById('chat-input');
  if (inp) { inp.value = text; inp.focus(); }
}

function _escTool(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
