/**
 * 제스처 비교 및 점수 계산 모듈
 *
 * MediaPipe 랜드마크를 정규화하고 기준 포즈와 비교합니다.
 */

/**
 * MediaPipe 랜드마크를 Three.js 좌표계로 정규화
 *
 * 변환 과정:
 *   1) 손목(0번)을 원점으로 이동
 *   2) 손목~중지MCP(9번) 거리를 1로 스케일
 *   3) y축 반전 (MediaPipe y↓ → Three.js y↑)
 *   4) z축 반전 (카메라 방향 통일)
 *   5) 왼손이면 x축 반전 (오른손 기준으로 통일)
 *
 * @param {Array} mpLandmarks - MediaPipe {x,y,z}[] 배열 (21개)
 * @param {boolean} isRightHand - 오른손 여부 (MediaPipe handedness 기준)
 * @returns {Array|null} 정규화된 [[x,y,z], ...] 배열 또는 null
 */
function normalizeLandmarks(mpLandmarks, isRightHand) {
  if (!mpLandmarks || mpLandmarks.length < 21) return null;

  const w = mpLandmarks[0]; // wrist

  // 1) 손목 기준 이동
  const shifted = mpLandmarks.map(lm => [
    lm.x - w.x,
    lm.y - w.y,
    (lm.z || 0) - (w.z || 0),
  ]);

  // 2) 스케일: 손목~중지MCP 거리
  const m = shifted[9];
  const scale = Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2]);
  if (scale < 0.001) return null;

  // 3,4,5) 축 변환
  // 웹캠은 셀피(좌우반전) 이미지이므로 오른손 엄지가 이미지 왼쪽에 위치
  // → 오른손은 x를 반전해야 기준 포즈(엄지 = +x)와 일치
  return shifted.map(([x, y, z]) => [
    (isRightHand ? -x : x) / scale,
    -y / scale,
    -z / scale,
  ]);
}

// 랜드마크별 비교 가중치 (손끝 > 중간 관절 > MCP)
const LM_WEIGHTS = [
  1.0,                       // 0 WRIST
  1.0, 1.0, 1.5, 2.0,        // 1-4  THUMB
  0.6, 0.9, 1.3, 2.0,        // 5-8  INDEX
  0.4, 0.6, 0.9, 1.5,        // 9-12 MIDDLE
  0.4, 0.6, 0.9, 1.3,        // 13-16 RING
  0.6, 0.8, 1.1, 1.8,        // 17-20 PINKY
];

// 엄지·검지는 변별력이 높아 타이트하게, 약지·새끼는 추적 노이즈가 커서 완화
const FINGER_SCORE_TOLERANCE = {
  thumb: 1.3,
  index: 1.3,
  middle: 1.5,
  ring: 1.6,
  pinky: 1.6,
};

const WEAK_FINGER_THRESHOLD = {
  thumb: 0.58,
  index: 0.58,
  middle: 0.58,
  ring: 0.58,
  pinky: 0.58,
};

function weakFingerCountFromScores(fingerScores) {
  return Object.entries(fingerScores || {})
    .filter(([finger, score]) => score < (WEAK_FINGER_THRESHOLD[finger] ?? 0.58))
    .length;
}

/**
 * 정규화된 사용자 포즈와 기준 포즈의 전체 점수 계산
 * @param {Array} userNorm - 정규화된 사용자 랜드마크
 * @param {Array} refPose  - 기준 포즈 [[x,y,z], ...] (signs-data.js)
 * @returns {number} 0~100 점수
 */
function rotatePose2D(pose, degrees) {
  const rad = degrees * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return pose.map(([x, y, z]) => [
    x * cos - y * sin,
    x * sin + y * cos,
    z || 0,
  ]);
}

function computeScoreBreakdown(userNorm, refPose, options = {}) {
  if (!userNorm || !refPose) {
    return { score: 0, poseScore: 0, directionScore: 0, fingerScore: 0, tipScore: 0, weakFingerCount: 5 };
  }

  const rotations = options.tryRotation ? [-24, -12, 0, 12, 24] : [0];
  let best = null;

  for (const deg of rotations) {
    const rotated = deg === 0 ? userNorm : rotatePose2D(userNorm, deg);
    const poseScore = computePoseDistanceScore(rotated, refPose);
    const directionScore = computeDirectionScore(rotated, refPose);
    const fingerScores = computePerFingerScores(rotated, refPose);
    const fingerScore = Object.values(fingerScores).reduce((sum, value) => sum + value, 0) / 5 * 100;
    const tipScore = computeTipPositionScore(rotated, refPose);
    const weakFingerCount = weakFingerCountFromScores(fingerScores);
    // 방향(각도)이 위치보다 스케일·깊이에 강건하므로 비중을 더 높임
    let score = poseScore * 0.36 + directionScore * 0.44 + fingerScore * 0.12 + tipScore * 0.08;

    if (options.strict) {
      // 위치·방향·손가락 중 하나라도 명백히 틀리면 고득점 차단 (거짓 통과 방지)
      if (poseScore < 55) score = Math.min(score, 60);
      if (directionScore < 55) score = Math.min(score, 62);
      if (fingerScore < 55) score = Math.min(score, 64);
      if (weakFingerCount >= 2) score = Math.min(score, 55);
      else if (weakFingerCount === 1) score = Math.min(score, 72);
    }

    score = Math.round(Math.max(0, Math.min(100, score)));
    const candidate = { score, poseScore, directionScore, fingerScore, tipScore, weakFingerCount, fingerScores };
    if (!best || candidate.score > best.score) best = candidate;
  }

  return best;
}

function computeScore(userNorm, refPose, options = {}) {
  return computeScoreBreakdown(userNorm, refPose, options)?.score || 0;
}

function computePoseDistanceScore(userNorm, refPose) {
  let totalErr = 0;
  let totalW = 0;
  for (let i = 0; i < 21; i++) {
    const [ux, uy, uz] = userNorm[i];
    const [rx, ry, rz] = refPose[i];
    const dist = Math.sqrt((ux - rx) ** 2 + (uy - ry) ** 2 + ((uz - rz) * 0.15) ** 2);
    totalErr += dist * LM_WEIGHTS[i];
    totalW   += LM_WEIGHTS[i];
  }

  const avgErr = totalErr / totalW;
  const ratio = Math.min(1, avgErr / 1.5);
  return Math.round(Math.max(0, (1 - ratio * ratio) * 100));
}

/**
 * OpenPose flat hand (50 floats) → 21×3, MediaPipe와 동일한 손 좌표계
 * @param {boolean} mirrorX - 화면 오른쪽 손 슬롯이면 true
 */
function normalizeOpenPoseFlatHand(flatHand, mirrorX = false) {
  if (!Array.isArray(flatHand) || flatHand.length < 42) return null;

  const points = [];
  for (let i = 0; i < 21; i++) {
    let x = Number(flatHand[i * 2] || 0);
    let y = Number(flatHand[i * 2 + 1] || 0);
    if (Math.abs(x) > 4 || Math.abs(y) > 4) {
      x /= 1920;
      y /= 1080;
    }
    points.push([x, y]);
  }

  const valid = points.filter(([x, y]) => Math.abs(x) + Math.abs(y) > 0.001);
  if (valid.length < 8) return null;

  const wrist = points[0];
  const middleMcp = points[9];
  const scale = Math.hypot(middleMcp[0] - wrist[0], middleMcp[1] - wrist[1]);
  if (scale < 1e-5) return null;

  return points.map(([x, y]) => [
    ((mirrorX ? -(x - wrist[0]) : (x - wrist[0])) / scale),
    (-(y - wrist[1]) / scale),
    0,
  ]);
}

function isActiveHandLandmarks(hand) {
  if (!Array.isArray(hand) || hand.length < 21) return false;
  let active = 0;
  for (const p of hand) {
    if (!Array.isArray(p)) continue;
    if (Math.abs(p[0] || 0) + Math.abs(p[1] || 0) + Math.abs(p[2] || 0) > 0.001) active += 1;
  }
  return active >= 8;
}

function toHandLandmarks21(points) {
  if (!Array.isArray(points)) return null;
  const hand = points.slice(0, 21).map(p => [
    Number(p[0] || 0),
    Number(p[1] || 0),
    Number(p[2] || 0),
  ]);
  return isActiveHandLandmarks(hand) ? hand : null;
}

/**
 * 프레임에서 채점·시범용 손 슬롯 추출 (미러 후보 없음)
 * slot: primary | screenLeft | screenRight
 */
function extractHandSlotsFromFrame(frame) {
  if (!Array.isArray(frame)) return [];

  if (frame.length >= 150 && typeof frame[0] === 'number') {
    const left = normalizeOpenPoseFlatHand(frame.slice(50, 100), false);
    const right = normalizeOpenPoseFlatHand(frame.slice(100, 150), true);
    const slots = [];
    if (left) slots.push({ slot: 'screenLeft', landmarks: left });
    if (right) slots.push({ slot: 'screenRight', landmarks: right });
    return slots;
  }

  if (frame.length >= 42 && Array.isArray(frame[0])) {
    const left = toHandLandmarks21(frame.slice(0, 21));
    const right = toHandLandmarks21(frame.slice(21, 42));
    const slots = [];
    if (left) slots.push({ slot: 'screenLeft', landmarks: left });
    if (right) slots.push({ slot: 'screenRight', landmarks: right });
    return slots;
  }

  if (frame.length >= 21 && Array.isArray(frame[0])) {
    const primary = toHandLandmarks21(frame);
    if (primary) return [{ slot: 'primary', landmarks: primary }];
  }

  return [];
}

/** 셀피 카메라: MediaPipe Right = 화면 왼쪽 = OpenPose screenLeft */
const MP_HAND_TO_SLOT = {
  Right: 'screenLeft',
  Left: 'screenRight',
};

function computeDirectionScore(userNorm, refPose) {
  const bones = [
    [0,1,0.8],[1,2,0.8],[2,3,1.1],[3,4,1.5],
    [0,5,0.5],[5,6,0.8],[6,7,1.1],[7,8,1.6],
    [0,9,0.4],[9,10,0.7],[10,11,1.0],[11,12,1.4],
    [0,13,0.4],[13,14,0.7],[14,15,1.0],[15,16,1.3],
    [0,17,0.5],[17,18,0.8],[18,19,1.1],[19,20,1.5],
  ];

  let total = 0;
  let totalW = 0;
  for (const [a, b, weight] of bones) {
    const u = unitVector(userNorm[a], userNorm[b]);
    const r = unitVector(refPose[a], refPose[b]);
    if (!u || !r) continue;

    const dot = Math.max(-1, Math.min(1, u[0] * r[0] + u[1] * r[1] + u[2] * r[2]));
    total += ((dot + 1) / 2) * weight;
    totalW += weight;
  }

  if (totalW === 0) return 0;
  return Math.round((total / totalW) * 100);
}

function computeTipPositionScore(userNorm, refPose) {
  const tips = [4, 8, 12, 16, 20];
  let totalErr = 0;

  for (const i of tips) {
    const [ux, uy, uz] = userNorm[i];
    const [rx, ry, rz] = refPose[i];
    totalErr += Math.sqrt((ux - rx) ** 2 + (uy - ry) ** 2 + ((uz - rz) * 0.15) ** 2);
  }

  const avgErr = totalErr / tips.length;
  return Math.round(Math.max(0, Math.min(100, (1 - Math.min(1, avgErr / 0.95)) * 100)));
}

function unitVector(a, b) {
  if (!a || !b) return null;
  const x = (b[0] || 0) - (a[0] || 0);
  const y = (b[1] || 0) - (a[1] || 0);
  const z = (b[2] || 0) - (a[2] || 0);
  const len = Math.sqrt(x * x + y * y + z * z);
  if (len < 1e-6) return null;
  return [x / len, y / len, z / len];
}

/**
 * 손가락별 점수 계산
 * @returns {Object} {thumb, index, middle, ring, pinky} 각 0~1
 */
function computePerFingerScores(userNorm, refPose) {
  if (!userNorm || !refPose) {
    return { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 };
  }

  const result = {};
  for (const [finger, indices] of Object.entries(FINGER_INDICES)) {
    let err = 0;
    for (const i of indices) {
      const [ux, uy, uz] = userNorm[i];
      const [rx, ry, rz] = refPose[i];
      err += Math.sqrt((ux - rx) ** 2 + (uy - ry) ** 2 + ((uz - rz) * 0.15) ** 2);
    }
    const avgErr = err / indices.length;
    const tolerance = FINGER_SCORE_TOLERANCE[finger] ?? 0.92;
    result[finger] = Math.max(0, Math.min(1, 1 - avgErr / tolerance));
  }
  return result;
}
