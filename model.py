import os
import json
import numpy as np
import torch
import torch.nn as nn

from torch.utils.data import Dataset, DataLoader, random_split

####################################################
# 1. keypoint 추출
####################################################
def clean_keypoints(arr, dim):
    arr = np.array(arr)

    if len(arr) == 0:
        return np.zeros((25 * (dim - 1)))

    arr = arr.reshape(-1, dim)

    # confidence 제거
    return arr[:, :dim-1].flatten()

####################################################
# 2. keypoint 추출
####################################################
def extract_keypoints(json_data):

    if "people" not in json_data:
        return np.zeros(335)

    people = json_data["people"]

    if isinstance(people, list):

        if len(people) == 0:
            return np.zeros(335)

        p = people[0]

    elif isinstance(people, dict):
        p = people

    else:
        return np.zeros(335)

    def safe_get(key, dim):

        if key not in p:
            return np.zeros(25 * (dim - 1))

        return clean_keypoints(p[key], dim)

    # 2D
    pose2d = safe_get("pose_keypoints_2d", 3)
    left2d = safe_get("hand_left_keypoints_2d", 3)
    right2d = safe_get("hand_right_keypoints_2d", 3)

    # 3D
    pose3d = safe_get("pose_keypoints_3d", 4)
    left3d = safe_get("hand_left_keypoints_3d", 4)
    right3d = safe_get("hand_right_keypoints_3d", 4)

    feat = np.concatenate([
        pose2d,
        left2d,
        right2d,
        pose3d,
        left3d,
        right3d
    ])

    # 🔥 335 맞추기
    if len(feat) > 335:
        feat = feat[:335]

    elif len(feat) < 335:
        feat = np.pad(feat, (0, 335 - len(feat)))

    return feat

####################################################
# 3. sequence 길이 맞추기
####################################################
def resample(seq, target_len=100):

    if len(seq) == 0:
        return np.zeros((target_len, 335))

    idx = np.linspace(
        0,
        len(seq)-1,
        target_len
    ).astype(int)

    return seq[idx]

####################################################
# 4. normalize
####################################################
def normalize(seq):

    seq = seq.copy()

    mean = np.mean(seq)
    std = np.std(seq)

    seq = (seq - mean) / (std + 1e-6)

    return seq

####################################################
# 5. smoothing
####################################################
def smoothing(seq):

    for i in range(1, len(seq)):
        seq[i] = 0.7 * seq[i] + 0.3 * seq[i - 1]

    return seq

####################################################
# 6. velocity 추가
####################################################
def add_velocity(seq):

    v = np.diff(seq, axis=0)

    v = np.vstack([v, v[-1]])

    seq = np.concatenate([seq, v], axis=1)

    return seq

####################################################
# 7. Dataset
####################################################
class SignDataset(Dataset):

    def __init__(self, data_dir):

        self.x = []
        self.y = []

        folders = sorted(os.listdir(data_dir))

        print("===== 데이터 로딩 시작 =====")

        label = 0
        count = 0

        for folder in folders:

            folder_path = os.path.join(data_dir, folder)

            if not os.path.isdir(folder_path):
                continue

            json_files = sorted([
                f for f in os.listdir(folder_path)
                if f.endswith(".json")
            ])

            if len(json_files) == 0:
                print(f"❌ skip: {folder}")
                continue

            sequence = []

            for jf in json_files:

                try:

                    path = os.path.join(folder_path, jf)

                    with open(path, "r") as f:
                        data = json.load(f)

                    kp = extract_keypoints(data)

                    sequence.append(kp)

                except Exception as e:
                    print("에러:", e)

            sequence = np.array(sequence)

            # 전처리
            sequence = resample(sequence)
            sequence = normalize(sequence)
            sequence = smoothing(sequence)

            # 🔥 velocity 추가
            sequence = add_velocity(sequence)

            self.x.append(sequence)
            self.y.append(label)

            count += 1

            # 🔥 5개마다 label 증가
            if count == 5:
                label += 1
                count = 0

        self.x = torch.tensor(
            np.array(self.x),
            dtype=torch.float32
        )

        self.y = torch.tensor(
            np.array(self.y),
            dtype=torch.long
        )

        print("===== 완료 =====")
        print("데이터 수:", len(self.x))
        print("클래스 수:", len(set(self.y.numpy())))

    def __len__(self):
        return len(self.x)

    def __getitem__(self, idx):
        return self.x[idx], self.y[idx]

####################################################
# 8. Transformer 모델
####################################################
class SignTransformer(nn.Module):

    def __init__(
        self,
        input_size=670,
        d_model=256,
        num_heads=8,
        num_layers=4,
        num_classes=500
    ):
        super().__init__()

        self.input_proj = nn.Linear(input_size, d_model)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=num_heads,
            batch_first=True,
            dropout=0.3
        )

        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=num_layers
        )

        self.classifier = nn.Sequential(

            nn.Linear(d_model, 256),
            nn.ReLU(),

            nn.Dropout(0.3),

            nn.Linear(256, num_classes)
        )

    def forward(self, x):

        x = self.input_proj(x)

        x = self.transformer(x)

        x = x.mean(dim=1)

        x = self.classifier(x)

        return x

####################################################
# 9. accuracy 계산
####################################################
def evaluate(model, loader, device):

    model.eval()

    correct = 0
    total = 0

    with torch.no_grad():

        for x, y in loader:

            x = x.to(device)
            y = y.to(device)

            out = model(x)

            pred = out.argmax(dim=1)

            correct += (pred == y).sum().item()

            total += y.size(0)

    acc = correct / total

    return acc

####################################################
# 10. train
####################################################
def train():

    dataset = SignDataset("data")

    # train / val 분리
    train_size = int(len(dataset) * 0.8)
    val_size = len(dataset) - train_size

    train_dataset, val_dataset = random_split(
        dataset,
        [train_size, val_size]
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=8,
        shuffle=True
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=8
    )

    device = torch.device(
        "cuda" if torch.cuda.is_available()
        else "cpu"
    )

    num_classes = len(set(dataset.y.numpy()))

    model = SignTransformer(
        input_size=670,
        num_classes=num_classes
    ).to(device)

    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=1e-4
    )

    criterion = nn.CrossEntropyLoss()

    best_acc = 0

    for epoch in range(100):

        model.train()

        total_loss = 0

        for x, y in train_loader:

            x = x.to(device)
            y = y.to(device)

            out = model(x)

            loss = criterion(out, y)

            optimizer.zero_grad()

            loss.backward()

            torch.nn.utils.clip_grad_norm_(
                model.parameters(),
                1.0
            )

            optimizer.step()

            total_loss += loss.item()

        avg_loss = total_loss / len(train_loader)

        train_acc = evaluate(
            model,
            train_loader,
            device
        )

        val_acc = evaluate(
            model,
            val_loader,
            device
        )

        print(
            f"Epoch {epoch+1} | "
            f"Loss: {avg_loss:.4f} | "
            f"Train Acc: {train_acc:.4f} | "
            f"Val Acc: {val_acc:.4f}"
        )

        # best 저장
        if val_acc > best_acc:

            best_acc = val_acc

            torch.save(
                model.state_dict(),
                "best_model.pth"
            )

            print("🔥 best model 저장")

####################################################
# 실행
####################################################
if __name__ == "__main__":
    train()