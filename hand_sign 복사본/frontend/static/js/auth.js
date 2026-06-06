class AuthManager {
  constructor() {
    this.token = localStorage.getItem('handSignToken') || '';
    this.user = null;
    this.el = {
      bar: document.getElementById('auth-bar'),
      user: document.getElementById('auth-user'),
      openLogin: document.getElementById('open-login-btn'),
      openRegister: document.getElementById('open-register-btn'),
      logout: document.getElementById('auth-logout-btn'),
      status: document.getElementById('auth-status'),
      loginModal: document.getElementById('login-modal'),
      registerModal: document.getElementById('register-modal'),
      loginForm: document.getElementById('login-form'),
      registerForm: document.getElementById('register-form'),
      loginUsername: document.getElementById('login-username'),
      loginPassword: document.getElementById('login-password'),
      registerUsername: document.getElementById('register-username'),
      registerPassword: document.getElementById('register-password'),
      registerDisplayName: document.getElementById('register-display-name'),
      loginMessage: document.getElementById('login-message'),
      registerMessage: document.getElementById('register-message'),
      switchToRegister: document.getElementById('switch-to-register'),
      switchToLogin: document.getElementById('switch-to-login'),
      summary: document.getElementById('history-summary'),
      list: document.getElementById('history-list'),
    };
    this._bind();
    this.restore();
  }

  _bind() {
    this.el.openLogin?.addEventListener('click', () => this.openModal('login'));
    this.el.openRegister?.addEventListener('click', () => this.openModal('register'));
    this.el.logout?.addEventListener('click', () => this.logout());
    this.el.switchToRegister?.addEventListener('click', () => this.openModal('register'));
    this.el.switchToLogin?.addEventListener('click', () => this.openModal('login'));
    this.el.loginForm?.addEventListener('submit', event => {
      event.preventDefault();
      this.login();
    });
    this.el.registerForm?.addEventListener('submit', event => {
      event.preventDefault();
      this.register();
    });

    document.querySelectorAll('[data-auth-close]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModals());
    });
    [this.el.loginModal, this.el.registerModal].forEach(modal => {
      modal?.addEventListener('click', event => {
        if (event.target === modal) this.closeModals();
      });
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') this.closeModals();
    });
  }

  openModal(type) {
    this.closeModals();
    const modal = type === 'register' ? this.el.registerModal : this.el.loginModal;
    const input = type === 'register' ? this.el.registerUsername : this.el.loginUsername;
    modal?.classList.add('active');
    modal?.setAttribute('aria-hidden', 'false');
    this.setModalMessage(type, '');
    setTimeout(() => input?.focus(), 40);
  }

  closeModals() {
    [this.el.loginModal, this.el.registerModal].forEach(modal => {
      modal?.classList.remove('active');
      modal?.setAttribute('aria-hidden', 'true');
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
    const username = this.el.loginUsername?.value.trim();
    const password = this.el.loginPassword?.value.trim();
    await this.authenticate('/api/auth/login', {
      username,
      password,
      display_name: username,
    }, 'login');
  }

  async register() {
    const username = this.el.registerUsername?.value.trim();
    const password = this.el.registerPassword?.value.trim();
    const displayName = this.el.registerDisplayName?.value.trim() || username;
    await this.authenticate('/api/auth/register', {
      username,
      password,
      display_name: displayName,
    }, 'register');
  }

  async authenticate(url, payload, type) {
    if (!payload.username || !payload.password) {
      this.setModalMessage(type, '아이디와 비밀번호를 입력해주세요.', 'warn');
      return;
    }

    try {
      const data = await this.request(url, {
        method: 'POST',
        body: JSON.stringify(payload),
      }, false);
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('handSignToken', this.token);
      this.clearInputs();
      this.closeModals();
      this.renderLoggedIn();
      await this.refreshHistory();
      this._showOnboarding(data.user);
    } catch (err) {
      this.setModalMessage(type, err.message || '요청에 실패했어요.', 'error');
    }
  }

  _showOnboarding(user) {
    const name = user?.display_name || user?.username || '';
    const modal = document.getElementById('onboarding-modal');
    if (!modal) return;

    const title = document.getElementById('onboarding-title');
    const phrase = document.getElementById('onboarding-phrase');
    if (title) title.textContent = `환영해요, ${name}님!`;
    if (phrase) phrase.textContent = `"안녕하세요, ${name}입니다."`;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');

    const startBtn = document.getElementById('onboarding-start-btn');
    const skipBtn = document.getElementById('onboarding-skip-btn');

    const close = () => {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    };

    const onStart = () => {
      close();
      const input = document.getElementById('sign-search-input');
      if (input) {
        input.value = `안녕하세요 ${name}입니다`;
        input.dispatchEvent(new Event('compositionend'));
        document.getElementById('sign-search-btn')?.click();
      }
    };

    startBtn?.removeEventListener('click', startBtn._onboardingHandler);
    skipBtn?.removeEventListener('click', skipBtn._onboardingHandler);

    startBtn._onboardingHandler = onStart;
    skipBtn._onboardingHandler = close;

    startBtn?.addEventListener('click', onStart);
    skipBtn?.addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); }, { once: true });
  }

  clearInputs() {
    [
      this.el.loginPassword,
      this.el.registerPassword,
      this.el.registerDisplayName,
    ].forEach(input => {
      if (input) input.value = '';
    });
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
    this.el.bar?.classList.add('is-logged-in');
    if (this.el.user) this.el.user.textContent = `${this.user?.display_name || this.user?.username}님`;
    this.setStatus('학습 기록 저장 중', 'ok');
    const adminBtn = document.getElementById('admin-toggle');
    if (adminBtn) adminBtn.style.display = this.user?.username === 'admin' ? '' : 'none';
  }

  renderLoggedOut() {
    this.el.bar?.classList.remove('is-logged-in');
    if (this.el.user) this.el.user.textContent = '로그인 필요';
    if (this.el.summary) this.el.summary.textContent = '로그인하면 학습 기록이 저장됩니다.';
    if (this.el.list) this.el.list.innerHTML = '<li>아직 표시할 기록이 없어요.</li>';
    this.setStatus('기록 저장을 하려면 로그인해주세요.', 'warn');
    const adminBtn = document.getElementById('admin-toggle');
    if (adminBtn) adminBtn.style.display = 'none';
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

  setModalMessage(type, message, tone = '') {
    const target = type === 'register' ? this.el.registerMessage : this.el.loginMessage;
    if (!target) return;
    target.textContent = message;
    target.dataset.type = tone;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.authManager = new AuthManager();
});
