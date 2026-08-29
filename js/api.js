/**
 * 甬学阁前端 API 封装层
 * 统一处理 token 注入、错误提示、基础 URL
 */

const API_BASE = 'http://localhost:5000';

// ===================== 基础请求 =====================
async function apiRequest(method, path, body = null, opts = {}) {
  const token = localStorage.getItem('nbscholar_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = {
    method,
    headers,
    ...opts,
  };
  if (body !== null) config.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.code === -1) {
    if (res.status === 401) {
      if (data.msg === 'ACCOUNT_REVOKED') {
          alert('您的账号已经被注销/封禁，请联系管理员。');
      } else if (data.msg === 'ACCOUNT_DELETED') {
          alert('您的账号不存在或已被删除。');
      }
      Auth.logout();
      throw new Error('未登录或登录已过期');
    }
    const msg = data.msg || `请求失败 (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

const apiGet    = (path, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiRequest('GET', qs ? `${path}?${qs}` : path);
};
const apiPost   = (path, body)   => apiRequest('POST',   path, body);
const apiPut    = (path, body)   => apiRequest('PUT',    path, body);
const apiDelete = (path)         => apiRequest('DELETE', path);

// ===================== 认证 =====================
const Auth = {
  async login(account, password) {
    const data = await apiPost('/api/auth/login', { account, password });
    localStorage.setItem('nbscholar_token', data.data.token);
    localStorage.setItem('nbscholar_user',  JSON.stringify(data.data.user));
    return data.data;
  },

  async register(payload) {
    const data = await apiPost('/api/auth/register', payload);
    localStorage.setItem('nbscholar_token', data.data.token);
    localStorage.setItem('nbscholar_user',  JSON.stringify(data.data.user));
    return data.data;
  },

  logout() {
    localStorage.removeItem('nbscholar_token');
    localStorage.removeItem('nbscholar_user');
    window.location.href = 'login.html';
  },

  async deleteAccount() {
    return await apiDelete('/api/auth/account');
  },

  async updateProfile(data) {
    const res = await apiPut('/api/auth/profile', data);
    if (res.data && res.data.user) {
      localStorage.setItem('nbscholar_user', JSON.stringify(res.data.user));
    }
    return res;
  },

  async updatePassword(new_password) {
    return await apiPut('/api/auth/password', { new_password });
  },

  getUser() {
    try { return JSON.parse(localStorage.getItem('nbscholar_user')); }
    catch { return null; }
  },

  isLoggedIn() { return !!localStorage.getItem('nbscholar_token'); },
};

// ===================== 用户 =====================
const UserAPI = {
  getMe()           { return apiGet('/api/user/me'); },
  updateMe(payload) { return apiPut('/api/user/me', payload); },
  getStats()        { return apiGet('/api/user/stats'); },
};

// ===================== 检索 =====================
const SearchAPI = {
  search(params) { return apiGet('/api/search', params); },
};

// ===================== 收藏 =====================
const FavoritesAPI = {
  list(params = {})      { return apiGet('/api/favorites', params); },
  add(paper_id)          { return apiPost('/api/favorites', { paper_id }); },
  remove(fav_id)         { return apiDelete(`/api/favorites/${fav_id}`); },
  removeByPaper(paper_id){ return apiDelete(`/api/favorites/by-paper/${paper_id}`); },
};

// ===================== 历史 =====================
const HistoryAPI = {
  list(params = {})   { return apiGet('/api/history', params); },
  delete(hist_id)     { return apiDelete(`/api/history/${hist_id}`); },
  clear()             { return apiDelete('/api/history/clear'); },
};

// ===================== 培训 =====================
const TrainingAPI = {
  list(params = {})   { return apiGet('/api/training', params); },
  get(id)             { return apiGet(`/api/training/${id}`); },
  enroll(id)          { return apiPost(`/api/training/${id}/enroll`); },
  cancelEnroll(id)    { return apiDelete(`/api/training/${id}/enroll`); },
  myEvents()          { return apiGet('/api/training/my'); },
};

// ===================== 期刊 =====================
const JournalAPI = {
  list(params = {})           { return apiGet('/api/journal', params); },
  match(title, abstract, opts){ return apiPost('/api/journal/match', { title, abstract, ...opts }); },
};

// ===================== 工具 =====================
const ToolsAPI = {
  translate(text, type)       { return apiPost('/api/tools/translate', { text, type }); },
  cite(citation, format)      { return apiPost('/api/tools/cite', { citation, format }); },
  getChatSessions()           { return apiGet('/api/tools/chat/sessions'); },
  getChatHistory(id)          { return apiGet(`/api/tools/chat/sessions/${id}`); },
  deleteChatSession(id)       { return apiDelete(`/api/tools/chat/sessions/${id}`); },

  /**
   * 流式 AI 对话（SSE）
   * @param {Array} messages   消息列表 [{role, content}]
   * @param {number} session_id 可选会话 ID
   * @param {Function} onChunk 收到每个 chunk 时的回调 (content: string, newSessionId?: number) => void
   * @param {Function} onDone  完成时的回调
   */
  async chatStream(messages, session_id, onChunk, onDone) {
    const token = localStorage.getItem('nbscholar_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/tools/chat`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ messages, session_id }),
    });

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop(); // 未完成的行留在 buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') { onDone?.(); return; }
        try {
          const obj = JSON.parse(payload);
          if (obj._session_id) onChunk('', obj._session_id); // 传递新建的 session_id
          if (obj.content) onChunk(obj.content);
          if (obj.error)   onChunk(`\n[错误] ${obj.error}`);
        } catch {}
      }
    }
    onDone?.();
  },
};

// 挂载到全局
window.Auth        = Auth;
window.UserAPI     = UserAPI;
window.SearchAPI   = SearchAPI;
window.FavoritesAPI= FavoritesAPI;
window.HistoryAPI  = HistoryAPI;
window.TrainingAPI = TrainingAPI;
window.JournalAPI  = JournalAPI;
window.ToolsAPI    = ToolsAPI;
