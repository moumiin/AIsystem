"""
수어 학습 웹 서비스

실행:  python app.py
접속:  http://localhost:8001

검색 우선순위:
  ① 지문자 DB (ㄱ~ㅎ, 모음)
  ② 로컬 학습 데이터 / 기존 키포인트 인덱스
  ③ 숫자 변환 후 지문자 분해 fallback
"""
import os
import sys
import json
from typing import List, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "frontend", "static")
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")
DB_PATH = os.environ.get("APP_DB_PATH", os.path.join(BASE_DIR, "app_data.sqlite3"))
MONGODB_URI = os.environ.get("MONGODB_URI", "").strip()
MONGODB_DB = os.environ.get("MONGODB_DB", "hand_sign_learning").strip()

from auth_store import create_auth_store
from jamo_db import find_jamo, JAMO_DB
from jamo_ai import add_sample, load_model, predict as predict_jamo, train_model
try:
    from aihub_pipeline import (
        lookup_sign_pose as aihub_lookup_pose,
        is_available     as aihub_available,
    )
except ImportError:
    aihub_lookup_pose = lambda _: None
    aihub_available   = lambda: False

app = FastAPI(title="수어 학습 서비스")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
if os.path.isdir(DATASETS_DIR):
    app.mount("/datasets", StaticFiles(directory=DATASETS_DIR), name="datasets")
auth_store = create_auth_store(DB_PATH, MONGODB_URI, MONGODB_DB)

# 관리자 계정 자동 생성
_ADMIN_ID = "admin"
_ADMIN_PW = "ai2026"
try:
    auth_store.create_user(_ADMIN_ID, _ADMIN_PW, "관리자")
except Exception:
    pass  # 이미 존재하면 무시


LOCAL_INDEX_PATH = os.path.join(BASE_DIR, "local_learning_keypoint_index.json")
LOCAL_MANIFEST_PATH = os.path.join(BASE_DIR, "local_learning_manifest.json")

@app.get("/")
def index():
    return FileResponse(
        os.path.join(BASE_DIR, "frontend", "index.html"),
        headers={"Cache-Control": "no-store"},
    )


# ── 한국어 → 지문자 자모 분해 ───────────────────────────────────────────────
CHOSUNG  = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
JUNGSUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
JONGSUNG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

COMPOUND_JUNG = {
    'ㅘ':['ㅗ','ㅏ'], 'ㅙ':['ㅗ','ㅐ'], 'ㅚ':['ㅗ','ㅣ'],
    'ㅝ':['ㅜ','ㅓ'], 'ㅞ':['ㅜ','ㅔ'], 'ㅟ':['ㅜ','ㅣ'], 'ㅢ':['ㅡ','ㅣ'],
}
COMPOUND_JONG = {
    'ㄳ':['ㄱ','ㅅ'], 'ㄵ':['ㄴ','ㅈ'], 'ㄶ':['ㄴ','ㅎ'],
    'ㄺ':['ㄹ','ㄱ'], 'ㄻ':['ㄹ','ㅁ'], 'ㄼ':['ㄹ','ㅂ'],
    'ㄽ':['ㄹ','ㅅ'], 'ㄾ':['ㄹ','ㅌ'], 'ㄿ':['ㄹ','ㅍ'],
    'ㅀ':['ㄹ','ㅎ'], 'ㅄ':['ㅂ','ㅅ'],
}
DOUBLE_TO_SINGLE = {'ㄲ':'ㄱ','ㄸ':'ㄷ','ㅃ':'ㅂ','ㅆ':'ㅅ','ㅉ':'ㅈ'}

def decompose_korean(text: str) -> list:
    result = []
    for ch in text:
        code = ord(ch)
        if 0xAC00 <= code <= 0xD7A3:
            code -= 0xAC00
            jong_idx = code % 28
            code //= 28
            jung_idx = code % 21
            cho_idx  = code // 21

            cho  = DOUBLE_TO_SINGLE.get(CHOSUNG[cho_idx], CHOSUNG[cho_idx])
            jung = JUNGSUNG[jung_idx]
            jong = JONGSUNG[jong_idx]

            result.append(cho)
            result.extend(COMPOUND_JUNG.get(jung, [jung]))
            if jong:
                result.extend(COMPOUND_JONG.get(jong,
                    [DOUBLE_TO_SINGLE.get(jong, jong)]))
        elif ch in DOUBLE_TO_SINGLE:
            result.append(DOUBLE_TO_SINGLE[ch])
        elif ord('ㄱ') <= ord(ch) <= ord('ㅣ'):
            result.extend(COMPOUND_JUNG.get(ch, COMPOUND_JONG.get(ch, [ch])))
    return result


# ── 검색 엔드포인트 ────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str


class CompareRequest(BaseModel):
    folder_name: str
    user_sequence: list


class JamoSampleRequest(BaseModel):
    label: str
    pose: list


class JamoPredictRequest(BaseModel):
    pose: list


class CoachingFeedbackRequest(BaseModel):
    sign_name: str = ""
    score: float = 0
    weak_fingers: List[str] = []
    strong_fingers: List[str] = []
    required_hands: int = 1
    detected_hands: int = 0


class GeminiFeedbackRequest(BaseModel):
    sign_name: str = ""
    score: float = 0
    pose_score: float = 0
    trajectory_score: float = 0
    movement_score: float = 0
    weak_fingers: List[str] = []
    is_static: bool = False
    attempt_message: str = ""
    existing_feedback: str = ""
    required_hands: int = 1
    hand_ok_ratio: float = 1


ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin1234")


class AdminVerifyRequest(BaseModel):
    password: str


class AuthRequest(BaseModel):
    username: str
    password: str
    display_name: Optional[str] = None


class PracticeRecordRequest(BaseModel):
    sign_id: str
    sign_name: str
    category: str = ""
    score: float
    success: bool = False
    feedback: str = ""
    duration_ms: int = 0
    frame_count: int = 0


def _token_from_header(authorization: Optional[str] = Header(default=None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="로그인이 필요해요.")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="로그인 정보가 올바르지 않아요.")
    return token


def current_user(token: str = Depends(_token_from_header)):
    user = auth_store.user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="로그인이 만료됐어요. 다시 로그인해주세요.")
    return user


def _auth_response(user):
    token = auth_store.create_session(user["id"])
    return {"status": "ok", "token": token, "user": user}

NUMBER_KOR = {
    '0':'영','1':'일','2':'이','3':'삼','4':'사',
    '5':'오','6':'육','7':'칠','8':'팔','9':'구',
    '10':'십','11':'십일','12':'십이','13':'십삼','14':'십사','15':'십오',
    '20':'이십','30':'삼십','40':'사십','50':'오십','100':'백','1000':'천',
}

def _jamo_video_url(key: str):
    video_path = os.path.join(DATASETS_DIR, "output_video", key, f"{key}_1.mp4")
    if os.path.exists(video_path):
        return f"/datasets/output_video/{key}/{key}_1.mp4"
    return None


@app.post("/api/admin/verify")
def admin_verify(req: AdminVerifyRequest):
    import hmac
    if not hmac.compare_digest(req.password, ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="비밀번호가 틀렸습니다.")
    return {"ok": True}


@app.post("/api/auth/register")
def register(req: AuthRequest):
    username = req.username.strip()
    password = req.password.strip()
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="아이디는 3글자 이상 입력해주세요.")
    if len(password) < 4:
        raise HTTPException(status_code=400, detail="비밀번호는 4글자 이상 입력해주세요.")
    try:
        user = auth_store.create_user(username, password, req.display_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _auth_response(user)


@app.post("/api/auth/login")
def login(req: AuthRequest):
    try:
        user = auth_store.authenticate(req.username, req.password)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return _auth_response(user)


@app.get("/api/auth/me")
def me(user=Depends(current_user)):
    return {"status": "ok", "user": user}


@app.post("/api/auth/logout")
def logout(token: str = Depends(_token_from_header)):
    auth_store.delete_session(token)
    return {"status": "ok"}


@app.post("/api/records")
def save_practice_record(req: PracticeRecordRequest, user=Depends(current_user)):
    if not req.sign_id.strip() or not req.sign_name.strip():
        raise HTTPException(status_code=400, detail="수어 정보가 부족해요.")
    score = max(0.0, min(100.0, float(req.score or 0)))
    record = auth_store.add_record(user["id"], {
        "sign_id": req.sign_id.strip(),
        "sign_name": req.sign_name.strip(),
        "category": req.category.strip(),
        "score": score,
        "success": req.success,
        "feedback": req.feedback.strip(),
        "duration_ms": req.duration_ms,
        "frame_count": req.frame_count,
    })
    return {"status": "ok", "record": record}


@app.get("/api/records")
def get_practice_records(limit: int = 30, user=Depends(current_user)):
    return {
        "status": "ok",
        "records": auth_store.list_records(user["id"], limit),
    }


@app.get("/api/records/summary")
def get_practice_summary(user=Depends(current_user)):
    return {
        "status": "ok",
        "summary": auth_store.summary(user["id"]),
    }

@app.post("/api/sign-search")
async def sign_search(req: SearchRequest):
    q = req.query.strip()

    # ① 지문자 검증 DB
    jamo = find_jamo(q)
    if jamo:
        print(f"[DB] '{q}' → 지문자 DB")
        return {
            "name": jamo["name"], "description": jamo["description"],
            "hint": jamo["hint"], "steps": jamo["steps"],
            "landmarks": jamo["landmarks"], "source": "verified",
            "data_format": "jamo", "hands": 1,
            "dataset": "datasets",
        }

    # ② 로컬 학습 단어 데이터 (전신 OpenPose: pose50 + left50 + right50)
    manifest = _read_json(LOCAL_MANIFEST_PATH, {})
    local_words = manifest.get("words", {})
    local_meta = local_words.get(q)
    if local_meta:
        index = _read_json(LOCAL_INDEX_PATH, {})
        sequence = index.get(q)
        if sequence:
            frame = sequence[min(len(sequence) // 2, len(sequence) - 1)]
            hands = 1
            if isinstance(frame, list) and len(frame) >= 150:
                active_hands = 0
                for start in (50, 100):
                    flat_hand = frame[start:start + 50]
                    active = 0
                    for i in range(0, len(flat_hand), 2):
                        if abs(float(flat_hand[i] or 0)) + abs(float(flat_hand[i + 1] or 0)) > 0.001:
                            active += 1
                    if active >= 5:
                        active_hands += 1
                hands = max(1, active_hands)

            print(f"[LOCAL] '{q}' → 전신 OpenPose 시퀀스 반환")
            return {
                "name": q,
                "description": f"{q} 수어 전신 시범 데이터",
                "hint": "시범의 몸 기준 손 위치와 이동 경로를 따라해보세요",
                "source": "local",
                "data_format": "openpose150",
                "dataset": "local_learning",
                "hands": hands,
                "sequence": sequence,
                "landmarks": frame,
            }

    # ③ AI Hub 키포인트 인덱스
    if aihub_available():
        pose = aihub_lookup_pose(q)
        if pose:
            print(f"[AIHub-KP] '{q}' → 키포인트 포즈 반환")
            return pose

    # ④ 숫자 → 한국어 변환 후 지문자 처리
    q = NUMBER_KOR.get(q, q)

    # ⑤ 지문자 분해 fallback (AI Hub에 없는 단어)
    jamos = decompose_korean(q)
    sequence = []
    for j in jamos:
        entry = find_jamo(j)
        if entry:
            sequence.append({
                "jamo": j,
                "name": entry["name"],
                "landmarks": entry["landmarks"],
            })

    if sequence:
        jamo_str = "-".join(s["jamo"] for s in sequence)
        print(f"[지문자] '{q}' → {jamo_str}")
        return {
            "name": q,
            "source": "fingerspell",
            "dataset": "datasets",
            "sequence": sequence,
            "landmarks": sequence[0]["landmarks"],
            "data_format": "jamo", "hands": 1,
            "description": f"지문자로 표현: {jamo_str}",
            "hint": "지문자를 순서대로 따라해보세요",
            "steps": [s["jamo"] for s in sequence],
        }

    raise HTTPException(status_code=404, detail=f"'{q}'에 해당하는 수어를 찾을 수 없습니다.")


@app.get("/api/words")
def get_words():
    """React 변환본에서 사용하는 단어 선택 목록."""
    manifest = _read_json(LOCAL_MANIFEST_PATH, {})
    words = []

    for label, meta in manifest.get("words", {}).items():
        words.append({
            "folder": meta.get("folder", label),
            "label": label,
            "category": meta.get("category", ""),
        })

    words.sort(key=lambda item: (item["category"], item["label"]))
    return {"words": words}


@app.get("/api/reference/{folder_name}")
def get_reference(folder_name: str):
    """React 변환본의 정답 시범 캔버스용 OpenPose 프레임."""
    manifest = _read_json(LOCAL_MANIFEST_PATH, {})
    word = None

    for label, meta in manifest.get("words", {}).items():
        if meta.get("folder") == folder_name:
            word = label
            break

    if not word:
        raise HTTPException(status_code=404, detail=f"'{folder_name}' 기준 데이터를 찾을 수 없습니다.")

    index = _read_json(LOCAL_INDEX_PATH, {})
    sequence = index.get(word)
    if not sequence:
        raise HTTPException(status_code=404, detail=f"'{word}' 시범 데이터를 찾을 수 없습니다.")

    return {
        "folder": folder_name,
        "label": word,
        "sequence": sequence,
    }


@app.post("/api/compare")
def compare_practice(req: CompareRequest):
    """React 변환본용 간단 채점 엔드포인트."""
    if len(req.user_sequence) < 20:
        return {
            "status": "fail",
            "message": "동작 프레임이 너무 적어요.",
        }

    active_frames = 0
    for frame in req.user_sequence:
        if sum(abs(float(v or 0)) for v in frame[:80]) > 1:
            active_frames += 1

    if active_frames < 10:
        return {
            "status": "ok",
            "score": 0,
            "feedback": "손동작이 충분히 감지되지 않았어요.",
        }

    return {
        "status": "ok",
        "score": min(100, round(active_frames / max(1, len(req.user_sequence)) * 100, 2)),
        "feedback": "동작 기록이 완료됐어요. 다음 단계에서는 기준 동작과 더 정밀하게 비교하도록 개선할 수 있어요.",
    }


@app.get("/api/jamos")
def get_all_jamos():
    result = []
    for key, entry in JAMO_DB.items():
        result.append({
            "id": f"jamo_{key}",
            "name": entry["name"],
            "category": "jamo",
            "emoji": key,
            "pose": entry["landmarks"],
            "description": entry.get("description", ""),
            "hint": entry.get("hint", ""),
            "steps": entry.get("steps", []),
            "videoUrl": _jamo_video_url(key),
            "video_url": _jamo_video_url(key),
            "source": entry.get("source", "verified"),
            "data_format": "jamo",
            "dataset": "datasets",
            "hands": 1,
        })
    return result


@app.get("/api/jamo-ai/model")
def get_jamo_ai_model():
    model = load_model(BASE_DIR, JAMO_DB)
    return {
        "status": "ok",
        "model": model,
    }


@app.get("/api/jamo-ai/status")
def get_jamo_ai_status():
    model = load_model(BASE_DIR, JAMO_DB)
    return {
        "status": "ok",
        "trained_at": model.get("trained_at"),
        "labels": model.get("labels", []),
        "sample_count": model.get("sample_count", 0),
        "augmented_sample_count": model.get("augmented_sample_count", 0),
        "user_sample_count": model.get("user_sample_count", 0),
        "augmentation": model.get("augmentation", {}),
    }


@app.post("/api/jamo-ai/sample")
def save_jamo_ai_sample(req: JamoSampleRequest):
    try:
        result = add_sample(BASE_DIR, req.label, req.pose)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "status": "ok",
        "sample": result,
    }


@app.post("/api/jamo-ai/train")
def train_jamo_ai_model():
    try:
        model = train_model(BASE_DIR, JAMO_DB)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "status": "ok",
        "model": model,
    }


FINGER_KO = {
    "thumb": "엄지",
    "index": "검지",
    "middle": "중지",
    "ring": "약지",
    "pinky": "새끼",
}


@app.post("/api/coaching-feedback")
def coaching_feedback(req: CoachingFeedbackRequest):
    """규칙 기반 실시간 코칭 문장 (LLM 없이 즉시 응답)."""
    score = max(0.0, min(100.0, float(req.score or 0)))
    weak = [FINGER_KO.get(name, name) for name in req.weak_fingers[:3]]
    strong = [FINGER_KO.get(name, name) for name in req.strong_fingers[:3]]
    lines = []

    if req.detected_hands > 0 and req.detected_hands < req.required_hands:
        lines.append(
            "양손 수어예요. 두 손이 모두 보이면 점수가 더 정확해집니다."
            if req.required_hands >= 2
            else "손 전체가 화면 안에 들어오게 조정해주세요."
        )

    if score >= 78:
        lines.append(f'"{req.sign_name or "현재 수어"}" 손모양이 시범과 매우 가깝습니다.')
    elif score >= 55:
        lines.append("전체 형태는 맞아가고 있어요. 손끝 높이와 손목 각도를 조금만 더 맞춰보세요.")
    elif score >= 35:
        lines.append("기본 방향은 보여요. 시범 손 위치와 손바닥 방향을 먼저 맞춰주세요.")
    elif score > 0:
        lines.append("손은 인식됐지만 시범과 차이가 커요. 카메라를 정면으로 두고 손을 크게 보여주세요.")
    else:
        lines.append("손이 충분히 인식되지 않았어요. 밝은 곳에서 손 전체를 화면 안에 넣어주세요.")

    if weak:
        lines.append(f"조정 포인트: {', '.join(weak)}")
    if strong and score >= 45:
        lines.append(f"잘 맞는 부분: {', '.join(strong)}")

    return {"status": "ok", "feedback": " ".join(lines[:4])}


GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash").strip()


def _rule_based_part_comment(req: "GeminiFeedbackRequest") -> str:
    """Gemini 미사용/실패 시 성분 점수 기반 규칙 코멘트."""
    parts = [("손모양", req.pose_score)]
    if not req.is_static:
        parts.append(("이동경로", req.trajectory_score))
        parts.append(("움직임", req.movement_score))
    lowest_name, lowest_score = min(parts, key=lambda p: p[1])

    tips = {
        "손모양": "손가락이 펴지거나 접히는 정도, 손바닥 방향, 손목 각도를 시범과 먼저 맞춰보세요.",
        "이동경로": "시작 위치를 고정한 뒤 손이 지나가는 선을 시범과 같은 방향과 높이로 그려보세요.",
        "움직임": "동작을 멈칫하지 말고 시작점에서 끝점까지 한 번에 이어가며 크기를 조금 더 분명하게 보여주세요.",
    }
    weak_ko = [FINGER_KO.get(f, f) for f in req.weak_fingers[:2]]
    base = f'"{req.sign_name or "이 수어"}"에서 기준 수어와 가장 차이가 큰 부분은 {lowest_name}이에요. {tips.get(lowest_name, "")}'
    if weak_ko:
        base += f" 특히 {', '.join(weak_ko)}의 끝 위치가 흔들리니 손끝을 시범 위치에 맞춘 뒤 다시 시도해보세요."
    if req.required_hands >= 2 and req.hand_ok_ratio < 0.8:
        base += " 양손 수어라면 두 손이 프레임에서 동시에 보이는 시간도 늘려야 평가가 안정적입니다."
    return base


async def _call_gemini(req: "GeminiFeedbackRequest") -> Optional[str]:
    if not GEMINI_API_KEY:
        return None
    import httpx

    parts_desc = f"손모양 {int(req.pose_score)}점"
    if not req.is_static:
        parts_desc += f", 이동경로 {int(req.trajectory_score)}점, 움직임 {int(req.movement_score)}점"
    weak_ko = [FINGER_KO.get(f, f) for f in req.weak_fingers[:3]]
    weak_desc = f"- 약한 손가락: {', '.join(weak_ko)}\n" if weak_ko else "- 약한 손가락: 특별히 감지되지 않음\n"
    sign_type = "정적 손모양 중심 수어" if req.is_static else "동작/이동 경로가 포함된 수어"
    attempt_context = (req.attempt_message or "").strip()
    existing_feedback = (req.existing_feedback or "").replace("<br>", " / ").strip()

    prompt = (
        "당신은 한국 수어 학습자를 코칭하는 전문 튜터입니다. "
        "학습자의 손동작을 정답 수어와 비교해 행동 피드백을 줍니다.\n\n"
        "[평가 데이터]\n"
        f'- 목표 수어: "{req.sign_name or "현재 수어"}"\n'
        f"- 수어 유형: {sign_type}\n"
        f"- 총점: {int(req.score)}점\n"
        f"- 성분별 점수: {parts_desc}\n"
        f"{weak_desc}"
        f"- 양손 필요 여부: {'예' if req.required_hands >= 2 else '아니오'}\n"
        f"- 손 감지 안정도: {round(max(0.0, min(1.0, req.hand_ok_ratio)) * 100)}%\n"
        f"- 시스템 판정: {attempt_context or '별도 메시지 없음'}\n"
        f"- 기존 규칙 피드백: {existing_feedback or '없음'}\n\n"
        "[코칭 원칙]\n"
        "1. 점수를 길게 나열하지 말고, 기준 수어와 어긋난 행동을 구체적으로 말하세요.\n"
        "2. 손모양, 손바닥 방향, 손목 각도, 손끝 높이, 시작 위치, 이동 경로, 동작 크기 중 실제로 낮은 항목을 우선하세요.\n"
        "3. 한 번에 고칠 수 있는 우선순위 1개와 다음 연습 방법 1개를 제시하세요.\n"
        "4. 과장하지 말고, 학습자가 바로 따라 할 수 있는 한국어로 말하세요.\n"
        "5. 출력은 2~3문장, 140자 이내로 작성하세요."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(
                url,
                params={"key": GEMINI_API_KEY},
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as exc:
        print(f"[Gemini] 호출 실패 → 규칙기반 fallback: {exc}")
        return None


@app.post("/api/gemini-feedback")
async def gemini_feedback(req: GeminiFeedbackRequest):
    comment = await _call_gemini(req)
    source = "gemini"
    if not comment:
        comment = _rule_based_part_comment(req)
        source = "rule"
    return {"status": "ok", "comment": comment, "source": source}


@app.post("/api/jamo-ai/predict")
def predict_jamo_ai(req: JamoPredictRequest):
    try:
        result = predict_jamo(BASE_DIR, JAMO_DB, req.pose)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "status": "ok",
        "prediction": result,
    }


def _read_json(path, fallback):
    if not os.path.exists(path):
        return fallback
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    port = int(os.environ.get("PORT", "8001"))
    print("\n[수어 학습 시작]")
    print(f"브라우저에서 열기: http://localhost:{port}\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
