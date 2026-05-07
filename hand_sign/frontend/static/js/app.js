/**
 * 수화 학습 앱 메인 컨트롤러
 */

class SignLanguageApp {
  constructor() {
    this.renderer = null;
    this.tracker  = null;
    this.currentSign  = null;
    this.state        = 'idle';
    this.successFrames = 0;
    this.scoreBuffer  = [];
    this.bestScore    = 0;
    this.lastDetectedHands = [];
    this.lastNormalizedPose = null;
    this.lastPoseHandedness = null;

    this.SUCCESS_SCORE  = 65;
    this.SUCCESS_FRAMES = 45;
    this.STAGE_SUCCESS_FRAMES = 18;
    this.isSearchMode   = false;

    this._initUI();
    this._initRenderer();
    this._renderGrid('numbers');
    this._setStatus('위 검색창에서 단어를 검색하거나 아래 목록에서 수화를 선택하세요 👇');

    // 수어 검색 초기화
    this.signSearch = new SignSearch(this);

    // 자음/모음 데이터 로드
    this._loadJamos();
  }

  async _loadJamos() {
    try {
      const res = await fetch('/api/jamos');
      const jamos = await res.json();
      SIGNS.push(...jamos);
    } catch(e) {
      console.warn('자음/모음 로드 실패', e);
    }
  }

  _initUI() {
    const jamoSubtabs = document.getElementById('jamo-subtabs');

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.category;
        if (cat === 'jamo') {
          jamoSubtabs.style.display = 'flex';
          this._renderJamoGrid('consonants');
          document.querySelectorAll('.subtab-btn').forEach(b => b.classList.toggle('active', b.dataset.jamoType === 'consonants'));
        } else {
          jamoSubtabs.style.display = 'none';
          this._renderGrid(cat);
        }
      });
    });

    document.querySelectorAll('.subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._renderJamoGrid(btn.dataset.jamoType);
      });
    });

    document.getElementById('start-camera-btn').addEventListener('click', () => {
      this._startCamera();
    });

    document.getElementById('modal-next-btn').addEventListener('click', () => {
      this._closeModal();
      if (this.isSearchMode) {
        const seq    = this.signSearch?._sequence;
        const isSeq  = seq?.length > 1;
        const seqIdx = this.signSearch?._seqIndex ?? 0;
        const isLast = isSeq && seqIdx >= seq.length - 1;

        if (isSeq && !isLast) {
          this.signSearch._stepSeq(+1);
        } else {
          const input = document.getElementById('sign-search-input');
          if (input) { input.value = ''; input.focus(); }
        }
      } else {
        this._goNextSign();
      }
    });
    document.getElementById('modal-retry-btn').addEventListener('click', () => {
      this._closeModal();
      if (this.isSearchMode) {
        const seq    = this.signSearch?._sequence;
        const isSeq  = seq?.length > 1;
        const seqIdx = this.signSearch?._seqIndex ?? 0;
        const isLast = isSeq && seqIdx >= seq.length - 1;

        if (isLast) {
          // 처음부터 다시하기: 1번 지문자로 돌아감
          this.signSearch._seqIndex = 0;
          const input = document.getElementById('sign-search-input');
          this.signSearch._showSeqStep(input ? input.value.trim() : '');
          return;
        }
      }
      this.successFrames = 0;
      this.bestScore = 0;
      if (this.tracker?.isRunning) this.state = 'practicing';
    });
  }

  _initRenderer() {
    const canvas = document.getElementById('three-canvas');
    this.renderer = new HandRenderer(canvas);
    this.renderer.setVisible(false);
  }

  _renderJamoGrid(type) {
    const CONSONANT_ORDER = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    const VOWEL_ORDER     = ['ㅏ','ㅑ','ㅓ','ㅕ','ㅗ','ㅛ','ㅜ','ㅠ','ㅡ','ㅣ','ㅐ','ㅒ','ㅔ','ㅖ','ㅚ','ㅟ','ㅢ'];
    const order = type === 'consonants' ? CONSONANT_ORDER : VOWEL_ORDER;

    const jamoSigns = SIGNS.filter(s => s.category === 'jamo');
    const sorted = order
      .map(ch => jamoSigns.find(s => s.emoji === ch))
      .filter(Boolean);

    const grid = document.getElementById('sign-grid');
    grid.innerHTML = sorted.map(sign => `
      <button class="sign-btn ${this.currentSign?.id === sign.id ? 'active' : ''}"
              data-id="${sign.id}"
              onclick="app.selectSign('${sign.id}')">
        <span class="btn-emoji">${sign.emoji}</span>
        <span class="btn-label">${sign.name}</span>
      </button>`).join('');
  }

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

  selectSign(signId) {
    const sign = SIGNS.find(s => s.id === signId);
    if (!sign) return;
    this.isSearchMode = false;

    // 영상 모드 → 3D 모드 복원
    const videoEl  = document.getElementById('aihub-video');
    const canvasEl = document.getElementById('three-canvas');
    const errorEl  = document.getElementById('aihub-video-error');
    if (videoEl) { videoEl.pause(); videoEl.src = ''; videoEl.style.display = 'none'; }
    if (errorEl) errorEl.style.display = 'none';
    if (canvasEl) canvasEl.style.display = '';

    document.querySelectorAll('.sign-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.id === signId);
    });

    const stepsEl = document.getElementById('sign-search-steps');
    if (stepsEl) stepsEl.style.display = 'none';

    // AI Hub 단어 매핑이 있으면 자동 로드
    if (sign.aihubWord) {
      this._fetchAndApplyAihub(sign);
      return;
    }

    this._applySign(sign);
  }

  async _fetchAndApplyAihub(sign) {
    // 캐시된 데이터가 있으면 바로 적용
    if (sign._cachedVideoData) {
      this._setupSignContext(sign);
      this.signSearch._renderVideo(sign.name, sign._cachedVideoData);
      document.getElementById('sign-badge-emoji').textContent = sign.emoji || '🎬';
      if (this.tracker?.isRunning) this.state = 'practicing';
      return;
    }
    if (sign.pose) {
      this._applySign(sign);
      return;
    }

    // 로딩 상태 표시
    this._setupSignContext(sign);
    document.getElementById('sign-description').textContent = '수어 데이터 불러오는 중...';
    this._setStatus(`⏳ "${sign.name}" AI Hub 데이터 로딩 중...`);
    this.renderer.setVisible(false);

    try {
      const resp = await fetch('/api/sign-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sign.aihubWord }),
      });
      if (!resp.ok) throw new Error('없음');
      const data = await resp.json();

      sign.description = data.description || sign.description || sign.name;
      sign.hint        = data.hint        || sign.hint        || '수어 동작을 따라해보세요';

      if (data.landmarks) {
        sign.pose = data.landmarks;
        // Only use sequence for keypoint frame arrays, not fingerspell jamo objects
        sign.sequence = Array.isArray(data.sequence?.[0]) ? data.sequence : null;
        this._applySign(sign);
      } else {
        throw new Error('포즈 없음');
      }
    } catch(e) {
      document.getElementById('sign-description').textContent = sign.description || 'AI Hub 데이터 없음';
      this._setStatus(`⚠️ "${sign.name}" 데이터를 불러올 수 없습니다`);
      this.renderer.setVisible(false);
    }
  }

  _setupSignContext(sign) {
    this._stopSeqAnimation();
    this.currentSign   = sign;
    this.state         = this.tracker?.isRunning ? 'practicing' : 'selected';
    this.successFrames = 0;
    this.bestScore     = 0;
    this.scoreBuffer   = [];
    this._updateScoreUI(0);
    document.getElementById('sign-badge-name').textContent  = sign.name;
    document.getElementById('sign-badge-emoji').textContent = sign.emoji || '🤟';
    document.getElementById('sign-description').textContent = sign.description || sign.name;
    this._setStatus(sign.hint ? `💡 ${sign.hint}` : `💡 수어 동작을 따라해보세요`);
  }

  // 검색 결과로 수화 적용
  selectSearchSign(sign) {
    this.isSearchMode = true;
    this._applySign(sign);
    document.querySelectorAll('.sign-btn').forEach(btn => btn.classList.remove('active'));
  }

  _applySign(sign) {
    this._setupSignContext(sign);

    this.renderer.setVisible(true);
    this.renderer.resetColors();
    const FLIP_X_JAMOS = ['ㅓ (어)','ㅕ (여)','ㅔ (에)','ㅖ (예)'];
    this.renderer.setPose(sign.pose, FLIP_X_JAMOS.includes(sign.name));
    this.renderer._autoRotate = false;
    this.renderer._rotY = 0;
    this.renderer.handGroup.rotation.y = 0;

    this._updateScoreUI(0);

    if (sign.sequence?.length > 0) {
      this._startStageAnimation(sign);
    } else {
      this._setDemoStage(null);
    }
  }

  _startStageAnimation(sign) {
    const stages = this._getSequenceStages(sign);
    if (stages.length === 0) {
      this._setDemoStage(null);
      return;
    }

    sign._stagePassFrames = 0;
    this._showSequenceStage(sign, 0, stages);
  }

  _showSequenceStage(sign, stageIndex, stages = this._getSequenceStages(sign)) {
    const stage = stages[stageIndex];
    if (!stage) return;

    sign.pose = stage.frame;
    sign._currentStageFrame = stage.frame;
    sign._currentStageIndex = stageIndex;
    sign._stagePassFrames = 0;
    this.successFrames = 0;
    this.scoreBuffer = [];

    if (this.currentSign === sign) {
      this.currentSign.pose = stage.frame;
      this.renderer.setPose(stage.frame);
      this._updateScoreUI(0);
      this._setDemoStage({
        index: stageIndex,
        total: stages.length,
        sourceIndex: stage.sourceIndex,
      });
    }
  }

  _startSeqAnimation(sign) {
    return this._startStageAnimation(sign);
    const stages = this._getSequenceStages(sign);
    if (stages.length === 0) {
      this._setDemoStage(null);
      return;
    }

    let stageIdx = 0;
    const interval = Math.round(5000 / frames.length); // 5초에 전체 재생

    this._seqAnimTimer = setInterval(() => {
      if (!this.currentSign || this.currentSign !== sign) {
        this._stopSeqAnimation();
        return;
      }
      const frame = frames[frameIdx % frames.length];
      this.currentSign.pose = frame;
      this.renderer.setPose(frame);
      frameIdx++;
    }, interval);
  }

  _stopSeqAnimation() {
    if (this._seqAnimTimer) {
      clearInterval(this._seqAnimTimer);
      this._seqAnimTimer = null;
    }
  }

  _getSequenceStages(sign) {
    if (!sign || !Array.isArray(sign.sequence) || sign.sequence.length === 0) return [];

    if (!sign._sequenceStages) {
      const stageCount = Math.min(5, sign.sequence.length);
      const stages = [];
      const seen = new Set();

      for (let i = 0; i < stageCount; i++) {
        const idx = stageCount === 1
          ? 0
          : Math.round((i * (sign.sequence.length - 1)) / (stageCount - 1));
        if (seen.has(idx)) continue;
        seen.add(idx);

        const frame = sign.sequence[idx];
        if (Array.isArray(frame) && frame.length >= 21) {
          stages.push({ frame, sourceIndex: idx });
        }
      }

      sign._sequenceStages = stages;
    }

    return sign._sequenceStages;
  }

  _setDemoStage(stage) {
    const bar = document.getElementById('demo-stage-bar');
    const label = document.getElementById('demo-stage-label');
    const dots = document.getElementById('demo-stage-dots');
    if (!bar || !label || !dots) return;

    if (!stage) {
      bar.style.display = 'none';
      dots.innerHTML = '';
      return;
    }

    bar.style.display = 'flex';
    label.textContent = `현재 단계 ${stage.index + 1}/${stage.total}`;
    dots.innerHTML = Array.from({ length: stage.total }, (_, i) =>
      `<span class="demo-stage-dot ${i === stage.index ? 'active' : ''}"></span>`
    ).join('');
  }

  _advanceSequenceStage() {
    const sign = this.currentSign;
    const stages = this._getSequenceStages(sign);
    if (!sign || stages.length <= 1) return false;

    const currentIndex = sign._currentStageIndex ?? 0;
    if (currentIndex >= stages.length - 1) return false;

    this._showSequenceStage(sign, currentIndex + 1, stages);
    this._setStatus(`다음 단계 ${currentIndex + 2}/${stages.length} 동작을 따라해보세요`);
    return true;
  }

  _getScoringRefs(sign) {
    if (!sign) return [];

    if (Array.isArray(sign.sequence) && sign.sequence.length > 0) {
      if (Array.isArray(sign._currentStageFrame) && sign._currentStageFrame.length >= 21) {
        return [sign._currentStageFrame];
      }

      if (!sign._scoreKeyframes) {
        sign._scoreKeyframes = this._getSequenceStages(sign).map(stage => stage.frame);
      }
      return sign._scoreKeyframes;
    }

    return Array.isArray(sign.pose) && sign.pose.length >= 21 ? [sign.pose] : [];
  }

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

  _onHandResult(hands) {
    if (!Array.isArray(hands)) hands = [];
    this.lastDetectedHands = hands;
    if (!hands || hands.length === 0) {
      this.lastNormalizedPose = null;
      this.lastPoseHandedness = null;
      this._updateScoreUI(0);
      if (this.state === 'practicing') {
        this._setStatus('✋ 카메라에 손을 보여주세요');
        this.renderer.resetColors();
      }
      return;
    }

    const adminHand = hands.find(h => h?.landmarks);
    if (adminHand) {
      const adminNorm = normalizeLandmarks(adminHand.landmarks, adminHand.handedness === 'Right');
      if (adminNorm) {
        this.lastNormalizedPose = adminNorm;
        this.lastPoseHandedness = adminHand.handedness;
      }
    }

    if (this.state !== 'practicing' || !this.currentSign) return;

    let bestScore = -1;
    let bestNorm  = null;
    let bestPerFinger = null;
    let bestHandedness = null;

    for (const { landmarks, handedness } of hands) {
      const isRight = handedness === 'Right';
      const norm = normalizeLandmarks(landmarks, isRight);
      if (!norm) continue;

      const refs = this._getScoringRefs(this.currentSign);
      if (refs.length === 0) continue;

      let score = -1;
      let scoreRef = null;
      for (const ref of refs) {
        const candidate = computeScore(norm, ref);
        if (candidate > score) {
          score = candidate;
          scoreRef = ref;
        }
      }
      if (!scoreRef) continue;

      // 디버그: 1초마다 전체 21개 좌표 출력
      if (!this._dbgTimer) this._dbgTimer = 0;
      if (Date.now() - this._dbgTimer > 1000) {
        this._dbgTimer = Date.now();
        const tip = norm[8];
        const ref = scoreRef[8];
        console.log(`[DBG] hand=${handedness} score=${score} | user_tip=[${tip.map(v=>v.toFixed(2))}] ref_tip=[${ref.map(v=>v.toFixed(2))}]`);
        console.log('[DBG-ALL] user landmarks:');
        norm.forEach((p, i) => console.log(`  [${p[0].toFixed(3)}, ${p[1].toFixed(3)}, ${p[2].toFixed(3)}],  # ${i}`));
      }

      if (score > bestScore) {
        bestScore      = score;
        bestNorm       = norm;
        bestPerFinger  = computePerFingerScores(norm, scoreRef);
        bestHandedness = handedness;
      }
    }

    if (!bestNorm) return;
    this.lastNormalizedPose = bestNorm;
    this.lastPoseHandedness = bestHandedness;

    this.scoreBuffer.push(bestScore);
    if (this.scoreBuffer.length > 10) this.scoreBuffer.shift();
    const smoothScore = Math.round(
      this.scoreBuffer.reduce((a, b) => a + b, 0) / this.scoreBuffer.length
    );

    this._updateScoreUI(smoothScore);
    this.renderer.setFingerColors(bestPerFinger);
    this.tracker.setFingerColors(bestPerFinger, bestHandedness);

    if (smoothScore > this.bestScore) this.bestScore = smoothScore;

    if (smoothScore >= this.SUCCESS_SCORE) {
      this.successFrames++;
      const stages = this._getSequenceStages(this.currentSign);
      if (stages.length > 1) {
        this.currentSign._stagePassFrames = (this.currentSign._stagePassFrames || 0) + 1;
        const currentIndex = this.currentSign._currentStageIndex ?? 0;
        const pct = Math.min(100, Math.round((this.currentSign._stagePassFrames / this.STAGE_SUCCESS_FRAMES) * 100));

        if (this.currentSign._stagePassFrames >= this.STAGE_SUCCESS_FRAMES) {
          if (this._advanceSequenceStage()) return;
          this._triggerSuccess();
          return;
        }

        this._setStatus(`단계 ${currentIndex + 1}/${stages.length} 맞추는 중... ${pct}%`);
        return;
      }

      if (this.successFrames >= this.SUCCESS_FRAMES) {
        this._triggerSuccess();
        return;
      }
      const pct = Math.min(100, Math.round((this.successFrames / this.SUCCESS_FRAMES) * 100));
      this._setStatus(`🎯 완성 중... ${pct}% (자세 유지!)`);
    } else {
      this.successFrames = Math.max(0, this.successFrames - 2);
      if (this.currentSign) {
        this.currentSign._stagePassFrames = Math.max(0, (this.currentSign._stagePassFrames || 0) - 2);
      }
      this._setStatus(this._feedbackMessage(smoothScore, bestPerFinger));
    }
  }

  _updateScoreUI(score) {
    document.getElementById('score-value').textContent = score;

    const circumference = 2 * Math.PI * 50;
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
  }

  _feedbackMessage(score, perFinger) {
    const KO = { thumb: '엄지', index: '검지', middle: '중지', ring: '약지', pinky: '새끼' };
    const weak = Object.entries(perFinger)
      .filter(([, s]) => s < 0.55)
      .map(([f]) => KO[f]);

    if (weak.length > 0) return `💡 ${weak.join(', ')} 손가락 위치를 맞춰보세요`;
    if (score >= 55)     return `👍 거의 다 됐어요! 조금만 더!`;
    return `💡 ${this.currentSign.hint}`;
  }

  _triggerSuccess() {
    if (this.state === 'success') return;
    this.state = 'success';

    document.getElementById('modal-sign-name').textContent  = this.currentSign.name;
    document.getElementById('modal-best-score').textContent = this.bestScore;

    const seq = this.signSearch?._sequence;
    const isSeq = this.isSearchMode && seq?.length > 1;
    const seqIdx = this.signSearch?._seqIndex ?? 0;
    const isLastSeq = isSeq && seqIdx >= seq.length - 1;

    let nextBtnText, retryBtnText;
    if (!this.isSearchMode) {
      retryBtnText = '🔄 다시 하기';
      nextBtnText  = '다음 수화 →';
    } else if (isSeq && !isLastSeq) {
      retryBtnText = '🔄 다시 하기';
      nextBtnText  = `다음 수어 → (${seqIdx + 2}/${seq.length})`;
    } else {
      retryBtnText = '🔄 처음부터 다시하기';
      nextBtnText  = '다른 수화 검색하기 🔍';
    }

    document.getElementById('modal-retry-btn').textContent = retryBtnText;
    document.getElementById('modal-next-btn').textContent  = nextBtnText;
    document.getElementById('success-modal').style.display = 'flex';
  }

  _closeModal() {
    document.getElementById('success-modal').style.display = 'none';
  }

  _goNextSign() {
    const idx  = SIGNS.findIndex(s => s.id === this.currentSign?.id);
    const next = SIGNS[(idx + 1) % SIGNS.length];
    this.selectSign(next.id);

    const activeCat = document.querySelector('.tab-btn.active')?.dataset.category;
    if (next.category !== activeCat) {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.category === next.category);
      });
      this._renderGrid(next.category);
    }
  }

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
  window.app = app;
  app.selectSign('num1');
});
