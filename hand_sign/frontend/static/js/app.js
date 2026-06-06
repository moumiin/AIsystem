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
    this.currentScore = 0;
    this.lastDetectedHands = [];
    this.lastNormalizedPose = null;
    this.lastPoseHandedness = null;
    this.motionBuffer = [];
    this.dynamicAttemptBuffer = [];
    this._noHandStreak = 0;
    this._isGestureRecording = false;
    this._lastGestureResult = null;
    this.GESTURE_MIN_FRAMES = 10;
    this.GESTURE_END_NO_HAND_FRAMES = 6;
    this.jamoAiModel = null;
    this.lastJamoAiPrediction = null;
    this.demoViewYaw = 0;
    this.demoViewPitch = 0;
    this._demoViewDragging = false;
    this._lastDemoPointer = null;
    this._lastHandDebugAt = 0;
    this.demoSpeed = 'normal';

    this.SUCCESS_SCORE  = 70;
    this.SUCCESS_FRAMES = 32;
    this.STAGE_SUCCESS_FRAMES = 16;
    this.isSearchMode   = false;

    this._initUI();
    this._initRenderer();
    this._setStatus('위 검색창에서 단어를 검색하거나 아래 목록에서 수화를 선택하세요 👇');

    // 수어 검색 초기화
    this.signSearch = new SignSearch(this);

    // 자음/모음 데이터 로드
    this._loadJamos();
    this._loadJamoAiModel();
    this._initHandDebug();
  }

  _initHandDebug() {
    window.handDebug = {
      enabled: false,
      latest: null,
      on() {
        this.enabled = true;
        console.log('[handDebug] 켜짐: 손 좌표가 0.5초마다 출력됩니다.');
      },
      off() {
        this.enabled = false;
        console.log('[handDebug] 꺼짐');
      },
      print() {
        console.log('[handDebug.latest]', this.latest);
      },
    };
  }

  async _loadJamos() {
    try {
      const res = await fetch('/api/jamos');
      const jamos = await res.json();
      jamos.forEach(j => {
        j.dataFormat = j.dataFormat || 'jamo';
        j.source = j.source || 'verified';
      });
      SIGNS.push(...jamos);
      if (document.querySelector('.tab-btn.active')?.dataset.category === 'jamo') {
        this._renderJamoGrid('consonants');
      }
    } catch(e) {
      console.warn('자음/모음 로드 실패', e);
    }
  }

  async _loadJamoAiModel() {
    try {
      const res = await fetch('/api/jamo-ai/model');
      const data = await res.json();
      this.jamoAiModel = data.model || null;
      return this.jamoAiModel;
    } catch (e) {
      console.warn('지문자 AI 모델 로드 실패', e);
      this.jamoAiModel = null;
      return null;
    }
  }

  _flattenPoseForAi(norm) {
    if (!Array.isArray(norm) || norm.length < 21) return null;
    const features = [];
    for (const point of norm.slice(0, 21)) {
      if (!Array.isArray(point)) return null;
      features.push(Number(point[0] || 0), Number(point[1] || 0), Number(point[2] || 0));
    }
    return features;
  }

  _jamoAiPredict(norm) {
    const model = this.jamoAiModel;
    const features = this._flattenPoseForAi(norm);
    const prototypes = Array.isArray(model?.prototypes) ? model.prototypes : [];
    const centroids = model?.centroids || {};
    if (!features || (prototypes.length === 0 && Object.keys(centroids).length === 0)) return null;

    const distance = (a, b) => {
      let sum = 0;
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const diff = Number(a[i] || 0) - Number(b[i] || 0);
        sum += diff * diff;
      }
      return Math.sqrt(sum / Math.max(1, Math.min(a.length, b.length)));
    };

    if (prototypes.length > 0) {
      const ranked = prototypes
        .filter(proto => proto?.label && Array.isArray(proto.features) && proto.features.length === 63)
        .map(proto => ({
          label: proto.label,
          distance: distance(features, proto.features),
          count: model.counts?.[proto.label] || 0,
        }))
        .sort((a, b) => a.distance - b.distance);

      if (ranked.length === 0) return null;

      const votes = {};
      const bestDistance = {};
      ranked.slice(0, 9).forEach(item => {
        const weight = 1 / Math.max(item.distance, 0.0001);
        votes[item.label] = (votes[item.label] || 0) + weight;
        bestDistance[item.label] = Math.min(bestDistance[item.label] ?? item.distance, item.distance);
      });

      const totalVote = Object.values(votes).reduce((sum, value) => sum + value, 0) || 1;
      const labels = Object.keys(votes).sort((a, b) => votes[b] - votes[a]);
      const best = labels[0];
      return {
        label: best,
        confidence: Math.round(Math.max(0, Math.min(100, (votes[best] / totalVote) * 100))),
        distance: bestDistance[best],
        top: labels.slice(0, 3).map(label => ({
          label,
          confidence: Math.round(Math.max(0, Math.min(100, (votes[label] / totalVote) * 100))),
          distance: bestDistance[label],
          count: model.counts?.[label] || 0,
        })),
        userSampleCount: model.user_sample_count || 0,
        augmentedSampleCount: model.augmented_sample_count || prototypes.length,
      };
    }

    const ranked = Object.entries(centroids)
      .filter(([, centroid]) => Array.isArray(centroid) && centroid.length === 63)
      .map(([label, centroid]) => ({
        label,
        distance: distance(features, centroid),
        count: model.counts?.[label] || 0,
      }))
      .sort((a, b) => a.distance - b.distance);

    if (ranked.length === 0) return null;
    const best = ranked[0];
    const second = ranked[1]?.distance ?? best.distance + 1;
    const margin = Math.max(0, Math.min(1, (second - best.distance) / Math.max(second, 1e-6)));
    return {
      label: best.label,
      confidence: Math.round(Math.max(0, Math.min(100, 45 + margin * 55))),
      distance: best.distance,
      top: ranked.slice(0, 3),
      userSampleCount: model.user_sample_count || 0,
    };
  }

  _jamoExpectedLabel(sign) {
    if (!sign) return '';
    return sign.emoji || (sign.id || '').replace(/^jamo_/, '');
  }

  _scoreWithJamoAi(score, norm, sign) {
    if (!this._isFingerSpellingSign(sign)) {
      this.lastJamoAiPrediction = null;
      return score;
    }

    const prediction = this._jamoAiPredict(norm);
    this.lastJamoAiPrediction = prediction;
    if (!prediction) return score;

    const expected = this._jamoExpectedLabel(sign);
    if (prediction.label === expected) {
      return score;
    }

    if (prediction.confidence >= 50) {
      return Math.min(score, 58);
    }
    return Math.min(score, 65);
  }

  _initUI() {
    const jamoSubtabs = document.getElementById('jamo-subtabs');
    const categoryTabs = document.getElementById('category-tabs');
    const categories = Object.entries(CATEGORY_META);

    if (categoryTabs && categories.length > 0) {
      categoryTabs.innerHTML = categories.map(([id, meta], index) => `
        <button class="tab-btn ${index === 0 ? 'active' : ''}" data-category="${id}">
          ${meta.emoji || ''} ${meta.label}
        </button>
      `).join('');
    }

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

    const firstCategory = categories[0]?.[0] || 'jamo';
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === firstCategory);
    });
    if (firstCategory === 'jamo') {
      jamoSubtabs.style.display = 'flex';
      this._renderJamoGrid('consonants');
    } else {
      jamoSubtabs.style.display = 'none';
      this._renderGrid(firstCategory);
    }

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
    this.motionBuffer = [];
    this.dynamicAttemptBuffer = [];
    if (this.tracker?.isRunning) this.state = 'practicing';
  });

    this._initDemoViewControls();
  }

  _initDemoViewControls() {
    const canvas = document.getElementById('openpose-demo-canvas');
    const leftBtn = document.getElementById('demo-rotate-left');
    const rightBtn = document.getElementById('demo-rotate-right');
    const resetBtn = document.getElementById('demo-rotate-reset');
    const speedControl = document.getElementById('demo-speed-control');

    const rotate = (delta) => {
      this.demoViewYaw = Math.max(-75, Math.min(75, this.demoViewYaw + delta));
      this._refreshDemoView();
    };

    leftBtn?.addEventListener('click', () => rotate(-15));
    rightBtn?.addEventListener('click', () => rotate(15));
    resetBtn?.addEventListener('click', () => {
      this.demoViewYaw = 0;
      this.demoViewPitch = 0;
      this._refreshDemoView();
    });

    speedControl?.querySelectorAll('[data-demo-speed]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.demoSpeed = btn.dataset.demoSpeed || 'normal';
        speedControl.querySelectorAll('[data-demo-speed]').forEach(item => {
          item.classList.toggle('active', item === btn);
        });
        if (this.currentSign) this.playOpenPose(this.currentSign);
      });
    });

    if (!canvas) return;

    canvas.addEventListener('pointerdown', (event) => {
      if (!this._isRotatableDemo(this.currentSign)) return;
      this._demoViewDragging = true;
      this._lastDemoPointer = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture?.(event.pointerId);
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!this._demoViewDragging || !this._lastDemoPointer) return;
      const dx = event.clientX - this._lastDemoPointer.x;
      const dy = event.clientY - this._lastDemoPointer.y;
      this.demoViewYaw = Math.max(-75, Math.min(75, this.demoViewYaw + dx * 0.45));
      this.demoViewPitch = Math.max(-35, Math.min(35, this.demoViewPitch - dy * 0.30));
      this._lastDemoPointer = { x: event.clientX, y: event.clientY };
      this._refreshDemoView();
    });

    const stopDrag = (event) => {
      this._demoViewDragging = false;
      this._lastDemoPointer = null;
      canvas.releasePointerCapture?.(event.pointerId);
    };
    canvas.addEventListener('pointerup', stopDrag);
    canvas.addEventListener('pointercancel', stopDrag);
    canvas.addEventListener('pointerleave', () => {
      this._demoViewDragging = false;
      this._lastDemoPointer = null;
    });
  }

  _isRotatableDemo(sign) {
    if (!sign) return false;
    return sign.category === 'jamo'
      || sign.category === 'numbers'
      || sign.source === 'verified'
      || sign.source === 'fingerspell'
      || /^jamo_/.test(sign.id || '');
  }

  _toggleDemoViewControls(show) {
    const controls = document.getElementById('demo-view-controls');
    if (!controls) return;
    controls.classList.toggle('active', !!show);
    this._updateDemoViewAngleLabel();
  }

  _toggleDemoSpeedControl(show) {
    const control = document.getElementById('demo-speed-control');
    if (!control) return;
    control.classList.toggle('active', !!show);
  }

  _demoFrameInterval(sequenceLength) {
    if (sequenceLength <= 1) return 500;
    return this.demoSpeed === 'slow' ? 160 : 80;
  }

  _updateDemoViewAngleLabel() {
    const label = document.getElementById('demo-view-angle');
    if (!label) return;
    const yaw = Math.round(this.demoViewYaw);
    const pitch = Math.round(this.demoViewPitch);
    const side = yaw === 0 ? '정면' : (yaw < 0 ? '왼쪽' : '오른쪽');
    label.textContent = pitch === 0
      ? `${side} ${Math.abs(yaw)}도`
      : `${side} ${Math.abs(yaw)}도 / 상하 ${pitch}도`;
  }

  _refreshDemoView() {
    this._updateDemoViewAngleLabel();
    if (!this.currentSign) return;
    const frame = this._getActivePracticeFrame(this.currentSign);
    if (frame) this.drawOpenPoseFrame(frame);
  }

  _initRenderer() {
    this.demoCanvas =
      document.getElementById(
        'openpose-demo-canvas'
      );

    this.demoCtx =
      this.demoCanvas.getContext('2d');

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
    if (videoEl) {
      videoEl.pause();
      videoEl.src = '';
      videoEl.style.display = 'none';
      videoEl.classList.remove('jamo-reference-video');
    }
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

    try {
      const resp = await fetch('/api/sign-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sign.aihubWord }),
      });
      if (!resp.ok) throw new Error('없음');
      const data = await resp.json();

      if (this._isStudyWord(sign) && (data.source === 'fingerspell' || !this._hasFullBodyDemoData(data))) {
        throw new Error('word-data-missing');
      }

      const isNumberSign = sign.category === 'numbers';
      sign.description = isNumberSign
        ? `${sign.name} 지숫자 손모양입니다`
        : (data.description || sign.description || sign.name);
      sign.hint        = isNumberSign
        ? `${sign.name} 지숫자 손모양을 카메라 앞에서 잠시 유지하세요`
        : (data.hint || sign.hint || '수어 동작을 따라해보세요');
      sign.source      = isNumberSign ? 'number_static' : (data.source || sign.source);
      sign.dataFormat  = isNumberSign ? (data.data_format || 'hand21') : (data.data_format || data.dataFormat || sign.dataFormat);
      sign.hands       = data.hands       || this._inferHandsFromData(data) || sign.hands;

      if (data.landmarks) {
        const numberFrame = isNumberSign && Array.isArray(data.sequence) && data.sequence.length > 0
          ? data.sequence[Math.floor(data.sequence.length / 2)]
          : data.landmarks;
        sign.pose = isNumberSign ? this._normalizeNumberReferenceFrame(numberFrame) : numberFrame;
        // Only use sequence for keypoint frame arrays, not fingerspell jamo objects
        sign.sequence = isNumberSign ? null : (Array.isArray(data.sequence?.[0]) ? data.sequence : null);
        if (!sign.dataFormat) sign.dataFormat = this._resolveDataFormat(sign);
        this._applySign(sign);
      } else {
        throw new Error('포즈 없음');
      }
    } catch(e) {
      const missingWordData = e?.message === 'word-data-missing';
      this._stopSeqAnimation();
      this._setDemoStage(null);
      this.drawOpenPoseFrame(null);
      document.getElementById('sign-description').textContent = missingWordData
        ? `${sign.name} 단어 수어 데이터가 아직 연결되지 않았어요. 지문자로 대체하지 않고 단어 수어 데이터가 있을 때만 시범을 보여줍니다.`
        : (sign.description || 'AI Hub 데이터 없음');
      this._setLiveFeedback(missingWordData
        ? '이 단어는 현재 연결된 단어 수어 데이터가 없습니다. 잘못된 지문자 시범으로 대체하지 않도록 막아두었습니다.'
        : '수어 데이터를 불러오지 못했어요. 다른 단어를 선택해보세요.');
      this._setStatus(missingWordData
        ? `⚠️ "${sign.name}" 단어 수어 데이터가 없습니다`
        : `⚠️ "${sign.name}" 데이터를 불러올 수 없습니다`);
    }
  }

  _normalizeNumberReferenceFrame(frame) {
    if (!Array.isArray(frame) || frame.length < 21 || !Array.isArray(frame[0])) return frame;

    const points = frame.slice(0, 21).map(point => [
      Number(point?.[0] || 0),
      Number(point?.[1] || 0),
      Number(point?.[2] || 0),
    ]);
    const active = points.filter(point =>
      Math.abs(point[0]) + Math.abs(point[1]) + Math.abs(point[2]) > 0.001
    );
    if (active.length < 8) return frame;

    const wrist = points[0];
    const middleMcp = points[9];
    let scale = Math.hypot(
      middleMcp[0] - wrist[0],
      middleMcp[1] - wrist[1],
      (middleMcp[2] - wrist[2]) * 0.15
    );
    if (scale < 1e-5) {
      scale = Math.max(...active.map(point =>
        Math.hypot(point[0] - wrist[0], point[1] - wrist[1], (point[2] - wrist[2]) * 0.15)
      ));
    }
    if (scale < 1e-5) return frame;

    return points.map(point => [
      (point[0] - wrist[0]) / scale,
      -(point[1] - wrist[1]) / scale,
      -((point[2] - wrist[2]) / scale),
    ]);
  }

  _isStudyWord(sign) {
    return ['greet', 'school', 'traffic'].includes(sign?.category);
  }

  _hasFullBodyDemoData(data) {
    const frames = Array.isArray(data?.sequence) && data.sequence.length > 0
      ? data.sequence
      : (data?.landmarks ? [data.landmarks] : []);

    return frames.some(frame =>
      Array.isArray(frame)
      && frame.length >= 150
      && typeof frame[0] === 'number'
    );
  }

  _inferHandsFromData(data) {
    const frames = Array.isArray(data?.sequence) && data.sequence.length > 0
      ? data.sequence
      : (data?.landmarks ? [data.landmarks] : []);

    let validFrames = 0;
    let twoHandFrames = 0;
    for (const frame of frames) {
      const count = this._countHandsInFrame(frame);
      if (count > 0) validFrames += 1;
      if (count >= 2) twoHandFrames += 1;
    }

    if (validFrames === 0) return null;
    return twoHandFrames / validFrames >= 0.35 ? 2 : 1;
  }

  _setupSignContext(sign) {
    this._stopSeqAnimation();
    this.currentSign   = sign;
    this.state = this.tracker?.isRunning ? 'practicing' : 'selected';
    this.successFrames = 0;
    this.bestScore     = 0;
    this._resetGestureRecording();
    this._lastGestureResult = null;
    this._updateScoreUI(0);
    this._updateFingerDots(null);
    this._setLiveFeedback(sign.hint
      ? `준비: ${sign.hint} 손이 보이면 기록 시작, 손을 치우면 채점됩니다.`
      : '시범을 보고 손이 보이는 동안 동작한 뒤, 손을 치우면 점수가 나옵니다.');
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
    if (!sign.dataFormat) {
      sign.dataFormat = this._resolveDataFormat(sign);
    }

    this._setupSignContext(sign);
    this.demoViewYaw = sign?.emoji === 'ㅇ' || sign?.name?.startsWith('ㅇ ')
      ? 90
      : 0;
    this.demoViewPitch = 0;
    this._toggleDemoViewControls(this._isRotatableDemo(sign));
    this._syncDemoHandSlots(sign);

    this.playOpenPose(sign);

    this._updateScoreUI(0);

    if (sign.sequence?.length > 0) {

      this._setDemoStage({
        mode: 'video',
        index: 0,
        total: sign.sequence.length,
      });

    } else {

      this._setDemoStage(null);

    }
  }

  playReferenceVideo(sign) {
    const videoEl = document.getElementById('aihub-video');
    const canvasEl = document.getElementById('three-canvas');
    const demoCanvasEl = document.getElementById('openpose-demo-canvas');
    const errorEl = document.getElementById('aihub-video-error');

    this._stopSeqAnimation();

    if (canvasEl) canvasEl.style.display = 'none';
    if (demoCanvasEl) demoCanvasEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    this._toggleDemoViewControls(false);
    this._toggleDemoSpeedControl(false);

    if (!videoEl) return;

    videoEl.pause();
    videoEl.loop = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.src = sign.videoUrl;
    videoEl.classList.add('jamo-reference-video');
    videoEl.style.display = 'block';
    videoEl.load();
    videoEl.play().catch(() => {
      if (errorEl) errorEl.style.display = 'flex';
    });
  }

  _getDemoHandMode(sign) {
    if (!sign) return 'auto';
    if (sign.hands === 1 || sign.handMode === 'one') return 'one';
    if (sign.hands === 2 || sign.handMode === 'two') return 'two';
    if (sign.category === 'numbers' || sign.category === 'jamo') return 'one';
    if (sign.source === 'verified' || sign.source === 'fingerspell') return 'one';
    return 'two';
  }

  _startStageAnimation(sign) {
    sign._demoMode = 'stage';
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
      this._syncDemoHandSlots(this.currentSign);
      this._updateScoreUI(0);
      this._setDemoStage({
        index: stageIndex,
        total: stages.length,
        sourceIndex: stage.sourceIndex,
      });
    }
  }


  _stopSeqAnimation() {
    if (this._seqAnimTimer) {
      clearInterval(this._seqAnimTimer);
      this._seqAnimTimer = null;
    }
    if (this.refTimer) {
      clearInterval(this.refTimer);
      this.refTimer = null;
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

  _getScoreKeyframes(sign) {
    if (!sign || !Array.isArray(sign.sequence) || sign.sequence.length === 0) return [];
    if (sign._scoreKeyframes) return sign._scoreKeyframes;

    const frameCount = Math.min(14, sign.sequence.length);
    const frames = [];
    const seen = new Set();

    for (let i = 0; i < frameCount; i++) {
      const idx = frameCount === 1
        ? 0
        : Math.round((i * (sign.sequence.length - 1)) / (frameCount - 1));
      if (seen.has(idx)) continue;
      seen.add(idx);
      frames.push(sign.sequence[idx]);
    }

    sign._scoreKeyframes = frames;
    return frames;
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
    label.textContent = stage.mode === 'video'
      ? `시범 재생중 ${stage.index + 1}/${stage.total}`
      : `현재 단계 ${stage.index + 1}/${stage.total}`;
    const dotTotal = stage.mode === 'video' ? Math.min(20, stage.total) : stage.total;
    const activeDot = stage.mode === 'video'
      ? Math.floor((stage.index / Math.max(1, stage.total - 1)) * Math.max(0, dotTotal - 1))
      : stage.index;
    dots.innerHTML = Array.from({ length: dotTotal }, (_, i) =>
      `<span class="demo-stage-dot ${i === activeDot ? 'active' : ''}"></span>`
    ).join('');
  }

  _advanceSequenceStage() {
    const sign = this.currentSign;
    if (sign?._demoMode === 'video') return false;
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
    const slots = this._syncDemoHandSlots(sign);
    return slots.map(item => item.landmarks);
  }

  _requiredHands(sign) {
    if (!sign) return 1;
    if (sign.handMode === 'two') return 2;
    if (sign.handMode === 'one') return 1;
    if (this._isDynamicSign(sign)) return this._movingHandCount(sign);
    if (sign.hands === 2) return 2;
    if (sign.hands === 1) return 1;

    const frames = Array.isArray(sign.sequence) && sign.sequence.length > 0
      ? sign.sequence
      : (sign.pose ? [sign.pose] : []);

    let twoHandFrames = 0;
    let validFrames = 0;
    for (const frame of frames) {
      const count = this._countHandsInFrame(frame);
      if (count > 0) validFrames += 1;
      if (count >= 2) twoHandFrames += 1;
    }

    return validFrames > 0 && twoHandFrames / validFrames >= 0.35 ? 2 : 1;
  }

  _movingHandCount(sign) {
    const frames = Array.isArray(sign?.sequence) ? sign.sequence : [];
    if (frames.length < 2) return 1;

    const centersByHand = [[], []];
    frames.forEach(frame => {
      this._extractFrameHandCenters(frame).forEach((center, index) => {
        if (center && centersByHand[index]) centersByHand[index].push(center);
      });
    });

    let movingHands = 0;
    centersByHand.forEach(centers => {
      if (centers.length < 4) return;

      let total = 0;
      for (let i = 1; i < centers.length; i++) {
        total += Math.hypot(centers[i][0] - centers[i - 1][0], centers[i][1] - centers[i - 1][1]);
      }

      const first = centers[0];
      const last = centers[centers.length - 1];
      const displacement = Math.hypot(last[0] - first[0], last[1] - first[1]);
      if (total >= 0.08 || displacement >= 0.035) movingHands += 1;
    });

    return movingHands >= 2 ? 2 : 1;
  }

  _extractFrameHandCenters(frame) {
    if (!Array.isArray(frame)) return [];

    const flatCenter = (flatHand) => {
      if (!Array.isArray(flatHand)) return null;
      const points = [];
      for (let i = 0; i < flatHand.length; i += 2) {
        const x = Number(flatHand[i] || 0);
        const y = Number(flatHand[i + 1] || 0);
        if (Math.abs(x) + Math.abs(y) > 0.001) {
          points.push([x > 1 ? x / 1920 : x, y > 1 ? y / 1080 : y]);
        }
      }
      if (points.length < 5) return null;
      return points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0])
        .map(v => v / points.length);
    };

    const pointCenter = (points) => {
      if (!Array.isArray(points)) return null;
      const valid = points
        .filter(p => Array.isArray(p) && Math.abs(p[0] || 0) + Math.abs(p[1] || 0) + Math.abs(p[2] || 0) > 0.001)
        .map(p => [Number(p[0] || 0), Number(p[1] || 0)]);
      if (valid.length < 5) return null;
      return valid.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0])
        .map(v => v / valid.length);
    };

    if (frame.length >= 150 && typeof frame[0] === 'number') {
      return [flatCenter(frame.slice(50, 100)), flatCenter(frame.slice(100, 150))];
    }

    if (frame.length >= 42 && Array.isArray(frame[0])) {
      return [pointCenter(frame.slice(0, 21)), pointCenter(frame.slice(21, 42))];
    }

    if (frame.length >= 21 && Array.isArray(frame[0])) return [pointCenter(frame)];
    return [];
  }

  _countHandsInFrame(frame) {
    if (!Array.isArray(frame)) return 0;

    const flatHasHand = (flatHand) => {
      if (!Array.isArray(flatHand)) return false;
      let active = 0;
      for (let i = 0; i < flatHand.length; i += 2) {
        if (Math.abs(Number(flatHand[i] || 0)) + Math.abs(Number(flatHand[i + 1] || 0)) > 0.001) {
          active += 1;
        }
      }
      return active >= 5;
    };

    const pointHasHand = (points) => points.some(p =>
      Array.isArray(p) && Math.abs(p[0] || 0) + Math.abs(p[1] || 0) + Math.abs(p[2] || 0) > 0.001
    );

    if (frame.length >= 150 && typeof frame[0] === 'number') {
      return [frame.slice(50, 100), frame.slice(100, 150)].filter(flatHasHand).length;
    }
    if (frame.length >= 42 && Array.isArray(frame[0])) {
      return [frame.slice(0, 21), frame.slice(21, 42)].filter(pointHasHand).length;
    }
    if (frame.length >= 21 && Array.isArray(frame[0])) return pointHasHand(frame) ? 1 : 0;
    return 0;
  }

  _isDynamicSign(sign) {
    if (this._resolveDataFormat(sign) !== 'openpose150') return false;
    const stats = this._referenceMotionStats(sign);
    return stats.frameCount > 24 && stats.totalMotion > 0.28;
  }

  _isFingerSpellingSign(sign) {
    return sign?.category === 'jamo'
      || sign?.source === 'fingerspell'
      || sign?.source === 'verified'
      || /^jamo_/.test(sign?.id || '');
  }

  _isStaticHandSign(sign) {
    return this._resolveDataFormat(sign) === 'jamo'
      || sign?.category === 'jamo'
      || sign?.category === 'numbers';
  }

  _resolveDataFormat(sign) {
    if (!sign) return 'unknown';
    if (sign.dataFormat) return sign.dataFormat;

    if (sign.category === 'jamo' || sign.category === 'numbers' || /^jamo_/.test(sign.id || '')) return 'jamo';
    if (sign.source === 'verified' || sign.source === 'fingerspell') return 'jamo';
    if (sign.source === 'local') return 'openpose150';
    if (sign.source === 'aihub') return 'hand21';

    const frame = this._getActivePracticeFrame(sign);
    if (!frame) return 'unknown';
    if (frame.length >= 150 && typeof frame[0] === 'number') return 'openpose150';
    if (frame.length >= 21 && Array.isArray(frame[0])) return 'hand21';
    return 'unknown';
  }

  _successThreshold(sign) {
    const format = this._resolveDataFormat(sign);
    if (format === 'jamo') return 74;
    if (format === 'hand21') return 68;
    return this.SUCCESS_SCORE;
  }

  _getActivePracticeFrame(sign) {
    if (!sign) return null;
    if (Number.isInteger(sign._currentFrameIndex) && Array.isArray(sign.sequence)) {
      return sign.sequence[sign._currentFrameIndex];
    }
    if (Array.isArray(sign._currentStageFrame)) return sign._currentStageFrame;
    if (Array.isArray(sign.pose)) return sign.pose;
    if (Array.isArray(sign.sequence) && sign.sequence.length > 0) {
      return sign.sequence[Math.floor(sign.sequence.length / 2)];
    }
    return null;
  }

  _syncDemoHandSlots(sign) {
    const frame = this._getActivePracticeFrame(sign);
    sign._demoHandSlots = extractHandSlotsFromFrame(frame);
    if (sign?.category === 'numbers') {
      const mirrored = [];
      sign._demoHandSlots.forEach(slot => {
        mirrored.push(slot);
        mirrored.push({
          ...slot,
          slot: `${slot.slot}:mirror`,
          landmarks: slot.landmarks.map(point => [-(point[0] || 0), point[1] || 0, point[2] || 0]),
        });
      });
      sign._demoHandSlots = mirrored;
    }
    return sign._demoHandSlots;
  }

  _passesQualityGate(matches, smoothScore, sign) {
    if (!matches?.length || smoothScore < this._successThreshold(sign)) return false;

    for (const match of matches) {
      const b = match.breakdown;
      if (!b) return false;
      if (b.poseScore < 56) return false;
      if (b.directionScore < 58) return false;
      if (b.weakFingerCount >= 2) return false;
    }

    if (this._isFingerSpellingSign(sign)) {
      const prediction = this.lastJamoAiPrediction;
      const expected = this._jamoExpectedLabel(sign);
      if (prediction && prediction.label !== expected && prediction.confidence >= 52) {
        return false;
      }
    }

    return true;
  }

  _smallRotationVariants(norm) {
    if (!Array.isArray(norm)) return [];
    const degrees = [-14, -7, 0, 7, 14];
    return degrees.map(deg => rotatePose2D(norm, deg));
  }

  _matchHandsToRefs(hands, refs, strictShape = false) {
    const sign = this.currentSign;
    const slots = sign?._demoHandSlots || [];
    if (!hands?.length || !slots?.length) return null;

    const scoreAgainstSlot = (landmarks, handedness, slotEntry) => {
      const isRight = handedness === 'Right';
      const norm = normalizeLandmarks(landmarks, isRight);
      if (!norm) return null;

      const breakdown = computeScoreBreakdown(norm, slotEntry.landmarks, {
        strict: true,
        tryRotation: strictShape,
      });
      if (!breakdown) return null;

      return {
        score: breakdown.score,
        norm,
        scoreRef: slotEntry.landmarks,
        slot: slotEntry.slot,
        handedness,
        perFinger: breakdown.fingerScores,
        breakdown,
      };
    };

    const pairings = [];
    hands.forEach((hand, handIndex) => {
      if (!hand?.landmarks) return;
      for (const slotEntry of slots) {
        const scored = scoreAgainstSlot(hand.landmarks, hand.handedness, slotEntry);
        if (scored) pairings.push({ handIndex, slotEntry, scored });
      }
    });

    if (pairings.length === 0) return null;

    pairings.sort((a, b) => b.scored.score - a.scored.score);
    const usedHands = new Set();
    const usedSlots = new Set();
    const matches = [];

    for (const pair of pairings) {
      if (usedHands.has(pair.handIndex) || usedSlots.has(pair.slotEntry.slot)) continue;
      usedHands.add(pair.handIndex);
      usedSlots.add(pair.slotEntry.slot);
      matches.push(pair.scored);
    }

    if (matches.length === 0) return null;

    const required = this._requiredHands(sign);
    if (required >= 2 && matches.length < 2) return null;
    if (required === 1 && slots.some(item => item.slot === 'primary') && matches.length < 1) return null;

    matches.sort((a, b) => b.score - a.score);
    return matches;
  }

  _referenceMotionStats(sign) {
    const frames = Array.isArray(sign?.sequence) ? sign.sequence : [];
    const centers = [];

    const handCenter = (flatHand) => {
      const points = [];
      for (let i = 0; i < flatHand.length; i += 2) {
        const x = Number(flatHand[i] || 0);
        const y = Number(flatHand[i + 1] || 0);
        if (Math.abs(x) + Math.abs(y) > 0.001) points.push([x / 1920, y / 1080]);
      }
      if (points.length < 5) return null;
      return points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0])
        .map(v => v / points.length);
    };

    frames.forEach(frame => {
      if (!Array.isArray(frame) || frame.length < 150 || typeof frame[0] !== 'number') return;
      const hands = [handCenter(frame.slice(50, 100)), handCenter(frame.slice(100, 150))].filter(Boolean);
      if (hands.length === 0) return;
      centers.push(hands.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0])
        .map(v => v / hands.length));
    });

    let totalMotion = 0;
    for (let i = 1; i < centers.length; i++) {
      totalMotion += Math.hypot(centers[i][0] - centers[i - 1][0], centers[i][1] - centers[i - 1][1]);
    }

    return { frameCount: centers.length, totalMotion };
  }

  _updateMotionBuffer(hands) {
    const points = [];
    hands.forEach(hand => {
      if (!hand?.landmarks) return;
      [0, 4, 8, 12, 16, 20].forEach(index => {
        const lm = hand.landmarks[index];
        if (lm) points.push([lm.x, lm.y]);
      });
    });

    if (points.length === 0) return { avgStep: 0, total: 0, displacement: 0 };

    const center = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0])
      .map(v => v / points.length);
    this.motionBuffer.push(center);
    if (this.motionBuffer.length > 24) this.motionBuffer.shift();

    if (this.motionBuffer.length < 6) return { avgStep: 0, total: 0, displacement: 0 };

    let distance = 0;
    for (let i = 1; i < this.motionBuffer.length; i++) {
      const prev = this.motionBuffer[i - 1];
      const curr = this.motionBuffer[i];
      distance += Math.hypot(curr[0] - prev[0], curr[1] - prev[1]);
    }

    const first = this.motionBuffer[0];
    const last = this.motionBuffer[this.motionBuffer.length - 1];
    return {
      avgStep: distance / (this.motionBuffer.length - 1),
      total: distance,
      displacement: Math.hypot(last[0] - first[0], last[1] - first[1]),
    };
  }

  _dynamicAttemptFrameTarget(sign) {
    const stats = this._referenceMotionStats(sign);
    if (stats.frameCount > 0) {
      return Math.min(75, Math.max(28, Math.round(stats.frameCount * 0.6)));
    }
    return 36;
  }

  _detectedHandsCenter(hands) {
    const points = [];
    hands.forEach(hand => {
      if (!hand?.landmarks) return;
      [0, 4, 8, 12, 16, 20].forEach(index => {
        const lm = hand.landmarks[index];
        if (lm) points.push([lm.x, lm.y]);
      });
    });

    if (points.length === 0) return null;
    return points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0])
      .map(v => v / points.length);
  }

  _recordGestureFrame(sign, hands, score, selected = []) {
    const center = this._detectedHandsCenter(hands);
    if (!center) {
      return { count: this.dynamicAttemptBuffer.length, recording: this._isGestureRecording };
    }

    if (!this._isGestureRecording) {
      this._isGestureRecording = true;
      this.dynamicAttemptBuffer = [];
      this.motionBuffer = [];
    }

    const lead = selected[0] || {};
    this.dynamicAttemptBuffer.push({
      center,
      handCount: hands.length,
      score,
      perFinger: lead.perFinger || null,
      breakdown: lead.breakdown || null,
      norm: lead.norm || null,
      scoreRef: lead.scoreRef || null,
      selected,
      ts: performance.now(),
    });

    const maxFrames = 360;
    if (this.dynamicAttemptBuffer.length > maxFrames) {
      this.dynamicAttemptBuffer.shift();
    }

    return { count: this.dynamicAttemptBuffer.length, recording: true };
  }

  _updateRecordingUI(frameCount) {
    const minFrames = this.GESTURE_MIN_FRAMES;
    const pct = Math.min(100, Math.round((frameCount / minFrames) * 100));
    const value = document.getElementById('score-value');
    const unit = document.querySelector('.score-number span');
    if (value) value.textContent = '기록';
    if (unit) unit.textContent = '';
    const ring = document.getElementById('score-ring-fill');
    if (ring) {
      const circumference = 2 * Math.PI * 50;
      ring.style.strokeDashoffset = circumference * (1 - pct / 100);
      ring.style.stroke = '#00d2ff';
    }
    const label = document.getElementById('score-label');
    if (label) label.textContent = `동작 기록 중 ${pct}% · 아직 점수 아님`;
  }

  _referenceTrajectory(sign, requiredHands) {
    const frames = Array.isArray(sign?.sequence) ? sign.sequence : [];
    const trajectory = [];

    frames.forEach(frame => {
      const centers = this._extractFrameHandCenters(frame).filter(Boolean);
      if (centers.length === 0) return;
      const used = centers.slice(0, Math.max(1, requiredHands));
      trajectory.push(used.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0])
        .map(v => v / used.length));
    });

    return trajectory;
  }

  _resamplePoints(points, targetLen) {
    if (!Array.isArray(points) || points.length === 0) return [];
    if (points.length === 1) return Array.from({ length: targetLen }, () => points[0]);

    return Array.from({ length: targetLen }, (_, i) => {
      const raw = (i * (points.length - 1)) / Math.max(1, targetLen - 1);
      const lo = Math.floor(raw);
      const hi = Math.min(points.length - 1, Math.ceil(raw));
      const t = raw - lo;
      return [
        points[lo][0] * (1 - t) + points[hi][0] * t,
        points[lo][1] * (1 - t) + points[hi][1] * t,
      ];
    });
  }

  _normalizeTrajectory(points) {
    if (!Array.isArray(points) || points.length === 0) return [];
    const origin = points[0];
    const shifted = points.map(point => [point[0] - origin[0], point[1] - origin[1]]);
    const xs = shifted.map(point => point[0]);
    const ys = shifted.map(point => point[1]);
    const box = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1e-4);
    return shifted.map(point => [point[0] / box, point[1] / box]);
  }

  _trajectoryScore(userCenters, refCenters) {
    if (!Array.isArray(userCenters) || !Array.isArray(refCenters) || userCenters.length < 4 || refCenters.length < 4) {
      return 50;
    }

    const length = Math.min(30, Math.max(10, Math.min(userCenters.length, refCenters.length)));
    const user = this._normalizeTrajectory(this._resamplePoints(userCenters, length));
    const ref = this._normalizeTrajectory(this._resamplePoints(refCenters, length));

    let total = 0;
    for (let i = 0; i < length; i++) {
      total += Math.hypot(user[i][0] - ref[i][0], user[i][1] - ref[i][1]);
    }

    const avg = total / length;
    return Math.round(Math.max(0, Math.min(100, (1 - Math.min(1, avg / 1.2)) * 100)));
  }

  _directionLabel(from, to) {
    if (!from || !to) return '방향 확인 불가';
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const distance = Math.hypot(dx, dy);
    if (distance < 0.025) return '거의 제자리';

    const horizontal = Math.abs(dx) > 0.018 ? (dx > 0 ? '오른쪽' : '왼쪽') : '';
    const vertical = Math.abs(dy) > 0.018 ? (dy > 0 ? '아래쪽' : '위쪽') : '';
    return [horizontal, vertical].filter(Boolean).join(' ') || '짧은 이동';
  }

  _movementAdvice(userCenters, refCenters) {
    if (!Array.isArray(userCenters) || userCenters.length < 2) {
      return '손이 보이면 바로 기록이 시작돼요. 시작 자세를 잡고 끝까지 이어서 움직여주세요.';
    }
    if (!Array.isArray(refCenters) || refCenters.length < 2) {
      return '기준 이동 경로가 짧아요. 손모양과 손목 방향을 먼저 맞춰주세요.';
    }

    const userStart = userCenters[0];
    const userEnd = userCenters[userCenters.length - 1];
    const refStart = refCenters[0];
    const refEnd = refCenters[refCenters.length - 1];
    const userDistance = Math.hypot(userEnd[0] - userStart[0], userEnd[1] - userStart[1]);
    const refDistance = Math.hypot(refEnd[0] - refStart[0], refEnd[1] - refStart[1]);
    const userDirection = this._directionLabel(userStart, userEnd);
    const refDirection = this._directionLabel(refStart, refEnd);

    if (refDistance >= 0.035 && userDistance < refDistance * 0.45) {
      return `움직임이 작아요. 시범은 ${refDirection}으로 이동하니 시작점과 끝점을 더 크게 벌려주세요.`;
    }

    if (refDistance >= 0.035 && userDistance >= 0.025 && userDirection !== refDirection) {
      return `이동 방향이 달라요. 사용자는 ${userDirection}으로 움직였고, 시범은 ${refDirection}으로 움직입니다.`;
    }

    if (userDistance > refDistance * 1.8 && refDistance >= 0.02) {
      return `이동 폭이 커요. 시범보다 손을 멀리 보내지 말고 ${refDirection} 방향으로 짧게 정리하세요.`;
    }

    return `이동 방향은 ${refDirection} 쪽으로 맞춰가고 있어요. 손모양을 유지한 채 같은 속도로 이어가세요.`;
  }

  _fingerAdjustmentAdvice(perFinger, score = 0, strictShape = false, userNorm = null, refPose = null) {
    const weak = this._weakFingerNames(perFinger);
    const weakCount = Object.values(perFinger || {}).filter(value => value < 0.58).length;
    if (strictShape && (score < 50 || weakCount >= 4)) {
      return '손가락 하나 문제가 아니라 손 전체 방향이 시범과 달라요. 손목을 덜 꺾고 손바닥/손등 방향을 시범과 같은 쪽으로 먼저 맞춰주세요.';
    }

    const detailed = this._fingerShapeAdvice(perFinger, userNorm, refPose, strictShape);
    if (detailed) return detailed;

    if (weak.length >= 2) {
      return `조정할 부분: ${weak.slice(0, 2).join(', ')} 기준 위치가 달라요. 손가락을 억지로 더 펴기보다 손목 각도와 손바닥 방향을 시범과 맞춰주세요.`;
    }
    if (weak.length === 1) {
      return `조정할 부분: ${weak[0]}가 조금 달라요. 손목을 세운 뒤 ${weak[0]} 끝 위치를 시범과 같은 높이로 맞춰보세요.`;
    }
    if (strictShape && score < 70) {
      return '손가락 개수는 비슷하지만 손바닥 방향이 달라 보여요. 손목을 돌려 손등/손바닥 방향을 시범과 맞춰주세요.';
    }
    if (score < 55) {
      return '손 전체 위치가 기준과 멀어요. 손목부터 손끝까지 화면에 넣고 얼굴/가슴 기준 높이를 다시 맞춰주세요.';
    }
    return '손가락 위치는 전반적으로 좋아요. 손목 방향과 높이만 조금 더 안정적으로 유지하세요.';
  }

  _fingerShapeAdvice(perFinger, userNorm, refPose, strictShape = false) {
    if (!strictShape || !Array.isArray(userNorm) || !Array.isArray(refPose)) return '';

    const weakEntries = Object.entries(perFinger || {})
      .filter(([, value]) => value < 0.62)
      .sort((a, b) => a[1] - b[1]);
    if (weakEntries.length === 0) return '';
    if (weakEntries.length >= 4) {
      return '손 전체가 기준과 다르게 잡혔어요. 손가락을 하나씩 고치기보다 손목을 펴고 손바닥 방향을 시범과 맞춘 뒤 다시 보여주세요.';
    }

    const KO = { thumb: '엄지', index: '검지', middle: '중지', ring: '약지', pinky: '새끼' };
    const fingerIndices = {
      thumb: [1, 4],
      index: [5, 8],
      middle: [9, 12],
      ring: [13, 16],
      pinky: [17, 20],
    };
    const [finger] = weakEntries[0];
    const [baseIdx, tipIdx] = fingerIndices[finger] || [];
    if (baseIdx === undefined || !userNorm[baseIdx] || !userNorm[tipIdx] || !refPose[baseIdx] || !refPose[tipIdx]) {
      return '';
    }

    const dist = (a, b) => Math.hypot((a[0] || 0) - (b[0] || 0), (a[1] || 0) - (b[1] || 0), ((a[2] || 0) - (b[2] || 0)) * 0.15);
    const userLen = dist(userNorm[baseIdx], userNorm[tipIdx]);
    const refLen = Math.max(0.001, dist(refPose[baseIdx], refPose[tipIdx]));
    const lenRatio = userLen / refLen;
    const userTip = userNorm[tipIdx];
    const refTip = refPose[tipIdx];
    const dx = userTip[0] - refTip[0];
    const dy = userTip[1] - refTip[1];

    if (lenRatio > 0.92 && lenRatio < 1.15) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 0.22) {
        return `손가락은 충분히 펴져 있어요. ${KO[finger]} 끝이 시범보다 ${dx > 0 ? '오른쪽' : '왼쪽'}으로 잡혀서, 손목을 살짝 돌려 손끝 방향을 맞춰주세요.`;
      }
      if (Math.abs(dy) > 0.22) {
        return `손가락은 충분히 펴져 있어요. ${KO[finger]} 끝 높이가 시범보다 ${dy > 0 ? '위쪽' : '아래쪽'}으로 잡혀서, 손 전체 높이를 조금 조정해주세요.`;
      }
      return `손가락을 더 펼 필요는 없어 보여요. 손바닥이 카메라를 향하는 각도와 손목 기울기를 시범처럼 맞춰주세요.`;
    }

    if (lenRatio < 0.82) {
      return `${KO[finger]}가 카메라에는 짧게 접힌 것처럼 잡혀요. 실제로 폈다면 손가락을 더 펴기보다 손바닥을 카메라 쪽으로 더 정면으로 보여주세요.`;
    }

    return `${KO[finger]}가 시범보다 길게/크게 잡혀요. 손을 카메라에서 조금 멀리 두고 손목 각도를 안정적으로 유지해주세요.`;
  }

  _resetGestureRecording() {
    this.dynamicAttemptBuffer = [];
    this.motionBuffer = [];
    this.scoreBuffer = [];
    this.successFrames = 0;
    this._noHandStreak = 0;
    this._isGestureRecording = false;
  }

  _resetDynamicAttempt() {
    this._resetGestureRecording();
  }

  _pickBestGestureFrame(frames) {
    if (!frames?.length) return null;
    return frames.reduce((best, frame) => (frame.score > (best?.score || 0) ? frame : best), frames[0]);
  }

  _evaluateGestureAttempt(sign, requiredHands) {
    const frames = this.dynamicAttemptBuffer;
    const format = this._resolveDataFormat(sign);
    const strictShape = this._isFingerSpellingSign(sign) || format === 'jamo' || format === 'hand21';

    if (frames.length < this.GESTURE_MIN_FRAMES) {
      return {
        score: 0,
        ok: false,
        message: '기록이 너무 짧아요. 손이 보이는 상태에서 동작을 조금 더 길게 보여주세요',
        feedback: `최소 ${this.GESTURE_MIN_FRAMES}프레임 이상 필요해요 (현재 ${frames.length}프레임)`,
        bestFrame: null,
      };
    }

    const handOkRatio = frames.filter(frame => frame.handCount >= requiredHands).length / frames.length;
    const sortedScores = frames.map(frame => frame.score).sort((a, b) => b - a);
    const topCount = Math.max(1, Math.ceil(sortedScores.length * 0.3));
    const topPoseScore = Math.round(
      sortedScores.slice(0, topCount).reduce((sum, value) => sum + value, 0) / topCount
    );
    const avgPoseScore = Math.round(
      frames.reduce((sum, frame) => sum + frame.score, 0) / frames.length
    );
    const badFrameRatio = frames.filter(frame => frame.score < 45).length / frames.length;
    const poseScore = Math.round(avgPoseScore * 0.70 + topPoseScore * 0.30);

    const userTrajectory = frames.map(frame => frame.center);
    const refTrajectory = this._referenceTrajectory(sign, requiredHands);
    const trajectoryScore = this._trajectoryScore(userTrajectory, refTrajectory);

    let total = 0;
    let activeSteps = 0;
    for (let i = 1; i < frames.length; i++) {
      const prev = frames[i - 1].center;
      const curr = frames[i].center;
      const step = Math.hypot(curr[0] - prev[0], curr[1] - prev[1]);
      total += step;
      if (step >= 0.004) activeSteps += 1;
    }

    const first = frames[0].center;
    const last = frames[frames.length - 1].center;
    const displacement = Math.hypot(last[0] - first[0], last[1] - first[1]);
    const activeRatio = activeSteps / Math.max(1, frames.length - 1);

    let movementScore = Math.min(100, (total / 0.16) * 60 + (displacement / 0.05) * 40);
    if (activeRatio < 0.15) movementScore *= 0.75;

    const refMoves = refTrajectory.length >= 4;
    let poseW = 0.55;
    let moveW = refMoves ? 0.20 : 0.30;
    let trajW = refMoves ? 0.25 : 0.15;
    if (format === 'jamo') {
      poseW = 0.72;
      moveW = 0.13;
      trajW = 0.15;
    }

    let score = Math.round(poseScore * poseW + movementScore * moveW + trajectoryScore * trajW);
    const enoughMovement = format === 'jamo'
      ? (displacement >= 0.008 || total >= 0.04 || frames.length >= 14)
      : (total >= 0.08 && (displacement >= 0.02 || activeRatio >= 0.22));

    if (!enoughMovement && format !== 'jamo') score = Math.min(score, 48);
    if (handOkRatio < 0.8) score = Math.min(score, 52);
    if (badFrameRatio >= 0.35) score = Math.min(score, 60);
    score = Math.max(0, Math.min(100, score));

    const bestFrame = this._pickBestGestureFrame(frames);
    const bestSelected = bestFrame?.selected || [];
    const qualityOk = bestSelected.length > 0
      && this._passesQualityGate(bestSelected, score, sign);

    let message = '다시 한 번 시범을 보고 손이 보이는 동안 끝까지 따라 해보세요';
    if (handOkRatio < 0.8) {
      message = requiredHands === 2
        ? '양손이 끝까지 같이 보여야 해요'
        : '손이 중간에 빠지지 않게 끝까지 보여주세요';
    } else if (badFrameRatio >= 0.35) {
      message = '동작 중간에 기준과 많이 다른 구간이 있어요. 시작부터 끝까지 같은 손모양을 유지해보세요';
    } else if (!enoughMovement && format !== 'jamo') {
      message = '움직임이 작아요. 시작 위치에서 끝 위치까지 시범처럼 더 크게 움직여보세요';
    } else if (score >= this._successThreshold(sign) && qualityOk) {
      message = '좋아요! 이번 동작 구간이 기준과 잘 맞았어요';
    } else if (score >= this._successThreshold(sign)) {
      message = '점수는 높지만 손가락 방향·위치가 시범과 달라요';
    }

    const feedback = [
      message,
      `기록 ${frames.length}프레임 · 전체 손모양 ${avgPoseScore}점 · 좋은 구간 ${topPoseScore}점 · 이동 ${trajectoryScore}점 · 움직임 ${Math.round(movementScore)}점`,
      this._movementAdvice(userTrajectory, refTrajectory),
    ];

    if (bestFrame?.perFinger) {
      const fingerAdvice = this._fingerAdjustmentAdvice(
        bestFrame.perFinger,
        score,
        strictShape,
        bestFrame.norm,
        bestFrame.scoreRef
      );
      if (fingerAdvice) feedback.push(fingerAdvice);
    }

    const ok = score >= this._successThreshold(sign) && qualityOk && handOkRatio >= 0.8 && badFrameRatio < 0.35
      && (enoughMovement || format === 'jamo');

    return {
      score,
      ok,
      message,
      feedback: feedback.join('<br>'),
      bestFrame,
      poseScore,
      trajectoryScore,
      movementScore,
      handOkRatio,
    };
  }

  _finishGestureAttempt(requiredHands) {
    if (!this.currentSign || this.dynamicAttemptBuffer.length === 0) return false;

    const sign = this.currentSign;
    const attemptFrames = this.dynamicAttemptBuffer.slice();
    const result = this._evaluateGestureAttempt(sign, requiredHands);
    const bestFrame = result.bestFrame;
    result.frameCount = attemptFrames.length;
    result.durationMs = attemptFrames.length > 1
      ? Math.round(attemptFrames[attemptFrames.length - 1].ts - attemptFrames[0].ts)
      : 0;

    this._resetGestureRecording();
    this._updateScoreUI(result.score);
    this._lastGestureResult = result;
    window.authManager?.saveRecord(sign, result);

    if (bestFrame?.perFinger) {
      this._updateFingerDots(bestFrame.perFinger);
      this.tracker?.setFingerColors(bestFrame.perFinger, this.lastPoseHandedness);
    } else {
      this._updateFingerDots(null);
      this.tracker?.setFingerColors(null);
    }

    if (result.score > this.bestScore) this.bestScore = result.score;

    if (result.ok) {
      const stages = this._getSequenceStages(sign);
      if (stages.length > 1 && sign._demoMode !== 'video') {
        sign._gesturePassCount = (sign._gesturePassCount || 0) + 1;
        if (sign._gesturePassCount < 2) {
          this._setStatus('좋아요! 같은 단계 동작을 한 번 더 이어서 해보세요');
          this._setLiveFeedback('손이 다시 보이면 기록이 시작됩니다. 끝날 때까지 이어서 움직여주세요.');
          return true;
        }
        sign._gesturePassCount = 0;
        if (this._advanceSequenceStage()) return true;
      }
      this._triggerSuccess();
    } else {
      this._setStatus(`💡 ${result.message}`);
      this._setLiveFeedback(result.feedback || result.message);
    }

    return true;
  }

  _finishDynamicAttempt(requiredHands) {
    return this._finishGestureAttempt(requiredHands);
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
        this._resetDynamicAttempt();
        this._setStatus(`💡 ${this.currentSign.hint} (손을 카메라에 보여주세요)`);
        this._setLiveFeedback(this._isStaticHandSign(this.currentSign)
          ? '카메라가 켜졌어요. 손모양을 보이면 바로 점수와 피드백이 표시됩니다.'
          : '카메라가 켜졌어요. 손이 보이면 기록이 시작되고, 손을 치우면 점수와 피드백이 나옵니다.');
      } else {
        this._setStatus('✅ 카메라 준비 완료! 수화를 선택하세요.');
      }
    } catch (err) {
      console.error(err);
      btn.textContent = '📷 카메라 시작';
      btn.disabled = false;
      const isDenied = err?.name === 'NotAllowedError' || /Permission denied/i.test(err?.message || '');
      if (isDenied) {
        this._setStatus('❌ 카메라 권한이 차단됐어요. 주소창 왼쪽 권한 아이콘에서 카메라를 허용한 뒤 새로고침해주세요.');
      } else {
        this._setStatus(`❌ 카메라 접근 실패: ${err?.message || '브라우저 권한을 확인해주세요.'}`);
      }
    }
  }

  _onHandResult(hands) {
    if (!Array.isArray(hands)) hands = [];
    this.lastDetectedHands = hands;
    this._updateHandDebug(hands);
    const isStaticSign = this.state === 'practicing'
      && this.currentSign
      && this._isStaticHandSign(this.currentSign);

    if (!hands.length) {
      if (isStaticSign) {
        this._resetGestureRecording();
        this._noHandStreak = 0;
        this.lastNormalizedPose = null;
        this.lastPoseHandedness = null;
        this._updateScoreUI(0);
        this._updateFingerDots(null);
        this.tracker?.setFingerColors(null);
        this._setStatus('✋ 손모양을 카메라에 보여주세요');
        this._setLiveFeedback('지문자와 지숫자는 움직임 기록 없이, 손모양이 보이는 동안 바로 채점됩니다.');
        return;
      }

      if (this.state === 'practicing' && this.currentSign && this._isGestureRecording) {
        this._noHandStreak += 1;
        if (this._noHandStreak >= this.GESTURE_END_NO_HAND_FRAMES) {
          this._finishGestureAttempt(this._requiredHands(this.currentSign));
          return;
        }
        this._setStatus('손이 잠깐 안 보여요… 치우면 채점이 끝납니다');
        return;
      }

      this._noHandStreak = 0;
      this.lastNormalizedPose = null;
      this.lastPoseHandedness = null;
      if (this.state === 'practicing' && this._lastGestureResult) {
        this._setStatus(`마지막 평가: ${this._lastGestureResult.score}점 · 손을 다시 보이면 새 기록이 시작됩니다`);
        return;
      }
      if (this.state === 'practicing' && !this._isGestureRecording) {
        this._updateScoreUI(0);
        this._updateFingerDots(null);
        this.tracker?.setFingerColors(null);
        this._setStatus('✋ 손이 보이면 기록이 시작됩니다');
        this._setLiveFeedback('시범을 보고 손 전체를 카메라에 넣어주세요. 손이 보이는 동안 움직이고, 끝나면 손을 치우면 채점됩니다.');
      }
      return;
    }

    this._noHandStreak = 0;
    if (isStaticSign) {
      this._lastGestureResult = null;
    } else if (this.state === 'practicing' && this._lastGestureResult && !this._isGestureRecording) {
      this._lastGestureResult = null;
      this.scoreBuffer = [];
      this.successFrames = 0;
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

    const sign = this.currentSign;
    const idealRequiredHands = this._requiredHands(sign);
    const format = this._resolveDataFormat(sign);
    const strictShape = this._isFingerSpellingSign(sign) || format === 'jamo' || format === 'hand21';
    const slots = this._syncDemoHandSlots(sign);

    if (!slots.length) {
      this._updateScoreUI(0);
      this._setLiveFeedback('기준 동작을 불러오지 못했어요. 수어를 다시 선택하거나 검색으로 불러와 주세요.');
      return;
    }

    const selected = this._matchHandsToRefs(hands, null, strictShape);
    if (!selected?.length) {
      if (isStaticSign) {
        this._resetGestureRecording();
        this._updateScoreUI(0);
        this._updateFingerDots(null);
        this.tracker?.setFingerColors(null);
        this._setStatus('손모양 비교 중');
        this._setLiveFeedback(idealRequiredHands === 2 && hands.length < 2
          ? '이 손모양은 양손이 모두 보여야 해요.'
          : '손은 보이지만 시범 손모양과 아직 달라요. 손바닥 방향과 손끝 위치를 맞춰주세요.');
        return;
      }

      const record = this._recordGestureFrame(sign, hands, 0, []);
      this._updateRecordingUI(record.count);
      this._updateFingerDots(null);
      this.tracker?.setFingerColors(null);
      this._setStatus(`동작 기록 중… ${record.count}프레임 (손을 치우면 채점)`);
      if (idealRequiredHands === 2 && hands.length < 2) {
        this._setLiveFeedback('이 수어는 양손이 모두 필요해요. 두 손이 보이는 상태로 끝까지 움직여주세요.');
      } else {
        this._setLiveFeedback([
          `손은 보이지만 기준 손모양과 아직 맞지 않아요 (${record.count}프레임 기록 중).`,
          '이 구간도 최종 점수에 포함됩니다. 시범 손모양으로 맞춘 뒤 끝까지 움직여주세요.',
          '동작을 마치면 손을 화면 밖으로 치워 평가를 끝내세요.',
        ].join('<br>'));
      }
      return;
    }

    const scoredHands = Math.min(idealRequiredHands, selected.length);
    let frameScore = Math.round(
      selected.slice(0, scoredHands).reduce((sum, item) => sum + item.score, 0) / scoredHands
    );
    const bestNorm = selected[0].norm;
    const bestPerFinger = selected[0].perFinger;
    const bestHandedness = selected[0].handedness;

    if (idealRequiredHands === 2 && selected.length < 2) {
      frameScore = Math.min(frameScore, 45);
    }

    frameScore = this._scoreWithJamoAi(frameScore, bestNorm, sign);
    this._updateHandDebug(hands, selected, frameScore);
    this.lastNormalizedPose = bestNorm;
    this.lastPoseHandedness = bestHandedness;

    if (isStaticSign) {
      this._resetGestureRecording();
      this.scoreBuffer.push(frameScore);
      if (this.scoreBuffer.length > this.SMOOTHING_FRAMES) this.scoreBuffer.shift();
      const smoothScore = Math.round(this.scoreBuffer.reduce((sum, value) => sum + value, 0) / this.scoreBuffer.length);
      const passed = smoothScore >= this._successThreshold(sign)
        && this._passesQualityGate(selected.slice(0, scoredHands), smoothScore, sign);
      if (passed) {
        this.successFrames += 1;
      } else {
        this.successFrames = 0;
      }

      this._updateScoreUI(smoothScore);
      this._updateFingerDots(bestPerFinger);
      this.tracker?.setFingerColors(bestPerFinger, bestHandedness);
      if (smoothScore > this.bestScore) this.bestScore = smoothScore;

      const advice = this._fingerAdjustmentAdvice(bestPerFinger, smoothScore, strictShape, bestNorm, selected[0].scoreRef)
        || this._feedbackMessage(smoothScore, bestPerFinger, strictShape, bestNorm, selected[0].scoreRef);
      this._setStatus(passed ? `✅ 정답에 가까워요: ${smoothScore}점` : `실시간 점수: ${smoothScore}점`);
      this._setLiveFeedback([
        `현재 손모양 점수 ${smoothScore}점`,
        passed ? '좋아요. 손모양이 시범과 잘 맞고 있어요.' : advice,
        '지문자와 지숫자는 손을 치워서 종료하지 않아도 바로 채점됩니다.',
      ].join('<br>'));

      if (passed && this.successFrames >= this.SUCCESS_FRAMES) {
        window.authManager?.saveRecord(sign, {
          score: smoothScore,
          ok: true,
          feedback: '정적 손모양을 성공 기준 이상으로 유지했어요.',
          frameCount: this.successFrames,
          durationMs: Math.round(this.successFrames * 33),
        });
        this._triggerSuccess();
      }
      return;
    }

    const record = this._recordGestureFrame(sign, hands, frameScore, selected);
    this._updateRecordingUI(record.count);
    this._updateFingerDots(bestPerFinger);
    this.tracker?.setFingerColors(bestPerFinger, bestHandedness);

    const userTrajectory = this.dynamicAttemptBuffer.map(frame => frame.center);
    const refTrajectory = this._referenceTrajectory(sign, idealRequiredHands);
    const motionHint = this._movementAdvice(userTrajectory, refTrajectory);

    this._setStatus(`동작 기록 중… ${record.count}프레임 (손을 치우면 채점)`);
    this._setLiveFeedback([
      `지금부터 손이 보이는 구간을 기록하고 있어요 (${record.count}프레임).`,
      `현재 프레임 점수 ${frameScore}점 · 끝내려면 손을 카메라에서 치워주세요.`,
      motionHint,
    ].join('<br>'));
  }

  _updateHandDebug(hands, selected = null, frameScore = null) {
    const debug = window.handDebug;
    if (!debug) return;

    const handData = hands.map((hand, index) => {
      const isRight = hand.handedness === 'Right';
      const normalized = normalizeLandmarks(hand.landmarks, isRight);
      return {
        index,
        handedness: hand.handedness,
        raw: hand.landmarks.map((p, i) => ({
          i,
          x: Number(p.x.toFixed(5)),
          y: Number(p.y.toFixed(5)),
          z: Number((p.z || 0).toFixed(5)),
        })),
        normalized: normalized?.map((p, i) => ({
          i,
          x: Number(p[0].toFixed(4)),
          y: Number(p[1].toFixed(4)),
          z: Number((p[2] || 0).toFixed(4)),
        })) || null,
      };
    });

    debug.latest = {
      at: new Date().toISOString(),
      state: this.state,
      currentSign: this.currentSign?.name || null,
      handCount: hands.length,
      hands: handData,
      score: frameScore,
      selected: selected?.map(item => ({
        score: item.score,
        handedness: item.handedness,
        slot: item.slot,
        perFinger: item.perFinger,
        breakdown: item.breakdown,
      })) || [],
    };

    const now = performance.now();
    if (debug.enabled && now - this._lastHandDebugAt >= 500) {
      this._lastHandDebugAt = now;
      console.log('[handDebug]', debug.latest);
    }
  }

  _updateScoreUI(score) {
    this.currentScore = Math.round(Number(score) || 0);
    score = this.currentScore;
    document.getElementById('score-value').textContent = score;
    const unit = document.querySelector('.score-number span');
    if (unit) unit.textContent = '점';

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

  _feedbackMessage(score, perFinger, strictShape = false, userNorm = null, refPose = null) {
    const KO = { thumb: '엄지', index: '검지', middle: '중지', ring: '약지', pinky: '새끼' };
    const weak = Object.entries(perFinger)
      .filter(([, s]) => s < 0.58)
      .map(([f]) => KO[f]);

    if (strictShape && (score < 50 || weak.length >= 4)) {
      return '💡 손 전체 방향이 시범과 달라요';
    }
    if (strictShape) {
      const detailed = this._fingerShapeAdvice(perFinger, userNorm, refPose, strictShape);
      if (detailed) return `💡 ${detailed}`;
    }
    if (weak.length > 0) return `💡 ${weak.slice(0, 2).join(', ')} 위치를 시범과 맞춰보세요`;
    if (score >= 55)     return `👍 손모양은 가까워요. 손목 방향과 손끝 높이를 조금만 맞춰보세요`;
    return `💡 ${this.currentSign.hint}`;
  }

  _dynamicFeedbackMessage(score, perFinger, motion, attempt, requiredHands) {
    const weak = this._weakFingerNames(perFinger);
    const handText = requiredHands === 2 ? '양손을' : '손을';

    if (attempt.count < 10) {
      return `🎬 기록 시작. ${handText} 끝까지 화면 안에 두고 동작하세요`;
    }

    if (requiredHands === 2 && attempt.count > 12 && motion.total < 0.05) {
      return '✋✋ 양손을 시범처럼 같이 움직여주세요';
    }

    if (motion.total < 0.06 && attempt.count > 16) {
      return '🏃 움직임이 작아요. 시작 위치에서 끝 위치까지 더 분명하게 이동해보세요';
    }

    if (weak.length > 0 && score < 70) {
      return `💡 ${weak.slice(0, 2).join(', ')} 모양을 맞추면서 계속 이어가세요 (${attempt.count}프레임)`;
    }

    if (score >= 75) {
      return `✅ 좋아요. 흐름을 유지하고 끝나면 손을 화면 밖으로 빼세요 (${attempt.count}프레임)`;
    }

    return `🎬 기록 중. 속도보다 순서와 손모양을 맞춰주세요 (${attempt.count}프레임)`;
  }

  _successHoldMessage(pct, strictShape) {
    if (strictShape) return `🎯 손모양 좋아요... ${pct}% 유지 중`;
    return `🎯 좋아요... ${pct}% 유지 중`;
  }

  _weakFingerNames(perFinger) {
    const KO = { thumb: '엄지', index: '검지', middle: '중지', ring: '약지', pinky: '새끼' };
    const threshold = { thumb: 0.58, index: 0.45, middle: 0.58, ring: 0.58, pinky: 0.58 };
    return Object.entries(perFinger || {})
      .filter(([finger, score]) => score < (threshold[finger] ?? 0.58))
      .sort((a, b) => a[1] - b[1])
      .map(([finger]) => KO[finger]);
  }

  _strongFingerNames(perFinger) {
    const KO = { thumb: '엄지', index: '검지', middle: '중지', ring: '약지', pinky: '새끼' };
    return Object.entries(perFinger || {})
      .filter(([, score]) => score >= 0.72)
      .sort((a, b) => b[1] - a[1])
      .map(([finger]) => KO[finger]);
  }

  _composeLiveFeedback(score, perFinger, context = {}) {
    const base = buildCoachingFeedback({
      score,
      perFinger,
      signName: context.signName,
      requiredHands: context.requiredHands,
      detectedHands: context.detectedHands,
      holding: context.holding,
      holdPercent: context.holdPercent,
      motionHint: context.motionHint,
    });

    const lines = [base];

    if (context.strictShape && context.aiPrediction) {
      const predicted = context.aiPrediction.label;
      const expected = context.expectedLabel;
      if (predicted === expected) {
        lines.push(`AI 판정: ${predicted} 가능성이 높아요 (${context.aiPrediction.confidence}점).`);
      } else {
        lines.push(`AI 판정: 현재 손은 ${predicted}에 더 가까워요. 목표 ${expected}와 손 전체 방향을 다시 맞춰주세요.`);
      }
    }

    const detailed = this._fingerAdjustmentAdvice(
      perFinger,
      score,
      context.strictShape,
      context.userNorm,
      context.refPose
    );
    if (detailed && score < 72) {
      lines.push(detailed);
    }

    return lines.slice(0, 4).join('<br>');
  }

  _setLiveFeedback(message) {
    const el = document.getElementById('live-feedback');
    if (!el) return;

    const body = el.querySelector('p');
    if (!body) return;
    body.innerHTML = message || '수어를 선택하고 카메라를 시작하면 자세 안내가 표시됩니다.';
  }

  _updateFingerDots(perFinger) {
    const dots = document.querySelectorAll('.finger-dot[data-finger]');
    dots.forEach(dot => {
      const score = perFinger?.[dot.dataset.finger];
      dot.classList.remove('good', 'warn', 'bad');

      if (typeof score !== 'number') {
        dot.title = dot.title?.split(':')[0] || dot.textContent;
        return;
      }

      if (score >= 0.72) dot.classList.add('good');
      else if (score >= 0.52) dot.classList.add('warn');
      else dot.classList.add('bad');

      const pct = Math.round(score * 100);
      const base = dot.getAttribute('aria-label') || dot.title?.split(':')[0] || dot.textContent;
      dot.title = `${base}: ${pct}%`;
    });
  }

  _triggerSuccess() {
    if (this.state === 'success') return;
    this.state = 'success';

    document.getElementById('modal-sign-name').textContent  = this.currentSign.name;
    const finalScore = this.currentScore || this.bestScore || 0;
    this.bestScore = Math.max(this.bestScore || 0, finalScore);
    document.getElementById('modal-best-score').textContent = finalScore;

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
  playOpenPose(signData) {
    const videoEl = document.getElementById('aihub-video');
    const demoCanvasEl = document.getElementById('openpose-demo-canvas');
    const errorEl = document.getElementById('aihub-video-error');

    if (videoEl) {
      videoEl.pause();
      videoEl.src = '';
      videoEl.style.display = 'none';
      videoEl.classList.remove('jamo-reference-video');
    }
    if (demoCanvasEl) demoCanvasEl.style.display = 'block';
    if (errorEl) errorEl.style.display = 'none';

    const sequence =
      signData.sequence ||
      signData.frames ||
      signData.motion ||
      (signData.pose ? [signData.pose] : []);

    if (!Array.isArray(sequence) || sequence.length === 0) {
      this.drawOpenPoseFrame(null);
      return;
    }

    signData._demoMode = sequence.length > 1 ? 'video' : 'still';
    this._toggleDemoSpeedControl(sequence.length > 1 && this._isStudyWord(signData));
    let frameIndex = 0;

    if (this.refTimer) {
      clearInterval(this.refTimer);
    }

    const draw = () => {
      const frame = sequence[frameIndex];
      signData._currentFrameIndex = frameIndex;
      signData._currentStageFrame = frame;
      this.drawOpenPoseFrame(frame);
      if (sequence.length > 1) {
        this._setDemoStage({
          mode: 'video',
          index: frameIndex,
          total: sequence.length,
        });
      } else {
        this._setDemoStage(null);
      }
      frameIndex = (frameIndex + 1) % sequence.length;
    };

    draw();
    this.refTimer = setInterval(draw, this._demoFrameInterval(sequence.length));
  }

drawOpenPoseFrame(feature){

  const ctx =
    this.demoCtx;

  const width =
    this.demoCanvas.width;

  const height =
    this.demoCanvas.height;

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  ctx.fillStyle = 'black';

  ctx.fillRect(
    0,
    0,
    width,
    height
  );

  if(!feature) {
    ctx.fillStyle = '#8892a4';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('수어를 선택하면 시범이 표시됩니다', width / 2, height / 2);
    return;
  }

  const format = this._resolveDataFormat(this.currentSign);
  const hands = this.normalizeDemoHands(feature);

  if (hands.length > 0 && (format === 'jamo' || format === 'hand21')) {
    hands.forEach((hand, index) => {
      const centerX = hands.length === 1
        ? width * 0.5
        : width * (index === 0 ? 0.33 : 0.67);
      const color = index === 0 ? '#22c55e' : '#f97316';
      this.drawNormalizedHand(ctx, hand, centerX, height * 0.56, width, height, color, 1);
    });
    return;
  }

  if (format !== 'openpose150') {
    ctx.fillStyle = '#8892a4';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('시범 손 데이터를 표시할 수 없습니다', width / 2, height / 2);
    return;
  }

  const pose = feature.slice(0, 50);
  const left = feature.slice(50, 100);
  const right = feature.slice(100, 150);
  const scale = 2.0;
  const neck = this.toCanvasPoint(pose, 1, width, height);
  const offsetX = width / 2 - (neck ? neck.x * scale : width / 2);
  const offsetY = height * 0.65 - (neck ? neck.y * scale : height / 2);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  this.drawBodySkeleton(ctx, pose, width, height);
  this.drawHead(ctx, pose, width, height);
  this.drawHand(ctx, left, width, height, '#22c55e');
  this.drawHand(ctx, right, width, height, '#f97316');
  this.drawPoints(ctx, left, width, height, '#22c55e', 1.8);
  this.drawPoints(ctx, right, width, height, '#f97316', 1.8);

  ctx.restore();
}

rawOpenPosePoint(arr, index) {
  let x = Number(arr[index * 2] || 0);
  let y = Number(arr[index * 2 + 1] || 0);
  if (!x || !y) return null;

  if (x <= 1 && y <= 1) {
    x *= 1920;
    y *= 1080;
  }

  return { x, y };
}

buildDemoFrameTransform(feature, width, height) {
  const pose = feature.slice(0, 50);
  const left = feature.slice(50, 100);
  const right = feature.slice(100, 150);
  const points = [];

  [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach(index => {
    const point = this.rawOpenPosePoint(pose, index);
    if (point) points.push(point);
  });

  [left, right].forEach(hand => {
    for (let index = 0; index < hand.length / 2; index += 1) {
      const point = this.rawOpenPosePoint(hand, index);
      if (point) points.push(point);
    }
  });

  if (points.length < 2) return null;

  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);

  const padX = Math.max(95, (maxX - minX) * 0.22);
  const padY = Math.max(75, (maxY - minY) * 0.22);
  minX -= padX;
  maxX += padX;
  minY -= padY;
  maxY += padY;

  const boxWidth = Math.max(1, maxX - minX);
  const boxHeight = Math.max(1, maxY - minY);
  const scale = Math.min(width / boxWidth, height / boxHeight) * 0.82;

  return {
    minX,
    minY,
    scale,
    offsetX: (width - boxWidth * scale) / 2,
    offsetY: (height - boxHeight * scale) / 2,
  };
}

normalizeDemoHands(feature) {
  if (!Array.isArray(feature)) return [];

  const isPoint = (p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1]));
  const toPoint = (p) => [Number(p[0]), Number(p[1]), Number(p[2] || 0)];

  if (feature.length >= 42 && isPoint(feature[0])) {
    return [feature.slice(0, 21).map(toPoint), feature.slice(21, 42).map(toPoint)]
      .filter(hand => hand.some(p => Math.abs(p[0]) + Math.abs(p[1]) + Math.abs(p[2]) > 0.001));
  }

  if (feature.length >= 21 && isPoint(feature[0])) {
    return [feature.slice(0, 21).map(toPoint)];
  }

  return [];
}

drawBodySkeleton(ctx, pose, width, height, transform) {
  const armColor = '#60a5fa';
  const connections = [
    [2, 3, armColor, 10],
    [3, 4, armColor, 9],
    [5, 6, armColor, 10],
    [6, 7, armColor, 9],
  ];

  connections.forEach(([a, b, color, lineWidth]) => {
    const p1 = this.toCanvasPoint(pose, a, width, height, transform);
    const p2 = this.toCanvasPoint(pose, b, width, height, transform);
    this.drawThickLine(ctx, p1, p2, color, lineWidth);
  });
}

drawHead(ctx, pose, width, height, transform) {
  const nose = this.toCanvasPoint(pose, 0, width, height, transform);
  const neck = this.toCanvasPoint(pose, 1, width, height, transform);
  if (!nose) return;

  let radius = 18;
  if (neck) {
    radius = Math.max(14, Math.min(28, Math.abs(neck.y - nose.y) * 0.8));
  }

  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(nose.x, nose.y - radius * 0.2, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(nose.x - radius * 0.35, nose.y - radius * 0.35, 2.5, 0, Math.PI * 2);
  ctx.arc(nose.x + radius * 0.35, nose.y - radius * 0.35, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

drawThickLine(ctx, p1, p2, color, lineWidth = 10) {
  if (!p1 || !p2) return;
  const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
  if (dist > 160) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

drawLine(ctx, points, a, b, width, height, color, transform) {
  const p1 = this.toCanvasPoint(points, a, width, height, transform);
  const p2 = this.toCanvasPoint(points, b, width, height, transform);
  if (!p1 || !p2) return;

  const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
  if (dist > 120) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

drawPoints(ctx, arr, width, height, color, size = 2, transform) {
  ctx.fillStyle = color;

  for (let i = 0; i < arr.length; i += 2) {
    const p = this.toCanvasPoint(arr, i / 2, width, height, transform);
    if (!p) continue;

    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

applyDemoViewRotation(hand) {
  if (!this._isRotatableDemo(this.currentSign)) return hand;
  const yaw = (this.demoViewYaw || 0) * Math.PI / 180;
  const pitch = (this.demoViewPitch || 0) * Math.PI / 180;
  if (Math.abs(yaw) < 0.001 && Math.abs(pitch) < 0.001) return hand;

  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);

  return hand.map(point => {
    const x = Number(point[0] || 0);
    const y = Number(point[1] || 0);
    const z = Number(point[2] || 0) * 0.75;

    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    const y1 = y * cosP - z1 * sinP;
    const z2 = y * sinP + z1 * cosP;
    const perspective = Math.max(0.72, Math.min(1.28, 1 / (1 + z2 * 0.14)));

    return [x1 * perspective, y1 * perspective, z2];
  });
}

drawNormalizedHand(ctx, hand, centerX, centerY, width, height, color, scaleRatio = 1) {
  hand = this.applyDemoViewRotation(hand);
  const fingerColors = {
    thumb: '#f59e0b',
    index: '#22c55e',
    middle: '#38bdf8',
    ring: '#a78bfa',
    pinky: '#f472b6',
    palm: '#94a3b8',
    wrist: '#e2e8f0',
  };
  const fingerByJoint = {
    1: 'thumb', 2: 'thumb', 3: 'thumb', 4: 'thumb',
    5: 'index', 6: 'index', 7: 'index', 8: 'index',
    9: 'middle', 10: 'middle', 11: 'middle', 12: 'middle',
    13: 'ring', 14: 'ring', 15: 'ring', 16: 'ring',
    17: 'pinky', 18: 'pinky', 19: 'pinky', 20: 'pinky',
  };
  const connectionColor = (a, b) => {
    const fa = fingerByJoint[a];
    const fb = fingerByJoint[b];
    if (fa && fa === fb) return fingerColors[fa];
    if (a === 0 && fb) return fingerColors[fb];
    if (b === 0 && fa) return fingerColors[fa];
    return fingerColors.palm;
  };
  const fingerGroups = {
    thumb: [1, 2, 3, 4],
    index: [5, 6, 7, 8],
    middle: [9, 10, 11, 12],
    ring: [13, 14, 15, 16],
    pinky: [17, 18, 19, 20],
  };
  const connections = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
  ];

  const valid = hand.filter(p => Math.abs(p[0]) + Math.abs(p[1]) + Math.abs(p[2] || 0) > 0.001);
  if (valid.length < 2) return;

  const xs = valid.map(p => p[0]);
  const ys = valid.map(p => p[1]);
  const zs = valid.map(p => p[2] || 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const zRange = Math.max(0.001, maxZ - minZ);
  const handW = Math.max(0.1, maxX - minX);
  const handH = Math.max(0.1, maxY - minY);
  const scale = Math.min(width * 0.36 / handW, height * 0.76 / handH, 165) * scaleRatio;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const project = (point) => ({
    x: centerX + (point[0] - midX) * scale,
    y: centerY - (point[1] - midY) * scale,
  });
  const depthRatio = (point) => Math.max(0, Math.min(1, ((point?.[2] || 0) - minZ) / zRange));
  const depthAlpha = (point) => 0.38 + depthRatio(point) * 0.62;
  const depthRadius = (base, point) => base * (0.72 + depthRatio(point) * 0.6);

  const foldedTips = new Set();
  Object.entries(fingerGroups).forEach(([name, joints]) => {
    const mcp = hand[joints[0]];
    const pip = hand[joints[1]];
    const dip = hand[joints[2]];
    const tip = hand[joints[3]];
    if (!mcp || !pip || !dip || !tip) return;
    const direct = Math.hypot(tip[0] - mcp[0], tip[1] - mcp[1], (tip[2] || 0) - (mcp[2] || 0));
    const path =
      Math.hypot(pip[0] - mcp[0], pip[1] - mcp[1], (pip[2] || 0) - (mcp[2] || 0)) +
      Math.hypot(dip[0] - pip[0], dip[1] - pip[1], (dip[2] || 0) - (pip[2] || 0)) +
      Math.hypot(tip[0] - dip[0], tip[1] - dip[1], (tip[2] || 0) - (dip[2] || 0));
    const curl = direct / Math.max(path, 0.001);
    const span = Math.hypot(tip[0] - mcp[0], tip[1] - mcp[1]);
    if (curl < 0.72 || span < 0.42) foldedTips.add(joints[3]);
  });

  const signKey = this.currentSign?.emoji || '';
  if (signKey === 'ㅓ' || signKey === 'ㅕ') {
    const guideSets = signKey === 'ㅕ'
      ? [[5, 6, 7, 8], [9, 10, 11, 12]]
      : [[5, 6, 7, 8]];

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    guideSets.forEach((joints, lineIndex) => {
      const points = joints.map(index => hand[index]).filter(Boolean);
      if (points.length < 2) return;
      ctx.beginPath();
      points.forEach((point, index) => {
        const p = project(point);
        if (index === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = lineIndex === 0 ? 'rgba(248,250,252,0.82)' : 'rgba(191,219,254,0.82)';
      ctx.lineWidth = 9;
      ctx.shadowColor = 'rgba(248,250,252,0.65)';
      ctx.shadowBlur = 8;
      ctx.stroke();

      const front = project(points[points.length - 1]);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(15,23,42,0.82)';
      ctx.beginPath();
      ctx.arc(front.x, front.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('앞', front.x, front.y);
    });
    ctx.restore();
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  ctx.shadowBlur = 10;

  connections.forEach(([a, b]) => {
    const pa = hand[a];
    const pb = hand[b];
    if (!pa || !pb) return;
    if (Math.abs(pa[0]) + Math.abs(pa[1]) < 0.001 || Math.abs(pb[0]) + Math.abs(pb[1]) < 0.001) return;
    const from = project(pa);
    const to = project(pb);
    const stroke = connectionColor(a, b);
    const alpha = Math.max(depthAlpha(pa), depthAlpha(pb));
    ctx.strokeStyle = stroke;
    ctx.shadowColor = stroke;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  });

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  hand.forEach((point, index) => {
    if (Math.abs(point[0]) + Math.abs(point[1]) < 0.001) return;
    const p = project(point);
    const fill = index === 0
      ? fingerColors.wrist
      : (fingerColors[fingerByJoint[index]] || color);
    ctx.beginPath();
    ctx.fillStyle = fill;
    ctx.globalAlpha = depthAlpha(point);
    ctx.arc(p.x, p.y, depthRadius(index === 0 ? 7 : 5, point), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (foldedTips.has(index)) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(-Math.PI / 10);
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = 'rgba(15,23,42,0.7)';
      ctx.lineWidth = 1;
      ctx.fillRect(-7, -2.5, 14, 5);
      ctx.strokeRect(-7, -2.5, 14, 5);
      ctx.restore();
    }
  });
}

drawHand(
  ctx,
  hand,
  width,
  height,
  color,
  transform
){

  const connections = [

    [0,1],[1,2],[2,3],[3,4],

    [0,5],[5,6],[6,7],[7,8],

    [0,9],[9,10],[10,11],[11,12],

    [0,13],[13,14],[14,15],[15,16],

    [0,17],[17,18],[18,19],[19,20]
  ];

  ctx.strokeStyle = color;

  ctx.lineWidth = 3;

  connections.forEach(([a,b])=>{

    this.drawLine(ctx, hand, a, b, width, height, color, transform);
  });
}

toCanvasPoint(
  arr,
  index,
  width,
  height,
  transform
){

  const point = this.rawOpenPosePoint(arr, index);
  if (!point) return null;

  if (transform) {
    return {
      x: (point.x - transform.minX) * transform.scale + transform.offsetX,
      y: (point.y - transform.minY) * transform.scale + transform.offsetY,
    };
  }

  let px = point.x;
  let py = point.y;

  px = px / 1920 * width;
  py = py / 1080 * height;

  return { x: px, y: py };
}
}

// ── 앱 시작 ──────────────────────────────────────────────────────────────────
let app;
function bootSignLanguageApp() {
  if (window.app) return;
  app = new SignLanguageApp();
  window.app = app;
  const firstSign = SIGNS.find(s => s.category === 'numbers') || SIGNS[0];
  if (firstSign) app.selectSign(firstSign.id);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootSignLanguageApp, { once: true });
} else {
  bootSignLanguageApp();
}
