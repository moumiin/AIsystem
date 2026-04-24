/**
 * 수화 학습 앱 메인 컨트롤러
 */

class SignLanguageApp {
  constructor() {
    this.renderer = null;
    this.tracker  = null;
    this.currentSign  = null;
    this.state        = 'idle'; // idle | selected | practicing | success
    this.successFrames = 0;
    this.scoreBuffer  = [];
    this.bestScore    = 0;

    // 성공 조건: 75점 이상 60프레임 유지 (~2초)
    this.SUCCESS_SCORE  = 75;
    this.SUCCESS_FRAMES = 60;

    this._initUI();
    this._initRenderer();
    this._renderGrid('numbers');
    this._setStatus('아래에서 배울 수화를 선택하세요 👇');
  }

  // ── UI 초기화 ────────────────────────────────────────────────────────────
  _initUI() {
    // 카테고리 탭
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._renderGrid(btn.dataset.category);
      });
    });

    // 카메라 버튼
    document.getElementById('start-camera-btn').addEventListener('click', () => {
      this._startCamera();
    });

    // 성공 모달 버튼
    document.getElementById('modal-next-btn').addEventListener('click', () => {
      this._closeModal();
      this._goNextSign();
    });
    document.getElementById('modal-retry-btn').addEventListener('click', () => {
      this._closeModal();
      this.successFrames = 0;
      this.bestScore = 0;
      if (this.tracker?.isRunning) this.state = 'practicing';
    });
  }

  // ── Three.js 렌더러 초기화 ───────────────────────────────────────────────
  _initRenderer() {
    const canvas = document.getElementById('three-canvas');
    this.renderer = new HandRenderer(canvas);
    this.renderer.setVisible(false);
  }

  // ── 수화 그리드 렌더링 ───────────────────────────────────────────────────
  _renderGrid(category) {
    const grid = document.getElementById('sign-grid');
    const signs = SIGNS.filter(s => s.category === category);

    grid.innerHTML = signs.map(sign => `
      <button class="sign-btn ${this.currentSign?.id === sign.id ? 'active' : ''}"
              data-id="${sign.id}"
              onclick="app.selectSign('${sign.id}')">
        <span class="btn-emoji">${sign.emoji}</span>
        <span class="btn-label">${sign.name}</span>
      </button>
    `).join('');
  }

  // ── 수화 선택 ────────────────────────────────────────────────────────────
  selectSign(signId) {
    this.currentSign  = SIGNS.find(s => s.id === signId);
    if (!this.currentSign) return;

    this.state         = this.tracker?.isRunning ? 'practicing' : 'selected';
    this.successFrames = 0;
    this.bestScore     = 0;
    this.scoreBuffer   = [];

    // UI 업데이트
    document.getElementById('sign-badge-name').textContent = this.currentSign.name;
    document.getElementById('sign-badge-emoji').textContent = this.currentSign.emoji;
    document.getElementById('sign-description').textContent = this.currentSign.description;
    this._setStatus(`💡 ${this.currentSign.hint}`);

    // 3D 시범 업데이트
    this.renderer.setVisible(true);
    this.renderer.resetColors();
    this.renderer.setPose(this.currentSign.pose);
    this.renderer._autoRotate = true;
    this.renderer._rotY = 0;
    this.renderer.handGroup.rotation.y = 0;

    // 점수 초기화
    this._updateScoreUI(0);

    // 그리드 활성 상태
    document.querySelectorAll('.sign-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.id === signId);
    });
  }

  // ── 카메라 시작 ─────────────────────────────────────────────────────────
  async _startCamera() {
    if (this.tracker?.isRunning) return;

    const btn = document.getElementById('start-camera-btn');
    btn.textContent = '🔄 카메라 로딩...';
    btn.disabled = true;

    try {
      const videoEl   = document.getElementById('webcam');
      const overlayEl = document.getElementById('overlay-canvas');

      this.tracker = new HandTracker(videoEl, overlayEl, r => this._onHandResult(r));
      await this.tracker.start();

      document.getElementById('webcam-placeholder').style.display = 'none';
      this._setTrackingStatus(true);
      btn.textContent = '✅ 카메라 실행 중';

      if (this.currentSign) {
        this.state = 'practicing';
        this._setStatus(`💡 ${this.currentSign.hint} (손을 카메라에 보여주세요)`);
      } else {
        this._setStatus('✅ 카메라 준비 완료! 수화를 선택하세요.');
      }
    } catch (err) {
      console.error(err);
      btn.textContent = '📷 카메라 시작';
      btn.disabled = false;
      this._setStatus('❌ 카메라 접근 실패. 브라우저 권한을 확인해주세요.');
    }
  }

  // ── MediaPipe 결과 처리 ──────────────────────────────────────────────────
  _onHandResult(result) {
    if (!result) {
      this._updateScoreUI(0);
      if (this.state === 'practicing') {
        this._setStatus('✋ 카메라에 손을 보여주세요');
        this.renderer.resetColors();
      }
      return;
    }

    if (this.state !== 'practicing' || !this.currentSign) return;

    const { landmarks, handedness } = result;
    const isRight = handedness === 'Right';

    const norm = normalizeLandmarks(landmarks, isRight);
    if (!norm) return;

    const score      = computeScore(norm, this.currentSign.pose);
    const perFinger  = computePerFingerScores(norm, this.currentSign.pose);

    // 이동평균 (10프레임) - 더 안정적인 점수 표시
    this.scoreBuffer.push(score);
    if (this.scoreBuffer.length > 10) this.scoreBuffer.shift();
    const smoothScore = Math.round(
      this.scoreBuffer.reduce((a, b) => a + b, 0) / this.scoreBuffer.length
    );

    this._updateScoreUI(smoothScore);
    this.renderer.setFingerColors(perFinger);
    this.tracker.setFingerColors(perFinger);

    if (smoothScore > this.bestScore) this.bestScore = smoothScore;

    // 성공 판정
    if (smoothScore >= this.SUCCESS_SCORE) {
      this.successFrames++;
      if (this.successFrames >= this.SUCCESS_FRAMES) {
        this._triggerSuccess();
        return;
      }
      const pct = Math.min(100, Math.round((this.successFrames / this.SUCCESS_FRAMES) * 100));
      this._setStatus(`🎯 완성 중... ${pct}% (자세 유지!)`);
    } else {
      this.successFrames = Math.max(0, this.successFrames - 2);
      this._setStatus(this._feedbackMessage(smoothScore, perFinger));
    }
  }

  // ── 점수 UI 업데이트 ─────────────────────────────────────────────────────
  _updateScoreUI(score) {
    document.getElementById('score-value').textContent = score;

    const circumference = 2 * Math.PI * 50; // r=50 → 314.16
    const offset = circumference * (1 - score / 100);
    const ring = document.getElementById('score-ring-fill');
    ring.style.strokeDashoffset = offset;

    const color = score >= 75 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444';
    ring.style.stroke = color;

    const label = document.getElementById('score-label');
    if (score >= 80)      label.textContent = '훌륭해요! 🎉';
    else if (score >= 60) label.textContent = '잘 하고있어요!';
    else if (score >= 35) label.textContent = '조금만 더!';
    else if (score > 0)   label.textContent = '손을 보여주세요';
    else                  label.textContent = '대기중';

    // 손가락 인디케이터 (색상은 renderer 에서 처리)
  }

  // ── 피드백 메시지 생성 ───────────────────────────────────────────────────
  _feedbackMessage(score, perFinger) {
    const KO = { thumb: '엄지', index: '검지', middle: '중지', ring: '약지', pinky: '새끼' };
    const weak = Object.entries(perFinger)
      .filter(([, s]) => s < 0.55)
      .map(([f]) => KO[f]);

    if (weak.length > 0) return `💡 ${weak.join(', ')} 손가락 위치를 맞춰보세요`;
    if (score >= 55)     return `👍 거의 다 됐어요! 조금만 더!`;
    return `💡 ${this.currentSign.hint}`;
  }

  // ── 성공 처리 ────────────────────────────────────────────────────────────
  _triggerSuccess() {
    if (this.state === 'success') return;
    this.state = 'success';

    document.getElementById('modal-sign-name').textContent = this.currentSign.name;
    document.getElementById('modal-best-score').textContent = this.bestScore;
    document.getElementById('success-modal').style.display = 'flex';
  }

  _closeModal() {
    document.getElementById('success-modal').style.display = 'none';
  }

  _goNextSign() {
    const idx  = SIGNS.findIndex(s => s.id === this.currentSign?.id);
    const next = SIGNS[(idx + 1) % SIGNS.length];
    this.selectSign(next.id);

    // 현재 카테고리 탭이 다를 경우 전환
    const activeCat = document.querySelector('.tab-btn.active')?.dataset.category;
    if (next.category !== activeCat) {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.category === next.category);
      });
      this._renderGrid(next.category);
    }
  }

  // ── 유틸 ─────────────────────────────────────────────────────────────────
  _setStatus(msg) {
    document.getElementById('status-message').textContent = msg;
  }

  _setTrackingStatus(active) {
    const el = document.getElementById('tracking-status');
    el.innerHTML = active
      ? '<span class="status-dot active"></span><span>추적 중</span>'
      : '<span class="status-dot"></span><span>카메라 대기</span>';
  }
}

// ── 앱 시작 ──────────────────────────────────────────────────────────────────
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new SignLanguageApp();
  // 기본 수화 선택
  app.selectSign('num1');
});
