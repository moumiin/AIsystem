"""
AI Hub CROWD 키포인트 다운로드 + 숫자/지문자 인덱스 빌드

파일:
  01_crowd_morpheme.zip (7.72 MB, key: 39581)  <- 단어 매핑
  01_crowd_keypoint.zip (6.16 GB, key: 39580)  <- 키포인트 (Training)

실행:  py download_crowd.py --apikey YOUR_API_KEY
또는 .env/환경변수에 AIHUB_API_KEY 설정
"""
import urllib.request, ssl, sys, os, time, zipfile, json, re, math, argparse
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DATASET   = "103"

MORPH_KEY = "39581"   # 01_crowd_morpheme.zip  7.72 MB
KP_KEY    = "39580"   # 01_crowd_keypoint.zip  6.16 GB

MORPH_OUT = os.path.join(BASE_DIR, "crowd_morpheme.zip")
KP_OUT    = os.path.join(BASE_DIR, "crowd_keypoint.zip")
KP_INDEX  = os.path.join(BASE_DIR, "aihub_keypoint_index.json")

SEQ_FRAMES = 30
ROUND_DP   = 3


def load_env_file():
    env_path = os.path.join(os.path.dirname(BASE_DIR), ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


# ── 다운로드 ─────────────────────────────────────────────────────────────────
def download_file(file_sn, out_path, label, api_key):
    if os.path.exists(out_path):
        size = os.path.getsize(out_path)
        print(f"[skip] {label} 이미 존재: {size/1024/1024:.1f} MB")
        return True

    url = f"https://api.aihub.or.kr/down/0.6/{DATASET}.do?fileSn={file_sn}"
    print(f"\n[다운로드] {label}")
    print(f"  URL: {url}")

    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={
        "apikey": api_key, "User-Agent": "aihubshell/0.6",
    })
    try:
        r = urllib.request.urlopen(req, timeout=60, context=ctx)
    except Exception as e:
        print(f"  ERROR: {e}")
        return False

    total = int(r.headers.get("Content-Length", 0))
    print(f"  크기: {total/1024/1024:.1f} MB")

    downloaded, t0 = 0, time.time()
    with open(out_path, "wb") as f:
        while True:
            chunk = r.read(524288)  # 512KB chunks
            if not chunk:
                break
            f.write(chunk)
            downloaded += len(chunk)
            elapsed = max(0.01, time.time() - t0)
            speed = downloaded / elapsed / 1024 / 1024
            pct = downloaded / total * 100 if total else 0
            print(f"\r  {downloaded/1024/1024:.1f}/{total/1024/1024:.1f} MB  "
                  f"({pct:.1f}%)  {speed:.1f} MB/s", end="", flush=True)

    elapsed = time.time() - t0
    print(f"\n  완료: {downloaded/1024/1024:.1f} MB in {elapsed:.1f}s")
    return True


# ── 형태소 → 단어 매핑 ────────────────────────────────────────────────────────
def load_crowd_word_map(morph_zip) -> dict:
    print(f"\n[형태소 로드] {morph_zip}")
    word_map = {}
    with zipfile.ZipFile(morph_zip) as zf:
        jsons = [n for n in zf.namelist() if n.endswith(".json")]
        print(f"  파일 수: {len(jsons):,}")
        for name in jsons:
            try:
                raw = zf.read(name)
                # cp949 먼저, 실패시 utf-8
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
                word_id = m.group(1).upper()

                for item in data.get("data", []):
                    for attr in item.get("attributes", []):
                        korean = attr.get("name", "").strip()
                        if korean and word_id not in word_map:
                            word_map[word_id] = korean
            except Exception:
                pass

    print(f"  매핑 완료: {len(word_map):,}개")
    for wid, kor in list(word_map.items())[:8]:
        print(f"  {wid} → {kor}")
    return word_map


# ── 정규화 (기존 build_keypoint_index.py와 동일) ──────────────────────────────
def normalize_2d(pts21, is_right):
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
         round(-y / scale, r), 0.0]
        for x, y in shifted
    ]


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
    if len(lst) <= n:
        return lst
    step = len(lst) / n
    return [lst[int(i * step)] for i in range(n)]


# ── CROWD 키포인트 빌드 ────────────────────────────────────────────────────────
def build_crowd_index(kp_zip, word_map) -> dict:
    print(f"\n[키포인트 빌드] {kp_zip}")
    word_files = defaultdict(list)

    with zipfile.ZipFile(kp_zip) as zf:
        all_jsons = [n for n in zf.namelist()
                     if n.endswith(".json") and "keypoint" in n.lower()]

    print(f"  키포인트 JSON: {len(all_jsons):,}개")

    for name in all_jsons:
        m = re.search(r"(FS\d+|WORD\d+)", name, re.I)
        if m:
            word_files[m.group(1).upper()].append(name)

    target = {wid: flist for wid, flist in word_files.items() if wid in word_map}
    print(f"  매핑된 ID: {len(target):,}개")

    index = {}
    found = skipped = 0
    with zipfile.ZipFile(kp_zip) as zf:
        for wi, (word_id, flist) in enumerate(target.items()):
            if wi % 100 == 0 and wi > 0:
                print(f"  {wi}/{len(target)} ... ({found}개 완료)")

            korean = word_map[word_id]
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
            sequence = [normalize_2d(pts, ir) for pts, ir in sampled]
            sequence = [s for s in sequence if s]

            if len(sequence) < 3:
                skipped += 1
                continue

            index[korean] = sequence
            found += 1

    print(f"  완료: {found}개 | 건너뜀: {skipped}개")
    return index


# ── 기존 인덱스와 병합 후 저장 ─────────────────────────────────────────────────
def merge_and_save(new_index):
    existing = {}
    if os.path.exists(KP_INDEX):
        with open(KP_INDEX, encoding="utf-8") as f:
            existing = json.load(f)
        print(f"\n[병합] 기존 {len(existing)}개 + 신규 {len(new_index)}개")
    else:
        print(f"\n[저장] 신규 {len(new_index)}개")

    merged = {**existing, **new_index}   # 새 데이터가 우선
    with open(KP_INDEX, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, separators=(",", ":"))

    size_mb = os.path.getsize(KP_INDEX) / 1024 / 1024
    print(f"  저장 완료: {len(merged)}개 단어 | {size_mb:.1f} MB")
    print(f"  파일: {KP_INDEX}")

    # 숫자 샘플 출력
    nums = [k for k in merged if re.match(r"^\d+$", k)]
    if nums:
        print(f"\n  숫자 항목: {sorted(nums, key=int)[:20]}")


# ── 메인 ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    load_env_file()
    parser = argparse.ArgumentParser()
    parser.add_argument("--apikey", default=os.getenv("AIHUB_API_KEY"), help="AI Hub API Key")
    args = parser.parse_args()
    if not args.apikey:
        print("ERROR: --apikey 또는 AIHUB_API_KEY 환경변수가 필요합니다.")
        sys.exit(1)

    print("=" * 60)
    print("STEP 1: crowd_morpheme 다운로드 (7.72 MB)")
    print("=" * 60)
    ok = download_file(MORPH_KEY, MORPH_OUT, "crowd_morpheme", args.apikey)
    if not ok:
        sys.exit(1)

    word_map = load_crowd_word_map(MORPH_OUT)
    if not word_map:
        print("ERROR: 단어 매핑 없음"); sys.exit(1)

    print("\n" + "=" * 60)
    print("STEP 2: crowd_keypoint 다운로드 (6.16 GB) — 시간이 걸립니다")
    print("=" * 60)
    ok2 = download_file(KP_KEY, KP_OUT, "crowd_keypoint", args.apikey)
    if not ok2:
        print("키포인트 다운로드 실패"); sys.exit(1)

    crowd_index = build_crowd_index(KP_OUT, word_map)
    merge_and_save(crowd_index)

    print("\n완료! 서버를 재시작하면 적용됩니다.")
