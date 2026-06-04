class AuthManager {
  constructor() {
    this.token = localStorage.getItem('handSignToken') || '';
    this.user = null;
    this.el = {
      form: document.getElementById('auth-form'),
      username: document.getElementById('auth-username'),
      password: document.getElementById('auth-password'),
      login: document.getElementById('auth-login-btn'),
      register: document.getElementById('auth-register-btn'),
      logout: document.getElementById('auth-logout-btn'),
      status: document.getElementById('auth-status'),
      user: document.getElementById('auth-user'),
      summary: document.getElementById('history-summary'),
      list: document.getElementById('history-list'),
    };
    this._bind();
    this.restore();
  }

  _bind() {
    this.el.login?.addEventListener('click', () => this.login());
    this.el.register?.addEventListener('click', () => this.register());
    this.el.logout?.addEventListener('click', () => this.logout());
    this.el.form?.addEventListener('submit', event => {
      event.preventDefault();
      this.login();
    });
  }

  async restore() {
    if (!this.token) {
      this.renderLoggedOut();
      return;
    }
    try {
      const data = await this.request('/api/auth/me');
      this.user = data.user;
      this.renderLoggedIn();
      await this.refreshHistory();
    } catch {
      localStorage.removeItem('handSignToken');
      this.token = '';
      this.renderLoggedOut();
    }
  }

  async login() {
    await this.authenticate('/api/auth/login');
  }

  async register() {
    await this.authenticate('/api/auth/register');
  }

  async authenticate(url) {
    const username = this.el.username?.value.trim();
    const password = this.el.password?.value.trim();
    if (!username || !password) {
      this.setStatus('아이디와 비밀번호를 입력해주세요.', 'warn');
      return;
    }

    try {
      const data = await this.request(url, {
        method: 'POST',
        body: JSON.stringify({ username, password, display_name: username }),
      }, false);
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('handSignToken', this.token);
      if (this.el.password) this.el.password.value = '';
      this.renderLoggedIn();
      await this.refreshHistory();
    } catch (err) {
      this.setStatus(err.message || '로그인에 실패했어요.', 'error');
    }
  }

  async logout() {
    if (this.token) {
      try {
        await this.request('/api/auth/logout', { method: 'POST' });
      } catch {}
    }
    this.token = '';
    this.user = null;
    localStorage.removeItem('handSignToken');
    this.renderLoggedOut();
  }

  async saveRecord(sign, result) {
    if (!this.token || !sign || !result) return;
    try {
      await this.request('/api/records', {
        method: 'POST',
        body: JSON.stringify({
          sign_id: sign.id || sign.name || '',
          sign_name: sign.name || sign.emoji || '수어',
          category: sign.category || '',
          score: Math.max(0, Math.min(100, Number(result.score) || 0)),
          success: Boolean(result.ok),
          feedback: String(result.feedback || result.message || '').replace(/<br\s*\/?>/gi, ' / '),
          duration_ms: Number(result.durationMs) || 0,
          frame_count: Number(result.frameCount) || 0,
        }),
      });
      await this.refreshHistory();
    } catch (err) {
      this.setStatus(`기록 저장 실패: ${err.message}`, 'error');
    }
  }

  async refreshHistory() {
    if (!this.token) return;
    const [summaryData, recordsData] = await Promise.all([
      this.request('/api/records/summary'),
      this.request('/api/records?limit=8'),
    ]);
    this.renderSummary(summaryData.summary);
    this.renderRecords(recordsData.records || []);
  }

  async request(url, options = {}, withAuth = true) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (withAuth && this.token) headers.Authorization = `Bearer ${this.token}`;
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || '요청에 실패했어요.');
    return data;
  }

  renderLoggedIn() {
    this.el.form?.classList.add('is-logged-in');
    if (this.el.user) this.el.user.textContent = `${this.user?.display_name || this.user?.username}님`;
    this.setStatus('로그인 중. 학습 기록이 저장됩니다.', 'ok');
  }

  renderLoggedOut() {
    this.el.form?.classList.remove('is-logged-in');
    if (this.el.user) this.el.user.textContent = '로그인 필요';
    if (this.el.summary) this.el.summary.textContent = '로그인하면 학습 기록이 저장됩니다.';
    if (this.el.list) this.el.list.innerHTML = '<li>아직 표시할 기록이 없어요.</li>';
    this.setStatus('기록 저장을 하려면 로그인해주세요.', 'warn');
  }

  renderSummary(summary) {
    if (!this.el.summary || !summary) return;
    this.el.summary.textContent = `총 ${summary.total_count}회 · 평균 ${summary.average_score}점 · 최고 ${summary.best_score}점`;
  }

  renderRecords(records) {
    if (!this.el.list) return;
    if (!records.length) {
      this.el.list.innerHTML = '<li>아직 표시할 기록이 없어요.</li>';
      return;
    }
    this.el.list.innerHTML = records.map(record => `
      <li>
        <span>${record.sign_name}</span>
        <strong>${Math.round(record.score)}점</strong>
      </li>
    `).join('');
  }

  setStatus(message, type = '') {
    if (!this.el.status) return;
    this.el.status.textContent = message;
    this.el.status.dataset.type = type;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.authManager = new AuthManager();
});
