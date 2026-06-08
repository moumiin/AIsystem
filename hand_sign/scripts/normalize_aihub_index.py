"""
AI Hub 키포인트 인덱스 좌표 정규화.

aihub_keypoint_index.json 의 21포인트(또는 42포인트) 프레임을
MediaPipe 학습 앱과 동일한 손 좌표계(손목 원점, 스케일 1, y/z 반전)로 맞춥니다.

실행:
  python scripts/normalize_aihub_index.py
  python scripts/normalize_aihub_index.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import math
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
INDEX_PATH = BASE_DIR / "aihub_keypoint_index.json"
BACKUP_PATH = BASE_DIR / "aihub_keypoint_index.backup.json"
REPORT_PATH = BASE_DIR / "aihub_normalize_report.json"

MIN_ACTIVE_POINTS = 8
MAX_NORM_COORD = 4.5


def _preprocess_point(point: list) -> tuple[float, float, float] | None:
    if not isinstance(point, list) or len(point) < 2:
        return None
    x = float(point[0] or 0)
    y = float(point[1] or 0)
    z = float(point[2] or 0) if len(point) > 2 else 0.0

    if abs(x) > 4 or abs(y) > 4:
        if abs(x) > 4:
            x /= 1920.0
        if abs(y) > 4:
            y /= 1080.0
    return x, y, z


def _active_count(hand: list) -> int:
    count = 0
    for point in hand[:21]:
        if not isinstance(point, list):
            continue
        pre = _preprocess_point(point)
        if pre and abs(pre[0]) + abs(pre[1]) + abs(pre[2]) > 0.001:
            count += 1
    return count


def normalize_hand21(points: list, mirror_x: bool = False) -> list | None:
    raw = []
    for point in points[:21]:
        pre = _preprocess_point(point)
        if pre is None:
            raw.append((0.0, 0.0, 0.0))
        else:
            raw.append(pre)

    if _active_count([[r[0], r[1], r[2]] for r in raw]) < MIN_ACTIVE_POINTS:
        return None

    wrist = raw[0]
    middle = raw[9]
    scale = math.sqrt(
        (middle[0] - wrist[0]) ** 2
        + (middle[1] - wrist[1]) ** 2
        + (middle[2] - wrist[2]) ** 2
    )
    if scale < 1e-6:
        return None

    normalized = []
    for x, y, z in raw:
        nx = (x - wrist[0]) / scale
        ny = -(y - wrist[1]) / scale
        nz = -(z - wrist[2]) / scale
        if mirror_x:
            nx = -nx
        normalized.append([
            round(nx, 4),
            round(ny, 4),
            round(nz, 4),
        ])
    return normalized


def normalize_frame(frame: list) -> tuple[list | None, str]:
    if not isinstance(frame, list) or len(frame) == 0:
        return None, "empty"

    if len(frame) >= 42 and isinstance(frame[0], list):
        left = normalize_hand21(frame[:21], mirror_x=False)
        right = normalize_hand21(frame[21:42], mirror_x=True)
        if left and right:
            return [*left, *right], "hand42"
        if left:
            return left, "hand21"
        if right:
            return right, "hand21"
        return None, "invalid42"

    if len(frame) >= 21 and isinstance(frame[0], list):
        hand = normalize_hand21(frame, mirror_x=False)
        if hand:
            return hand, "hand21"
        return None, "invalid21"

    return None, "unsupported"


def frame_max_abs(frame: list) -> float:
    max_val = 0.0
    for point in frame:
        if not isinstance(point, list):
            continue
        for value in point[:3]:
            max_val = max(max_val, abs(float(value or 0)))
    return max_val


def normalize_index(data: dict, dry_run: bool = False) -> dict:
    report = {
        "words": len(data),
        "frames_total": 0,
        "frames_normalized": 0,
        "frames_skipped": 0,
        "outlier_words_before": 0,
        "outlier_words_after": 0,
        "skipped_samples": [],
    }

    normalized_data = {}

    for word, sequence in data.items():
        if not isinstance(sequence, list):
            report["frames_skipped"] += 1
            continue

        before_max = 0.0
        new_sequence = []

        for frame in sequence:
            report["frames_total"] += 1
            before_max = max(before_max, frame_max_abs(frame))
            norm_frame, kind = normalize_frame(frame)
            if norm_frame is None:
                report["frames_skipped"] += 1
                if len(report["skipped_samples"]) < 20:
                    report["skipped_samples"].append({"word": word, "reason": kind})
                continue
            report["frames_normalized"] += 1
            new_sequence.append(norm_frame)

        if before_max > 5:
            report["outlier_words_before"] += 1

        after_max = 0.0
        for frame in new_sequence:
            after_max = max(after_max, frame_max_abs(frame))

        if after_max > MAX_NORM_COORD:
            report["outlier_words_after"] += 1

        if new_sequence:
            normalized_data[word] = new_sequence

    if not dry_run:
        if INDEX_PATH.exists() and not BACKUP_PATH.exists():
            shutil.copy2(INDEX_PATH, BACKUP_PATH)
            print(f"[backup] {BACKUP_PATH}")

        with open(INDEX_PATH, "w", encoding="utf-8") as f:
            json.dump(normalized_data, f, ensure_ascii=False)

        with open(REPORT_PATH, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

    report["words_out"] = len(normalized_data)
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not INDEX_PATH.exists():
        raise SystemExit(f"index not found: {INDEX_PATH}")

    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    report = normalize_index(data, dry_run=args.dry_run)
    print(json.dumps(report, ensure_ascii=False, indent=2))

    if args.dry_run:
        print("\n(dry-run: index file not modified)")
    else:
        print(f"\n[ok] wrote {INDEX_PATH}")


if __name__ == "__main__":
    main()
