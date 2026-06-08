/**
 * 규칙 기반 실시간 코칭 메시지 (LLM 없이 즉시 응답)
 */
const FINGER_KO = {
  thumb: '엄지',
  index: '검지',
  middle: '중지',
  ring: '약지',
  pinky: '새끼',
};

function buildCoachingFeedback({
  score = 0,
  perFinger = null,
  signName = '',
  requiredHands = 1,
  detectedHands = 0,
  holding = false,
  holdPercent = 0,
  motionHint = '',
} = {}) {
  const lines = [];

  if (detectedHands > 0 && detectedHands < requiredHands) {
    lines.push(requiredHands === 2
      ? '양손이 모두 보이면 점수가 더 정확해져요. 가능하면 두 손을 화면 안에 넣어주세요.'
      : '손 한 손만 인식됐어요. 손 전체가 화면에 들어오게 조정해주세요.');
  }

  if (holding) {
    lines.push(`좋아요! "${signName || '현재 수어'}" 자세를 ${holdPercent}% 정도 유지 중이에요.`);
    return lines.slice(0, 3).join('<br>');
  }

  if (score >= 78) {
    lines.push('손모양이 시범과 매우 가까워요. 지금 자세를 조금만 더 유지해보세요.');
  } else if (score >= 58) {
    lines.push('전체 형태는 맞아가고 있어요. 손끝 높이와 손목 각도를 조금만 더 맞춰보세요.');
  } else if (score >= 35) {
    lines.push('기본 방향은 보여요. 시범 손 위치와 손바닥 방향을 먼저 맞춰주세요.');
  } else if (score > 0) {
    lines.push('손이 인식됐지만 시범과 차이가 커요. 카메라를 정면으로 두고 손 전체를 크게 보여주세요.');
  } else {
    lines.push('손이 아직 충분히 인식되지 않았어요. 조명이 밝은 곳에서 손 전체를 화면 안에 넣어주세요.');
  }

  if (perFinger) {
    const weak = Object.entries(perFinger)
      .filter(([, value]) => value < 0.55)
      .sort((a, b) => a[1] - b[1])
      .map(([finger]) => FINGER_KO[finger]);

    const strong = Object.entries(perFinger)
      .filter(([, value]) => value >= 0.72)
      .sort((a, b) => b[1] - a[1])
      .map(([finger]) => FINGER_KO[finger]);

    if (weak.length > 0) {
      lines.push(`조정 포인트: ${weak.slice(0, 2).join(', ')} 위치를 시범과 맞춰보세요.`);
    }
    if (strong.length > 0 && score >= 45) {
      lines.push(`잘 맞는 부분: ${strong.slice(0, 2).join(', ')}`);
    }
  }

  if (motionHint) lines.push(motionHint);

  return lines.slice(0, 4).join('<br>');
}
