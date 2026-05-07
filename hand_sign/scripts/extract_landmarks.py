"""
MP4 영상 → MediaPipe 21개 랜드마크 추출 → pose_data.py 생성
gesture-scorer.js normalizeLandmarks와 동일한 정규화 적용.
"""
import cv2
import numpy as np
import os
import sys
from mediapipe import tasks
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

MODEL_PATH = r"C:\Users\USER\Downloads\hand_landmarker.task"
VIDEO_DIR  = r"C:\hand_sign\hand_sign_basic\hearing_impaired_helper_make_model-main\datasets\output_video"
OUT_PATH   = r"C:\hand_sign\pose_data.py"

JAMO_ORDER = [
    'ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
    'ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅚ','ㅛ','ㅜ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ',
]

def normalize_landmarks(lm_list):
    pts = np.array([[lm.x, lm.y, lm.z] for lm in lm_list])
    w = pts[0].copy()
    shifted = pts - w
    scale = np.linalg.norm(shifted[9])
    if scale < 0.001:
        return None
    norm = shifted / scale
    # 영상은 정면 촬영: MediaPipe가 이미 thumb=+x로 감지 → x 반전 없음
    norm[:, 1] *= -1   # y 반전 (MediaPipe y↓ → y↑)
    norm[:, 2] *= -1   # z 반전
    return norm

def extract_pose(video_path, landmarker):
    import mediapipe as mp
    cap = cv2.VideoCapture(video_path)
    frames = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = landmarker.detect(mp_img)
        if not result.hand_landmarks:
            continue
        norm = normalize_landmarks(result.hand_landmarks[0])
        if norm is not None:
            frames.append(norm)
    cap.release()
    if not frames:
        return None
    mid = len(frames) // 2
    candidates = frames[max(0, mid - 5):mid + 6]
    return np.median(np.stack(candidates), axis=0)

# HandLandmarker 초기화
options = mp_vision.HandLandmarkerOptions(
    base_options=mp_python.BaseOptions(model_asset_path=MODEL_PATH),
    num_hands=1,
    min_hand_detection_confidence=0.4,
    min_hand_presence_confidence=0.4,
    min_tracking_confidence=0.4,
)
landmarker = mp_vision.HandLandmarker.create_from_options(options)

print("추출 중...", flush=True)
results = {}
for jamo in JAMO_ORDER:
    folder = os.path.join(VIDEO_DIR, jamo)
    if not os.path.isdir(folder):
        print(f"  {jamo}: 폴더 없음", flush=True)
        continue
    mp4s = [f for f in os.listdir(folder) if f.endswith('.mp4')]
    if not mp4s:
        print(f"  {jamo}: mp4 없음", flush=True)
        continue
    pose = extract_pose(os.path.join(folder, sorted(mp4s)[0]), landmarker)
    if pose is None:
        print(f"  {jamo}: 랜드마크 없음", flush=True)
    else:
        results[jamo] = pose
        tip = pose[8]
        print(f"  {jamo}: idx_tip=[{tip[0]:+.2f},{tip[1]:+.2f},{tip[2]:+.2f}]", flush=True)

landmarker.close()

# pose_data.py 저장
LM = ['WRIST',
      'THUMB_CMC','THUMB_MCP','THUMB_IP','THUMB_TIP',
      'INDEX_MCP','INDEX_PIP','INDEX_DIP','INDEX_TIP',
      'MIDDLE_MCP','MIDDLE_PIP','MIDDLE_DIP','MIDDLE_TIP',
      'RING_MCP','RING_PIP','RING_DIP','RING_TIP',
      'PINKY_MCP','PINKY_PIP','PINKY_DIP','PINKY_TIP']

with open(OUT_PATH, 'w', encoding='utf-8') as f:
    f.write('# KSL 지문자 영상에서 추출한 기준 포즈 (MediaPipe 정규화 좌표)\n')
    f.write('# x+=엄지방향  y+=위  z+=손바닥방향  스케일=손목~중지MCP거리\n')
    f.write('VIDEO_POSES = {\n')
    for jamo in JAMO_ORDER:
        if jamo not in results:
            continue
        pose = results[jamo]
        f.write(f"    '{jamo}': [  # {jamo}\n")
        for i, pt in enumerate(pose):
            f.write(f"        [{pt[0]:+.3f}, {pt[1]:+.3f}, {pt[2]:+.3f}],  # {i} {LM[i]}\n")
        f.write("    ],\n")
    f.write('}\n')

print(f"\npose_data.py 저장 완료: {len(results)}개 자모", flush=True)
