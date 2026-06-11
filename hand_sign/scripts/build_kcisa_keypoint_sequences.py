"""
KCISA 영상에서 MediaPipe 키포인트만 추출해 로컬 시범 JSON을 만듭니다.

원본 영상은 임시 폴더에만 내려받고, 추출 후 삭제합니다. 저장되는 파일은
얼굴/팔/손 좌표(openpose150 호환 숫자 배열)뿐입니다.
"""
from __future__ import annotations

import json
import os
import tempfile
import time
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np


BASE_DIR = Path(__file__).resolve().parents[1]
REFERENCE_PATH = BASE_DIR / "kcisa_reference_data.json"
OUT_PATH = BASE_DIR / "kcisa_keypoint_sequences.json"

TARGET_WORDS = ["안녕하세요", "감사합니다", "고맙습니다", "나", "-ㅂ니다"]
MAX_FRAMES = 72
MIN_FRAMES = 12


def _read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def _download_video(url: str, dest: Path) -> bool:
    if url.startswith("http://sldict.korean.go.kr/"):
        url = "https://" + url[len("http://"):]
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://sldict.korean.go.kr/",
    }
    request = urllib.request.Request(url, headers=headers)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                dest.write_bytes(response.read())
            return dest.stat().st_size > 1024
        except Exception as exc:
            if attempt == 2:
                print(f"[download-fail] {url}: {exc}")
                return False
            time.sleep(1.5)
    return False


def _empty_flat(count: int) -> list[float]:
    return [0.0] * (count * 2)


def _xy(landmark, width: int, height: int) -> list[float]:
    x = min(1.0, max(0.0, float(landmark.x)))
    y = min(1.0, max(0.0, float(landmark.y)))
    return [round(x, 5), round(y, 5)]


def _pose_to_openpose50(pose_landmarks, width: int, height: int) -> list[float]:
    pose = _empty_flat(25)
    if not pose_landmarks:
        return pose

    lm = pose_landmarks.landmark

    def put(openpose_idx: int, mp_idx: int):
        if mp_idx >= len(lm) or lm[mp_idx].visibility < 0.25:
            return
        pose[openpose_idx * 2:openpose_idx * 2 + 2] = _xy(lm[mp_idx], width, height)

    def midpoint(a: int, b: int):
        if a >= len(lm) or b >= len(lm):
            return None
        if lm[a].visibility < 0.25 or lm[b].visibility < 0.25:
            return None
        return [
            round((lm[a].x + lm[b].x) / 2, 5),
            round((lm[a].y + lm[b].y) / 2, 5),
        ]

    put(0, 0)   # nose
    neck = midpoint(11, 12)
    if neck:
        pose[2:4] = neck
    put(2, 12)  # right shoulder
    put(3, 14)  # right elbow
    put(4, 16)  # right wrist
    put(5, 11)  # left shoulder
    put(6, 13)  # left elbow
    put(7, 15)  # left wrist
    put(15, 2)  # right eye-ish
    put(16, 5)  # left eye-ish
    put(17, 8)  # right ear-ish
    put(18, 7)  # left ear-ish
    return pose


def _hand_to_flat(hand_landmarks, width: int, height: int) -> list[float]:
    if not hand_landmarks:
        return _empty_flat(25)
    values = []
    for landmark in hand_landmarks.landmark[:21]:
        values.extend(_xy(landmark, width, height))
    values.extend([0.0] * (50 - len(values)))
    return values


def _hand_count(frame: list[float]) -> int:
    count = 0
    for start in (50, 100):
        hand = frame[start:start + 50]
        active = 0
        for i in range(0, 42, 2):
            if abs(hand[i]) + abs(hand[i + 1]) > 0.001:
                active += 1
        if active >= 8:
            count += 1
    return count


def _smooth_sequence(sequence: list[list[float]]) -> list[list[float]]:
    if len(sequence) < 3:
        return sequence
    arr = np.array(sequence, dtype=np.float32)
    smoothed = arr.copy()
    for i in range(1, len(arr) - 1):
        valid = np.abs(arr[i]).sum(axis=0) > -1
        smoothed[i, valid] = arr[i - 1, valid] * 0.2 + arr[i, valid] * 0.6 + arr[i + 1, valid] * 0.2
    return np.round(smoothed, 5).tolist()


def _resample(sequence: list[list[float]], max_frames: int = MAX_FRAMES) -> list[list[float]]:
    if len(sequence) <= max_frames:
        return sequence
    idx = np.linspace(0, len(sequence) - 1, max_frames).round().astype(int)
    return [sequence[int(i)] for i in idx]


def _extract_video(video_path: Path) -> list[list[float]]:
    mp_holistic = mp.solutions.holistic
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return []

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    stride = max(1, int(round(fps / 12)))
    sequence = []
    frame_index = 0

    with mp_holistic.Holistic(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        enable_segmentation=False,
        refine_face_landmarks=False,
        min_detection_confidence=0.45,
        min_tracking_confidence=0.45,
    ) as holistic:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if frame_index % stride != 0:
                frame_index += 1
                continue

            height, width = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = holistic.process(rgb)

            pose = _pose_to_openpose50(result.pose_landmarks, width, height)
            left = _hand_to_flat(result.left_hand_landmarks, width, height)
            right = _hand_to_flat(result.right_hand_landmarks, width, height)
            out = pose + left + right
            if len(out) == 150 and (sum(abs(v) for v in pose[:18]) > 0.01 or _hand_count(out) > 0):
                sequence.append(out)
            frame_index += 1

    cap.release()

    hand_frames = [frame for frame in sequence if _hand_count(frame) > 0]
    if len(hand_frames) >= MIN_FRAMES:
        sequence = hand_frames

    return _resample(_smooth_sequence(sequence))


def build():
    references = _read_json(REFERENCE_PATH, {})
    output = {}

    with tempfile.TemporaryDirectory(prefix="kcisa_sign_") as tmp_dir:
        tmp = Path(tmp_dir)
        cache: dict[str, Path] = {}

        for word in TARGET_WORDS:
            ref = references.get(word)
            if not ref:
                print(f"[skip] no reference: {word}")
                continue
            url = ref.get("videoUrl")
            if not url:
                print(f"[skip] no video url: {word}")
                continue

            if url not in cache:
                video_path = tmp / f"{len(cache)}.mp4"
                if not _download_video(url, video_path):
                    continue
                cache[url] = video_path
            else:
                video_path = cache[url]

            sequence = _extract_video(video_path)
            if len(sequence) < MIN_FRAMES:
                print(f"[skip] too few keypoint frames: {word} ({len(sequence)})")
                continue

            output[word] = {
                "sequence": sequence,
                "hands": 1 if word == "나" else 2,
                "description": ref.get("description", f"{word} KCISA 영상 추출 키포인트"),
                "source": "kcisa_mediapipe",
                "frameCount": len(sequence),
            }
            print(f"[ok] {word}: {len(sequence)} frames")

    if not output:
        raise RuntimeError("KCISA 영상에서 추출된 키포인트가 없습니다.")

    OUT_PATH.write_text(json.dumps(output, ensure_ascii=False), encoding="utf-8")
    print(f"saved {OUT_PATH}")


if __name__ == "__main__":
    build()
