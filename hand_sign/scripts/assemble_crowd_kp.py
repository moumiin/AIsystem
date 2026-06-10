"""
crowd_keypoint.zip (TAR) → 분할 파트 조립 → 인덱스 빌드
"""
import tarfile, zipfile, json, re, math, sys, os, time
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
TAR_PATH   = os.path.join(BASE_DIR, "crowd_keypoint.zip")
ASSEMBLED  = os.path.join(BASE_DIR, "crowd_keypoint_assembled.zip")
MORPH_ZIP  = os.path.join(BASE_DIR, "crowd_morpheme.zip")
KP_INDEX   = os.path.join(BASE_DIR, "aihub_keypoint_index.json")

SEQ_FRAMES = 30
ROUND_DP   = 3


# ── STEP 1: TAR → 단일 ZIP 조립 ───────────────────────────────────────────────
def assemble_parts():
    if os.path.exists(ASSEMBLED):
        size = os.path.getsize(ASSEMBLED)
        print(f"[skip] 이미 조립됨: {size/1024/1024/1024:.2f} GB")
        return

    print("[1] TAR에서 분할 파트 조립 중...")
    t0 = time.time()

    with tarfile.open(TAR_PATH, "r:*") as tar:
        members = [m for m in tar.getmembers() if "keypoint" in m.name and "part" in m.name]
        # 파트 번호(바이트 오프셋) 순으로 정렬
        members.sort(key=lambda m: int(m.name.rsplit("part", 1)[-1]))
        total_size = sum(m.size for m in members)
        print(f"  파트 수: {len(members)}개, 총 {total_size/1024/1024/1024:.2f} GB")

        written = 0
        with open(ASSEMBLED, "wb") as out:
            for m in members:
                f = tar.extractfile(m)
                while True:
                    chunk = f.read(4 * 1024 * 1024)  # 4MB
                    if not chunk:
                        break
                    out.write(chunk)
                    written += len(chunk)
                pct = written / total_size * 100
                elapsed = time.time() - t0
                speed = written / elapsed / 1024 / 1024
                print(f"  {written/1024/1024/1024:.2f}/{total_size/1024/1024/1024:.2f} GB "
                      f"({pct:.1f}%)  {speed:.1f} MB/s")

    elapsed = time.time() - t0
    size = os.path.getsize(ASSEMBLED)
    print(f"  완료: {size/1024/1024/1024:.2f} GB ({elapsed:.1f}s)")


# ── STEP 2: 형태소 → ID→단어 매핑 ────────────────────────────────────────────
def load_word_map() -> dict:
    print(f"\n[2] 형태소 로드: {MORPH_ZIP}")
    word_map = {}
    with zipfile.ZipFile(MORPH_ZIP) as zf:
        jsons = [n for n in zf.namelist() if n.endswith(".json")]
        print(f"  파일: {len(jsons):,}개")
        for name in jsons:
            try:
                raw = zf.read(name)
                for enc in ("cp949", "utf-8"):
                    try:
                        data = json.loads(raw.decode(enc))
                        break
                    except Exception:
                        continue
                else:
                    continue
                fname = data.get("metaData", {}).get("name", "")
                m = re.search(r"(FS\d+|WORD\d+)", fname, re.I)
                if not m:
                    continue
                wid = m.group(1).upper()
                for item in data.get("data", []):
                    for attr in item.get("attributes", []):
                        k = attr.get("name", "").strip()
                        if k and wid not in word_map:
                            word_map[wid] = k
            except Exception:
                pass
    print(f"  매핑: {len(word_map):,}개")
    return word_map


# ── STEP 3: 키포인트 추출·정규화·인덱스 빌드 ──────────────────────────────────
def normalize_2d(pts21, is_right):
    if not pts21 or len(pts21) < 21:
        return None
    w = pts21[0]
    shifted = [[p[0]-w[0], p[1]-w[1]] for p in pts21]
    m = shifted[9]
    scale = math.sqrt(m[0]**2 + m[1]**2)
    if scale < 0.001:
        return None
    return [
        [round((-x if is_right else x) / scale, ROUND_DP),
         round(-y / scale, ROUND_DP), 0.0]
        for x, y in shifted
    ]


def extract_pts(people, side):
    kps = people.get(side, [])
    if len(kps) < 63:
        return None
    pts = [[kps[j], kps[j+1]] for j in range(0, 63, 3)]
    if sum(kps[j+2] for j in range(0, 63, 3)) / 21 < 0.3:
        return None
    return pts


def subsample(lst, n):
    if len(lst) <= n:
        return lst
    step = len(lst) / n
    return [lst[int(i * step)] for i in range(n)]


def build_index(word_map) -> dict:
    print(f"\n[3] 키포인트 인덱스 빌드: {ASSEMBLED}")
    t0 = time.time()

    with zipfile.ZipFile(ASSEMBLED) as zf:
        all_files = zf.namelist()

    kp_files = [n for n in all_files if n.endswith(".json") and "keypoint" in n.lower()]
    print(f"  키포인트 JSON: {len(kp_files):,}개")

    word_files = defaultdict(list)
    for name in kp_files:
        m = re.search(r"(FS\d+|WORD\d+)", name, re.I)
        if m:
            word_files[m.group(1).upper()].append(name)

    target = {wid: fl for wid, fl in word_files.items() if wid in word_map}
    print(f"  매핑된 ID: {len(target):,}개")

    index = {}
    found = skipped = 0

    with zipfile.ZipFile(ASSEMBLED) as zf:
        for wi, (wid, flist) in enumerate(target.items()):
            if wi % 100 == 0 and wi > 0:
                elapsed = time.time() - t0
                print(f"  {wi}/{len(target)} ({found}개 완료, {elapsed:.0f}s)")

            korean = word_map[wid]
            flist.sort()
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
                    pass

            if len(raw_frames) < 3:
                skipped += 1
                continue

            sampled = subsample(raw_frames, SEQ_FRAMES)
            sequence = [normalize_2d(p, ir) for p, ir in sampled]
            sequence = [s for s in sequence if s]

            if len(sequence) < 3:
                skipped += 1
                continue

            index[korean] = sequence
            found += 1

    print(f"  완료: {found}개 | 건너뜀: {skipped}개 | 소요: {time.time()-t0:.1f}s")
    return index


# ── STEP 4: 기존 인덱스와 병합 저장 ───────────────────────────────────────────
def merge_and_save(new_index):
    existing = {}
    if os.path.exists(KP_INDEX):
        with open(KP_INDEX, encoding="utf-8") as f:
            existing = json.load(f)
        print(f"\n[4] 병합: 기존 {len(existing)}개 + 신규 {len(new_index)}개")
    else:
        print(f"\n[4] 저장: 신규 {len(new_index)}개")

    merged = {**existing, **new_index}
    with open(KP_INDEX, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, separators=(",", ":"))

    size_mb = os.path.getsize(KP_INDEX) / 1024 / 1024
    print(f"  저장: {len(merged)}개 단어 | {size_mb:.1f} MB → {KP_INDEX}")

    nums = sorted([k for k in merged if re.match(r"^\d+$", k)], key=int)
    if nums:
        print(f"  숫자 항목: {nums[:20]}")


if __name__ == "__main__":
    assemble_parts()
    word_map   = load_word_map()
    crowd_idx  = build_index(word_map)
    merge_and_save(crowd_idx)
    print("\n완료! 서버 재시작 필요.")
