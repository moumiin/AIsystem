/**
 * 수화 기준 포즈 데이터
 *
 * 좌표계: Three.js 공간 (정규화)
 *   - 손목(wrist) = 원점 (0,0,0)
 *   - 중지 MCP 까지의 거리 = 1.0 (스케일 기준)
 *   - x+: 오른쪽 (엄지 방향, 오른손 기준)
 *   - y+: 위 (손가락 끝 방향)
 *   - z+: 뷰어 방향
 *
 * MediaPipe 21개 랜드마크 순서:
 *   0:WRIST  1-4:THUMB  5-8:INDEX  9-12:MIDDLE  13-16:RING  17-20:PINKY
 */

// ─── 기본 포즈: 손 펼침 (Open Palm) ───────────────────────────────────────
const OPEN_PALM = [
  [ 0.00,  0.00,  0.00], // 0  WRIST
  [ 0.22,  0.38,  0.02], // 1  THUMB_CMC
  [ 0.32,  0.58,  0.03], // 2  THUMB_MCP
  [ 0.39,  0.74,  0.05], // 3  THUMB_IP
  [ 0.43,  0.86,  0.06], // 4  THUMB_TIP
  [ 0.15,  0.95,  0.00], // 5  INDEX_MCP
  [ 0.15,  1.38,  0.02], // 6  INDEX_PIP
  [ 0.15,  1.65,  0.04], // 7  INDEX_DIP
  [ 0.15,  1.82,  0.05], // 8  INDEX_TIP
  [ 0.00,  1.00,  0.00], // 9  MIDDLE_MCP
  [ 0.00,  1.48,  0.02], // 10 MIDDLE_PIP
  [ 0.00,  1.78,  0.04], // 11 MIDDLE_DIP
  [ 0.00,  1.97,  0.05], // 12 MIDDLE_TIP
  [-0.14,  0.95,  0.00], // 13 RING_MCP
  [-0.14,  1.38,  0.02], // 14 RING_PIP
  [-0.14,  1.65,  0.04], // 15 RING_DIP
  [-0.14,  1.82,  0.05], // 16 RING_TIP
  [-0.25,  0.86,  0.00], // 17 PINKY_MCP
  [-0.25,  1.20,  0.01], // 18 PINKY_PIP
  [-0.25,  1.40,  0.03], // 19 PINKY_DIP
  [-0.25,  1.53,  0.04], // 20 PINKY_TIP
];

// ─── 기본 포즈: 주먹 (Closed Fist) ────────────────────────────────────────
const CLOSED_FIST = [
  [ 0.00,  0.00,  0.00], // 0  WRIST
  [ 0.22,  0.38,  0.02], // 1  THUMB_CMC
  [ 0.30,  0.53,  0.08], // 2  THUMB_MCP
  [ 0.22,  0.62,  0.16], // 3  THUMB_IP
  [ 0.10,  0.68,  0.18], // 4  THUMB_TIP
  [ 0.15,  0.95,  0.00], // 5  INDEX_MCP
  [ 0.23,  1.07,  0.20], // 6  INDEX_PIP
  [ 0.17,  0.98,  0.33], // 7  INDEX_DIP
  [ 0.06,  0.89,  0.36], // 8  INDEX_TIP
  [ 0.00,  1.00,  0.00], // 9  MIDDLE_MCP
  [ 0.06,  1.12,  0.22], // 10 MIDDLE_PIP
  [ 0.01,  1.02,  0.35], // 11 MIDDLE_DIP
  [-0.07,  0.92,  0.38], // 12 MIDDLE_TIP
  [-0.14,  0.95,  0.00], // 13 RING_MCP
  [-0.10,  1.07,  0.20], // 14 RING_PIP
  [-0.09,  0.97,  0.33], // 15 RING_DIP
  [-0.04,  0.88,  0.36], // 16 RING_TIP
  [-0.25,  0.86,  0.00], // 17 PINKY_MCP
  [-0.24,  0.95,  0.15], // 18 PINKY_PIP
  [-0.22,  0.88,  0.26], // 19 PINKY_DIP
  [-0.18,  0.82,  0.28], // 20 PINKY_TIP
];

// ─── 손가락 인덱스 맵 ────────────────────────────────────────────────────
const FINGER_INDICES = {
  thumb:  [1, 2, 3, 4],
  index:  [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring:   [13, 14, 15, 16],
  pinky:  [17, 18, 19, 20],
};

/**
 * 손가락 굴곡값으로 포즈 생성
 * @param {Object} curls - {thumb, index, middle, ring, pinky} 각 0(펼침)~1(접힘)
 * @returns {Array} 21개 랜드마크 배열
 */
function createSign(curls) {
  const result = OPEN_PALM.map(([x, y, z]) => [x, y, z]);
  for (const [finger, curl] of Object.entries(curls)) {
    for (const idx of FINGER_INDICES[finger]) {
      const a = OPEN_PALM[idx];
      const b = CLOSED_FIST[idx];
      result[idx] = [
        a[0] + (b[0] - a[0]) * curl,
        a[1] + (b[1] - a[1]) * curl,
        a[2] + (b[2] - a[2]) * curl,
      ];
    }
  }
  return result;
}

// ─── 수화 목록 ─────────────────────────────────────────────────────────────
const SIGNS = [
  // ── 숫자 ──────────────────────────────────────────────────────────────
  {
    id: 'num1', name: '숫자 1', category: 'numbers', emoji: '☝️',
    description: '검지만 곧게 펴고 나머지 손가락은 접으세요',
    hint: '검지 하나만 위로 세워요',
    pose: createSign({ thumb: 0.5, index: 0.0, middle: 1.0, ring: 1.0, pinky: 1.0 }),
  },
  {
    id: 'num2', name: '숫자 2', category: 'numbers', emoji: '✌️',
    description: '검지와 중지를 펴고 V자 모양을 만드세요',
    hint: '검지, 중지 두 손가락을 위로 펴요',
    pose: createSign({ thumb: 0.5, index: 0.0, middle: 0.0, ring: 1.0, pinky: 1.0 }),
  },
  {
    id: 'num3', name: '숫자 3', category: 'numbers', emoji: '🤟',
    description: '검지, 중지, 약지 세 손가락을 펴세요',
    hint: '세 손가락을 나란히 펴요',
    pose: createSign({ thumb: 0.5, index: 0.0, middle: 0.0, ring: 0.0, pinky: 1.0 }),
  },
  {
    id: 'num4', name: '숫자 4', category: 'numbers', emoji: '4️⃣',
    description: '엄지를 제외한 네 손가락을 모두 펴세요',
    hint: '엄지만 접고 나머지 네 손가락을 펴요',
    pose: createSign({ thumb: 1.0, index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 }),
  },
  {
    id: 'num5', name: '숫자 5', category: 'numbers', emoji: '🖐️',
    description: '다섯 손가락을 모두 활짝 펴세요',
    hint: '손바닥을 완전히 펴서 보여주세요',
    pose: createSign({ thumb: 0.0, index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 }),
  },

  // ── 인사 ──────────────────────────────────────────────────────────────
  {
    id: 'hello', name: '안녕하세요', category: 'greetings', emoji: '👋',
    description: '손바닥을 앞으로 향하고 손을 펼쳐 가볍게 흔드세요',
    hint: '손바닥을 카메라 쪽으로 향하고 손을 펼쳐요',
    pose: createSign({ thumb: 0.0, index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 }),
  },
  {
    id: 'thanks', name: '감사합니다', category: 'greetings', emoji: '🙏',
    description: '손을 살짝 구부린 채 가슴 앞에 모으세요',
    hint: '모든 손가락을 살짝 구부려요',
    pose: createSign({ thumb: 0.2, index: 0.3, middle: 0.3, ring: 0.3, pinky: 0.3 }),
  },
  {
    id: 'sorry', name: '미안합니다', category: 'greetings', emoji: '😔',
    description: '가볍게 주먹을 쥐고 가슴 앞에서 원을 그리세요',
    hint: '손가락을 모두 가볍게 접어 주먹을 만들어요',
    pose: createSign({ thumb: 0.4, index: 0.9, middle: 0.9, ring: 0.9, pinky: 0.9 }),
  },

  // ── 표현 ──────────────────────────────────────────────────────────────
  {
    id: 'ily', name: '사랑해요', category: 'expressions', emoji: '🤟',
    description: '엄지, 검지, 새끼손가락을 펴세요 (ILY 사인)',
    hint: '엄지·검지·새끼를 펴고 중지·약지는 접어요',
    pose: createSign({ thumb: 0.0, index: 0.0, middle: 1.0, ring: 1.0, pinky: 0.0 }),
  },
  {
    id: 'fighting', name: '파이팅!', category: 'expressions', emoji: '✊',
    description: '주먹을 꽉 쥐고 힘차게 올려주세요',
    hint: '다섯 손가락을 모두 꽉 접어서 주먹을 만들어요',
    pose: createSign({ thumb: 0.5, index: 1.0, middle: 1.0, ring: 1.0, pinky: 1.0 }),
  },
  {
    id: 'ok', name: '오케이', category: 'expressions', emoji: '👌',
    description: '검지만 살짝 구부리고 나머지는 접으세요',
    hint: '검지는 살짝, 나머지는 완전히 접어요',
    pose: createSign({ thumb: 0.3, index: 0.6, middle: 1.0, ring: 1.0, pinky: 1.0 }),
  },
];
