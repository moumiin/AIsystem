class AdminMode {
  constructor(appGetter) {
    this.getApp = appGetter;
    this.captures = [];

    this.drawer = document.getElementById('admin-drawer');
    this.openBtn = document.getElementById('admin-toggle');
    this.closeBtn = document.getElementById('admin-close');
    this.captureBtn = document.getElementById('admin-capture-btn');
    this.previewBtn = document.getElementById('admin-preview-btn');
    this.copyBtn = document.getElementById('admin-copy-btn');
    this.statusEl = document.getElementById('admin-status');
    this.exportEl = document.getElementById('admin-export');
    this.currentEl = document.getElementById('admin-current-sign');

    if (!this.drawer || !this.openBtn) return;

    this.openBtn.addEventListener('click', () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.drawer.addEventListener('click', event => {
      if (event.target === this.drawer) this.close();
    });
    this.captureBtn?.addEventListener('click', () => this.capture());
    this.previewBtn?.addEventListener('click', () => this.preview());
    this.copyBtn?.addEventListener('click', () => this.copyExport());

    setInterval(() => this.refreshCurrentSign(), 500);
  }

  open() {
    this.drawer.classList.add('open');
    this.drawer.setAttribute('aria-hidden', 'false');
    this.refreshCurrentSign();
    this.updateExport();
  }

  close() {
    this.drawer.classList.remove('open');
    this.drawer.setAttribute('aria-hidden', 'true');
  }

  get sign() {
    return this.getApp()?.currentSign || null;
  }

  refreshCurrentSign() {
    if (!this.currentEl) return;
    const sign = this.sign;
    this.currentEl.textContent = sign ? `${sign.name} (${sign.id})` : '없음';
  }

  capture() {
    const app = this.getApp();
    const sign = this.sign;
    if (!app?.tracker?.isRunning) {
      this.setStatus('카메라가 꺼져 있습니다. 먼저 카메라를 시작해주세요.', 'error');
      return;
    }
    if (!sign) {
      this.setStatus('선택된 수어가 없습니다. 수정할 수어를 먼저 골라주세요.', 'error');
      return;
    }
    if (!Array.isArray(app.lastNormalizedPose) || app.lastNormalizedPose.length < 21) {
      this.setStatus('아직 손 자세가 인식되지 않았습니다. 손을 카메라 화면 안에 맞춰주세요.', 'error');
      return;
    }

    const pose = this.roundPose(app.lastNormalizedPose);
    this.captures.push({
      signId: sign.id,
      signName: sign.name,
      handedness: app.lastPoseHandedness || 'Unknown',
      pose,
      capturedAt: new Date().toISOString(),
    });

    this.updateExport();
    this.setStatus(`${sign.id} 수어의 캡처 ${this.captures.length}개를 저장했습니다.`, 'ok');
  }

  preview() {
    const app = this.getApp();
    const latest = this.latestCapture();
    const sign = this.sign;
    const frames = this.sequenceForCurrentSign();
    if (!app?.renderer || !latest || !sign || frames.length === 0) {
      this.setStatus('아직 캡처된 자세가 없습니다.', 'error');
      return;
    }

    sign.pose = frames[0];
    sign.sequence = frames.length > 1 ? frames : null;
    app._applySign(sign);
    this.setStatus(
      frames.length > 1
        ? '캡처한 단계형 자세를 시범 패널에 반영했습니다.'
        : '캡처한 자세를 시범 패널에 반영했습니다.',
      'ok'
    );
  }

  async copyExport() {
    const text = this.exportEl?.value || '';
    if (!text.trim()) {
      this.setStatus('복사할 추출 코드가 아직 없습니다.', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.setStatus('추출 코드를 복사했습니다.', 'ok');
    } catch (_) {
      this.exportEl.focus();
      this.exportEl.select();
      document.execCommand('copy');
      this.setStatus('추출 코드를 선택한 뒤 복사했습니다.', 'ok');
    }
  }

  latestCapture() {
    const sign = this.sign;
    const list = sign ? this.captures.filter(c => c.signId === sign.id) : this.captures;
    return list[list.length - 1] || null;
  }

  sequenceForCurrentSign() {
    const sign = this.sign;
    if (!sign) return [];
    return this.captures.filter(c => c.signId === sign.id).map(c => c.pose);
  }

  updateExport() {
    if (!this.exportEl) return;
    const sign = this.sign;
    if (!sign) {
      this.exportEl.value = '';
      return;
    }

    const frames = this.sequenceForCurrentSign();
    if (frames.length === 0) {
      this.exportEl.value = `// "${sign.id}" 수어를 선택한 뒤 카메라를 켜고 올바른 손 자세를 캡처하세요.`;
      return;
    }

    const basePose = frames[0];
    const sequenceLine = frames.length > 1
      ? `,\n  sequence: ${this.formatPoseArray(frames, 2)}`
      : '';

    this.exportEl.value =
`// frontend/static/js/signs-data.js 에 적용할 보정 데이터
// id 가 "${sign.id}" 인 SIGNS 항목에 아래 필드를 추가하거나 교체하세요.
pose: ${this.formatPoseArray(basePose, 0)}${sequenceLine}

// 브라우저 콘솔에서 바로 반영:
Object.assign(SIGNS.find(sign => sign.id === ${JSON.stringify(sign.id)}), {
  pose: ${this.formatPoseArray(basePose, 2)}${sequenceLine ? `,\n  sequence: ${this.formatPoseArray(frames, 2)}` : ''}
});`;
  }

  roundPose(pose) {
    return pose.map(point => point.map(value => Number(value.toFixed(4))));
  }

  formatPoseArray(value, baseIndent = 0) {
    if (!Array.isArray(value)) return JSON.stringify(value);
    const indent = ' '.repeat(baseIndent);
    const childIndent = ' '.repeat(baseIndent + 2);

    if (value.length > 0 && Array.isArray(value[0]) && typeof value[0][0] === 'number') {
      return `[\n${value.map(point => `${childIndent}[${point.map(n => this.formatNumber(n)).join(', ')}]`).join(',\n')}\n${indent}]`;
    }

    return `[\n${value.map(frame => this.formatPoseArray(frame, baseIndent + 2)).join(',\n')}\n${indent}]`;
  }

  formatNumber(value) {
    return Number(value).toFixed(4).replace(/\.?0+$/, match => match === '.' ? '' : '');
  }

  setStatus(message, type = '') {
    if (!this.statusEl) return;
    this.statusEl.textContent = message;
    this.statusEl.classList.remove('ok', 'error');
    if (type) this.statusEl.classList.add(type);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.adminMode = new AdminMode(() => window.app || app);
});
