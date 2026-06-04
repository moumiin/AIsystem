"""
Build local learning keypoint index for the web app.

Sources:
  - Jamo training source: hearing_impaired_helper_make_model-main/datasets
  - Word training source: AIsystem/code/data OpenPose keypoint folders

The generated local_learning_keypoint_index.json is used before the older
aihub_keypoint_index.json, and intentionally excludes jisutja/numbers.

Each frame is saved as a 150-value OpenPose-style vector:
  pose 25 points x 2 + left hand 25 points x 2 + right hand 25 points x 2

OpenPose hands have 21 points, so 4 empty points are padded per hand. This
keeps the demo renderer compatible with the reference HTML the user provided,
where slices are pose[0:50], left[50:100], right[100:150].
"""
import json
import re
import zipfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
WORD_LIST_PATH = Path("/Users/gimhamin/Downloads/수어_초보자_단어500.txt")
WORD_DATA_DIR = BASE_DIR.parent / "code" / "data"
WORD_DATA_ZIP = BASE_DIR.parent / "code" / "data.zip"
JAMO_DATA_DIR = Path("/Users/gimhamin/Desktop/class/3학년/ai시스템설계및개발/hearing_impaired_helper_make_model-main/datasets")
OUT_PATH = BASE_DIR / "local_learning_keypoint_index.json"
MANIFEST_PATH = BASE_DIR / "local_learning_manifest.json"

SEQ_FRAMES = 30
ROUND_DP = 2


def parse_word_list(path):
    entries = []
    current_category = None
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^===\s*(\d+)\.\s*(.+?)\s*\((\d+)개\)\s*===$", line)
        if m:
            current_category = m.group(2)
            continue
        if "\t" not in line:
            continue
        word, video_file = line.split("\t", 1)
        stem = Path(video_file.strip()).stem
        entries.append({
            "word": word.strip(),
            "folder": stem,
            "category": current_category,
        })
    return entries


def extract_xy_points(person, key, point_count, stride=3):
    values = person.get(key, [])
    if len(values) < point_count * stride:
        return []

    pts = []
    confs = []
    for i in range(0, point_count * stride, stride):
        x, y, c = values[i], values[i + 1], values[i + 2]
        pts.append([float(x), float(y)])
        confs.append(float(c))
    if confs and sum(confs) / len(confs) < 0.05:
        return []
    return pts


def flatten_xy(points, target_points):
    padded = points[:target_points] + [[0.0, 0.0] for _ in range(max(0, target_points - len(points)))]
    result = []
    for x, y in padded[:target_points]:
        result.extend([round(float(x), ROUND_DP), round(float(y), ROUND_DP)])
    return result


def person_from_json(data):
    people = data.get("people")
    if isinstance(people, list):
        return people[0] if people else {}
    if isinstance(people, dict):
        return people
    return {}


def subsample(items, n):
    if len(items) <= n:
        return items
    if n <= 1:
        return [items[len(items) // 2]]
    return [items[round(i * (len(items) - 1) / (n - 1))] for i in range(n)]


def load_word_sequence_from_files(folder):
    json_files = sorted(folder.glob("*_keypoints.json"))
    frames = []
    for path in json_files:
        try:
            person = person_from_json(json.loads(path.read_text(encoding="utf-8")))
            frame = build_openpose_frame(person)
            if frame:
                frames.append(frame)
        except Exception:
            continue
    return subsample(frames, SEQ_FRAMES)


def load_word_sequence_from_zip(zip_file, names):
    frames = []
    for name in names:
        try:
            person = person_from_json(json.loads(zip_file.read(name).decode("utf-8")))
            frame = build_openpose_frame(person)
            if frame:
                frames.append(frame)
        except Exception:
            continue
    return subsample(frames, SEQ_FRAMES)


def build_openpose_frame(person):
    pose = extract_xy_points(person, "pose_keypoints_2d", 25)
    left = extract_xy_points(person, "hand_left_keypoints_2d", 21)
    right = extract_xy_points(person, "hand_right_keypoints_2d", 21)
    frame = flatten_xy(pose, 25) + flatten_xy(left, 25) + flatten_xy(right, 25)
    return frame if any(abs(v) > 1e-6 for v in frame[50:150]) else None


def build_zip_lookup(zip_file):
    lookup = {}
    for name in zip_file.namelist():
        if not name.endswith("_keypoints.json") or not name.startswith("data/"):
            continue
        parts = name.split("/")
        if len(parts) >= 3:
            lookup.setdefault(parts[1], []).append(name)
    for names in lookup.values():
        names.sort()
    return lookup


def build_index():
    entries = parse_word_list(WORD_LIST_PATH)
    index = {}
    manifest = {
        "word_source": str(WORD_DATA_DIR if WORD_DATA_DIR.exists() else WORD_DATA_ZIP),
        "jamo_source": str(JAMO_DATA_DIR),
        "excluded": ["jisutja"],
        "frame_format": "pose50_left50_right50",
        "words": {},
        "missing": [],
    }

    if WORD_DATA_DIR.exists():
        for entry in entries:
            folder = WORD_DATA_DIR / entry["folder"]
            if not folder.exists():
                manifest["missing"].append(entry)
                continue
            add_entry(index, manifest, entry, load_word_sequence_from_files(folder))
    elif WORD_DATA_ZIP.exists():
        with zipfile.ZipFile(WORD_DATA_ZIP) as zip_file:
            zip_lookup = build_zip_lookup(zip_file)
            for entry in entries:
                names = zip_lookup.get(entry["folder"], [])
                if not names:
                    manifest["missing"].append(entry)
                    continue
                add_entry(index, manifest, entry, load_word_sequence_from_zip(zip_file, names))
    else:
        manifest["missing"] = entries

    return index, manifest


def add_entry(index, manifest, entry, seq):
    if len(seq) < 3:
        manifest["missing"].append(entry)
        return

    index[entry["word"]] = seq
    manifest["words"][entry["word"]] = {
        "folder": entry["folder"],
        "category": entry["category"],
        "frames": len(seq),
        "source": "local_word_dataset",
    }


if __name__ == "__main__":
    index, manifest = build_index()
    OUT_PATH.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT_PATH}")
    print(f"wrote {MANIFEST_PATH}")
    print(f"indexed words: {len(index)}")
    print(f"missing words: {len(manifest['missing'])}")
