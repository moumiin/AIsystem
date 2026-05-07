import os
import json
import numpy as np

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

with open("labels.json", "r", encoding="utf-8") as f:
    LABELS = json.load(f)

app = FastAPI()

DATA_DIR = "data"

app.mount("/static", StaticFiles(directory="static"), name="static")

def normalize_hand_sequence(seq):
    seq = np.array(seq, dtype=np.float32)
    seq = seq.reshape(seq.shape[0], -1, 2)

    normalized = []

    for frame in seq:
        valid = np.any(frame != 0, axis=1)

        if np.sum(valid) < 2:
            normalized.append(frame.flatten())
            continue

        points = frame[valid]

        # 손 위치 보정: 중심을 0으로
        center = np.mean(points, axis=0)
        frame = frame - center

        # 손 크기 보정: 가장 먼 점 거리 기준
        scale = np.max(np.linalg.norm(frame[valid], axis=1))

        if scale > 1e-6:
            frame = frame / scale

        normalized.append(frame.flatten())

    return np.array(normalized)

def clean_keypoints(arr, dim):
    arr = np.array(arr)

    if len(arr) == 0:
        return np.zeros(25 * (dim - 1))

    arr = arr.reshape(-1, dim)
    return arr[:, :dim - 1].flatten()


def extract_keypoints(json_data):
    if "people" not in json_data:
        return np.zeros(335)

    people = json_data["people"]

    if isinstance(people, list):
        if len(people) == 0:
            return np.zeros(335)
        p = people[0]
    elif isinstance(people, dict):
        p = people
    else:
        return np.zeros(335)

    def safe_get(key, dim):
        if key not in p:
            return np.zeros(25 * (dim - 1))
        return clean_keypoints(p[key], dim)

    pose2d = safe_get("pose_keypoints_2d", 3)
    left2d = safe_get("hand_left_keypoints_2d", 3)
    right2d = safe_get("hand_right_keypoints_2d", 3)

    pose3d = safe_get("pose_keypoints_3d", 4)
    left3d = safe_get("hand_left_keypoints_3d", 4)
    right3d = safe_get("hand_right_keypoints_3d", 4)

    feat = np.concatenate([
        pose2d, left2d, right2d,
        pose3d, left3d, right3d
    ])

    if len(feat) > 335:
        feat = feat[:335]
    elif len(feat) < 335:
        feat = np.pad(feat, (0, 335 - len(feat)))

    return feat


def load_sequence(folder_name):
    folder_path = os.path.join(DATA_DIR, folder_name)

    files = sorted([
        f for f in os.listdir(folder_path)
        if f.endswith(".json")
    ])

    sequence = []

    for file in files:
        path = os.path.join(folder_path, file)

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        sequence.append(extract_keypoints(data))

    return np.array(sequence)


def resample(seq, target_len=100):
    if len(seq) == 0:
        return np.zeros((target_len, 335))

    idx = np.linspace(0, len(seq) - 1, target_len).astype(int)
    return seq[idx]


def normalize(seq):
    seq = np.array(seq, dtype=np.float32)

    mean = np.mean(seq)
    std = np.std(seq)

    return (seq - mean) / (std + 1e-6)


def cosine_score(a, b):
    a = a.flatten()
    b = b.flatten()

    sim = np.dot(a, b) / ((np.linalg.norm(a) * np.linalg.norm(b)) + 1e-6)

    # -1~1을 0~100으로 바꾸되, 너무 낮게 나오지 않게 보정
    score = (sim + 1) / 2 * 100

    return round(float(np.clip(score, 0, 100)), 2)

def extract_hands_only(seq):
    # OpenPose 기준: left2d 50개 + right2d 50개
    return seq[:, 50:150]

@app.get("/")
def home():
    return FileResponse("static/index.html")


@app.get("/api/words")
def words():
    folders = sorted([
        f for f in os.listdir(DATA_DIR)
        if os.path.isdir(os.path.join(DATA_DIR, f)) and f.endswith("_F")
    ])

    result = []

    for i, folder in enumerate(folders):
        label = LABELS[i] if i < len(LABELS) else folder

        result.append({
            "folder": folder,
            "label": label
        })

    return {"words": result}


@app.get("/api/reference/{folder_name}")
def reference(folder_name: str):
    seq = load_sequence(folder_name)
    return {
        "folder": folder_name,
        "sequence": seq.tolist()
    }


class CompareRequest(BaseModel):
    folder_name: str
    user_sequence: list


@app.post("/api/compare")
def compare(req: CompareRequest):
    ref_seq = load_sequence(req.folder_name)
    user_seq = np.array(req.user_sequence, dtype=np.float32)

    if len(user_seq) < 30:
        return {
            "status": "fail",
            "message": "동작 프레임이 너무 적어요."
        }

    active_frames = np.sum(np.abs(user_seq), axis=1)
    active_frames = np.sum(active_frames > 1)

    if active_frames < 15:
        return {
            "status": "ok",
            "score": 0,
            "feedback": "손동작이 감지되지 않았어요."
        }

    motion = np.mean(np.abs(np.diff(user_seq, axis=0)))

    if motion < 0.001:
        return {
            "status": "ok",
            "score": 0,
            "feedback": "움직임이 너무 적어요. 손동작을 따라 해보세요."
        }

    # 정답도 손 좌표만 사용
    ref_seq = extract_hands_only(ref_seq)

    # 사용자 좌표도 100차원으로 맞춤
    if user_seq.shape[1] > 100:
        user_seq = user_seq[:, :100]
    elif user_seq.shape[1] < 100:
        pad = np.zeros((user_seq.shape[0], 100 - user_seq.shape[1]))
        user_seq = np.concatenate([user_seq, pad], axis=1)

    ref_seq = resample(ref_seq, 100)
    user_seq = resample(user_seq, 100)

    ref_seq = normalize_hand_sequence(ref_seq)
    user_seq = normalize_hand_sequence(user_seq)

    score = cosine_score(ref_seq, user_seq)

    if score >= 80:
        feedback = "아주 잘했어요!"
    elif score >= 60:
        feedback = "비슷하지만 조금 더 연습이 필요해요."
    else:
        feedback = "정답 동작과 차이가 커요. 다시 따라 해보세요."

    return {
        "status": "ok",
        "score": score,
        "feedback": feedback
    }


@app.get("/favicon.ico")
def favicon():
    return {"message": "no favicon"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)