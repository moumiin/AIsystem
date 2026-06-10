"""
AI Hub API key로 필요한 파일 다운로드

사용법:
  py download_aihub.py --apikey YOUR_API_KEY [--target morpheme|keypoint|all]

다운로드 대상:
  morpheme  : 단어 메타데이터 (13.77 MB) → URL 인덱스 재생성
  keypoint  : 합성 단어 키포인트 (449 MB) + 합성 문장 키포인트 (598 MB)
  all       : 위 전부

AI Hub API 키 발급:
  https://aihub.or.kr → 마이페이지 → API 활용신청 → API Key 확인
"""
import os, sys, argparse, zipfile, io
import urllib.request, urllib.error

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# AI Hub 파일 ID → (설명, 저장 파일명)
FILE_MAP = {
    # 모폼(메타데이터) - 작은 파일, URL 기반 인덱스 재생성용
    "39478": ("01_real_word_morpheme (REAL WORD 형태소, 13.77 MB)",   "real_word_morpheme.zip"),
    "39475": ("01_crowd_morpheme     (CROWD 형태소,   930 KB)",         "crowd_morpheme.zip"),

    # 키포인트 - 랜드마크가 직접 포함된 파일
    "39481": ("02_sys_word_keypoint  (SYN WORD  키포인트, 449 MB)",    "sys_word_keypoint.zip"),
    "39480": ("02_sys_sen_keypoint   (SYN SEN   키포인트, 598 MB)",    "sys_sen_keypoint.zip"),
}

TARGETS = {
    "morpheme": ["39478", "39475"],
    "keypoint": ["39481", "39480"],
    "all":      ["39478", "39475", "39481", "39480"],
}


def download_file(api_key: str, file_id: str, dest_path: str):
    url = f"https://api.aihub.or.kr/down/1.0/{file_id}.do?apiKey={api_key}"
    print(f"\n  → 다운로드 시작: {os.path.basename(dest_path)}")
    print(f"     파일 ID: {file_id}")

    try:
        req  = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=30)

        # 콘텐츠 타입 확인
        ctype = resp.headers.get("Content-Type", "")
        if "html" in ctype.lower():
            body = resp.read(2000).decode("utf-8", errors="replace")
            print(f"  ❌ HTML 응답 (인증 실패 또는 잘못된 API key)")
            print(f"     응답 미리보기: {body[:300]}")
            return False

        total = int(resp.headers.get("Content-Length", 0))
        downloaded = 0
        chunk = 65536

        with open(dest_path, "wb") as f:
            while True:
                data = resp.read(chunk)
                if not data:
                    break
                f.write(data)
                downloaded += len(data)
                if total:
                    pct = downloaded / total * 100
                    mb  = downloaded / 1024 / 1024
                    print(f"\r     {mb:.1f} MB / {total/1024/1024:.1f} MB  ({pct:.1f}%)", end="", flush=True)

        print(f"\n  ✅ 완료: {dest_path}")
        return True

    except urllib.error.HTTPError as e:
        print(f"  ❌ HTTP {e.code}: {e.reason}")
        return False
    except Exception as e:
        print(f"  ❌ 오류: {e}")
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apikey", required=True, help="AI Hub API Key")
    parser.add_argument("--target", default="keypoint",
                        choices=["morpheme", "keypoint", "all"],
                        help="다운로드 대상 (기본: keypoint)")
    parser.add_argument("--outdir", default=BASE_DIR, help="저장 디렉토리")
    args = parser.parse_args()

    ids = TARGETS[args.target]
    print(f"\n[AI Hub 다운로드] 대상: {args.target} ({len(ids)}개 파일)")
    print(f"저장 위치: {args.outdir}\n")

    for fid in ids:
        desc, fname = FILE_MAP[fid]
        dest = os.path.join(args.outdir, fname)
        print(f"[{fid}] {desc}")

        if os.path.exists(dest):
            size_mb = os.path.getsize(dest) / 1024 / 1024
            print(f"  ⏩ 이미 존재 ({size_mb:.1f} MB) — 건너뜀")
            continue

        ok = download_file(args.apikey, fid, dest)
        if ok:
            # zip 파일 검증
            try:
                with zipfile.ZipFile(dest) as zf:
                    count = len([n for n in zf.namelist() if n.endswith(".json")])
                    print(f"  📦 ZIP 내 JSON 파일: {count}개")
            except Exception as e:
                print(f"  ⚠ ZIP 검증 실패: {e}")

    print("\n다음 단계:")
    if args.target in ("keypoint", "all"):
        print("  py build_keypoint_index.py  # 키포인트 인덱스 빌드")
    if args.target in ("morpheme", "all"):
        print("  py build_index.py --word real_word_morpheme.zip  # URL 인덱스 재생성")


if __name__ == "__main__":
    main()
