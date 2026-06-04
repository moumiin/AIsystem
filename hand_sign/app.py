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

    # ② AI Hub 키포인트 인덱스
    if aihub_available():
        pose = aihub_lookup_pose(q)
        if pose:
            print(f"[AIHub-KP] '{q}' → 키포인트 포즈 반환")
            return pose

    # ③ 숫자 → 한국어 변환 후 지문자 처리
    q = NUMBER_KOR.get(q, q)

    # ④ 지문자 분해 fallback (AI Hub에 없는 단어)
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
