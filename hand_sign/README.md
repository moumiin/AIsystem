# 수어 학습 AI

웹캠으로 사용자의 손동작을 추적하고, 기준 수어 시범을 보면서 따라 할 수 있는 수어 학습 웹앱입니다.

## 실행

```bash
python app.py
```

브라우저에서 접속:

```text
http://localhost:8001
```

## 현재 데이터 기준

- `지문자`: `jamo_db.py`에 정의된 자음/모음 포즈 사용
- 초보자 단어: `local_learning_keypoint_index.json` 사용
  - 원본: `../code/data.zip`
  - 생성 스크립트: `scripts/build_local_learning_index.py`
  - 형식: `pose50 + left50 + right50`
  - 시범 화면에서 얼굴, 팔, 양손을 OpenPose 스타일로 그림
- 기존 보조 데이터: `aihub_keypoint_index.json`

검색 우선순위:

1. 지문자 DB
2. 로컬 학습 데이터
3. 기존 AI Hub 키포인트 데이터
4. 지문자 분해 fallback

## 주요 파일

```text
hand_sign/
├── app.py
├── aihub_pipeline.py
├── jamo_db.py
├── local_learning_keypoint_index.json
├── local_learning_manifest.json
├── aihub_keypoint_index.json
├── requirements.txt
├── frontend/
│   ├── index.html
│   ├── react/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   ├── index.html
│   │   └── package.json
│   └── static/
│       ├── css/style.css
│       └── js/
│           ├── app.js
│           ├── sign-search.js
│           ├── hand-tracker.js
│           ├── gesture-scorer.js
│           ├── signs-data.js
│           └── admin-mode.js
└── scripts/
    ├── build_local_learning_index.py
    └── normalize_aihub_index.py   # AI Hub 21포인트 좌표 정규화
```

## 데이터 형식 (앱 자동 분기)

| 종류 | source | data_format | 시범 | 채점 |
|------|--------|-------------|------|------|
| 지문자 | `verified` | `jamo` | 손 모양 | 엄격 |
| 초보자 454단어 | `local` | `openpose150` | 전신 스켈레톤 | 양손 OpenPose |
| AI Hub | `aihub` | `hand21` | 손 모양 | 21포인트 정규화 |

AI Hub 인덱스 재정규화:

```bash
python scripts/normalize_aihub_index.py
```

## API

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/` | 메인 페이지 |
| `POST` | `/api/sign-search` | 단어 검색 후 시범 포즈/시퀀스 반환 |
| `GET` | `/api/jamos` | 지문자 전체 목록 반환 |

## 시범 화면

시범 캔버스는 `frontend/static/js/app.js`의 `drawOpenPoseFrame()`에서 그립니다.

- `pose50 + left50 + right50` 형식이면 얼굴, 팔, 양손을 그림
- 정규화된 21/42포인트 형식이면 손 중심으로 크게 그림
- 프레임 시퀀스는 반복 재생되어 영상처럼 보입니다

## React 변환본

첨부된 HTML/CSS를 React 구조로 옮긴 파일은 `frontend/react/`에 있습니다.

```bash
cd frontend/react
npm install
npm run dev
```

React 변환본은 참고/이식용이며, 현재 FastAPI 앱의 기본 실행 화면은 `frontend/index.html`입니다.
