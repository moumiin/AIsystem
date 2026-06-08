"""Small local jamo classifier.

This intentionally avoids heavy ML dependencies. It stores user-captured
MediaPipe-normalized hand poses, trains one centroid per jamo, and predicts by
nearest centroid. The shape is simple, but it gives the app a real learnable
model path that can later be replaced by PyTorch or TensorFlow.
"""
from __future__ import annotations

import json
import math
import os
import random
from datetime import datetime
from typing import Any


JAMO_AI_DIR = "jamo_ai_data"
SAMPLES_PATH = os.path.join(JAMO_AI_DIR, "samples.jsonl")
MODEL_PATH = os.path.join(JAMO_AI_DIR, "model.json")
AUGMENT_SEED = 20260604


def _ensure_dir(base_dir: str) -> str:
    path = os.path.join(base_dir, JAMO_AI_DIR)
    os.makedirs(path, exist_ok=True)
    return path


def _paths(base_dir: str) -> tuple[str, str]:
    _ensure_dir(base_dir)
    return (
        os.path.join(base_dir, SAMPLES_PATH),
        os.path.join(base_dir, MODEL_PATH),
    )


def flatten_pose(pose: list[Any]) -> list[float]:
    if not isinstance(pose, list) or len(pose) < 21:
        raise ValueError("pose must contain 21 landmarks")

    features: list[float] = []
    for point in pose[:21]:
        if not isinstance(point, list) or len(point) < 2:
            raise ValueError("each landmark must be [x, y, z]")
        features.extend([
            float(point[0] or 0),
            float(point[1] or 0),
            float(point[2] or 0) if len(point) > 2 else 0.0,
        ])
    return features


def _chunks(features: list[float]) -> list[list[float]]:
    return [features[i:i + 3] for i in range(0, 63, 3)]


def _flatten_points(points: list[list[float]]) -> list[float]:
    return [value for point in points for value in point[:3]]


def _rotate_points(points: list[list[float]], degrees: float) -> list[list[float]]:
    rad = math.radians(degrees)
    cos_v = math.cos(rad)
    sin_v = math.sin(rad)
    return [
        [x * cos_v - y * sin_v, x * sin_v + y * cos_v, z]
        for x, y, z in points
    ]


def augment_features(features: list[float], count: int, rng: random.Random) -> list[list[float]]:
    """Create camera-like static jamo variations.

    Applied augmentations:
    - Gaussian noise: small landmark jitter
    - 2D rotation: wrist angle variation
    - Scaling: hand size/camera distance variation
    - Landmark dropout: occasional missed joint pulled toward wrist
    """
    if len(features) != 63:
      return []

    augmented = []
    for _ in range(count):
        points = _chunks(features)
        scale = rng.uniform(0.96, 1.04)
        angle = rng.uniform(-10.0, 10.0)
        points = [[x * scale, y * scale, z * scale] for x, y, z in points]
        points = _rotate_points(points, angle)

        next_points = []
        for index, (x, y, z) in enumerate(points):
            if index != 0 and rng.random() < 0.035:
                next_points.append([0.0, 0.0, 0.0])
                continue

            next_points.append([
                x + rng.gauss(0.0, 0.012),
                y + rng.gauss(0.0, 0.012),
                z + rng.gauss(0.0, 0.006),
            ])

        augmented.append(_flatten_points(next_points))

    return augmented


def add_sample(base_dir: str, label: str, pose: list[Any], source: str = "camera") -> dict[str, Any]:
    label = (label or "").strip()
    if not label:
        raise ValueError("label is required")

    features = flatten_pose(pose)
    samples_path, _ = _paths(base_dir)
    record = {
        "label": label,
        "features": features,
        "source": source,
        "created_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
    }

    with open(samples_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

    return {"label": label, "feature_count": len(features)}


def load_samples(base_dir: str) -> list[dict[str, Any]]:
    samples_path, _ = _paths(base_dir)
    if not os.path.exists(samples_path):
        return []

    samples = []
    with open(samples_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(item.get("features"), list) and item.get("label"):
                samples.append(item)
    return samples


def build_seed_samples(jamo_db: dict[str, Any]) -> list[dict[str, Any]]:
    seeds = []
    for label, entry in jamo_db.items():
        pose = entry.get("landmarks")
        if not isinstance(pose, list):
            continue
        try:
            features = flatten_pose(pose)
        except ValueError:
            continue
        seeds.append({
            "label": label,
            "features": features,
            "source": "verified_seed",
        })
    return seeds


def train_model(base_dir: str, jamo_db: dict[str, Any]) -> dict[str, Any]:
    seed_samples = build_seed_samples(jamo_db)
    user_samples = load_samples(base_dir)
    raw_samples = seed_samples + user_samples
    if not raw_samples:
        raise ValueError("no samples available")

    grouped: dict[str, list[list[float]]] = {}
    prototypes = []
    rng = random.Random(AUGMENT_SEED)

    for sample in raw_samples:
        label = sample["label"]
        features = [float(v or 0) for v in sample["features"]]
        if len(features) != 63:
            continue

        source = sample.get("source", "sample")
        generated = [features]
        generated.extend(augment_features(
            features,
            24 if source == "camera" else 14,
            rng,
        ))

        grouped.setdefault(label, []).extend(generated)
        for index, row in enumerate(generated):
            prototypes.append({
                "label": label,
                "features": row,
                "source": source if index == 0 else f"{source}_augmented",
            })

    centroids = {}
    prototype_counts = {}
    for label, rows in grouped.items():
        prototype_counts[label] = len(rows)
        centroids[label] = [
            sum(row[i] for row in rows) / len(rows)
            for i in range(63)
        ]

    raw_counts: dict[str, int] = {}
    for sample in raw_samples:
        raw_counts[sample["label"]] = raw_counts.get(sample["label"], 0) + 1

    model = {
        "version": 2,
        "model_type": "augmented_knn",
        "trained_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "labels": sorted(centroids.keys()),
        "centroids": centroids,
        "prototypes": prototypes,
        "counts": raw_counts,
        "prototype_counts": prototype_counts,
        "sample_count": sum(raw_counts.values()),
        "augmented_sample_count": len(prototypes),
        "user_sample_count": len(user_samples),
        "augmentation": {
            "gaussian_noise_std_xy": 0.012,
            "gaussian_noise_std_z": 0.006,
            "rotation_degrees": [-10, 10],
            "scale": [0.96, 1.04],
            "landmark_dropout": 0.035,
        },
    }

    _, model_path = _paths(base_dir)
    with open(model_path, "w", encoding="utf-8") as f:
        json.dump(model, f, ensure_ascii=False)

    return model


def load_model(base_dir: str, jamo_db: dict[str, Any]) -> dict[str, Any]:
    _, model_path = _paths(base_dir)
    if os.path.exists(model_path):
        with open(model_path, "r", encoding="utf-8") as f:
            model = json.load(f)
        if model.get("version", 0) >= 2 and model.get("prototypes"):
            return model
    return train_model(base_dir, jamo_db)


def _distance(a: list[float], b: list[float]) -> float:
    return math.sqrt(sum((x - y) * (x - y) for x, y in zip(a, b)) / max(1, len(a)))


def predict(base_dir: str, jamo_db: dict[str, Any], pose: list[Any]) -> dict[str, Any]:
    model = load_model(base_dir, jamo_db)
    features = flatten_pose(pose)

    prototype_ranked = []
    for proto in model.get("prototypes", []):
        label = proto.get("label")
        row = proto.get("features")
        if not label or not isinstance(row, list) or len(row) != 63:
            continue
        prototype_ranked.append({
            "label": label,
            "distance": _distance(features, [float(v or 0) for v in row]),
            "count": model.get("counts", {}).get(label, 0),
        })

    prototype_ranked.sort(key=lambda item: item["distance"])

    if prototype_ranked:
        neighbors = prototype_ranked[:9]
        votes: dict[str, float] = {}
        best_distance_by_label: dict[str, float] = {}
        for item in neighbors:
            weight = 1.0 / max(item["distance"], 1e-4)
            votes[item["label"]] = votes.get(item["label"], 0.0) + weight
            best_distance_by_label[item["label"]] = min(
                best_distance_by_label.get(item["label"], item["distance"]),
                item["distance"],
            )

        total_vote = sum(votes.values()) or 1.0
        labels = sorted(votes, key=lambda label: votes[label], reverse=True)
        best_label = labels[0]
        confidence = round(max(0.0, min(100.0, votes[best_label] / total_vote * 100.0)), 2)
        return {
            "label": best_label,
            "confidence": confidence,
            "distance": round(best_distance_by_label[best_label], 4),
            "top": [
                {
                    "label": label,
                    "confidence": round(max(0.0, min(100.0, votes[label] / total_vote * 100.0)), 2),
                    "distance": round(best_distance_by_label[label], 4),
                    "count": model.get("counts", {}).get(label, 0),
                }
                for label in labels[:3]
            ],
            "model": {
                "type": model.get("model_type", "augmented_knn"),
                "trained_at": model.get("trained_at"),
                "sample_count": model.get("sample_count", 0),
                "augmented_sample_count": model.get("augmented_sample_count", 0),
                "user_sample_count": model.get("user_sample_count", 0),
            },
        }

    ranked = []
    for label, centroid in model.get("centroids", {}).items():
        if not isinstance(centroid, list) or len(centroid) != 63:
            continue
        ranked.append({
            "label": label,
            "distance": _distance(features, [float(v or 0) for v in centroid]),
            "count": model.get("counts", {}).get(label, 0),
        })

    ranked.sort(key=lambda item: item["distance"])
    if not ranked:
        raise ValueError("model has no centroids")

    best = ranked[0]
    second = ranked[1]["distance"] if len(ranked) > 1 else best["distance"] + 1.0
    margin = max(0.0, min(1.0, (second - best["distance"]) / max(second, 1e-6)))
    confidence = round(max(0.0, min(100.0, 45.0 + margin * 55.0)), 2)

    return {
        "label": best["label"],
        "confidence": confidence,
        "distance": round(best["distance"], 4),
        "top": [
            {
                "label": item["label"],
                "confidence": round(max(0.0, min(100.0, 100.0 - item["distance"] * 35.0)), 2),
                "distance": round(item["distance"], 4),
                "count": item["count"],
            }
            for item in ranked[:3]
        ],
        "model": {
            "type": model.get("model_type", "centroid"),
            "trained_at": model.get("trained_at"),
            "sample_count": model.get("sample_count", 0),
            "augmented_sample_count": model.get("augmented_sample_count", 0),
            "user_sample_count": model.get("user_sample_count", 0),
        },
    }
