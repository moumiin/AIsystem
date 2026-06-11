import hashlib
import hmac
import os
import secrets
import sqlite3
from datetime import datetime, timezone

try:
    import certifi
except ImportError:
    certifi = None

try:
    from pymongo import ASCENDING, DESCENDING, MongoClient
    from pymongo.errors import DuplicateKeyError
except ImportError:
    ASCENDING = DESCENDING = MongoClient = DuplicateKeyError = None


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class AuthStore:
    def __init__(self, db_path):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.init()

    def connect(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init(self):
        with self.connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    display_name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    token TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS practice_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    sign_id TEXT NOT NULL,
                    sign_name TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT '',
                    score REAL NOT NULL,
                    success INTEGER NOT NULL DEFAULT 0,
                    feedback TEXT NOT NULL DEFAULT '',
                    duration_ms INTEGER NOT NULL DEFAULT 0,
                    frame_count INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );
                """
            )

    def hash_password(self, password, salt=None):
        salt = salt or secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            120_000,
        ).hex()
        return salt, digest

    def verify_password(self, password, salt, password_hash):
        _, digest = self.hash_password(password, salt)
        return hmac.compare_digest(digest, password_hash)

    def create_user(self, username, password, display_name=None):
        username = username.strip().lower()
        display_name = (display_name or username).strip()
        salt, password_hash = self.hash_password(password)
        try:
            with self.connect() as conn:
                cur = conn.execute(
                    """
                    INSERT INTO users (username, display_name, password_hash, salt, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (username, display_name, password_hash, salt, utc_now()),
                )
                user_id = cur.lastrowid
        except sqlite3.IntegrityError as exc:
            raise ValueError("이미 사용 중인 아이디예요.") from exc
        return self.get_user_by_id(user_id)

    def get_user_by_id(self, user_id):
        with self.connect() as conn:
            row = conn.execute(
                "SELECT id, username, display_name, created_at FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
        return dict(row) if row else None

    def authenticate(self, username, password):
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE username = ?",
                (username.strip().lower(),),
            ).fetchone()
        if not row or not self.verify_password(password, row["salt"], row["password_hash"]):
            raise ValueError("아이디 또는 비밀번호가 맞지 않아요.")
        return self.get_user_by_id(row["id"])

    def create_session(self, user_id):
        token = secrets.token_urlsafe(32)
        with self.connect() as conn:
            conn.execute(
                "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
                (token, user_id, utc_now()),
            )
        return token

    def user_from_token(self, token):
        with self.connect() as conn:
            row = conn.execute(
                """
                SELECT u.id, u.username, u.display_name, u.created_at
                FROM sessions s
                JOIN users u ON u.id = s.user_id
                WHERE s.token = ?
                """,
                (token,),
            ).fetchone()
        return dict(row) if row else None

    def delete_session(self, token):
        with self.connect() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))

    def add_record(self, user_id, record):
        with self.connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO practice_records
                    (user_id, sign_id, sign_name, category, score, success, feedback,
                     duration_ms, frame_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    record["sign_id"],
                    record["sign_name"],
                    record.get("category", ""),
                    float(record["score"]),
                    1 if record.get("success") else 0,
                    record.get("feedback", ""),
                    int(record.get("duration_ms") or 0),
                    int(record.get("frame_count") or 0),
                    utc_now(),
                ),
            )
            record_id = cur.lastrowid
        return self.get_record(user_id, record_id)

    def get_record(self, user_id, record_id):
        with self.connect() as conn:
            row = conn.execute(
                """
                SELECT id, sign_id, sign_name, category, score, success, feedback,
                       duration_ms, frame_count, created_at
                FROM practice_records
                WHERE user_id = ? AND id = ?
                """,
                (user_id, record_id),
            ).fetchone()
        return self._record_dict(row)

    def list_records(self, user_id, limit=30):
        limit = max(1, min(int(limit or 30), 100))
        with self.connect() as conn:
            rows = conn.execute(
                """
                SELECT id, sign_id, sign_name, category, score, success, feedback,
                       duration_ms, frame_count, created_at
                FROM practice_records
                WHERE user_id = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (user_id, limit),
            ).fetchall()
        return [self._record_dict(row) for row in rows]

    def summary(self, user_id):
        with self.connect() as conn:
            total = conn.execute(
                "SELECT COUNT(*) AS count, AVG(score) AS avg_score, MAX(score) AS best_score FROM practice_records WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            recent = conn.execute(
                """
                SELECT sign_name, MAX(score) AS best_score, COUNT(*) AS attempts
                FROM practice_records
                WHERE user_id = ?
                GROUP BY sign_name
                ORDER BY MAX(id) DESC
                LIMIT 8
                """,
                (user_id,),
            ).fetchall()
        return {
            "total_count": int(total["count"] or 0),
            "average_score": round(float(total["avg_score"] or 0), 1),
            "best_score": round(float(total["best_score"] or 0), 1),
            "recent_words": [dict(row) for row in recent],
        }

    def _record_dict(self, row):
        if not row:
            return None
        data = dict(row)
        data["success"] = bool(data["success"])
        data["score"] = round(float(data["score"]), 1)
        return data


class MongoAuthStore:
    def __init__(self, mongo_uri, db_name="hand_sign_learning"):
        if MongoClient is None:
            raise RuntimeError("pymongo가 설치되어 있지 않아요.")
        options = {"serverSelectionTimeoutMS": 5000}
        if certifi is not None:
            options["tlsCAFile"] = certifi.where()
        self.client = MongoClient(mongo_uri, **options)
        self.client.admin.command("ping")
        self.db = self.client[db_name]
        self.users = self.db.users
        self.sessions = self.db.sessions
        self.records = self.db.practice_records
        self.init()

    def init(self):
        self.users.create_index([("username", ASCENDING)], unique=True)
        self.sessions.create_index([("token", ASCENDING)], unique=True)
        self.sessions.create_index([("user_id", ASCENDING)])
        self.records.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])

    def hash_password(self, password, salt=None):
        salt = salt or secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            120_000,
        ).hex()
        return salt, digest

    def verify_password(self, password, salt, password_hash):
        _, digest = self.hash_password(password, salt)
        return hmac.compare_digest(digest, password_hash)

    def _next_id(self, name):
        doc = self.db.counters.find_one_and_update(
            {"_id": name},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return int(doc["seq"])

    def create_user(self, username, password, display_name=None):
        username = username.strip().lower()
        display_name = (display_name or username).strip()
        salt, password_hash = self.hash_password(password)
        user_id = self._next_id("users")
        doc = {
            "id": user_id,
            "username": username,
            "display_name": display_name,
            "password_hash": password_hash,
            "salt": salt,
            "created_at": utc_now(),
        }
        try:
            self.users.insert_one(doc)
        except DuplicateKeyError as exc:
            raise ValueError("이미 사용 중인 아이디예요.") from exc
        return self.get_user_by_id(user_id)

    def get_user_by_id(self, user_id):
        row = self.users.find_one(
            {"id": int(user_id)},
            {"_id": 0, "id": 1, "username": 1, "display_name": 1, "created_at": 1},
        )
        return dict(row) if row else None

    def authenticate(self, username, password):
        row = self.users.find_one({"username": username.strip().lower()})
        if not row or not self.verify_password(password, row["salt"], row["password_hash"]):
            raise ValueError("아이디 또는 비밀번호가 맞지 않아요.")
        return self.get_user_by_id(row["id"])

    def create_session(self, user_id):
        token = secrets.token_urlsafe(32)
        self.sessions.insert_one({
            "token": token,
            "user_id": int(user_id),
            "created_at": utc_now(),
        })
        return token

    def user_from_token(self, token):
        session = self.sessions.find_one({"token": token})
        if not session:
            return None
        return self.get_user_by_id(session["user_id"])

    def delete_session(self, token):
        self.sessions.delete_one({"token": token})

    def add_record(self, user_id, record):
        record_id = self._next_id("practice_records")
        doc = {
            "id": record_id,
            "user_id": int(user_id),
            "sign_id": record["sign_id"],
            "sign_name": record["sign_name"],
            "category": record.get("category", ""),
            "score": float(record["score"]),
            "success": bool(record.get("success")),
            "feedback": record.get("feedback", ""),
            "duration_ms": int(record.get("duration_ms") or 0),
            "frame_count": int(record.get("frame_count") or 0),
            "created_at": utc_now(),
        }
        self.records.insert_one(doc)
        return self.get_record(user_id, record_id)

    def get_record(self, user_id, record_id):
        row = self.records.find_one(
            {"user_id": int(user_id), "id": int(record_id)},
            {"_id": 0, "user_id": 0},
        )
        return self._record_dict(row)

    def list_records(self, user_id, limit=30):
        limit = max(1, min(int(limit or 30), 100))
        rows = self.records.find(
            {"user_id": int(user_id)},
            {"_id": 0, "user_id": 0},
        ).sort("id", DESCENDING).limit(limit)
        return [self._record_dict(row) for row in rows]

    def summary(self, user_id):
        user_id = int(user_id)
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": None,
                "count": {"$sum": 1},
                "avg_score": {"$avg": "$score"},
                "best_score": {"$max": "$score"},
            }},
        ]
        total = next(self.records.aggregate(pipeline), {})
        recent_pipeline = [
            {"$match": {"user_id": user_id}},
            {"$sort": {"id": DESCENDING}},
            {"$group": {
                "_id": "$sign_name",
                "sign_name": {"$first": "$sign_name"},
                "best_score": {"$max": "$score"},
                "attempts": {"$sum": 1},
                "last_id": {"$max": "$id"},
            }},
            {"$sort": {"last_id": DESCENDING}},
            {"$limit": 8},
            {"$project": {"_id": 0, "sign_name": 1, "best_score": 1, "attempts": 1}},
        ]
        return {
            "total_count": int(total.get("count") or 0),
            "average_score": round(float(total.get("avg_score") or 0), 1),
            "best_score": round(float(total.get("best_score") or 0), 1),
            "recent_words": list(self.records.aggregate(recent_pipeline)),
        }

    def _record_dict(self, row):
        if not row:
            return None
        data = dict(row)
        data["success"] = bool(data["success"])
        data["score"] = round(float(data["score"]), 1)
        return data


def create_auth_store(sqlite_path, mongo_uri=None, mongo_db_name=None):
    if mongo_uri:
        try:
            return MongoAuthStore(mongo_uri, mongo_db_name or "hand_sign_learning")
        except Exception as exc:
            print(f"[auth_store] MongoDB connection failed, falling back to SQLite: {exc}")
    return AuthStore(sqlite_path)
