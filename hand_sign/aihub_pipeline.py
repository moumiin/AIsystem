"""
AI Hub 수어 데이터 파이프라인

검색 우선순위:
  ① aihub_keypoint_index.json  (키포인트 인덱스, build_keypoint_index.py로 생성)
  ② aihub_index.json           (영상 URL 인덱스, 기존 방식)
"""
import json, os, math, tempfile

BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH      = os.path.join(BASE_DIR, "aihub_index.json")
KP_INDEX_PATH   = os.path.join(BASE_DIR, "aihub_keypoint_index.json")
CACHE_DIR       = os.path.join(BASE_DIR, "aihub_cache")

_index    = None
_kp_index = None
_hands    = None

# ── 키포인트 인덱스 로드 ───────────────────────────────────────────────────
def _load_kp_index():
    global _kp_index
    if _kp_index is None:
        if os.path.exists(KP_INDEX_PATH):
            with open(KP_INDEX_PATH, "r", encoding="utf-8") as f:
                _kp_index = json.load(f)
            print(f"[AIHub-KP] 키포인트 인덱스 로드: {len(_kp_index)}개 단어")
        else:
            _kp_index = {}
    return _kp_index

# ── 영상 URL 인덱스 로드 ────────────────────────────────────────────────────
def _load_index():
    global _index
    if _index is None:
        if os.path.exists(INDEX_PATH):
            with open(INDEX_PATH, "r", encoding="utf-8") as f:
                _index = json.load(f)
            print(f"[AIHub] 인덱스 로드: {len(_index)}개 단어")
        else:
            _index = {}
    return _index


# ── MediaPipe 초기화 (최초 1회) ────────────────────────────────────────────
def _get_hands():
    global _hands
    if _hands is None:
        try:
            import mediapipe as mp
            _hands = mp.solutions.hands.Hands(
                static_image_mode=True,
                max_num_hands=1,
                min_detection_confidence=0.5,
                model_complexity=1,
            )
        except ImportError:
            raise RuntimeError("mediapipe 미설치. 'pip install mediapipe opencv-python' 실행하세요.")
    return _hands


# ── 정규화 (gesture-scorer.js normalizeLandmarks와 동일) ────────────────────
def _normalize(lm_list, is_right: bool):
    if not lm_list or len(lm_list) < 21:
        return None
    pts = [[lm.x, lm.y, lm.z] for lm in lm_list]
    w   = pts[0]
    shifted = [[p[0]-w[0], p[1]-w[1], p[2]-w[2]] for p in pts]

    m     = shifted[9]
    scale = math.sqrt(m[0]**2 + m[1]**2 + m[2]**2)
    if scale < 0.001:
        return None

    # 웹캠 셀피 보정: 오른손은 x 반전 (gesture-scorer.js와 동일 로직)
    norm = [
        [(-x if is_right else x) / scale, -y / scale, -z / scale]
        for x, y, z in shifted
    ]
    return norm


# ── 영상에서 포즈 추출 ─────────────────────────────────────────────────────
def _extract_pose(url: str, start: float, end: float):
    import httpx, cv2

    # 영상 다운로드
    try:
        resp = httpx.get(url, timeout=30.0, follow_redirects=True)
        resp.raise_for_status()
    except Exception as e:
        print(f"[AIHub] 영상 다운로드 실패: {e}")
        return None

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        f.write(resp.content)
        tmp = f.name

    try:
        cap = cv2.VideoCapture(tmp)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

        s_frame = int(start * fps)
        e_frame = int(end   * fps)
        mid     = (s_frame + e_frame) // 2

        # 중간 프레임 우선, 실패 시 주변 탐색
        candidates = [mid, mid-2, mid+2, mid-5, mid+5, s_frame, e_frame-1]

        hands = _get_hands()
        best  = None

        for fn in candidates:
            if fn < 0:
                continue
            cap.set(cv2.CAP_PROP_POS_FRAMES, fn)
            ret, frame = cap.read()
            if not ret:
                continue

            import numpy as np
            rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = hands.process(rgb)

            if result.multi_hand_landmarks:
                lm_raw  = result.multi_hand_landmarks[0].landmark
                is_right = True
                if result.multi_handedness:
                    label    = result.multi_handedness[0].classification[0].label
                    is_right = (label == "Right")

                pose = _normalize(lm_raw, is_right)
                if pose:
                    best = pose
                    break

        cap.release()
        return best
    finally:
        os.unlink(tmp)


# ── 공개 API ───────────────────────────────────────────────────────────────
def find_sign(word: str):
    """
    단어에 해당하는 수어 포즈를 반환합니다.
    캐시 → 인덱스 → 영상 추출 순으로 시도.
    없으면 None 반환.
    """
    os.makedirs(CACHE_DIR, exist_ok=True)

    # 1) 캐시 확인
    safe  = "".join(c if c.isalnum() or c in "-_" else f"_{ord(c)}_" for c in word)
    cache = os.path.join(CACHE_DIR, f"{safe}.json")
    if os.path.exists(cache):
        with open(cache, "r", encoding="utf-8") as f:
            return json.load(f)

    # 2) 인덱스 조회
    index   = _load_index()
    entries = index.get(word, [])
    if not entries:
        return None

    # 3) 영상에서 포즈 추출 (최대 3개 시도)
    for entry in entries[:3]:
        print(f"[AIHub] '{word}' 추출 중: {entry['url'][:60]}...")
        pose = _extract_pose(entry["url"], entry["start"], entry["end"])
        if pose:
            result = {
                "name":        word,
                "landmarks":   pose,
                "source":      "aihub",
                "description": f"{word} 수어 (AI Hub 검증 데이터)",
                "hint":        "실제 수어 영상에서 추출한 손 모양입니다",
                "steps":       [],
            }
            with open(cache, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False)
            return result

    return None


def lookup_sign_pose(word: str):
    """
    키포인트 인덱스에서 프레임 시퀀스(또는 단일 포즈)를 반환 (즉시 응답).
    없으면 None 반환.
    """
    kp = _load_kp_index()
    data = kp.get(word)
    if not data:
        return None

    # 시퀀스 형식: [[frame0: [[x,y,z]×21]], [frame1], ...]
    is_seq = isinstance(data, list) and data and isinstance(data[0], list) and isinstance(data[0][0], list)
    if is_seq:
        mid = data[len(data) // 2]
        return {
            "name":        word,
            "source":      "aihub",
            "type":        "sequence",
            "sequence":    data,
            "landmarks":   mid,            # 중간 프레임 (정적 fallback용)
            "description": f"{word} 수어 (AI Hub 키포인트 데이터)",
            "hint":        "손동작을 따라해보세요",
            "steps":       [],
        }

    # 구형 단일 프레임 형식
    return {
        "name":        word,
        "source":      "aihub",
        "landmarks":   data,
        "description": f"{word} 수어 (AI Hub 키포인트 데이터)",
        "hint":        "손 모양을 따라해보세요",
        "steps":       [],
    }


def lookup_video(word: str):
    """
    영상 URL 인덱스에서 video_url + 타임스탬프를 즉시 반환.
    없으면 None 반환.
    """
    index = _load_index()
    entries = index.get(word, [])
    if not entries:
        return None
    e = entries[0]
    return {
        "name":        word,
        "source":      "aihub",
        "video_url":   e["url"],
        "video_start": e["start"],
        "video_end":   e["end"],
        "description": f"{word} 수어 (AI Hub 데이터)",
        "hint":        "영상을 보고 따라해보세요",
        "steps":       [],
    }


def is_in_index(word: str) -> bool:
    """키포인트 또는 영상 URL 인덱스에 단어가 있는지 확인"""
    return word in _load_kp_index() or word in _load_index()


def is_available() -> bool:
    """키포인트 인덱스 또는 영상 인덱스가 존재하면 사용 가능"""
    return os.path.exists(KP_INDEX_PATH) or os.path.exists(INDEX_PATH)
