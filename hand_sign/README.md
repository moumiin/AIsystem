# 수화 공부 — AI 수화 교육 서비스

한국수어(KSL)를 배울 수 있는 웹 기반 교육 서비스.
웹캠으로 손 동작을 인식하고, AI Hub 키포인트 데이터로 실제 수어를 3D로 시범 보여줍니다.

---

## 실행 방법

```
startup.bat 더블클릭
→ http://localhost:8000 접속
```

Python 3.11, 의존 패키지는 startup.bat이 자동 설치합니다.

---

## 폴더 구조

```
hand_sign/
├── app.py                      # FastAPI 서버 (진입점)
├── aihub_pipeline.py           # 키포인트 인덱스 조회 로직
├── jamo_db.py                  # 지문자(자음/모음) 포즈 DB
├── aihub_keypoint_index.json   # 핵심 데이터: 1,472개 수어 단어 × 30프레임
├── requirements.txt            # Python 의존 패키지
├── startup.bat                 # 서버 실행 스크립트
├── .env                        # AIHUB_API_KEY 보관용 (git 제외)
│
├── frontend/
│   ├── index.html              # 단일 페이지 앱
│   └── static/
│       ├── css/style.css
│       └── js/
│           ├── signs-data.js       # 수화 단어 목록 + 카테고리 (312개)
│           ├── app.js              # 메인 앱 로직
│           ├── hand-renderer.js    # Three.js 3D 손 렌더러
│           ├── hand-tracker.js     # MediaPipe 웹캠 추적
│           ├── gesture-scorer.js   # 포즈 유사도 점수 계산
│           └── sign-search.js      # 검색 UI 모듈
│
└── scripts/                    # 데이터 빌드 유틸리티 (운영과 무관)
    ├── build_keypoint_index.py     # 키포인트 인덱스 재빌드
    ├── assemble_crowd_kp.py        # AI Hub CROWD ZIP 조립
    ├── download_crowd.py           # AI Hub 데이터 다운로드
    ├── generate_signs_data.py      # signs-data.js 신규 항목 생성 도우미
    ├── analyze_kp_words.py         # 키포인트 단어 카테고리 분석
    ├── check_kp_coverage.py        # signs-data ↔ 키포인트 커버리지 확인
    └── ...
```

---

## 서비스 파이프라인

### 전체 흐름

```
[사용자]
  │
  ├─ 단어 검색 (텍스트 입력)
  │     └─→ POST /api/sign-search
  │               │
  │         ① 지문자 DB 조회 (jamo_db.py)        ← ㄱ, ㄴ, ㅏ, ㅣ 등 자음/모음
  │         ② 키포인트 인덱스 조회               ← 1,472개 실제 수어 단어
  │         ③ 숫자 → 한국어 변환 (1→일, 2→이…)
  │         ④ 지문자 분해 fallback               ← 나머지 모든 한국어 단어
  │               │
  │         JSON 응답: { landmarks, sequence, source }
  │               │
  │         Three.js 3D 시범 재생 (5초 루프)
  │
  └─ 카테고리 카드 클릭
        └─→ signs-data.js에서 aihubWord 조회
              └─→ 위와 동일한 검색 API 호출
```

### 웹캠 채점 흐름

```
웹캠 영상
  └─→ MediaPipe Hands (21개 랜드마크 추출)
        └─→ gesture-scorer.js
              └─→ 정규화 (손목 기준 상대좌표, 크기 스케일)
                    └─→ 현재 포즈 ↔ 목표 포즈 코사인 유사도
                          └─→ 0~100점 실시간 표시
```

---

## 주요 파일 상세

### `aihub_keypoint_index.json`
- **AI Hub CROWD + SYS_WORD 데이터셋**에서 추출한 키포인트 인덱스
- 구조: `{ "단어": [ [frame0: [[x,y,z]×21]], [frame1], ... ] }`
- **1,472개 단어**, 단어당 평균 30프레임, 총 17MB
- `scripts/build_keypoint_index.py`로 재빌드 가능

### `jamo_db.py`
- ㄱ~ㅎ 자음 19개, ㅏ~ㅣ 모음 21개의 정적 포즈 수동 정의
- 키포인트 인덱스에 없는 단어는 자모 분해 후 이 DB로 지문자 표현

### `signs-data.js`
- 화면에 표시되는 **312개 수화 카드** 정의
- 카테고리: 숫자, 인사, 감정(43개), 가족(29개), 음식, 신체, 건강, 시간, 장소, 교통, 직업, 학교, 날씨, 색깔, 스포츠, 기초표현, 일상, 성격, 사회, 인생, 자음/모음
- `aihubWord` 필드가 있는 항목은 선택 시 자동으로 키포인트 API 호출

### `hand-renderer.js`
- Three.js로 21개 랜드마크를 3D 뼈대로 렌더링
- `setPose([[x,y,z]×21])` 호출로 포즈 업데이트
- 시퀀스 애니메이션: 30프레임을 5초에 루프 재생 (`setInterval`)

### `gesture-scorer.js`
- 웹캠 랜드마크와 목표 포즈 간 유사도 계산
- 정규화 방식: 손목(0번)을 원점으로, 중지 MCP(9번)까지 거리로 스케일
- 셀피 보정: 오른손 x축 반전 (거울상 교정)

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 백엔드 | Python 3.11, FastAPI, Uvicorn |
| 프론트엔드 | Vanilla JS, Three.js 0.134, MediaPipe Hands |
| 데이터 | AI Hub 한국수어 CROWD/SYS_WORD 키포인트 데이터셋 |
| 3D 렌더링 | Three.js (WebGL) |
| 손 추적 | MediaPipe Hands (21 landmarks) |

---

## 데이터 커버리지 현황

| 항목 | 수량 |
|------|------|
| 키포인트 인덱스 단어 수 | 1,472개 |
| signs-data.js 카드 수 | 312개 |
| 카드 중 키포인트 데이터 있음 | 169개 |
| 카드 중 지문자 fallback | 143개 |

> 인사말(안녕하세요, 감사합니다 등)은 현재 키포인트 데이터 미포함 → 지문자로 표현됨.
> AI Hub REAL_WORD 데이터셋 추가 시 해결 가능.

---

## 데이터 재빌드 방법 (필요 시)

```bash
# 1. AI Hub에서 데이터 다운로드
python scripts/download_crowd.py --apikey YOUR_API_KEY

# 2. 키포인트 인덱스 재빌드
python scripts/build_keypoint_index.py

# 3. 커버리지 확인
python scripts/check_kp_coverage.py
```

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/` | 메인 페이지 |
| POST | `/api/sign-search` | 단어 검색 → 포즈/시퀀스 반환 |
| GET | `/api/jamos` | 전체 지문자 목록 반환 |
