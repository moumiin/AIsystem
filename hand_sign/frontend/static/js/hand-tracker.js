/**
 * MediaPipe Hands 웹캠 추적 모듈
 *
 * 요구 CDN:
 *   @mediapipe/hands, @mediapipe/camera_utils, @mediapipe/drawing_utils
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
   * @param {Function} onResult          - 결과 콜백 ({landmarks, handedness} | null)
   */
  constructor(videoEl, overlayEl, onResult) {
    this.videoEl  = videoEl;
    this.overlay  = overlayEl;
    this.ctx      = overlayEl.getContext('2d');
    this.onResult = onResult;
    this.hands    = null;
    this.camera   = null;
    this.isRunning = false;
    this._perFingerColors = null; // 손가락별 색상 덮어쓰기용
  }

  async start() {
    this.hands = new Hands({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${f}`,
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults(r => this._onResults(r));

    this.camera = new Camera(this.videoEl, {
      onFrame: async () => {
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

  /** 손가락별 색상 설정 (오버레이 하이라이트용) */
  setFingerColors(perFingerScores) {
    this._perFingerColors = perFingerScores;
  }

  _onResults(results) {
    const { ctx, overlay } = this;
    ctx.save();
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (results.multiHandLandmarks?.length > 0) {
      const landmarks   = results.multiHandLandmarks[0];
      const handedness  = results.multiHandedness[0].label; // 'Left' | 'Right'

      // ── 뼈대 그리기 ──────────────────────────────────────────────────
      this._drawConnections(landmarks, this._perFingerColors);

      // ── 관절 그리기 ──────────────────────────────────────────────────
      this._drawJoints(landmarks, this._perFingerColors);

      this.onResult({ landmarks, handedness });
    } else {
      this.onResult(null);
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
