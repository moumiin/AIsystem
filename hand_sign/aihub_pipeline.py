"""
수어 키포인트 검색 파이프라인.

검색 우선순위:
1. local_learning_keypoint_index.json
   - 사용자가 제공한 로컬 학습 데이터
   - 초보자 단어 454개, 30프레임, 양손 42포인트
2. aihub_keypoint_index.json
   - 기존 AI Hub 키포인트 인덱스
"""

import json
import os
from functools import lru_cache


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_KP_INDEX_PATH = os.path.join(BASE_DIR, "local_learning_keypoint_index.json")
AIHUB_KP_INDEX_PATH = os.path.join(BASE_DIR, "aihub_keypoint_index.json")


@lru_cache(maxsize=1)
def load_local_index():
    """사용자 제공 학습 데이터 인덱스를 읽습니다."""
    return _load_json_index(LOCAL_KP_INDEX_PATH, "LOCAL-KP")


@lru_cache(maxsize=1)
def load_aihub_index():
    """기존 AI Hub 키포인트 인덱스를 읽습니다."""
    return _load_json_index(AIHUB_KP_INDEX_PATH, "AIHub-KP")


def _load_json_index(path, label):
    if not os.path.exists(path):
        return {}

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"[{label}] 인덱스 로드: {len(data)}개 단어")
    return data


def _infer_data_format(data) -> str:
    if not isinstance(data, list) or len(data) == 0:
        return "unknown"
    first = data[0]
    if isinstance(first, list) and len(first) >= 150 and isinstance(first[0], (int, float)):
        return "openpose150"
    if isinstance(first, list) and len(first) >= 21 and isinstance(first[0], list):
        return "hand21"
    return "unknown"


def _infer_hands(data) -> int:
    if not isinstance(data, list) or len(data) == 0:
        return 1
    first = data[0]
    if isinstance(first, list) and len(first) >= 42 and isinstance(first[0], list):
        left = first[:21]
        right = first[21:42]
        active = lambda hand: sum(
            1 for p in hand
            if isinstance(p, list) and abs(p[0] or 0) + abs(p[1] or 0) + abs(p[2] or 0) > 0.001
        ) >= 8
        count = int(active(left)) + int(active(right))
        return 2 if count >= 2 else 1
    return 1


def lookup_sign_pose(word: str):
    """
    단어에 해당하는 수어 포즈/시퀀스를 반환합니다.

    반환 데이터는 프론트엔드가 바로 시범 영상처럼 재생할 수 있도록
    sequence, landmarks, source, description, hint를 포함합니다.
    """
    word = word.strip()
    if not word:
        return None

    data = load_local_index().get(word)
    source = "local"
    description_source = "로컬 학습 데이터"

    if data is None:
        data = load_aihub_index().get(word)
        source = "aihub"
        description_source = "AI Hub 키포인트 데이터"

    if data is None:
        return None

    data_format = _infer_data_format(data)
    hands = _infer_hands(data)
    hint = (
        "손 모양을 시범과 맞춰보세요"
        if data_format == "hand21"
        else "손동작을 따라해보세요"
    )

    if _is_sequence(data):
        return {
            "name": word,
            "source": source,
            "type": "sequence",
            "data_format": data_format,
            "hands": hands,
            "sequence": data,
            "landmarks": data[len(data) // 2],
            "description": f"{word} 수어 ({description_source})",
            "hint": hint,
            "steps": [],
        }

    return {
        "name": word,
        "source": source,
        "data_format": data_format,
        "hands": hands,
        "landmarks": data,
        "description": f"{word} 수어 ({description_source})",
        "hint": hint,
        "steps": [],
    }


def _is_sequence(data):
    if not isinstance(data, list) or len(data) == 0:
        return False

    first = data[0]
    if not isinstance(first, list) or len(first) == 0:
        return False

    # normalized: frame = [[x, y, z], ...]
    if isinstance(first[0], list):
        return True

    # OpenPose display: frame = [pose50, left50, right50]
    return isinstance(first[0], (int, float)) and len(first) >= 150


def is_in_index(word: str) -> bool:
    """단어가 로컬 또는 AI Hub 인덱스에 있는지 확인합니다."""
    word = word.strip()
    return word in load_local_index() or word in load_aihub_index()


def is_available() -> bool:
    """수어 키포인트 인덱스가 하나라도 있으면 True."""
    return os.path.exists(LOCAL_KP_INDEX_PATH) or os.path.exists(AIHUB_KP_INDEX_PATH)
