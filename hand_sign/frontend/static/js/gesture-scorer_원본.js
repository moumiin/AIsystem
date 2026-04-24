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
  return shifted.map(([x, y, z]) => [
    (isRightHand ? x : -x) / scale, //  x: 오른손 엄지 = +x
    -y / scale,                      //  y: 위 = +y
    -z / scale,                      //  z: 카메라 방향 = +z
  ]);
}

// 랜드마크별 비교 가중치 (손끝 > 중간 관절 > MCP)
const LM_WEIGHTS = [
  1.0,                       // 0 WRIST
  0.4, 0.5, 0.8, 1.5,        // 1-4  THUMB
  0.4, 0.6, 0.9, 1.5,        // 5-8  INDEX
  0.4, 0.6, 0.9, 1.5,        // 9-12 MIDDLE
  0.4, 0.6, 0.9, 1.3,        // 13-16 RING
  0.4, 0.6, 0.8, 1.2,        // 17-20 PINKY
];

/**
 * 정규화된 사용자 포즈와 기준 포즈의 전체 점수 계산
 * @param {Array} userNorm - 정규화된 사용자 랜드마크
 * @param {Array} refPose  - 기준 포즈 [[x,y,z], ...] (signs-data.js)
 * @returns {number} 0~100 점수
 */
function computeScore(userNorm, refPose) {
  if (!userNorm || !refPose) return 0;

  let totalErr = 0;
  let totalW = 0;

  for (let i = 0; i < 21; i++) {
    const [ux, uy, uz] = userNorm[i];
    const [rx, ry, rz] = refPose[i];
    // Z축(깊이)은 MediaPipe에서 노이즈가 많으므로 가중치 0.3 적용
    const dist = Math.sqrt((ux - rx) ** 2 + (uy - ry) ** 2 + ((uz - rz) * 0.3) ** 2);
    totalErr += dist * LM_WEIGHTS[i];
    totalW   += LM_WEIGHTS[i];
  }

  const avgErr = totalErr / totalW;
  // 이차 곡선: 작은 오차는 고점수 유지, 큰 오차에서 빠르게 감점
  // avgErr 0 → 100점, 0.15 → 91점, 0.3 → 64점, 0.5 → 0점
  const ratio = Math.min(1, avgErr / 0.5);
  return Math.round(Math.max(0, (1 - ratio * ratio) * 100));
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
      err += Math.sqrt((ux - rx) ** 2 + (uy - ry) ** 2 + (uz - rz) ** 2);
    }
    const avgErr = err / indices.length;
    // 손가락별 판정도 완화 (0.55 기준으로 확장)
    result[finger] = Math.max(0, Math.min(1, 1 - avgErr / 0.55));
  }
  return result;
}
