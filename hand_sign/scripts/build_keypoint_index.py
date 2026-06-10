"""
AI Hub 수어 키포인트 → 단어별 프레임 시퀀스 인덱스 빌드
전략: 단어별 전체 프레임 수집 → 30프레임으로 균등 추출 → 정규화

사용법:
  py build_keypoint_index.py

입력:
  real_word_morpheme.zip  — WORD_ID → 한국어 단어 매핑
  sys_word_keypoint.zip   — WORD_ID별 키포인트 JSON

출력:
  aihub_keypoint_index.json  — {단어: [[[x,y,z]×21], ...30프레임...], ...}
"""
import zipfile, json, os, sys, math, re
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
MORPH_ZIP   = os.path.join(BASE_DIR, "real_word_morpheme.zip")
KP_ZIP      = os.path.join(BASE_DIR, "sys_word_keypoint.zip")
OUT_PATH    = os.path.join(BASE_DIR, "aihub_keypoint_index.json")

SEQ_FRAMES  = 30   # 단어당 저장할 프레임 수
ROUND_DP    = 3    # 좌표 소수점 자리수 (파일 크기 절약)


def normalize_2d(pts21, is_right: bool):
    """21개 [x,y] 점 → 정규화 [[x,y,0]×21]. 실패 시 None."""
    if not pts21 or len(pts21) < 21:
        return None
    w = pts21[0]
    shifted = [[p[0]-w[0], p[1]-w[1]] for p in pts21]
    m = shifted[9]
    scale = math.sqrt(m[0]**2 + m[1]**2)
    if scale < 0.001:
        return None
    r = ROUND_DP
    return [
        [round((-x if is_right else x) / scale, r),
         round(-y / scale, r),
         0.0]
        for x, y in shifted
    ]


def load_word_map(morph_zip_path: str) -> dict:
    word_map = {}
    print(f"[1] 형태소 매핑 로드: {morph_zip_path}")
    with zipfile.ZipFile(morph_zip_path) as zf:
        jsons = [n for n in zf.namelist() if n.endswith(".json")]
        print(f"  JSON 파일: {len(jsons)}개")
        for name in jsons:
            try:
                data = json.loads(zf.read(name).decode("utf-8"))
                fname = data.get("metaData", {}).get("name", "")
                m = re.search(r'(WORD\d+)', fname, re.I)
                if not m:
                    continue
                word_id = m.group(1).upper()
                items = data.get("data", [])
                for item in items:
                    for attr in item.get("attributes", []):
                        korean = attr.get("name", "").strip()
                        if korean and word_id not in word_map:
                            word_map[word_id] = korean
            except Exception:
                pass
    print(f"  매핑 완료: {len(word_map)}개")
    for wid, kor in list(word_map.items())[:5]:
        print(f"  {wid} → {kor}")
    return word_map


def extract_pts(people, side):
    kps = people.get(side, [])
    if len(kps) < 63:
        return None
    pts = [[kps[j], kps[j+1]] for j in range(0, 63, 3)]
    confs = [kps[j+2] for j in range(0, 63, 3)]
    if sum(confs) / 21 < 0.3:
        return None
    return pts


def subsample(lst, n):
    """lst에서 n개를 균등 추출."""
    if len(lst) <= n:
        return lst
    step = len(lst) / n
    return [lst[int(i * step)] for i in range(n)]


def build_index(kp_zip_path: str, word_map: dict) -> dict:
    print(f"\n[2] 키포인트 시퀀스 빌드: {kp_zip_path}")

    # STEP A: WORD_ID별 파일 목록 수집
    word_files = defaultdict(list)
    with zipfile.ZipFile(kp_zip_path) as zf:
        all_jsons = [n for n in zf.namelist() if n.endswith(".json")]
    print(f"  전체 파일: {len(all_jsons):,}개")

    for name in all_jsons:
        m = re.search(r'(WORD\d+)', name, re.I)
        if m:
            word_files[m.group(1).upper()].append(name)

    target = {wid: flist for wid, flist in word_files.items() if wid in word_map}
    avg_frames = sum(len(v) for v in target.values()) // max(1, len(target))
    print(f"  매핑된 WORD: {len(target):,}개, 평균 {avg_frames}프레임/단어")
    print(f"  → 단어당 {SEQ_FRAMES}프레임으로 균등 추출")

    # STEP B: 각 WORD의 모든 프레임 수집 → 추출 → 정규화
    index = {}
    found = skipped = errors = 0

    with zipfile.ZipFile(kp_zip_path) as zf:
        for wi, (word_id, flist) in enumerate(target.items()):
            if wi % 200 == 0 and wi > 0:
                print(f"  {wi:,}/{len(target):,} 단어... ({found}개 완료)")

            korean = word_map[word_id]
            flist.sort()  # 프레임 순서 보장

            # 모든 프레임의 (pts, is_right) 수집
            raw_frames = []
            for fname in flist:
                try:
                    data = json.loads(zf.read(fname).decode("utf-8"))
                    people = data.get("people", {})

                    pts = extract_pts(people, "hand_right_keypoints_2d")
                    is_right = True
                    if pts is None:
                        pts = extract_pts(people, "hand_left_keypoints_2d")
                        is_right = False
                    if pts is None:
                        continue

                    raw_frames.append((pts, is_right))
                except Exception:
                    errors += 1

            if len(raw_frames) < 3:
                skipped += 1
                continue

            # 30프레임으로 균등 추출 후 정규화
            sampled = subsample(raw_frames, SEQ_FRAMES)
            sequence = []
            for pts, is_right in sampled:
                norm = normalize_2d(pts, is_right)
                if norm:
                    sequence.append(norm)

            if len(sequence) < 3:
                skipped += 1
                continue

            index[korean] = sequence
            found += 1

    print(f"  완료: {found}개 단어 | 건너뜀 {skipped} | 오류 {errors}")
    return index


if __name__ == "__main__":
    if not os.path.exists(MORPH_ZIP):
        print(f"오류: {MORPH_ZIP} 없음"); sys.exit(1)
    if not os.path.exists(KP_ZIP):
        print(f"오류: {KP_ZIP} 없음"); sys.exit(1)

    word_map = load_word_map(MORPH_ZIP)
    index    = build_index(KP_ZIP, word_map)

    print(f"\n[3] 저장: {OUT_PATH}")
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(',', ':'))

    size_mb = os.path.getsize(OUT_PATH) / 1024 / 1024
    print(f"  총 {len(index)}개 단어 | 파일 크기: {size_mb:.1f} MB")

    print("\n[샘플]")
    for w, seq in list(index.items())[:3]:
        print(f"  '{w}': {len(seq)}프레임, 프레임0 tip={seq[0][8]}, 프레임15 tip={seq[min(15,len(seq)-1)][8]}")
