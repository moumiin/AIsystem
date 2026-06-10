/**
 * MediaPipe Hands 웹캠 추적 모듈
 *
 * 요구 CDN:
 *   @mediapipe/hands, @mediapipe/camera_utils
 */

const HAND_CONNECTIONS_DEF = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

class HandTracker {
  /**
   * @param {HTMLVideoElement} videoEl   - 웹캠 비디오 요소
   * @param {HTMLCanvasElement} overlayEl - 랜드마크 오버레이 캔버스
   * @param {Function} onResult          - 결과 콜백 ([{landmarks, handedness}] | [])
   */
  constructor(videoEl, overlayEl, onResult) {
    this.videoEl  = videoEl;
    this.overlay  = overlayEl;
    this.ctx      = overlayEl.getContext('2d');
    this.onResult = onResult;
    this.hands    = null;
    this.pose     = null;
    this.camera   = null;
    this.isRunning = false;
    this._perFingerColors = {}; // { 'Left': perFingerScores, 'Right': perFingerScores }
    this._lastPoseLandmarks = null;
  }

  async start() {
    this.hands = new Hands({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${f}`,
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults(r => this._onResults(r));

    if (typeof Pose !== 'undefined') {
      this.pose = new Pose({
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${f}`,
      });
      this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });
      this.pose.onResults(r => {
        this._lastPoseLandmarks = r.poseLandmarks || null;
      });
    }

    this.camera = new Camera(this.videoEl, {
      onFrame: async () => {
        if (this.pose) await this.pose.send({ image: this.videoEl });
        if (this.hands) await this.hands.send({ image: this.videoEl });
      },
      width: 640,
      height: 480,
    });

    await this.camera.start();
    this.isRunning = true;
  }

  stop() {
    if (this.camera) this.camera.stop();
    this.isRunning = false;
  }

  /**
   * 손가락별 색상 설정 (오버레이 하이라이트용)
   * @param {Object} perFingerScores - {thumb, index, middle, ring, pinky}
   * @param {string} handedness      - 'Left' | 'Right'
   */
  setFingerColors(perFingerScores, handedness = 'Right') {
    this._perFingerColors[handedness] = perFingerScores;
  }

  _onResults(results) {
    const { ctx, overlay } = this;
    ctx.save();
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const detected = [];

    if (results.multiHandLandmarks?.length > 0) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks  = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i].label; // 'Left' | 'Right'
        const colors     = this._perFingerColors[handedness] ?? null;

        this._drawConnections(landmarks, colors);
        this._drawJoints(landmarks, colors);

        detected.push({ landmarks, handedness });
      }
    }

    if (this._lastPoseLandmarks) this._drawBodyPose(this._lastPoseLandmarks);

    this.onResult(detected, this._lastPoseLandmarks);

    ctx.restore();
  }

  _drawBodyPose(poseLandmarks) {
    const { ctx, overlay } = this;
    if (!poseLandmarks || poseLandmarks.length < 17) return;

    const W = overlay.width;
    const H = overlay.height;
    const points = [0, 11, 12, 13, 14, 15, 16];
    const lines = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16]];

    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.9)';
    for (const [a, b] of lines) {
      const pa = poseLandmarks[a];
      const pb = poseLandmarks[b];
      if (!pa || !pb || pa.visibility < 0.35 || pb.visibility < 0.35) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x * W, pa.y * H);
      ctx.lineTo(pb.x * W, pb.y * H);
      ctx.stroke();
    }

    for (const i of points) {
      const p = poseLandmarks[i];
      if (!p || p.visibility < 0.35) continue;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, i === 0 ? 5 : 7, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#f59e0b' : '#22c55e';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawConnections(landmarks, fingerScores) {
    const { ctx, overlay } = this;
    const W = overlay.width;
    const H = overlay.height;

    for (const [a, b] of HAND_CONNECTIONS_DEF) {
      const ax = landmarks[a].x * W;
      const ay = landmarks[a].y * H;
      const bx = landmarks[b].x * W;
      const by = landmarks[b].y * H;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  _drawJoints(landmarks, fingerScores) {
    const { ctx, overlay } = this;
    const W = overlay.width;
    const H = overlay.height;

    const FINGER_MAP = {
      thumb: [1,2,3,4], index: [5,6,7,8],
      middle: [9,10,11,12], ring: [13,14,15,16], pinky: [17,18,19,20],
    };

    const idxColorMap = {};
    if (fingerScores) {
      for (const [finger, score] of Object.entries(fingerScores)) {
        const color = score > 0.75 ? '#22c55e' : score > 0.45 ? '#f59e0b' : '#ef4444';
        for (const i of FINGER_MAP[finger]) idxColorMap[i] = color;
      }
    }

    for (let i = 0; i < 21; i++) {
      const lm = landmarks[i];
      const x = lm.x * W;
      const y = lm.y * H;
      const r = i === 0 ? 7 : (i % 4 === 0 ? 6 : 4);

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = idxColorMap[i] || '#FF1744';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}
