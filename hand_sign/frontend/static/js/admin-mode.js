class AdminMode {
  constructor(appGetter) {
    this.getApp = appGetter;
    this.captures = [];
    this.motionCaptures = [];

    this.drawer = document.getElementById('admin-drawer');
    this.openBtn = document.getElementById('admin-toggle');
    this.closeBtn = document.getElementById('admin-close');
    this.captureBtn = document.getElementById('admin-capture-btn');
    this.recordBtn = document.getElementById('admin-record-btn');
    this.previewBtn = document.getElementById('admin-preview-btn');
    this.flipLeftBtn = document.getElementById('admin-flip-left-btn');
    this.flipRightBtn = document.getElementById('admin-flip-right-btn');
    this.copyBtn = document.getElementById('admin-copy-btn');
    this.statusEl = document.getElementById('admin-status');
    this.exportEl = document.getElementById('admin-export');
    this.currentEl = document.getElementById('admin-current-sign');
    this.isRecording = false;
    this.recordTimer = null;
    this.recordStartedAt = 0;
    this.recordDurationMs = 5000;
    this.recordIntervalMs = 200;
    this.recordDelayMs = 3000;
    this.countdownTimer = null;
    this.pendingRecording = false;

    if (!this.drawer || !this.openBtn) return;

    this.openBtn.addEventListener('click', () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.drawer.addEventListener('click', event => {
      if (event.target === this.drawer) this.close();
    });
    this.captureBtn?.addEventListener('click', () => this.capture());
    this.recordBtn?.addEventListener('click', () => this.toggleRecording());
    this.previewBtn?.addEventListener('click', () => this.preview());
    this.flipLeftBtn?.addEventListener('click', () => this.flipHand('left'));
    this.flipRightBtn?.addEventListener('click', () => this.flipHand('right'));
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
    this.cancelCountdown();
    if (this.isRecording) this.stopRecording(true);
    this.drawer.classList.remove('open');
    this.drawer.setAttribute('aria-hidden', 'true');
  }

  get sign() {
    return this.getApp()?.currentSign || null;
  }

  getCurrentHandFrame() {
    const app = this.getApp();
    const hands = Array.isArray(app?.lastNormalizedHands) ? app.lastNormalizedHands : [];
    const frame = { left: null, right: null };
    for (const hand of hands) {
      if (!Array.isArray(hand.pose) || hand.pose.length < 21) continue;
      const key = hand.handedness === 'Left' ? 'left' : 'right';
      frame[key] = this.roundPose(hand.pose);
    }

    if (!frame.right && !frame.left && Array.isArray(app?.lastNormalizedPose) && app.lastNormalizedPose.length >= 21) {
      const key = app.lastPoseHandedness === 'Left' ? 'left' : 'right';
      frame[key] = this.roundPose(app.lastNormalizedPose);
    }

    const primary = frame.right || frame.left;
    return primary ? { frame, primary } : null;
  }

  formatHandCount(frame) {
    return ['left', 'right'].filter(side => Array.isArray(frame?.[side])).length;
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
    const handFrame = this.getCurrentHandFrame();
    if (!handFrame) {
      this.setStatus('아직 손 자세가 인식되지 않았습니다. 손을 카메라 화면 안에 맞춰주세요.', 'error');
      return;
    }

    this.captures.push({
      signId: sign.id,
      signName: sign.name,
      handedness: app.lastPoseHandedness || 'Unknown',
      pose: handFrame.primary,
      hands: handFrame.frame,
      capturedAt: new Date().toISOString(),
    });

    this.updateExport();
    this.setStatus(`${sign.id} 수어의 캡처 ${this.captures.length}개를 저장했습니다. (${this.formatHandCount(handFrame.frame)}손)`, 'ok');
  }

  toggleRecording() {
    if (this.pendingRecording) {
      this.cancelCountdown();
      return;
    }
    if (this.isRecording) {
      this.stopRecording(true);
      return;
    }
    this.startRecording();
  }

  startRecording() {
    const app = this.getApp();
    const sign = this.sign;
    if (!app?.tracker?.isRunning) {
      this.setStatus('카메라가 꺼져 있습니다. 먼저 카메라를 시작해주세요.', 'error');
      return;
    }
    if (!sign) {
      this.setStatus('선택된 수어가 없습니다. 저장할 수어를 먼저 골라주세요.', 'error');
      return;
    }
    if (!this.getCurrentHandFrame()) {
      this.setStatus('손 자세가 아직 인식되지 않았습니다. 손을 화면 안에 맞춰주세요.', 'error');
      return;
    }

    this.pendingRecording = true;
    if (this.recordBtn) {
      this.recordBtn.textContent = '대기 취소';
      this.recordBtn.classList.add('recording');
    }
    if (this.captureBtn) this.captureBtn.disabled = true;
    if (this.previewBtn) this.previewBtn.disabled = true;

    const countdownStartedAt = Date.now();
    this.setStatus('3초 뒤 5초 연속동작 저장을 시작합니다. 준비하세요.', 'ok');
    this.countdownTimer = setInterval(() => {
      const elapsed = Date.now() - countdownStartedAt;
      const left = Math.max(0, Math.ceil((this.recordDelayMs - elapsed) / 1000));
      if (elapsed >= this.recordDelayMs) {
        this.cancelCountdown(false);
        this.beginRecordingNow();
        return;
      }
      this.setStatus(`${left}초 뒤 녹화를 시작합니다.`, 'ok');
    }, 200);
  }

  cancelCountdown(restoreControls = true) {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (!this.pendingRecording) return;
    this.pendingRecording = false;
    if (!restoreControls) return;
    if (this.recordBtn) {
      this.recordBtn.textContent = '5초 연속동작 저장';
      this.recordBtn.classList.remove('recording');
    }
    if (this.captureBtn) this.captureBtn.disabled = false;
    if (this.previewBtn) this.previewBtn.disabled = false;
    this.setStatus('연속동작 저장 대기를 취소했습니다.', 'error');
  }

  beginRecordingNow() {
    const app = this.getApp();
    const sign = this.sign;
    if (!app?.tracker?.isRunning || !sign) {
      this.cancelCountdown();
      return;
    }

    this.motionCaptures = this.motionCaptures.filter(c => c.signId !== sign.id);
    this.isRecording = true;
    this.recordStartedAt = Date.now();
    if (this.recordBtn) {
      this.recordBtn.textContent = '녹화 중지';
      this.recordBtn.classList.add('recording');
    }
    if (this.captureBtn) this.captureBtn.disabled = true;
    if (this.previewBtn) this.previewBtn.disabled = true;

    this.sampleRecordingFrame();
    this.recordTimer = setInterval(() => {
      this.sampleRecordingFrame();
      const elapsed = Date.now() - this.recordStartedAt;
      const left = Math.max(0, Math.ceil((this.recordDurationMs - elapsed) / 1000));
      this.setStatus(`연속동작 저장 중... 남은 시간 ${left}초, ${this.motionSequenceForCurrentSign().length}프레임`, 'ok');
      if (elapsed >= this.recordDurationMs) {
        this.stopRecording(false);
      }
    }, this.recordIntervalMs);
  }

  sampleRecordingFrame() {
    const sign = this.sign;
    const handFrame = this.getCurrentHandFrame();
    if (!sign || !handFrame) return;
    const bodyPose = this.getApp()?.lastBodyPose || null;

    this.motionCaptures.push({
      signId: sign.id,
      signName: sign.name,
      handedness: this.getApp()?.lastPoseHandedness || 'Unknown',
      pose: handFrame.primary,
      hands: handFrame.frame,
      bodyPose,
      capturedAt: new Date().toISOString(),
      source: 'continuous-recording',
    });
  }

  stopRecording(cancelledByUser = false) {
    this.cancelCountdown(false);
    if (this.recordTimer) {
      clearInterval(this.recordTimer);
      this.recordTimer = null;
    }
    if (!this.isRecording) return;
    this.isRecording = false;
    if (this.recordBtn) {
      this.recordBtn.textContent = '5초 연속동작 저장';
      this.recordBtn.classList.remove('recording');
    }
    if (this.captureBtn) this.captureBtn.disabled = false;
    if (this.previewBtn) this.previewBtn.disabled = false;

    const frames = this.motionSequenceForCurrentSign();
    this.updateExport();
    if (frames.length > 1) {
      this.setStatus(
        `${cancelledByUser ? '연속동작 저장을 중지했습니다.' : '5초 연속동작 저장이 끝났습니다.'} ${frames.length}프레임을 motionSequence로 추출했습니다.`,
        'ok'
      );
    } else {
      this.setStatus('저장된 프레임이 부족합니다. 손을 화면 안에 둔 상태로 다시 시도해주세요.', 'error');
    }
  }

  preview() {
    const app = this.getApp();
    const latest = this.latestCapture();
    const sign = this.sign;
    const stageFrames = this.sequenceForCurrentSign();
    const motionFrames = this.motionSequenceForCurrentSign();
    const frames = stageFrames.length > 0 ? stageFrames : motionFrames;
    if (!app?.renderer || !latest || !sign || frames.length === 0) {
      this.setStatus('아직 캡처된 자세가 없습니다.', 'error');
      return;
    }

    sign.pose = frames[0];
    sign.sequence = frames.length > 1 ? frames : null;
    sign.handPose = stageFrames.length > 0
      ? this.handSequenceForCurrentSign()[0]
      : this.motionHandSequenceForCurrentSign()[0];
    sign.motionSequence = motionFrames.length > 1 ? motionFrames : null;
    app._applySign(sign);
    this.setStatus(
      frames.length > 1
        ? '캡처한 단계형 자세를 시범 패널에 반영했습니다.'
        : '캡처한 자세를 시범 패널에 반영했습니다.',
      'ok'
    );
  }

  flipHand(side) {
    const sign = this.sign;
    if (!sign) {
      this.setStatus('선택된 수어가 없습니다.', 'error');
      return;
    }

    const flipPose = pose => Array.isArray(pose)
      ? pose.map(([x, y, z]) => [Number((-x).toFixed(4)), y, z])
      : pose;

    let changed = 0;
    const applyFlip = capture => {
      if (capture.signId !== sign.id || !capture.hands?.[side]) return;
      capture.hands[side] = flipPose(capture.hands[side]);
      capture.pose = capture.hands.right || capture.hands.left || capture.pose;
      changed++;
    };

    this.captures.forEach(applyFlip);
    this.motionCaptures.forEach(applyFlip);

    if (changed === 0) {
      this.setStatus(`${side === 'left' ? '오른손' : '왼손'} 데이터가 없습니다. 먼저 해당 손을 캡처해주세요.`, 'error');
      return;
    }

    this.updateExport();
    this.preview();
    this.setStatus(`${side === 'left' ? '오른손' : '왼손'} 방향을 반전했습니다. 미리보기에서 확인해주세요.`, 'ok');
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
    const stageList = sign ? this.captures.filter(c => c.signId === sign.id) : this.captures;
    const motionList = sign ? this.motionCaptures.filter(c => c.signId === sign.id) : this.motionCaptures;
    return stageList[stageList.length - 1] || motionList[motionList.length - 1] || null;
  }

  sequenceForCurrentSign() {
    const sign = this.sign;
    if (!sign) return [];
    return this.captures.filter(c => c.signId === sign.id).map(c => c.pose);
  }

  handSequenceForCurrentSign() {
    const sign = this.sign;
    if (!sign) return [];
    return this.captures
      .filter(c => c.signId === sign.id)
      .map(c => c.hands)
      .filter(Boolean);
  }

  motionSequenceForCurrentSign() {
    const sign = this.sign;
    if (!sign) return [];
    return this.motionCaptures.filter(c => c.signId === sign.id).map(c => c.pose);
  }

  motionHandSequenceForCurrentSign() {
    const sign = this.sign;
    if (!sign) return [];
    return this.motionCaptures
      .filter(c => c.signId === sign.id)
      .map(c => c.hands)
      .filter(Boolean);
  }

  motionPoseSequenceForCurrentSign() {
    const sign = this.sign;
    if (!sign) return [];
    return this.motionCaptures
      .filter(c => c.signId === sign.id)
      .map(c => c.bodyPose)
      .filter(Boolean);
  }

  updateExport() {
    if (!this.exportEl) return;
    const sign = this.sign;
    if (!sign) {
      this.exportEl.value = '';
      return;
    }

    const stageFrames = this.sequenceForCurrentSign();
    const motionFrames = this.motionSequenceForCurrentSign();
    const stageHandFrames = this.handSequenceForCurrentSign();
    const motionHandFrames = this.motionHandSequenceForCurrentSign();
    const motionPoseFrames = this.motionPoseSequenceForCurrentSign();
    if (stageFrames.length === 0 && motionFrames.length === 0) {
      this.exportEl.value = `// "${sign.id}" 수어를 선택한 뒤 단계 자세를 캡처하거나 5초 연속동작을 저장하세요.`;
      return;
    }

    const basePose = stageFrames[0] || motionFrames[0];
    const baseHandPose = stageHandFrames[0] || motionHandFrames[0] || null;
    const handPoseLine = baseHandPose
      ? `,\n  handPose: ${this.formatPoseArray(baseHandPose, 2)}`
      : '';
    const sequenceLine = stageFrames.length > 0
      ? `,\n  sequence: ${this.formatPoseArray(stageFrames, 2)}`
      : '';
    const handSequenceLine = stageHandFrames.length > 0
      ? `,\n  handSequence: ${this.formatPoseArray(stageHandFrames, 2)}`
      : '';
    const motionSequenceLine = motionFrames.length > 0
      ? `,\n  motionSequence: ${this.formatPoseArray(motionFrames, 2)}`
      : '';
    const motionHandSequenceLine = motionHandFrames.length > 0
      ? `,\n  motionHandSequence: ${this.formatPoseArray(motionHandFrames, 2)}`
      : '';
    const motionPoseSequenceLine = motionPoseFrames.length > 0
      ? `,\n  motionPoseSequence: ${this.formatPoseArray(motionPoseFrames, 2)}`
      : '';
    const sequenceMetaLine = stageFrames.length > 0 || motionFrames.length > 0
      ? `,\n  durationMs: ${this.recordDurationMs},\n  stageCount: 5`
      : '';

    this.exportEl.value =
`// frontend/static/js/signs-data.js 에 적용할 보정 데이터
// sequence: 1/5~5/5 단계 연습용 키포즈
// motionSequence: 마지막 5초 연속동작 연습용 프레임
// handPose/handSequence/motionHandSequence: 양손 저장용 left/right 데이터
// id 가 "${sign.id}" 인 SIGNS 항목에 아래 필드를 추가하거나 교체하세요.
pose: ${this.formatPoseArray(basePose, 0)}${handPoseLine}${sequenceLine}${handSequenceLine}${motionSequenceLine}${motionHandSequenceLine}${motionPoseSequenceLine}${sequenceMetaLine}

// 브라우저 콘솔에서 바로 반영:
Object.assign(SIGNS.find(sign => sign.id === ${JSON.stringify(sign.id)}), {
  pose: ${this.formatPoseArray(basePose, 2)}${handPoseLine}${sequenceLine}${handSequenceLine}${motionSequenceLine}${motionHandSequenceLine}${motionPoseSequenceLine}${sequenceMetaLine}
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
