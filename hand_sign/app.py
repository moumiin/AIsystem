"""
수화 학습 웹 서비스

실행:  python app.py
접속:  http://localhost:8000

검색 우선순위:
  ① 지문자 DB (ㄱ~ㅎ, 모음)
  ② AI Hub 실제 수어 데이터 (4000개 단어/문장)
  ③ 지문자 분해 fallback (모든 한국어 단어)
"""
import os, sys
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

from jamo_db import find_jamo, JAMO_DB
try:
    from aihub_pipeline import (
        lookup_sign_pose as aihub_lookup_pose,
        is_available     as aihub_available,
    )
except ImportError:
    aihub_lookup_pose = lambda _: None
    aihub_available   = lambda: False

app = FastAPI(title="수화 학습 서비스")
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "frontend", "static")), name="static")

@app.get("/")
def index():
    return FileResponse(os.path.join(BASE_DIR, "frontend", "index.html"))


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

NUMBER_KOR = {
    '0':'영','1':'일','2':'이','3':'삼','4':'사',
    '5':'오','6':'육','7':'칠','8':'팔','9':'구',
    '10':'십','11':'십일','12':'십이','13':'십삼','14':'십사','15':'십오',
    '20':'이십','30':'삼십','40':'사십','50':'오십','100':'백','1000':'천',
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
            "sequence": sequence,
            "landmarks": sequence[0]["landmarks"],
            "description": f"지문자로 표현: {jamo_str}",
            "hint": "지문자를 순서대로 따라해보세요",
            "steps": [s["jamo"] for s in sequence],
        }

    raise HTTPException(status_code=404, detail=f"'{q}'에 해당하는 수어를 찾을 수 없습니다.")


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
        })
    return result


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    print("\n[수화 학습 시작]")
    print("브라우저에서 열기: http://localhost:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
