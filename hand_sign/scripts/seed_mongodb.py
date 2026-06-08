import argparse
import json
import os
import sys
from datetime import datetime, timezone

from pymongo import ASCENDING, MongoClient

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

from jamo_db import JAMO_DB


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def read_json(path, fallback):
    if not os.path.exists(path):
        return fallback
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_catalog():
    manifest = read_json(os.path.join(ROOT_DIR, "local_learning_manifest.json"), {})
    keypoints = read_json(os.path.join(ROOT_DIR, "local_learning_keypoint_index.json"), {})
    docs = []

    for key, entry in JAMO_DB.items():
        docs.append({
            "kind": "jamo",
            "sign_id": f"jamo_{key}",
            "name": entry.get("name", key),
            "label": key,
            "category": "지문자",
            "data_format": "jamo",
            "hands": 1,
            "description": entry.get("description", ""),
            "hint": entry.get("hint", ""),
            "steps": entry.get("steps", []),
            "landmarks": entry.get("landmarks", []),
            "source": entry.get("source", "verified"),
            "updated_at": utc_now(),
        })

    for label, meta in manifest.get("words", {}).items():
        frames = keypoints.get(label, [])
        docs.append({
            "kind": "word",
            "sign_id": meta.get("folder", label),
            "name": label,
            "label": label,
            "category": meta.get("category", ""),
            "data_format": manifest.get("frame_format", "pose50_left50_right50"),
            "hands": meta.get("hands"),
            "frames": frames,
            "frame_count": len(frames),
            "source": meta.get("source", "local_word_dataset"),
            "updated_at": utc_now(),
        })

    return docs


def main():
    parser = argparse.ArgumentParser(description="Reset and seed MongoDB sign data.")
    parser.add_argument("--uri", default=os.environ.get("MONGODB_URI", ""), help="MongoDB connection URI")
    parser.add_argument("--db", default=os.environ.get("MONGODB_DB", "hand_sign_learning"), help="MongoDB database name")
    parser.add_argument(
        "--reset-users",
        action="store_true",
        help="Also delete users, sessions, and practice_records. Sign catalog is always reset.",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Required confirmation flag for deleting existing MongoDB data.",
    )
    args = parser.parse_args()

    if not args.uri:
        raise SystemExit("MONGODB_URI가 필요해요. --uri 또는 환경변수로 넣어주세요.")
    if not args.yes:
        raise SystemExit("기존 데이터를 지우려면 --yes를 붙여주세요.")

    client = MongoClient(args.uri, serverSelectionTimeoutMS=8000)
    client.admin.command("ping")
    db = client[args.db]

    deleted_catalog = db.sign_catalog.delete_many({}).deleted_count
    db.sign_catalog.create_index([("sign_id", ASCENDING)], unique=True)
    db.sign_catalog.create_index([("kind", ASCENDING), ("category", ASCENDING)])

    deleted_user_data = {}
    if args.reset_users:
        for name in ("users", "sessions", "practice_records", "counters"):
            deleted_user_data[name] = db[name].delete_many({}).deleted_count

    docs = build_catalog()
    if docs:
        db.sign_catalog.insert_many(docs, ordered=False)

    print(json.dumps({
        "status": "ok",
        "database": args.db,
        "deleted_sign_catalog": deleted_catalog,
        "deleted_user_data": deleted_user_data,
        "inserted_sign_catalog": len(docs),
        "jamo_count": sum(1 for doc in docs if doc["kind"] == "jamo"),
        "word_count": sum(1 for doc in docs if doc["kind"] == "word"),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
