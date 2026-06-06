/**
 * 수어 기준 단어 데이터
 *
 * 카테고리: 지문자, 지숫자, 수어 초보자 단어 파일 기준 15개 분류
 * 원본: 수어_초보자_단어500.txt (454개 단어)
 */

const FINGER_INDICES = {
  thumb:  [1, 2, 3, 4],
  index:  [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring:   [13, 14, 15, 16],
  pinky:  [17, 18, 19, 20],
};

const CATEGORY_META = {
  "jamo": {
    "label": "지문자",
    "emoji": "🤟"
  },
  "numbers": {
    "label": "지숫자",
    "emoji": "🔢"
  },
  "cat01": {
    "label": "인사",
    "emoji": "👋"
  },
  "cat09": {
    "label": "학교",
    "emoji": "📚"
  },
  "cat11": {
    "label": "교통",
    "emoji": "🚌"
  }
};

const SIGNS = [
  {
    "id": "num1",
    "category": "numbers",
    "name": "1",
    "emoji": "1️⃣",
    "aihubWord": "1",
    "hands": 1
  },
  {
    "id": "num2",
    "category": "numbers",
    "name": "2",
    "emoji": "2️⃣",
    "aihubWord": "2",
    "hands": 1
  },
  {
    "id": "num3",
    "category": "numbers",
    "name": "3",
    "emoji": "3️⃣",
    "aihubWord": "3",
    "hands": 1
  },
  {
    "id": "num4",
    "category": "numbers",
    "name": "4",
    "emoji": "4️⃣",
    "aihubWord": "4",
    "hands": 1
  },
  {
    "id": "num5",
    "category": "numbers",
    "name": "5",
    "emoji": "5️⃣",
    "aihubWord": "5",
    "hands": 1
  },
  {
    "id": "num6",
    "category": "numbers",
    "name": "6",
    "emoji": "6️⃣",
    "aihubWord": "6",
    "hands": 1
  },
  {
    "id": "num7",
    "category": "numbers",
    "name": "7",
    "emoji": "7️⃣",
    "aihubWord": "7",
    "hands": 1
  },
  {
    "id": "num8",
    "category": "numbers",
    "name": "8",
    "emoji": "8️⃣",
    "aihubWord": "8",
    "hands": 1
  },
  {
    "id": "num9",
    "category": "numbers",
    "name": "9",
    "emoji": "9️⃣",
    "aihubWord": "9",
    "hands": 1
  },
  {
    "id": "num10",
    "category": "numbers",
    "name": "10",
    "emoji": "🔟",
    "aihubWord": "10",
    "hands": 1
  },
  {
    "id": "greeting_001",
    "category": "cat01",
    "name": "안녕하세요",
    "emoji": "👋",
    "aihubWord": "안녕하세요",
    "hint": "손을 들어 인사하는 동작을 해보세요",
    "hands": 1
  },
  {
    "id": "greeting_002",
    "category": "cat01",
    "name": "감사합니다",
    "emoji": "🙏",
    "aihubWord": "감사합니다",
    "hint": "두 손을 모아 고마움을 표현해보세요",
    "hands": 2
  },
  {
    "id": "greeting_003",
    "category": "cat01",
    "name": "고맙습니다",
    "emoji": "🙏",
    "aihubWord": "고맙습니다",
    "hint": "두 손을 모아 고마움을 표현해보세요",
    "hands": 2
  },
  {
    "id": "greeting_004",
    "category": "cat01",
    "name": "반갑습니다",
    "emoji": "😊",
    "aihubWord": "반갑습니다",
    "hint": "만나서 반가운 표정과 함께 동작을 따라해보세요",
    "hands": 1
  },
  {
    "id": "greeting_005",
    "category": "cat01",
    "name": "죄송합니다",
    "emoji": "😔",
    "aihubWord": "죄송합니다",
    "hint": "고개를 숙이며 사과하는 동작을 해보세요",
    "hands": 2
  },
  {
    "id": "greeting_006",
    "category": "cat01",
    "name": "괜찮습니다",
    "emoji": "👌",
    "aihubWord": "괜찮다",
    "hint": "손을 가볍게 흔들며 괜찮다는 동작을 해보세요",
    "hands": 1
  },
  {
    "id": "greeting_007",
    "category": "cat01",
    "name": "안녕히 가세요",
    "emoji": "👋",
    "aihubWord": "안녕히가세요",
    "hint": "손을 흔들며 작별 인사를 해보세요",
    "hands": 1
  },
  {
    "id": "greeting_008",
    "category": "cat01",
    "name": "처음 뵙겠습니다",
    "emoji": "🤝",
    "aihubWord": "처음뵙겠습니다",
    "hint": "두 손을 모아 첫 인사를 해보세요",
    "hands": 2
  },
  {
    "id": "cat01_001",
    "category": "cat01",
    "name": "수어",
    "emoji": "💬",
    "aihubWord": "수어",
    "videoFile": "NIA_SL_WORD0003_REAL01_D.mp4"
  },
  {
    "id": "cat01_002",
    "category": "cat01",
    "name": "어떻게",
    "emoji": "💬",
    "aihubWord": "어떻게",
    "videoFile": "NIA_SL_WORD0331_REAL01_D.mp4"
  },
  {
    "id": "cat01_003",
    "category": "cat01",
    "name": "부탁",
    "emoji": "💬",
    "aihubWord": "부탁",
    "videoFile": "NIA_SL_WORD1589_REAL01_D.mp4"
  },
  {
    "id": "cat01_004",
    "category": "cat01",
    "name": "얼마",
    "emoji": "💬",
    "aihubWord": "얼마",
    "videoFile": "NIA_SL_WORD0436_REAL01_D.mp4"
  },
  {
    "id": "cat01_005",
    "category": "cat01",
    "name": "이해",
    "emoji": "💬",
    "aihubWord": "이해",
    "videoFile": "NIA_SL_WORD1207_REAL01_D.mp4"
  },
  {
    "id": "cat01_006",
    "category": "cat01",
    "name": "가능",
    "emoji": "💬",
    "aihubWord": "가능",
    "videoFile": "NIA_SL_WORD1282_REAL01_D.mp4"
  },
  {
    "id": "cat01_007",
    "category": "cat01",
    "name": "불가능",
    "emoji": "💬",
    "aihubWord": "불가능",
    "videoFile": "NIA_SL_WORD1097_REAL01_D.mp4"
  },
  {
    "id": "cat01_008",
    "category": "cat01",
    "name": "맞다",
    "emoji": "💬",
    "aihubWord": "맞다",
    "videoFile": "NIA_SL_WORD1174_REAL01_D.mp4"
  },
  {
    "id": "cat01_009",
    "category": "cat01",
    "name": "틀리다",
    "emoji": "💬",
    "aihubWord": "틀리다",
    "videoFile": "NIA_SL_WORD1359_REAL01_D.mp4"
  },
  {
    "id": "cat01_010",
    "category": "cat01",
    "name": "모르다",
    "emoji": "💬",
    "aihubWord": "모르다",
    "videoFile": "NIA_SL_WORD1096_REAL01_D.mp4"
  },
  {
    "id": "cat01_011",
    "category": "cat01",
    "name": "알다",
    "emoji": "💬",
    "aihubWord": "알다",
    "videoFile": "NIA_SL_WORD1185_REAL01_D.mp4"
  },
  {
    "id": "cat01_012",
    "category": "cat01",
    "name": "괜찮다",
    "emoji": "💬",
    "aihubWord": "괜찮다",
    "videoFile": "NIA_SL_WORD1381_REAL01_D.mp4"
  },
  {
    "id": "cat01_013",
    "category": "cat01",
    "name": "감사",
    "emoji": "💬",
    "aihubWord": "감사",
    "videoFile": "NIA_SL_WORD1290_REAL01_D.mp4"
  },
  {
    "id": "cat01_014",
    "category": "cat01",
    "name": "미소",
    "emoji": "💬",
    "aihubWord": "미소",
    "videoFile": "NIA_SL_WORD1399_REAL01_D.mp4"
  },
  {
    "id": "cat01_015",
    "category": "cat01",
    "name": "좋다",
    "emoji": "💬",
    "aihubWord": "좋다",
    "videoFile": "NIA_SL_WORD0738_REAL01_D.mp4"
  },
  {
    "id": "cat01_016",
    "category": "cat01",
    "name": "없다",
    "emoji": "💬",
    "aihubWord": "없다",
    "videoFile": "NIA_SL_WORD1384_REAL01_D.mp4"
  },
  {
    "id": "cat01_017",
    "category": "cat01",
    "name": "오다",
    "emoji": "💬",
    "aihubWord": "오다",
    "videoFile": "NIA_SL_WORD1149_REAL01_D.mp4"
  },
  {
    "id": "cat01_018",
    "category": "cat01",
    "name": "가다",
    "emoji": "💬",
    "aihubWord": "가다",
    "videoFile": "NIA_SL_WORD0943_REAL01_D.mp4"
  },
  {
    "id": "cat01_019",
    "category": "cat01",
    "name": "주다",
    "emoji": "💬",
    "aihubWord": "주다",
    "videoFile": "NIA_SL_WORD2394_REAL01_D.mp4"
  },
  {
    "id": "cat01_020",
    "category": "cat01",
    "name": "받다",
    "emoji": "💬",
    "aihubWord": "받다",
    "videoFile": "NIA_SL_WORD2187_REAL01_D.mp4"
  },
  {
    "id": "cat01_021",
    "category": "cat01",
    "name": "보이다",
    "emoji": "💬",
    "aihubWord": "보이다",
    "videoFile": "NIA_SL_WORD2601_REAL01_D.mp4"
  },
  {
    "id": "cat01_022",
    "category": "cat01",
    "name": "알려주다",
    "emoji": "💬",
    "aihubWord": "알려주다",
    "videoFile": "NIA_SL_WORD2198_REAL01_D.mp4"
  },
  {
    "id": "cat01_023",
    "category": "cat01",
    "name": "인사법",
    "emoji": "💬",
    "aihubWord": "인사법",
    "videoFile": "NIA_SL_WORD0775_REAL01_D.mp4"
  },
  {
    "id": "cat01_024",
    "category": "cat01",
    "name": "소개",
    "emoji": "💬",
    "aihubWord": "소개",
    "videoFile": "NIA_SL_WORD0566_REAL01_D.mp4"
  },
  {
    "id": "cat01_025",
    "category": "cat01",
    "name": "상담",
    "emoji": "💬",
    "aihubWord": "상담",
    "videoFile": "NIA_SL_WORD1597_REAL01_D.mp4"
  },
  {
    "id": "cat02_001",
    "category": "cat02",
    "name": "월요일",
    "emoji": "🗓️",
    "aihubWord": "월요일",
    "videoFile": "NIA_SL_WORD0336_REAL01_D.mp4"
  },
  {
    "id": "cat02_002",
    "category": "cat02",
    "name": "화요일",
    "emoji": "🗓️",
    "aihubWord": "화요일",
    "videoFile": "NIA_SL_WORD0347_REAL01_D.mp4"
  },
  {
    "id": "cat02_003",
    "category": "cat02",
    "name": "수요일",
    "emoji": "🗓️",
    "aihubWord": "수요일",
    "videoFile": "NIA_SL_WORD0329_REAL01_D.mp4"
  },
  {
    "id": "cat02_004",
    "category": "cat02",
    "name": "금요일",
    "emoji": "🗓️",
    "aihubWord": "금요일",
    "videoFile": "NIA_SL_WORD0316_REAL01_D.mp4"
  },
  {
    "id": "cat02_005",
    "category": "cat02",
    "name": "일요일",
    "emoji": "🗓️",
    "aihubWord": "일요일",
    "videoFile": "NIA_SL_WORD0257_REAL01_D.mp4"
  },
  {
    "id": "cat02_006",
    "category": "cat02",
    "name": "자정",
    "emoji": "🗓️",
    "aihubWord": "자정",
    "videoFile": "NIA_SL_WORD0338_REAL01_D.mp4"
  },
  {
    "id": "cat02_007",
    "category": "cat02",
    "name": "방금",
    "emoji": "🗓️",
    "aihubWord": "방금",
    "videoFile": "NIA_SL_WORD0320_REAL01_D.mp4"
  },
  {
    "id": "cat02_008",
    "category": "cat02",
    "name": "아까",
    "emoji": "🗓️",
    "aihubWord": "아까",
    "videoFile": "NIA_SL_WORD0339_REAL01_D.mp4"
  },
  {
    "id": "cat02_009",
    "category": "cat02",
    "name": "예전",
    "emoji": "🗓️",
    "aihubWord": "예전",
    "videoFile": "NIA_SL_WORD0334_REAL01_D.mp4"
  },
  {
    "id": "cat02_010",
    "category": "cat02",
    "name": "연말",
    "emoji": "🗓️",
    "aihubWord": "연말",
    "videoFile": "NIA_SL_WORD0333_REAL01_D.mp4"
  },
  {
    "id": "cat02_011",
    "category": "cat02",
    "name": "공휴일",
    "emoji": "🗓️",
    "aihubWord": "공휴일",
    "videoFile": "NIA_SL_WORD0312_REAL01_D.mp4"
  },
  {
    "id": "cat02_012",
    "category": "cat02",
    "name": "평일",
    "emoji": "🗓️",
    "aihubWord": "평일",
    "videoFile": "NIA_SL_WORD0344_REAL01_D.mp4"
  },
  {
    "id": "cat02_013",
    "category": "cat02",
    "name": "생년월일",
    "emoji": "🗓️",
    "aihubWord": "생년월일",
    "videoFile": "NIA_SL_WORD0328_REAL01_D.mp4"
  },
  {
    "id": "cat02_014",
    "category": "cat02",
    "name": "어린이날",
    "emoji": "🗓️",
    "aihubWord": "어린이날",
    "videoFile": "NIA_SL_WORD0332_REAL01_D.mp4"
  },
  {
    "id": "cat02_015",
    "category": "cat02",
    "name": "한글날",
    "emoji": "🗓️",
    "aihubWord": "한글날",
    "videoFile": "NIA_SL_WORD0345_REAL01_D.mp4"
  },
  {
    "id": "cat02_016",
    "category": "cat02",
    "name": "현충일",
    "emoji": "🗓️",
    "aihubWord": "현충일",
    "videoFile": "NIA_SL_WORD0346_REAL01_D.mp4"
  },
  {
    "id": "cat02_017",
    "category": "cat02",
    "name": "3.1절",
    "emoji": "🗓️",
    "aihubWord": "3.1절",
    "videoFile": "NIA_SL_WORD0327_REAL01_D.mp4"
  },
  {
    "id": "cat02_018",
    "category": "cat02",
    "name": "식목일",
    "emoji": "🗓️",
    "aihubWord": "식목일",
    "videoFile": "NIA_SL_WORD0319_REAL01_D.mp4"
  },
  {
    "id": "cat02_019",
    "category": "cat02",
    "name": "사계절",
    "emoji": "🗓️",
    "aihubWord": "사계절",
    "videoFile": "NIA_SL_WORD2572_REAL01_D.mp4"
  },
  {
    "id": "cat02_020",
    "category": "cat02",
    "name": "첫번째",
    "emoji": "🗓️",
    "aihubWord": "첫번째",
    "videoFile": "NIA_SL_WORD0058_REAL01_D.mp4"
  },
  {
    "id": "cat02_021",
    "category": "cat02",
    "name": "두번째",
    "emoji": "🗓️",
    "aihubWord": "두번째",
    "videoFile": "NIA_SL_WORD0179_REAL01_D.mp4"
  },
  {
    "id": "cat02_022",
    "category": "cat02",
    "name": "세번째",
    "emoji": "🗓️",
    "aihubWord": "세번째",
    "videoFile": "NIA_SL_WORD0313_REAL01_D.mp4"
  },
  {
    "id": "cat02_023",
    "category": "cat02",
    "name": "열번째",
    "emoji": "🗓️",
    "aihubWord": "열번째",
    "videoFile": "NIA_SL_WORD0759_REAL01_D.mp4"
  },
  {
    "id": "cat03_001",
    "category": "cat03",
    "name": "엄마",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "엄마",
    "videoFile": "NIA_SL_WORD1528_REAL01_D.mp4"
  },
  {
    "id": "cat03_002",
    "category": "cat03",
    "name": "딸",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "딸",
    "videoFile": "NIA_SL_WORD1522_REAL01_D.mp4"
  },
  {
    "id": "cat03_003",
    "category": "cat03",
    "name": "형",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "형",
    "videoFile": "NIA_SL_WORD1574_REAL01_D.mp4"
  },
  {
    "id": "cat03_004",
    "category": "cat03",
    "name": "누나",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "누나",
    "videoFile": "NIA_SL_WORD1516_REAL01_D.mp4"
  },
  {
    "id": "cat03_005",
    "category": "cat03",
    "name": "오빠",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "오빠",
    "videoFile": "NIA_SL_WORD1556_REAL01_D.mp4"
  },
  {
    "id": "cat03_006",
    "category": "cat03",
    "name": "여동생",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "여동생",
    "videoFile": "NIA_SL_WORD1518_REAL01_D.mp4"
  },
  {
    "id": "cat03_007",
    "category": "cat03",
    "name": "남매",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "남매",
    "videoFile": "NIA_SL_WORD1512_REAL01_D.mp4"
  },
  {
    "id": "cat03_008",
    "category": "cat03",
    "name": "할머니",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "할머니",
    "videoFile": "NIA_SL_WORD1565_REAL01_D.mp4"
  },
  {
    "id": "cat03_009",
    "category": "cat03",
    "name": "할아버지",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "할아버지",
    "videoFile": "NIA_SL_WORD1566_REAL01_D.mp4"
  },
  {
    "id": "cat03_010",
    "category": "cat03",
    "name": "손자",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "손자",
    "videoFile": "NIA_SL_WORD0051_REAL01_D.mp4"
  },
  {
    "id": "cat03_011",
    "category": "cat03",
    "name": "손녀",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "손녀",
    "videoFile": "NIA_SL_WORD0050_REAL01_D.mp4"
  },
  {
    "id": "cat03_012",
    "category": "cat03",
    "name": "남편",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "남편",
    "videoFile": "NIA_SL_WORD1531_REAL01_D.mp4"
  },
  {
    "id": "cat03_013",
    "category": "cat03",
    "name": "아내",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "아내",
    "videoFile": "NIA_SL_WORD1524_REAL01_D.mp4"
  },
  {
    "id": "cat03_014",
    "category": "cat03",
    "name": "부부",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "부부",
    "videoFile": "NIA_SL_WORD1535_REAL01_D.mp4"
  },
  {
    "id": "cat03_015",
    "category": "cat03",
    "name": "가족",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "가족",
    "videoFile": "NIA_SL_WORD1492_REAL01_D.mp4"
  },
  {
    "id": "cat03_016",
    "category": "cat03",
    "name": "아기",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "아기",
    "videoFile": "NIA_SL_WORD1189_REAL01_D.mp4"
  },
  {
    "id": "cat03_017",
    "category": "cat03",
    "name": "어른",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "어른",
    "videoFile": "NIA_SL_WORD2016_REAL01_D.mp4"
  },
  {
    "id": "cat03_018",
    "category": "cat03",
    "name": "노인",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "노인",
    "videoFile": "NIA_SL_WORD2032_REAL01_D.mp4"
  },
  {
    "id": "cat03_019",
    "category": "cat03",
    "name": "청년",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "청년",
    "videoFile": "NIA_SL_WORD2023_REAL01_D.mp4"
  },
  {
    "id": "cat03_020",
    "category": "cat03",
    "name": "청소년",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "청소년",
    "videoFile": "NIA_SL_WORD2024_REAL01_D.mp4"
  },
  {
    "id": "cat03_021",
    "category": "cat03",
    "name": "한국인",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "한국인",
    "videoFile": "NIA_SL_WORD2013_REAL01_D.mp4"
  },
  {
    "id": "cat03_022",
    "category": "cat03",
    "name": "외국인",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "외국인",
    "videoFile": "NIA_SL_WORD0014_REAL01_D.mp4"
  },
  {
    "id": "cat03_023",
    "category": "cat03",
    "name": "친구",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "친구",
    "videoFile": "NIA_SL_WORD1204_REAL01_D.mp4"
  },
  {
    "id": "cat03_024",
    "category": "cat03",
    "name": "고모",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "고모",
    "videoFile": "NIA_SL_WORD1500_REAL01_D.mp4"
  },
  {
    "id": "cat03_025",
    "category": "cat03",
    "name": "이모",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "이모",
    "videoFile": "NIA_SL_WORD1499_REAL01_D.mp4"
  },
  {
    "id": "cat03_026",
    "category": "cat03",
    "name": "조카",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "조카",
    "videoFile": "NIA_SL_WORD1568_REAL01_D.mp4"
  },
  {
    "id": "cat03_027",
    "category": "cat03",
    "name": "맏형",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "맏형",
    "videoFile": "NIA_SL_WORD1563_REAL01_D.mp4"
  },
  {
    "id": "cat03_028",
    "category": "cat03",
    "name": "큰언니",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "큰언니",
    "videoFile": "NIA_SL_WORD2167_REAL01_D.mp4"
  },
  {
    "id": "cat03_029",
    "category": "cat03",
    "name": "시어머니",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "시어머니",
    "videoFile": "NIA_SL_WORD2141_REAL01_D.mp4"
  },
  {
    "id": "cat03_030",
    "category": "cat03",
    "name": "시아버지",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "시아버지",
    "videoFile": "NIA_SL_WORD1547_REAL01_D.mp4"
  },
  {
    "id": "cat03_031",
    "category": "cat03",
    "name": "장모",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "장모",
    "videoFile": "NIA_SL_WORD2160_REAL01_D.mp4"
  },
  {
    "id": "cat03_032",
    "category": "cat03",
    "name": "장인어른",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "장인어른",
    "videoFile": "NIA_SL_WORD2161_REAL01_D.mp4"
  },
  {
    "id": "cat03_033",
    "category": "cat03",
    "name": "외할머니",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "외할머니",
    "videoFile": "NIA_SL_WORD2151_REAL01_D.mp4"
  },
  {
    "id": "cat03_034",
    "category": "cat03",
    "name": "외할아버지",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "외할아버지",
    "videoFile": "NIA_SL_WORD2152_REAL01_D.mp4"
  },
  {
    "id": "cat03_035",
    "category": "cat03",
    "name": "큰아버지",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "큰아버지",
    "videoFile": "NIA_SL_WORD2165_REAL01_D.mp4"
  },
  {
    "id": "cat03_036",
    "category": "cat03",
    "name": "큰어머니",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "큰어머니",
    "videoFile": "NIA_SL_WORD2166_REAL01_D.mp4"
  },
  {
    "id": "cat03_037",
    "category": "cat03",
    "name": "며느리",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "며느리",
    "videoFile": "NIA_SL_WORD2006_REAL01_D.mp4"
  },
  {
    "id": "cat03_038",
    "category": "cat03",
    "name": "사위",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "사위",
    "videoFile": "NIA_SL_WORD0045_REAL01_D.mp4"
  },
  {
    "id": "cat03_039",
    "category": "cat03",
    "name": "형수",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "형수",
    "videoFile": "NIA_SL_WORD2170_REAL01_D.mp4"
  },
  {
    "id": "cat03_040",
    "category": "cat03",
    "name": "처남",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "처남",
    "videoFile": "NIA_SL_WORD2162_REAL01_D.mp4"
  },
  {
    "id": "cat03_041",
    "category": "cat03",
    "name": "처형",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "처형",
    "videoFile": "NIA_SL_WORD2163_REAL01_D.mp4"
  },
  {
    "id": "cat03_042",
    "category": "cat03",
    "name": "제부",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "제부",
    "videoFile": "NIA_SL_WORD2127_REAL01_D.mp4"
  },
  {
    "id": "cat03_043",
    "category": "cat03",
    "name": "매형",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "매형",
    "videoFile": "NIA_SL_WORD2126_REAL01_D.mp4"
  },
  {
    "id": "cat03_044",
    "category": "cat03",
    "name": "남자",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "남자",
    "videoFile": "NIA_SL_WORD1104_REAL01_D.mp4"
  },
  {
    "id": "cat03_045",
    "category": "cat03",
    "name": "여자",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "여자",
    "videoFile": "NIA_SL_WORD1275_REAL01_D.mp4"
  },
  {
    "id": "cat03_046",
    "category": "cat03",
    "name": "사람",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "사람",
    "videoFile": "NIA_SL_WORD1242_REAL01_D.mp4"
  },
  {
    "id": "cat03_047",
    "category": "cat03",
    "name": "총각",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "총각",
    "videoFile": "NIA_SL_WORD1280_REAL01_D.mp4"
  },
  {
    "id": "cat03_048",
    "category": "cat03",
    "name": "처녀",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "처녀",
    "videoFile": "NIA_SL_WORD1132_REAL01_D.mp4"
  },
  {
    "id": "cat03_049",
    "category": "cat03",
    "name": "신부",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "신부",
    "videoFile": "NIA_SL_WORD2143_REAL01_D.mp4"
  },
  {
    "id": "cat03_050",
    "category": "cat03",
    "name": "신혼",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "신혼",
    "videoFile": "NIA_SL_WORD2144_REAL01_D.mp4"
  },
  {
    "id": "cat03_051",
    "category": "cat03",
    "name": "고조할아버지",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "고조할아버지",
    "videoFile": "NIA_SL_WORD2120_REAL01_D.mp4"
  },
  {
    "id": "cat03_052",
    "category": "cat03",
    "name": "작은아빠",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "작은아빠",
    "videoFile": "NIA_SL_WORD2138_REAL01_D.mp4"
  },
  {
    "id": "cat03_053",
    "category": "cat03",
    "name": "작은엄마",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "작은엄마",
    "videoFile": "NIA_SL_WORD2137_REAL01_D.mp4"
  },
  {
    "id": "cat03_054",
    "category": "cat03",
    "name": "친척",
    "emoji": "👨‍👩‍👧",
    "aihubWord": "친척",
    "videoFile": "NIA_SL_WORD0608_REAL01_D.mp4"
  },
  {
    "id": "cat04_001",
    "category": "cat04",
    "name": "눈",
    "emoji": "🏥",
    "aihubWord": "눈",
    "videoFile": "NIA_SL_WORD0005_REAL01_D.mp4"
  },
  {
    "id": "cat04_002",
    "category": "cat04",
    "name": "코",
    "emoji": "🏥",
    "aihubWord": "코",
    "videoFile": "NIA_SL_WORD1235_REAL01_D.mp4"
  },
  {
    "id": "cat04_003",
    "category": "cat04",
    "name": "입",
    "emoji": "🏥",
    "aihubWord": "입",
    "videoFile": "NIA_SL_WORD1279_REAL01_D.mp4"
  },
  {
    "id": "cat04_004",
    "category": "cat04",
    "name": "귀",
    "emoji": "🏥",
    "aihubWord": "귀",
    "videoFile": "NIA_SL_WORD1370_REAL01_D.mp4"
  },
  {
    "id": "cat04_005",
    "category": "cat04",
    "name": "손",
    "emoji": "🏥",
    "aihubWord": "손",
    "videoFile": "NIA_SL_WORD1226_REAL01_D.mp4"
  },
  {
    "id": "cat04_006",
    "category": "cat04",
    "name": "머리",
    "emoji": "🏥",
    "aihubWord": "머리",
    "videoFile": "NIA_SL_WORD1249_REAL01_D.mp4"
  },
  {
    "id": "cat04_007",
    "category": "cat04",
    "name": "얼굴",
    "emoji": "🏥",
    "aihubWord": "얼굴",
    "videoFile": "NIA_SL_WORD1210_REAL01_D.mp4"
  },
  {
    "id": "cat04_008",
    "category": "cat04",
    "name": "몸",
    "emoji": "🏥",
    "aihubWord": "몸",
    "videoFile": "NIA_SL_WORD1253_REAL01_D.mp4"
  },
  {
    "id": "cat04_009",
    "category": "cat04",
    "name": "다리",
    "emoji": "🏥",
    "aihubWord": "다리",
    "videoFile": "NIA_SL_WORD1599_REAL01_D.mp4"
  },
  {
    "id": "cat04_010",
    "category": "cat04",
    "name": "팔",
    "emoji": "🏥",
    "aihubWord": "팔",
    "videoFile": "NIA_SL_WORD1147_REAL01_D.mp4"
  },
  {
    "id": "cat04_011",
    "category": "cat04",
    "name": "발가락",
    "emoji": "🏥",
    "aihubWord": "발가락",
    "videoFile": "NIA_SL_WORD0008_REAL01_D.mp4"
  },
  {
    "id": "cat04_012",
    "category": "cat04",
    "name": "목",
    "emoji": "🏥",
    "aihubWord": "목",
    "videoFile": "NIA_SL_WORD1376_REAL01_D.mp4"
  },
  {
    "id": "cat04_013",
    "category": "cat04",
    "name": "혀",
    "emoji": "🏥",
    "aihubWord": "혀",
    "videoFile": "NIA_SL_WORD1181_REAL01_D.mp4"
  },
  {
    "id": "cat04_014",
    "category": "cat04",
    "name": "볼",
    "emoji": "🏥",
    "aihubWord": "볼",
    "videoFile": "NIA_SL_WORD1375_REAL01_D.mp4"
  },
  {
    "id": "cat04_015",
    "category": "cat04",
    "name": "이마",
    "emoji": "🏥",
    "aihubWord": "이마",
    "videoFile": "NIA_SL_WORD1374_REAL01_D.mp4"
  },
  {
    "id": "cat04_016",
    "category": "cat04",
    "name": "눈썹",
    "emoji": "🏥",
    "aihubWord": "눈썹",
    "videoFile": "NIA_SL_WORD1371_REAL01_D.mp4"
  },
  {
    "id": "cat04_017",
    "category": "cat04",
    "name": "머리카락",
    "emoji": "🏥",
    "aihubWord": "머리카락",
    "videoFile": "NIA_SL_WORD1241_REAL01_D.mp4"
  },
  {
    "id": "cat04_018",
    "category": "cat04",
    "name": "겨드랑이",
    "emoji": "🏥",
    "aihubWord": "겨드랑이",
    "videoFile": "NIA_SL_WORD1297_REAL01_D.mp4"
  },
  {
    "id": "cat04_019",
    "category": "cat04",
    "name": "엉덩이",
    "emoji": "🏥",
    "aihubWord": "엉덩이",
    "videoFile": "NIA_SL_WORD1270_REAL01_D.mp4"
  },
  {
    "id": "cat04_020",
    "category": "cat04",
    "name": "감기",
    "emoji": "🏥",
    "aihubWord": "감기",
    "videoFile": "NIA_SL_WORD0037_REAL01_D.mp4"
  },
  {
    "id": "cat04_021",
    "category": "cat04",
    "name": "당뇨병",
    "emoji": "🏥",
    "aihubWord": "당뇨병",
    "videoFile": "NIA_SL_WORD0033_REAL01_D.mp4"
  },
  {
    "id": "cat04_022",
    "category": "cat04",
    "name": "빈혈",
    "emoji": "🏥",
    "aihubWord": "빈혈",
    "videoFile": "NIA_SL_WORD0070_REAL01_D.mp4"
  },
  {
    "id": "cat04_023",
    "category": "cat04",
    "name": "골절",
    "emoji": "🏥",
    "aihubWord": "골절",
    "videoFile": "NIA_SL_WORD0387_REAL01_D.mp4"
  },
  {
    "id": "cat04_024",
    "category": "cat04",
    "name": "불면증",
    "emoji": "🏥",
    "aihubWord": "불면증",
    "videoFile": "NIA_SL_WORD0042_REAL01_D.mp4"
  },
  {
    "id": "cat04_025",
    "category": "cat04",
    "name": "변비",
    "emoji": "🏥",
    "aihubWord": "변비",
    "videoFile": "NIA_SL_WORD0039_REAL01_D.mp4"
  },
  {
    "id": "cat04_026",
    "category": "cat04",
    "name": "설사",
    "emoji": "🏥",
    "aihubWord": "설사",
    "videoFile": "NIA_SL_WORD0046_REAL01_D.mp4"
  },
  {
    "id": "cat04_027",
    "category": "cat04",
    "name": "화상",
    "emoji": "🏥",
    "aihubWord": "화상",
    "videoFile": "NIA_SL_WORD0071_REAL01_D.mp4"
  },
  {
    "id": "cat04_028",
    "category": "cat04",
    "name": "식도염",
    "emoji": "🏥",
    "aihubWord": "식도염",
    "videoFile": "NIA_SL_WORD0441_REAL01_D.mp4"
  },
  {
    "id": "cat04_029",
    "category": "cat04",
    "name": "치료",
    "emoji": "🏥",
    "aihubWord": "치료",
    "videoFile": "NIA_SL_WORD0064_REAL01_D.mp4"
  },
  {
    "id": "cat04_030",
    "category": "cat04",
    "name": "병원",
    "emoji": "🏥",
    "aihubWord": "병원",
    "videoFile": "NIA_SL_WORD1496_REAL01_D.mp4"
  },
  {
    "id": "cat04_031",
    "category": "cat04",
    "name": "의사",
    "emoji": "🏥",
    "aihubWord": "의사",
    "videoFile": "NIA_SL_WORD0163_REAL01_D.mp4"
  },
  {
    "id": "cat04_032",
    "category": "cat04",
    "name": "간호사",
    "emoji": "🏥",
    "aihubWord": "간호사",
    "videoFile": "NIA_SL_WORD0187_REAL01_D.mp4"
  },
  {
    "id": "cat04_033",
    "category": "cat04",
    "name": "입원",
    "emoji": "🏥",
    "aihubWord": "입원",
    "videoFile": "NIA_SL_WORD0060_REAL01_D.mp4"
  },
  {
    "id": "cat04_034",
    "category": "cat04",
    "name": "퇴원",
    "emoji": "🏥",
    "aihubWord": "퇴원",
    "videoFile": "NIA_SL_WORD0067_REAL01_D.mp4"
  },
  {
    "id": "cat04_035",
    "category": "cat04",
    "name": "마스크",
    "emoji": "🏥",
    "aihubWord": "마스크",
    "videoFile": "NIA_SL_WORD0499_REAL01_D.mp4"
  },
  {
    "id": "cat04_036",
    "category": "cat04",
    "name": "붕대",
    "emoji": "🏥",
    "aihubWord": "붕대",
    "videoFile": "NIA_SL_WORD0044_REAL01_D.mp4"
  },
  {
    "id": "cat04_037",
    "category": "cat04",
    "name": "소화제",
    "emoji": "🏥",
    "aihubWord": "소화제",
    "videoFile": "NIA_SL_WORD0049_REAL01_D.mp4"
  },
  {
    "id": "cat04_038",
    "category": "cat04",
    "name": "한약",
    "emoji": "🏥",
    "aihubWord": "한약",
    "videoFile": "NIA_SL_WORD0068_REAL01_D.mp4"
  },
  {
    "id": "cat04_039",
    "category": "cat04",
    "name": "건강",
    "emoji": "🏥",
    "aihubWord": "건강",
    "videoFile": "NIA_SL_WORD1115_REAL01_D.mp4"
  },
  {
    "id": "cat04_040",
    "category": "cat04",
    "name": "체온",
    "emoji": "🏥",
    "aihubWord": "체온",
    "videoFile": "NIA_SL_WORD0288_REAL01_D.mp4"
  },
  {
    "id": "cat04_041",
    "category": "cat04",
    "name": "면역",
    "emoji": "🏥",
    "aihubWord": "면역",
    "videoFile": "NIA_SL_WORD0036_REAL01_D.mp4"
  },
  {
    "id": "cat04_042",
    "category": "cat04",
    "name": "통증",
    "emoji": "🏥",
    "aihubWord": "통증",
    "videoFile": "NIA_SL_WORD0689_REAL01_D.mp4"
  },
  {
    "id": "cat04_043",
    "category": "cat04",
    "name": "혈액형",
    "emoji": "🏥",
    "aihubWord": "혈액형",
    "videoFile": "NIA_SL_WORD0612_REAL01_D.mp4"
  },
  {
    "id": "cat04_044",
    "category": "cat04",
    "name": "콧물",
    "emoji": "🏥",
    "aihubWord": "콧물",
    "videoFile": "NIA_SL_WORD1239_REAL01_D.mp4"
  },
  {
    "id": "cat04_045",
    "category": "cat04",
    "name": "치아",
    "emoji": "🏥",
    "aihubWord": "치아",
    "videoFile": "NIA_SL_WORD1373_REAL01_D.mp4"
  },
  {
    "id": "cat04_046",
    "category": "cat04",
    "name": "여드름",
    "emoji": "🏥",
    "aihubWord": "여드름",
    "videoFile": "NIA_SL_WORD2146_REAL01_D.mp4"
  },
  {
    "id": "cat04_047",
    "category": "cat04",
    "name": "수면제",
    "emoji": "🏥",
    "aihubWord": "수면제",
    "videoFile": "NIA_SL_WORD0052_REAL01_D.mp4"
  },
  {
    "id": "cat04_048",
    "category": "cat04",
    "name": "진단서",
    "emoji": "🏥",
    "aihubWord": "진단서",
    "videoFile": "NIA_SL_WORD0062_REAL01_D.mp4"
  },
  {
    "id": "cat05_001",
    "category": "cat05",
    "name": "슬프다",
    "emoji": "😊",
    "aihubWord": "슬프다",
    "videoFile": "NIA_SL_WORD0009_REAL01_D.mp4"
  },
  {
    "id": "cat05_002",
    "category": "cat05",
    "name": "화나다",
    "emoji": "😊",
    "aihubWord": "화나다",
    "videoFile": "NIA_SL_WORD1236_REAL01_D.mp4"
  },
  {
    "id": "cat05_003",
    "category": "cat05",
    "name": "무섭다",
    "emoji": "😊",
    "aihubWord": "무섭다",
    "videoFile": "NIA_SL_WORD1134_REAL01_D.mp4"
  },
  {
    "id": "cat05_004",
    "category": "cat05",
    "name": "놀랍다",
    "emoji": "😊",
    "aihubWord": "놀랍다",
    "videoFile": "NIA_SL_WORD2526_REAL01_D.mp4"
  },
  {
    "id": "cat05_005",
    "category": "cat05",
    "name": "싫어하다",
    "emoji": "😊",
    "aihubWord": "싫어하다",
    "videoFile": "NIA_SL_WORD0025_REAL01_D.mp4"
  },
  {
    "id": "cat05_006",
    "category": "cat05",
    "name": "행복",
    "emoji": "😊",
    "aihubWord": "행복",
    "videoFile": "NIA_SL_WORD1169_REAL01_D.mp4"
  },
  {
    "id": "cat05_007",
    "category": "cat05",
    "name": "불행",
    "emoji": "😊",
    "aihubWord": "불행",
    "videoFile": "NIA_SL_WORD0043_REAL01_D.mp4"
  },
  {
    "id": "cat05_008",
    "category": "cat05",
    "name": "걱정",
    "emoji": "😊",
    "aihubWord": "걱정",
    "videoFile": "NIA_SL_WORD1294_REAL01_D.mp4"
  },
  {
    "id": "cat05_009",
    "category": "cat05",
    "name": "고민",
    "emoji": "😊",
    "aihubWord": "고민",
    "videoFile": "NIA_SL_WORD0001_REAL01_D.mp4"
  },
  {
    "id": "cat05_010",
    "category": "cat05",
    "name": "불안",
    "emoji": "😊",
    "aihubWord": "불안",
    "videoFile": "NIA_SL_WORD1123_REAL01_D.mp4"
  },
  {
    "id": "cat05_011",
    "category": "cat05",
    "name": "우울",
    "emoji": "😊",
    "aihubWord": "우울",
    "videoFile": "NIA_SL_WORD1251_REAL01_D.mp4"
  },
  {
    "id": "cat05_012",
    "category": "cat05",
    "name": "피곤",
    "emoji": "😊",
    "aihubWord": "피곤",
    "videoFile": "NIA_SL_WORD1554_REAL01_D.mp4"
  },
  {
    "id": "cat05_013",
    "category": "cat05",
    "name": "즐겁다",
    "emoji": "😊",
    "aihubWord": "즐겁다",
    "videoFile": "NIA_SL_WORD1140_REAL01_D.mp4"
  },
  {
    "id": "cat05_014",
    "category": "cat05",
    "name": "창피",
    "emoji": "😊",
    "aihubWord": "창피",
    "videoFile": "NIA_SL_WORD1215_REAL01_D.mp4"
  },
  {
    "id": "cat05_015",
    "category": "cat05",
    "name": "성실",
    "emoji": "😊",
    "aihubWord": "성실",
    "videoFile": "NIA_SL_WORD0023_REAL01_D.mp4"
  },
  {
    "id": "cat05_016",
    "category": "cat05",
    "name": "침착",
    "emoji": "😊",
    "aihubWord": "침착",
    "videoFile": "NIA_SL_WORD0022_REAL01_D.mp4"
  },
  {
    "id": "cat05_017",
    "category": "cat05",
    "name": "귀엽다",
    "emoji": "😊",
    "aihubWord": "귀엽다",
    "videoFile": "NIA_SL_WORD1314_REAL01_D.mp4"
  },
  {
    "id": "cat05_018",
    "category": "cat05",
    "name": "긍정적",
    "emoji": "😊",
    "aihubWord": "긍정적",
    "videoFile": "NIA_SL_WORD2060_REAL01_D.mp4"
  },
  {
    "id": "cat05_019",
    "category": "cat05",
    "name": "솔직하다",
    "emoji": "😊",
    "aihubWord": "솔직하다",
    "videoFile": "NIA_SL_WORD2090_REAL01_D.mp4"
  },
  {
    "id": "cat05_020",
    "category": "cat05",
    "name": "안타깝다",
    "emoji": "😊",
    "aihubWord": "안타깝다",
    "videoFile": "NIA_SL_WORD0011_REAL01_D.mp4"
  },
  {
    "id": "cat05_021",
    "category": "cat05",
    "name": "어색하다",
    "emoji": "😊",
    "aihubWord": "어색하다",
    "videoFile": "NIA_SL_WORD0012_REAL01_D.mp4"
  },
  {
    "id": "cat05_022",
    "category": "cat05",
    "name": "뻔뻔",
    "emoji": "😊",
    "aihubWord": "뻔뻔",
    "videoFile": "NIA_SL_WORD0002_REAL01_D.mp4"
  },
  {
    "id": "cat05_023",
    "category": "cat05",
    "name": "쑥쓰럽다",
    "emoji": "😊",
    "aihubWord": "쑥쓰럽다",
    "videoFile": "NIA_SL_WORD0456_REAL01_D.mp4"
  },
  {
    "id": "cat05_024",
    "category": "cat05",
    "name": "소외감",
    "emoji": "😊",
    "aihubWord": "소외감",
    "videoFile": "NIA_SL_WORD2087_REAL01_D.mp4"
  },
  {
    "id": "cat05_025",
    "category": "cat05",
    "name": "감동",
    "emoji": "😊",
    "aihubWord": "감동",
    "videoFile": "NIA_SL_WORD1289_REAL01_D.mp4"
  },
  {
    "id": "cat05_026",
    "category": "cat05",
    "name": "짜증",
    "emoji": "😊",
    "aihubWord": "짜증",
    "videoFile": "NIA_SL_WORD1255_REAL01_D.mp4"
  },
  {
    "id": "cat05_027",
    "category": "cat05",
    "name": "당황",
    "emoji": "😊",
    "aihubWord": "당황",
    "videoFile": "NIA_SL_WORD1128_REAL01_D.mp4"
  },
  {
    "id": "cat05_028",
    "category": "cat05",
    "name": "실망",
    "emoji": "😊",
    "aihubWord": "실망",
    "videoFile": "NIA_SL_WORD1195_REAL01_D.mp4"
  },
  {
    "id": "cat05_029",
    "category": "cat05",
    "name": "그립다",
    "emoji": "😊",
    "aihubWord": "그립다",
    "videoFile": "NIA_SL_WORD1506_REAL01_D.mp4"
  },
  {
    "id": "cat05_030",
    "category": "cat05",
    "name": "섭섭하다",
    "emoji": "😊",
    "aihubWord": "섭섭하다",
    "videoFile": "NIA_SL_WORD1151_REAL01_D.mp4"
  },
  {
    "id": "cat05_031",
    "category": "cat05",
    "name": "답답",
    "emoji": "😊",
    "aihubWord": "답답",
    "videoFile": "NIA_SL_WORD1102_REAL01_D.mp4"
  },
  {
    "id": "cat05_032",
    "category": "cat05",
    "name": "힘들다",
    "emoji": "😊",
    "aihubWord": "힘들다",
    "videoFile": "NIA_SL_WORD1222_REAL01_D.mp4"
  },
  {
    "id": "cat06_001",
    "category": "cat06",
    "name": "밥",
    "emoji": "🍚",
    "aihubWord": "밥",
    "videoFile": "NIA_SL_WORD1534_REAL01_D.mp4"
  },
  {
    "id": "cat06_002",
    "category": "cat06",
    "name": "고추",
    "emoji": "🍚",
    "aihubWord": "고추",
    "videoFile": "NIA_SL_WORD0074_REAL01_D.mp4"
  },
  {
    "id": "cat06_003",
    "category": "cat06",
    "name": "두부",
    "emoji": "🍚",
    "aihubWord": "두부",
    "videoFile": "NIA_SL_WORD0087_REAL01_D.mp4"
  },
  {
    "id": "cat06_004",
    "category": "cat06",
    "name": "라면",
    "emoji": "🍚",
    "aihubWord": "라면",
    "videoFile": "NIA_SL_WORD0090_REAL01_D.mp4"
  },
  {
    "id": "cat06_005",
    "category": "cat06",
    "name": "비빔밥",
    "emoji": "🍚",
    "aihubWord": "비빔밥",
    "videoFile": "NIA_SL_WORD0098_REAL01_D.mp4"
  },
  {
    "id": "cat06_006",
    "category": "cat06",
    "name": "떡국",
    "emoji": "🍚",
    "aihubWord": "떡국",
    "videoFile": "NIA_SL_WORD0089_REAL01_D.mp4"
  },
  {
    "id": "cat06_007",
    "category": "cat06",
    "name": "된장찌게",
    "emoji": "🍚",
    "aihubWord": "된장찌게",
    "videoFile": "NIA_SL_WORD0085_REAL01_D.mp4"
  },
  {
    "id": "cat06_008",
    "category": "cat06",
    "name": "돼지고기",
    "emoji": "🍚",
    "aihubWord": "돼지고기",
    "videoFile": "NIA_SL_WORD0086_REAL01_D.mp4"
  },
  {
    "id": "cat06_009",
    "category": "cat06",
    "name": "소불고기",
    "emoji": "🍚",
    "aihubWord": "소불고기",
    "videoFile": "NIA_SL_WORD0097_REAL01_D.mp4"
  },
  {
    "id": "cat06_010",
    "category": "cat06",
    "name": "짬뽕",
    "emoji": "🍚",
    "aihubWord": "짬뽕",
    "videoFile": "NIA_SL_WORD0112_REAL01_D.mp4"
  },
  {
    "id": "cat06_011",
    "category": "cat06",
    "name": "칼국수",
    "emoji": "🍚",
    "aihubWord": "칼국수",
    "videoFile": "NIA_SL_WORD0114_REAL01_D.mp4"
  },
  {
    "id": "cat06_012",
    "category": "cat06",
    "name": "보신탕",
    "emoji": "🍚",
    "aihubWord": "보신탕",
    "videoFile": "NIA_SL_WORD0095_REAL01_D.mp4"
  },
  {
    "id": "cat06_013",
    "category": "cat06",
    "name": "사과",
    "emoji": "🍚",
    "aihubWord": "사과",
    "videoFile": "NIA_SL_WORD0099_REAL01_D.mp4"
  },
  {
    "id": "cat06_014",
    "category": "cat06",
    "name": "딸기",
    "emoji": "🍚",
    "aihubWord": "딸기",
    "videoFile": "NIA_SL_WORD0088_REAL01_D.mp4"
  },
  {
    "id": "cat06_015",
    "category": "cat06",
    "name": "참외",
    "emoji": "🍚",
    "aihubWord": "참외",
    "videoFile": "NIA_SL_WORD0113_REAL01_D.mp4"
  },
  {
    "id": "cat06_016",
    "category": "cat06",
    "name": "무",
    "emoji": "🍚",
    "aihubWord": "무",
    "videoFile": "NIA_SL_WORD0092_REAL01_D.mp4"
  },
  {
    "id": "cat06_017",
    "category": "cat06",
    "name": "밥그릇",
    "emoji": "🍚",
    "aihubWord": "밥그릇",
    "videoFile": "NIA_SL_WORD0093_REAL01_D.mp4"
  },
  {
    "id": "cat06_018",
    "category": "cat06",
    "name": "냄비",
    "emoji": "🍚",
    "aihubWord": "냄비",
    "videoFile": "NIA_SL_WORD0081_REAL01_D.mp4"
  },
  {
    "id": "cat06_019",
    "category": "cat06",
    "name": "식당",
    "emoji": "🍚",
    "aihubWord": "식당",
    "videoFile": "NIA_SL_WORD0104_REAL01_D.mp4"
  },
  {
    "id": "cat06_020",
    "category": "cat06",
    "name": "부엌",
    "emoji": "🍚",
    "aihubWord": "부엌",
    "videoFile": "NIA_SL_WORD0096_REAL01_D.mp4"
  },
  {
    "id": "cat06_021",
    "category": "cat06",
    "name": "커피",
    "emoji": "🍚",
    "aihubWord": "커피",
    "videoFile": "NIA_SL_WORD0115_REAL01_D.mp4"
  },
  {
    "id": "cat06_022",
    "category": "cat06",
    "name": "콜라",
    "emoji": "🍚",
    "aihubWord": "콜라",
    "videoFile": "NIA_SL_WORD0116_REAL01_D.mp4"
  },
  {
    "id": "cat06_023",
    "category": "cat06",
    "name": "사이다",
    "emoji": "🍚",
    "aihubWord": "사이다",
    "videoFile": "NIA_SL_WORD0100_REAL01_D.mp4"
  },
  {
    "id": "cat06_024",
    "category": "cat06",
    "name": "음료수",
    "emoji": "🍚",
    "aihubWord": "음료수",
    "videoFile": "NIA_SL_WORD0007_REAL01_D.mp4"
  },
  {
    "id": "cat06_025",
    "category": "cat06",
    "name": "술",
    "emoji": "🍚",
    "aihubWord": "술",
    "videoFile": "NIA_SL_WORD0109_REAL01_D.mp4"
  },
  {
    "id": "cat06_026",
    "category": "cat06",
    "name": "소주",
    "emoji": "🍚",
    "aihubWord": "소주",
    "videoFile": "NIA_SL_WORD0102_REAL01_D.mp4"
  },
  {
    "id": "cat06_027",
    "category": "cat06",
    "name": "막걸리",
    "emoji": "🍚",
    "aihubWord": "막걸리",
    "videoFile": "NIA_SL_WORD0091_REAL01_D.mp4"
  },
  {
    "id": "cat06_028",
    "category": "cat06",
    "name": "와인",
    "emoji": "🍚",
    "aihubWord": "와인",
    "videoFile": "NIA_SL_WORD0119_REAL01_D.mp4"
  },
  {
    "id": "cat06_029",
    "category": "cat06",
    "name": "달다",
    "emoji": "🍚",
    "aihubWord": "달다",
    "videoFile": "NIA_SL_WORD0101_REAL01_D.mp4"
  },
  {
    "id": "cat06_030",
    "category": "cat06",
    "name": "양식",
    "emoji": "🍚",
    "aihubWord": "양식",
    "videoFile": "NIA_SL_WORD0107_REAL01_D.mp4"
  },
  {
    "id": "cat06_031",
    "category": "cat06",
    "name": "가래떡",
    "emoji": "🍚",
    "aihubWord": "가래떡",
    "videoFile": "NIA_SL_WORD0072_REAL01_D.mp4"
  },
  {
    "id": "cat06_032",
    "category": "cat06",
    "name": "백설기",
    "emoji": "🍚",
    "aihubWord": "백설기",
    "videoFile": "NIA_SL_WORD0120_REAL01_D.mp4"
  },
  {
    "id": "cat06_033",
    "category": "cat06",
    "name": "꿀물",
    "emoji": "🍚",
    "aihubWord": "꿀물",
    "videoFile": "NIA_SL_WORD0080_REAL01_D.mp4"
  },
  {
    "id": "cat06_034",
    "category": "cat06",
    "name": "배추국",
    "emoji": "🍚",
    "aihubWord": "배추국",
    "videoFile": "NIA_SL_WORD0077_REAL01_D.mp4"
  },
  {
    "id": "cat06_035",
    "category": "cat06",
    "name": "꽈베기",
    "emoji": "🍚",
    "aihubWord": "꽈베기",
    "videoFile": "NIA_SL_WORD0078_REAL01_D.mp4"
  },
  {
    "id": "cat06_036",
    "category": "cat06",
    "name": "다과",
    "emoji": "🍚",
    "aihubWord": "다과",
    "videoFile": "NIA_SL_WORD0083_REAL01_D.mp4"
  },
  {
    "id": "cat06_037",
    "category": "cat06",
    "name": "통조림",
    "emoji": "🍚",
    "aihubWord": "통조림",
    "videoFile": "NIA_SL_WORD0118_REAL01_D.mp4"
  },
  {
    "id": "cat06_038",
    "category": "cat06",
    "name": "쌀가루",
    "emoji": "🍚",
    "aihubWord": "쌀가루",
    "videoFile": "NIA_SL_WORD0105_REAL01_D.mp4"
  },
  {
    "id": "cat06_039",
    "category": "cat06",
    "name": "밥솥",
    "emoji": "🍚",
    "aihubWord": "밥솥",
    "videoFile": "NIA_SL_WORD0094_REAL01_D.mp4"
  },
  {
    "id": "cat06_040",
    "category": "cat06",
    "name": "술잔",
    "emoji": "🍚",
    "aihubWord": "술잔",
    "videoFile": "NIA_SL_WORD0103_REAL01_D.mp4"
  },
  {
    "id": "cat06_041",
    "category": "cat06",
    "name": "고깃국",
    "emoji": "🍚",
    "aihubWord": "고깃국",
    "videoFile": "NIA_SL_WORD0073_REAL01_D.mp4"
  },
  {
    "id": "cat06_042",
    "category": "cat06",
    "name": "고추가루",
    "emoji": "🍚",
    "aihubWord": "고추가루",
    "videoFile": "NIA_SL_WORD0075_REAL01_D.mp4"
  },
  {
    "id": "cat06_043",
    "category": "cat06",
    "name": "벌꿀",
    "emoji": "🍚",
    "aihubWord": "벌꿀",
    "videoFile": "NIA_SL_WORD0079_REAL01_D.mp4"
  },
  {
    "id": "cat06_044",
    "category": "cat06",
    "name": "찬물",
    "emoji": "🍚",
    "aihubWord": "찬물",
    "videoFile": "NIA_SL_WORD0082_REAL01_D.mp4"
  },
  {
    "id": "cat06_045",
    "category": "cat06",
    "name": "냉커피",
    "emoji": "🍚",
    "aihubWord": "냉커피",
    "videoFile": "NIA_SL_WORD0106_REAL01_D.mp4"
  },
  {
    "id": "cat07_001",
    "category": "cat07",
    "name": "에어컨",
    "emoji": "🏠",
    "aihubWord": "에어컨",
    "videoFile": "NIA_SL_WORD0128_REAL01_D.mp4"
  },
  {
    "id": "cat07_002",
    "category": "cat07",
    "name": "이불",
    "emoji": "🏠",
    "aihubWord": "이불",
    "videoFile": "NIA_SL_WORD0127_REAL01_D.mp4"
  },
  {
    "id": "cat07_003",
    "category": "cat07",
    "name": "잠옷",
    "emoji": "🏠",
    "aihubWord": "잠옷",
    "videoFile": "NIA_SL_WORD0126_REAL01_D.mp4"
  },
  {
    "id": "cat07_004",
    "category": "cat07",
    "name": "치약",
    "emoji": "🏠",
    "aihubWord": "치약",
    "videoFile": "NIA_SL_WORD0132_REAL01_D.mp4"
  },
  {
    "id": "cat07_005",
    "category": "cat07",
    "name": "세수",
    "emoji": "🏠",
    "aihubWord": "세수",
    "videoFile": "NIA_SL_WORD1543_REAL01_D.mp4"
  },
  {
    "id": "cat07_006",
    "category": "cat07",
    "name": "양치",
    "emoji": "🏠",
    "aihubWord": "양치",
    "videoFile": "NIA_SL_WORD1555_REAL01_D.mp4"
  },
  {
    "id": "cat07_007",
    "category": "cat07",
    "name": "월세",
    "emoji": "🏠",
    "aihubWord": "월세",
    "videoFile": "NIA_SL_WORD0130_REAL01_D.mp4"
  },
  {
    "id": "cat07_008",
    "category": "cat07",
    "name": "전세",
    "emoji": "🏠",
    "aihubWord": "전세",
    "videoFile": "NIA_SL_WORD0131_REAL01_D.mp4"
  },
  {
    "id": "cat07_009",
    "category": "cat07",
    "name": "집주인",
    "emoji": "🏠",
    "aihubWord": "집주인",
    "videoFile": "NIA_SL_WORD0207_REAL01_D.mp4"
  },
  {
    "id": "cat07_010",
    "category": "cat07",
    "name": "이사",
    "emoji": "🏠",
    "aihubWord": "이사",
    "videoFile": "NIA_SL_WORD1558_REAL01_D.mp4"
  },
  {
    "id": "cat07_011",
    "category": "cat07",
    "name": "설거지",
    "emoji": "🏠",
    "aihubWord": "설거지",
    "videoFile": "NIA_SL_WORD1103_REAL01_D.mp4"
  },
  {
    "id": "cat07_012",
    "category": "cat07",
    "name": "자다",
    "emoji": "🏠",
    "aihubWord": "자다",
    "videoFile": "NIA_SL_WORD1377_REAL01_D.mp4"
  },
  {
    "id": "cat07_013",
    "category": "cat07",
    "name": "잠자다",
    "emoji": "🏠",
    "aihubWord": "잠자다",
    "videoFile": "NIA_SL_WORD1245_REAL01_D.mp4"
  },
  {
    "id": "cat07_014",
    "category": "cat07",
    "name": "행거",
    "emoji": "🏠",
    "aihubWord": "행거",
    "videoFile": "NIA_SL_WORD0129_REAL01_D.mp4"
  },
  {
    "id": "cat07_015",
    "category": "cat07",
    "name": "옷장",
    "emoji": "🏠",
    "aihubWord": "옷장",
    "videoFile": "NIA_SL_WORD0789_REAL01_D.mp4"
  },
  {
    "id": "cat07_016",
    "category": "cat07",
    "name": "의자",
    "emoji": "🏠",
    "aihubWord": "의자",
    "videoFile": "NIA_SL_WORD1182_REAL01_D.mp4"
  },
  {
    "id": "cat07_017",
    "category": "cat07",
    "name": "세수대야",
    "emoji": "🏠",
    "aihubWord": "세수대야",
    "videoFile": "NIA_SL_WORD0476_REAL01_D.mp4"
  },
  {
    "id": "cat07_018",
    "category": "cat07",
    "name": "용품",
    "emoji": "🏠",
    "aihubWord": "용품",
    "videoFile": "NIA_SL_WORD0110_REAL01_D.mp4"
  },
  {
    "id": "cat07_019",
    "category": "cat07",
    "name": "귀중품",
    "emoji": "🏠",
    "aihubWord": "귀중품",
    "videoFile": "NIA_SL_WORD0445_REAL01_D.mp4"
  },
  {
    "id": "cat07_020",
    "category": "cat07",
    "name": "물통",
    "emoji": "🏠",
    "aihubWord": "물통",
    "videoFile": "NIA_SL_WORD0532_REAL01_D.mp4"
  },
  {
    "id": "cat08_001",
    "category": "cat08",
    "name": "운동화",
    "emoji": "👕",
    "aihubWord": "운동화",
    "videoFile": "NIA_SL_WORD0125_REAL01_D.mp4"
  },
  {
    "id": "cat08_002",
    "category": "cat08",
    "name": "군복",
    "emoji": "👕",
    "aihubWord": "군복",
    "videoFile": "NIA_SL_WORD0122_REAL01_D.mp4"
  },
  {
    "id": "cat08_003",
    "category": "cat08",
    "name": "양산",
    "emoji": "👕",
    "aihubWord": "양산",
    "videoFile": "NIA_SL_WORD0124_REAL01_D.mp4"
  },
  {
    "id": "cat08_004",
    "category": "cat08",
    "name": "포켓",
    "emoji": "👕",
    "aihubWord": "포켓",
    "videoFile": "NIA_SL_WORD0123_REAL01_D.mp4"
  },
  {
    "id": "cat08_005",
    "category": "cat08",
    "name": "가죽신",
    "emoji": "👕",
    "aihubWord": "가죽신",
    "videoFile": "NIA_SL_WORD0121_REAL01_D.mp4"
  },
  {
    "id": "cat08_006",
    "category": "cat08",
    "name": "가발",
    "emoji": "👕",
    "aihubWord": "가발",
    "videoFile": "NIA_SL_WORD0355_REAL01_D.mp4"
  },
  {
    "id": "cat08_007",
    "category": "cat08",
    "name": "벨트",
    "emoji": "👕",
    "aihubWord": "벨트",
    "videoFile": "NIA_SL_WORD0631_REAL01_D.mp4"
  },
  {
    "id": "cat08_008",
    "category": "cat08",
    "name": "날씬",
    "emoji": "👕",
    "aihubWord": "날씬",
    "videoFile": "NIA_SL_WORD1281_REAL01_D.mp4"
  },
  {
    "id": "cat08_009",
    "category": "cat08",
    "name": "뚱뚱하다",
    "emoji": "👕",
    "aihubWord": "뚱뚱하다",
    "videoFile": "NIA_SL_WORD1184_REAL01_D.mp4"
  },
  {
    "id": "cat08_010",
    "category": "cat08",
    "name": "미남",
    "emoji": "👕",
    "aihubWord": "미남",
    "videoFile": "NIA_SL_WORD1108_REAL01_D.mp4"
  },
  {
    "id": "cat08_011",
    "category": "cat08",
    "name": "미녀",
    "emoji": "👕",
    "aihubWord": "미녀",
    "videoFile": "NIA_SL_WORD1113_REAL01_D.mp4"
  },
  {
    "id": "cat08_012",
    "category": "cat08",
    "name": "얼굴형",
    "emoji": "👕",
    "aihubWord": "얼굴형",
    "videoFile": "NIA_SL_WORD2097_REAL01_D.mp4"
  },
  {
    "id": "cat08_013",
    "category": "cat08",
    "name": "체형",
    "emoji": "👕",
    "aihubWord": "체형",
    "videoFile": "NIA_SL_WORD2072_REAL01_D.mp4"
  },
  {
    "id": "cat08_014",
    "category": "cat08",
    "name": "아름답다",
    "emoji": "👕",
    "aihubWord": "아름답다",
    "videoFile": "NIA_SL_WORD2010_REAL01_D.mp4"
  },
  {
    "id": "cat08_015",
    "category": "cat08",
    "name": "예쁘다",
    "emoji": "👕",
    "aihubWord": "예쁘다",
    "videoFile": "NIA_SL_WORD1145_REAL01_D.mp4"
  },
  {
    "id": "cat08_016",
    "category": "cat08",
    "name": "검정머리",
    "emoji": "👕",
    "aihubWord": "검정머리",
    "videoFile": "NIA_SL_WORD0341_REAL01_D.mp4"
  },
  {
    "id": "cat08_017",
    "category": "cat08",
    "name": "염색",
    "emoji": "👕",
    "aihubWord": "염색",
    "videoFile": "NIA_SL_WORD2147_REAL01_D.mp4"
  },
  {
    "id": "cat08_018",
    "category": "cat08",
    "name": "구두",
    "emoji": "👕",
    "aihubWord": "구두",
    "videoFile": "NIA_SL_WORD0816_REAL01_D.mp4"
  },
  {
    "id": "cat09_001",
    "category": "cat09",
    "name": "고등학교",
    "emoji": "📚",
    "aihubWord": "고등학교",
    "videoFile": "NIA_SL_WORD0211_REAL01_D.mp4"
  },
  {
    "id": "cat09_002",
    "category": "cat09",
    "name": "교수",
    "emoji": "📚",
    "aihubWord": "교수",
    "videoFile": "NIA_SL_WORD0140_REAL01_D.mp4"
  },
  {
    "id": "cat09_003",
    "category": "cat09",
    "name": "교장",
    "emoji": "📚",
    "aihubWord": "교장",
    "videoFile": "NIA_SL_WORD0141_REAL01_D.mp4"
  },
  {
    "id": "cat09_004",
    "category": "cat09",
    "name": "학부모",
    "emoji": "📚",
    "aihubWord": "학부모",
    "videoFile": "NIA_SL_WORD0239_REAL01_D.mp4"
  },
  {
    "id": "cat09_005",
    "category": "cat09",
    "name": "교실",
    "emoji": "📚",
    "aihubWord": "교실",
    "videoFile": "NIA_SL_WORD0215_REAL01_D.mp4"
  },
  {
    "id": "cat09_006",
    "category": "cat09",
    "name": "교무실",
    "emoji": "📚",
    "aihubWord": "교무실",
    "videoFile": "NIA_SL_WORD0213_REAL01_D.mp4"
  },
  {
    "id": "cat09_007",
    "category": "cat09",
    "name": "교탁",
    "emoji": "📚",
    "aihubWord": "교탁",
    "videoFile": "NIA_SL_WORD0418_REAL01_D.mp4"
  },
  {
    "id": "cat09_008",
    "category": "cat09",
    "name": "복습",
    "emoji": "📚",
    "aihubWord": "복습",
    "videoFile": "NIA_SL_WORD0223_REAL01_D.mp4"
  },
  {
    "id": "cat09_009",
    "category": "cat09",
    "name": "예습",
    "emoji": "📚",
    "aihubWord": "예습",
    "videoFile": "NIA_SL_WORD0233_REAL01_D.mp4"
  },
  {
    "id": "cat09_010",
    "category": "cat09",
    "name": "독서",
    "emoji": "📚",
    "aihubWord": "독서",
    "videoFile": "NIA_SL_WORD0034_REAL01_D.mp4"
  },
  {
    "id": "cat09_011",
    "category": "cat09",
    "name": "서점",
    "emoji": "📚",
    "aihubWord": "서점",
    "videoFile": "NIA_SL_WORD0226_REAL01_D.mp4"
  },
  {
    "id": "cat09_012",
    "category": "cat09",
    "name": "독서실",
    "emoji": "📚",
    "aihubWord": "독서실",
    "videoFile": "NIA_SL_WORD0220_REAL01_D.mp4"
  },
  {
    "id": "cat09_013",
    "category": "cat09",
    "name": "개학",
    "emoji": "📚",
    "aihubWord": "개학",
    "videoFile": "NIA_SL_WORD0214_REAL01_D.mp4"
  },
  {
    "id": "cat09_014",
    "category": "cat09",
    "name": "등교",
    "emoji": "📚",
    "aihubWord": "등교",
    "videoFile": "NIA_SL_WORD0221_REAL01_D.mp4"
  },
  {
    "id": "cat09_015",
    "category": "cat09",
    "name": "낙제",
    "emoji": "📚",
    "aihubWord": "낙제",
    "videoFile": "NIA_SL_WORD0218_REAL01_D.mp4"
  },
  {
    "id": "cat09_016",
    "category": "cat09",
    "name": "분필",
    "emoji": "📚",
    "aihubWord": "분필",
    "videoFile": "NIA_SL_WORD0224_REAL01_D.mp4"
  },
  {
    "id": "cat09_017",
    "category": "cat09",
    "name": "상장",
    "emoji": "📚",
    "aihubWord": "상장",
    "videoFile": "NIA_SL_WORD0225_REAL01_D.mp4"
  },
  {
    "id": "cat09_018",
    "category": "cat09",
    "name": "답안지",
    "emoji": "📚",
    "aihubWord": "답안지",
    "videoFile": "NIA_SL_WORD0469_REAL01_D.mp4"
  },
  {
    "id": "cat09_019",
    "category": "cat09",
    "name": "문제지",
    "emoji": "📚",
    "aihubWord": "문제지",
    "videoFile": "NIA_SL_WORD0528_REAL01_D.mp4"
  },
  {
    "id": "cat09_020",
    "category": "cat09",
    "name": "필기시험",
    "emoji": "📚",
    "aihubWord": "필기시험",
    "videoFile": "NIA_SL_WORD0027_REAL01_D.mp4"
  },
  {
    "id": "cat09_021",
    "category": "cat09",
    "name": "유학",
    "emoji": "📚",
    "aihubWord": "유학",
    "videoFile": "NIA_SL_WORD0234_REAL01_D.mp4"
  },
  {
    "id": "cat09_022",
    "category": "cat09",
    "name": "학업",
    "emoji": "📚",
    "aihubWord": "학업",
    "videoFile": "NIA_SL_WORD0227_REAL01_D.mp4"
  },
  {
    "id": "cat09_023",
    "category": "cat09",
    "name": "훈련",
    "emoji": "📚",
    "aihubWord": "훈련",
    "videoFile": "NIA_SL_WORD0241_REAL01_D.mp4"
  },
  {
    "id": "cat09_024",
    "category": "cat09",
    "name": "실습",
    "emoji": "📚",
    "aihubWord": "실습",
    "videoFile": "NIA_SL_WORD0228_REAL01_D.mp4"
  },
  {
    "id": "cat09_025",
    "category": "cat09",
    "name": "자습",
    "emoji": "📚",
    "aihubWord": "자습",
    "videoFile": "NIA_SL_WORD0483_REAL01_D.mp4"
  },
  {
    "id": "cat09_026",
    "category": "cat09",
    "name": "학습",
    "emoji": "📚",
    "aihubWord": "학습",
    "videoFile": "NIA_SL_WORD0412_REAL01_D.mp4"
  },
  {
    "id": "cat09_027",
    "category": "cat09",
    "name": "재학",
    "emoji": "📚",
    "aihubWord": "재학",
    "videoFile": "NIA_SL_WORD0237_REAL01_D.mp4"
  },
  {
    "id": "cat09_028",
    "category": "cat09",
    "name": "연구",
    "emoji": "📚",
    "aihubWord": "연구",
    "videoFile": "NIA_SL_WORD0238_REAL01_D.mp4"
  },
  {
    "id": "cat09_029",
    "category": "cat09",
    "name": "연구소",
    "emoji": "📚",
    "aihubWord": "연구소",
    "videoFile": "NIA_SL_WORD0231_REAL01_D.mp4"
  },
  {
    "id": "cat09_030",
    "category": "cat09",
    "name": "연구실",
    "emoji": "📚",
    "aihubWord": "연구실",
    "videoFile": "NIA_SL_WORD0232_REAL01_D.mp4"
  },
  {
    "id": "cat09_031",
    "category": "cat09",
    "name": "동화책",
    "emoji": "📚",
    "aihubWord": "동화책",
    "videoFile": "NIA_SL_WORD0267_REAL01_D.mp4"
  },
  {
    "id": "cat09_032",
    "category": "cat09",
    "name": "문학",
    "emoji": "📚",
    "aihubWord": "문학",
    "videoFile": "NIA_SL_WORD0269_REAL01_D.mp4"
  },
  {
    "id": "cat09_033",
    "category": "cat09",
    "name": "예절",
    "emoji": "📚",
    "aihubWord": "예절",
    "videoFile": "NIA_SL_WORD0219_REAL01_D.mp4"
  },
  {
    "id": "cat09_034",
    "category": "cat09",
    "name": "국어학",
    "emoji": "📚",
    "aihubWord": "국어학",
    "videoFile": "NIA_SL_WORD0217_REAL01_D.mp4"
  },
  {
    "id": "cat10_001",
    "category": "cat10",
    "name": "요리사",
    "emoji": "💼",
    "aihubWord": "요리사",
    "videoFile": "NIA_SL_WORD0159_REAL01_D.mp4"
  },
  {
    "id": "cat10_002",
    "category": "cat10",
    "name": "가수",
    "emoji": "💼",
    "aihubWord": "가수",
    "videoFile": "NIA_SL_WORD0133_REAL01_D.mp4"
  },
  {
    "id": "cat10_003",
    "category": "cat10",
    "name": "디자이너",
    "emoji": "💼",
    "aihubWord": "디자이너",
    "videoFile": "NIA_SL_WORD0147_REAL01_D.mp4"
  },
  {
    "id": "cat10_004",
    "category": "cat10",
    "name": "운동선수",
    "emoji": "💼",
    "aihubWord": "운동선수",
    "videoFile": "NIA_SL_WORD0161_REAL01_D.mp4"
  },
  {
    "id": "cat10_005",
    "category": "cat10",
    "name": "통역사",
    "emoji": "💼",
    "aihubWord": "통역사",
    "videoFile": "NIA_SL_WORD0174_REAL01_D.mp4"
  },
  {
    "id": "cat10_006",
    "category": "cat10",
    "name": "예술가",
    "emoji": "💼",
    "aihubWord": "예술가",
    "videoFile": "NIA_SL_WORD0157_REAL01_D.mp4"
  },
  {
    "id": "cat10_007",
    "category": "cat10",
    "name": "음악가",
    "emoji": "💼",
    "aihubWord": "음악가",
    "videoFile": "NIA_SL_WORD0271_REAL01_D.mp4"
  },
  {
    "id": "cat10_008",
    "category": "cat10",
    "name": "사진작가",
    "emoji": "💼",
    "aihubWord": "사진작가",
    "videoFile": "NIA_SL_WORD0614_REAL01_D.mp4"
  },
  {
    "id": "cat10_009",
    "category": "cat10",
    "name": "출근",
    "emoji": "💼",
    "aihubWord": "출근",
    "videoFile": "NIA_SL_WORD0170_REAL01_D.mp4"
  },
  {
    "id": "cat10_010",
    "category": "cat10",
    "name": "근무",
    "emoji": "💼",
    "aihubWord": "근무",
    "videoFile": "NIA_SL_WORD0173_REAL01_D.mp4"
  },
  {
    "id": "cat10_011",
    "category": "cat10",
    "name": "사무실",
    "emoji": "💼",
    "aihubWord": "사무실",
    "videoFile": "NIA_SL_WORD2183_REAL01_D.mp4"
  },
  {
    "id": "cat10_012",
    "category": "cat10",
    "name": "직원",
    "emoji": "💼",
    "aihubWord": "직원",
    "videoFile": "NIA_SL_WORD2184_REAL01_D.mp4"
  },
  {
    "id": "cat10_013",
    "category": "cat10",
    "name": "사장",
    "emoji": "💼",
    "aihubWord": "사장",
    "videoFile": "NIA_SL_WORD2185_REAL01_D.mp4"
  },
  {
    "id": "cat10_014",
    "category": "cat10",
    "name": "아르바이트",
    "emoji": "💼",
    "aihubWord": "아르바이트",
    "videoFile": "NIA_SL_WORD0203_REAL01_D.mp4"
  },
  {
    "id": "cat10_015",
    "category": "cat10",
    "name": "취업",
    "emoji": "💼",
    "aihubWord": "취업",
    "videoFile": "NIA_SL_WORD2196_REAL01_D.mp4"
  },
  {
    "id": "cat10_016",
    "category": "cat10",
    "name": "구직",
    "emoji": "💼",
    "aihubWord": "구직",
    "videoFile": "NIA_SL_WORD0193_REAL01_D.mp4"
  },
  {
    "id": "cat10_017",
    "category": "cat10",
    "name": "월급",
    "emoji": "💼",
    "aihubWord": "월급",
    "videoFile": "NIA_SL_WORD2179_REAL01_D.mp4"
  },
  {
    "id": "cat10_018",
    "category": "cat10",
    "name": "고용",
    "emoji": "💼",
    "aihubWord": "고용",
    "videoFile": "NIA_SL_WORD0190_REAL01_D.mp4"
  },
  {
    "id": "cat10_019",
    "category": "cat10",
    "name": "퇴사",
    "emoji": "💼",
    "aihubWord": "퇴사",
    "videoFile": "NIA_SL_WORD0175_REAL01_D.mp4"
  },
  {
    "id": "cat10_020",
    "category": "cat10",
    "name": "재택근무",
    "emoji": "💼",
    "aihubWord": "재택근무",
    "videoFile": "NIA_SL_WORD0166_REAL01_D.mp4"
  },
  {
    "id": "cat10_021",
    "category": "cat10",
    "name": "회식",
    "emoji": "💼",
    "aihubWord": "회식",
    "videoFile": "NIA_SL_WORD0183_REAL01_D.mp4"
  },
  {
    "id": "cat10_022",
    "category": "cat10",
    "name": "사직",
    "emoji": "💼",
    "aihubWord": "사직",
    "videoFile": "NIA_SL_WORD0176_REAL01_D.mp4"
  },
  {
    "id": "cat10_023",
    "category": "cat10",
    "name": "퇴임",
    "emoji": "💼",
    "aihubWord": "퇴임",
    "videoFile": "NIA_SL_WORD0162_REAL01_D.mp4"
  },
  {
    "id": "cat10_024",
    "category": "cat10",
    "name": "기술자",
    "emoji": "💼",
    "aihubWord": "기술자",
    "videoFile": "NIA_SL_WORD2180_REAL01_D.mp4"
  },
  {
    "id": "cat10_025",
    "category": "cat10",
    "name": "농부",
    "emoji": "💼",
    "aihubWord": "농부",
    "videoFile": "NIA_SL_WORD0774_REAL01_D.mp4"
  },
  {
    "id": "cat10_026",
    "category": "cat10",
    "name": "마술사",
    "emoji": "💼",
    "aihubWord": "마술사",
    "videoFile": "NIA_SL_WORD0498_REAL01_D.mp4"
  },
  {
    "id": "cat10_027",
    "category": "cat10",
    "name": "교육자",
    "emoji": "💼",
    "aihubWord": "교육자",
    "videoFile": "NIA_SL_WORD0216_REAL01_D.mp4"
  },
  {
    "id": "cat10_028",
    "category": "cat10",
    "name": "화가",
    "emoji": "💼",
    "aihubWord": "화가",
    "videoFile": "NIA_SL_WORD2201_REAL01_D.mp4"
  },
  {
    "id": "cat10_029",
    "category": "cat10",
    "name": "수집가",
    "emoji": "💼",
    "aihubWord": "수집가",
    "videoFile": "NIA_SL_WORD0053_REAL01_D.mp4"
  },
  {
    "id": "cat11_001",
    "category": "cat11",
    "name": "관광버스",
    "emoji": "📍",
    "aihubWord": "관광버스",
    "videoFile": "NIA_SL_WORD0139_REAL01_D.mp4"
  },
  {
    "id": "cat11_002",
    "category": "cat11",
    "name": "마을버스",
    "emoji": "📍",
    "aihubWord": "마을버스",
    "videoFile": "NIA_SL_WORD0148_REAL01_D.mp4"
  },
  {
    "id": "cat11_003",
    "category": "cat11",
    "name": "구급차",
    "emoji": "📍",
    "aihubWord": "구급차",
    "videoFile": "NIA_SL_WORD0149_REAL01_D.mp4"
  },
  {
    "id": "cat11_004",
    "category": "cat11",
    "name": "여객선",
    "emoji": "📍",
    "aihubWord": "여객선",
    "videoFile": "NIA_SL_WORD0154_REAL01_D.mp4"
  },
  {
    "id": "cat11_005",
    "category": "cat11",
    "name": "여행사",
    "emoji": "📍",
    "aihubWord": "여행사",
    "videoFile": "NIA_SL_WORD0155_REAL01_D.mp4"
  },
  {
    "id": "cat11_006",
    "category": "cat11",
    "name": "자가용",
    "emoji": "📍",
    "aihubWord": "자가용",
    "videoFile": "NIA_SL_WORD0165_REAL01_D.mp4"
  },
  {
    "id": "cat11_007",
    "category": "cat11",
    "name": "기차역",
    "emoji": "📍",
    "aihubWord": "기차역",
    "videoFile": "NIA_SL_WORD0156_REAL01_D.mp4"
  },
  {
    "id": "cat11_008",
    "category": "cat11",
    "name": "공항",
    "emoji": "📍",
    "aihubWord": "공항",
    "videoFile": "NIA_SL_WORD2177_REAL01_D.mp4"
  },
  {
    "id": "cat11_009",
    "category": "cat11",
    "name": "주차장",
    "emoji": "📍",
    "aihubWord": "주차장",
    "videoFile": "NIA_SL_WORD0168_REAL01_D.mp4"
  },
  {
    "id": "cat11_010",
    "category": "cat11",
    "name": "주유소",
    "emoji": "📍",
    "aihubWord": "주유소",
    "videoFile": "NIA_SL_WORD0206_REAL01_D.mp4"
  },
  {
    "id": "cat11_011",
    "category": "cat11",
    "name": "터미널",
    "emoji": "📍",
    "aihubWord": "터미널",
    "videoFile": "NIA_SL_WORD0172_REAL01_D.mp4"
  },
  {
    "id": "cat11_012",
    "category": "cat11",
    "name": "백화점",
    "emoji": "📍",
    "aihubWord": "백화점",
    "videoFile": "NIA_SL_WORD0197_REAL01_D.mp4"
  },
  {
    "id": "cat11_013",
    "category": "cat11",
    "name": "경찰서",
    "emoji": "📍",
    "aihubWord": "경찰서",
    "videoFile": "NIA_SL_WORD0136_REAL01_D.mp4"
  },
  {
    "id": "cat11_014",
    "category": "cat11",
    "name": "보건소",
    "emoji": "📍",
    "aihubWord": "보건소",
    "videoFile": "NIA_SL_WORD0041_REAL01_D.mp4"
  },
  {
    "id": "cat11_015",
    "category": "cat11",
    "name": "찻길",
    "emoji": "📍",
    "aihubWord": "찻길",
    "videoFile": "NIA_SL_WORD0142_REAL01_D.mp4"
  },
  {
    "id": "cat11_016",
    "category": "cat11",
    "name": "사거리",
    "emoji": "📍",
    "aihubWord": "사거리",
    "videoFile": "NIA_SL_WORD0417_REAL01_D.mp4"
  },
  {
    "id": "cat11_017",
    "category": "cat11",
    "name": "버스값",
    "emoji": "📍",
    "aihubWord": "버스값",
    "videoFile": "NIA_SL_WORD0192_REAL01_D.mp4"
  },
  {
    "id": "cat11_018",
    "category": "cat11",
    "name": "예식장",
    "emoji": "📍",
    "aihubWord": "예식장",
    "videoFile": "NIA_SL_WORD0055_REAL01_D.mp4"
  },
  {
    "id": "cat11_019",
    "category": "cat11",
    "name": "주민센터",
    "emoji": "📍",
    "aihubWord": "주민센터",
    "videoFile": "NIA_SL_WORD0489_REAL01_D.mp4"
  },
  {
    "id": "cat11_020",
    "category": "cat11",
    "name": "낚시터",
    "emoji": "📍",
    "aihubWord": "낚시터",
    "videoFile": "NIA_SL_WORD0031_REAL01_D.mp4"
  },
  {
    "id": "cat11_021",
    "category": "cat11",
    "name": "매표소",
    "emoji": "📍",
    "aihubWord": "매표소",
    "videoFile": "NIA_SL_WORD0035_REAL01_D.mp4"
  },
  {
    "id": "cat11_022",
    "category": "cat11",
    "name": "축구장",
    "emoji": "📍",
    "aihubWord": "축구장",
    "videoFile": "NIA_SL_WORD0063_REAL01_D.mp4"
  },
  {
    "id": "cat11_023",
    "category": "cat11",
    "name": "수영장",
    "emoji": "📍",
    "aihubWord": "수영장",
    "videoFile": "NIA_SL_WORD0655_REAL01_D.mp4"
  },
  {
    "id": "cat12_001",
    "category": "cat12",
    "name": "강",
    "emoji": "🌤️",
    "aihubWord": "강",
    "videoFile": "NIA_SL_WORD0285_REAL01_D.mp4"
  },
  {
    "id": "cat12_002",
    "category": "cat12",
    "name": "바다",
    "emoji": "🌤️",
    "aihubWord": "바다",
    "videoFile": "NIA_SL_WORD2546_REAL01_D.mp4"
  },
  {
    "id": "cat12_003",
    "category": "cat12",
    "name": "하늘",
    "emoji": "🌤️",
    "aihubWord": "하늘",
    "videoFile": "NIA_SL_WORD0290_REAL01_D.mp4"
  },
  {
    "id": "cat12_004",
    "category": "cat12",
    "name": "숲",
    "emoji": "🌤️",
    "aihubWord": "숲",
    "videoFile": "NIA_SL_WORD2558_REAL01_D.mp4"
  },
  {
    "id": "cat12_005",
    "category": "cat12",
    "name": "달빛",
    "emoji": "🌤️",
    "aihubWord": "달빛",
    "videoFile": "NIA_SL_WORD0286_REAL01_D.mp4"
  },
  {
    "id": "cat12_006",
    "category": "cat12",
    "name": "파도",
    "emoji": "🌤️",
    "aihubWord": "파도",
    "videoFile": "NIA_SL_WORD0289_REAL01_D.mp4"
  },
  {
    "id": "cat12_007",
    "category": "cat12",
    "name": "장마",
    "emoji": "🌤️",
    "aihubWord": "장마",
    "videoFile": "NIA_SL_WORD0287_REAL01_D.mp4"
  },
  {
    "id": "cat12_008",
    "category": "cat12",
    "name": "강풍",
    "emoji": "🌤️",
    "aihubWord": "강풍",
    "videoFile": "NIA_SL_WORD0404_REAL01_D.mp4"
  },
  {
    "id": "cat12_009",
    "category": "cat12",
    "name": "강아지",
    "emoji": "🌤️",
    "aihubWord": "강아지",
    "videoFile": "NIA_SL_WORD0292_REAL01_D.mp4"
  },
  {
    "id": "cat12_010",
    "category": "cat12",
    "name": "참새",
    "emoji": "🌤️",
    "aihubWord": "참새",
    "videoFile": "NIA_SL_WORD0308_REAL01_D.mp4"
  },
  {
    "id": "cat12_011",
    "category": "cat12",
    "name": "송아지",
    "emoji": "🌤️",
    "aihubWord": "송아지",
    "videoFile": "NIA_SL_WORD0304_REAL01_D.mp4"
  },
  {
    "id": "cat12_012",
    "category": "cat12",
    "name": "망아지",
    "emoji": "🌤️",
    "aihubWord": "망아지",
    "videoFile": "NIA_SL_WORD0507_REAL01_D.mp4"
  },
  {
    "id": "cat12_013",
    "category": "cat12",
    "name": "꿀벌",
    "emoji": "🌤️",
    "aihubWord": "꿀벌",
    "videoFile": "NIA_SL_WORD2585_REAL01_D.mp4"
  },
  {
    "id": "cat12_014",
    "category": "cat12",
    "name": "기린",
    "emoji": "🌤️",
    "aihubWord": "기린",
    "videoFile": "NIA_SL_WORD2584_REAL01_D.mp4"
  },
  {
    "id": "cat12_015",
    "category": "cat12",
    "name": "벚꽃",
    "emoji": "🌤️",
    "aihubWord": "벚꽃",
    "videoFile": "NIA_SL_WORD0301_REAL01_D.mp4"
  },
  {
    "id": "cat12_016",
    "category": "cat12",
    "name": "무궁화",
    "emoji": "🌤️",
    "aihubWord": "무궁화",
    "videoFile": "NIA_SL_WORD0299_REAL01_D.mp4"
  },
  {
    "id": "cat12_017",
    "category": "cat12",
    "name": "연꽃",
    "emoji": "🌤️",
    "aihubWord": "연꽃",
    "videoFile": "NIA_SL_WORD0307_REAL01_D.mp4"
  },
  {
    "id": "cat12_018",
    "category": "cat12",
    "name": "꽃씨",
    "emoji": "🌤️",
    "aihubWord": "꽃씨",
    "videoFile": "NIA_SL_WORD0295_REAL01_D.mp4"
  },
  {
    "id": "cat12_019",
    "category": "cat12",
    "name": "꽃잎",
    "emoji": "🌤️",
    "aihubWord": "꽃잎",
    "videoFile": "NIA_SL_WORD0296_REAL01_D.mp4"
  },
  {
    "id": "cat12_020",
    "category": "cat12",
    "name": "솔잎",
    "emoji": "🌤️",
    "aihubWord": "솔잎",
    "videoFile": "NIA_SL_WORD0303_REAL01_D.mp4"
  },
  {
    "id": "cat12_021",
    "category": "cat12",
    "name": "가시나무",
    "emoji": "🌤️",
    "aihubWord": "가시나무",
    "videoFile": "NIA_SL_WORD0291_REAL01_D.mp4"
  },
  {
    "id": "cat12_022",
    "category": "cat12",
    "name": "밤나무",
    "emoji": "🌤️",
    "aihubWord": "밤나무",
    "videoFile": "NIA_SL_WORD0300_REAL01_D.mp4"
  },
  {
    "id": "cat12_023",
    "category": "cat12",
    "name": "감나무",
    "emoji": "🌤️",
    "aihubWord": "감나무",
    "videoFile": "NIA_SL_WORD2582_REAL01_D.mp4"
  },
  {
    "id": "cat12_024",
    "category": "cat12",
    "name": "구렁이",
    "emoji": "🌤️",
    "aihubWord": "구렁이",
    "videoFile": "NIA_SL_WORD0293_REAL01_D.mp4"
  },
  {
    "id": "cat12_025",
    "category": "cat12",
    "name": "까마귀",
    "emoji": "🌤️",
    "aihubWord": "까마귀",
    "videoFile": "NIA_SL_WORD0294_REAL01_D.mp4"
  },
  {
    "id": "cat12_026",
    "category": "cat12",
    "name": "깃털",
    "emoji": "🌤️",
    "aihubWord": "깃털",
    "videoFile": "NIA_SL_WORD0302_REAL01_D.mp4"
  },
  {
    "id": "cat12_027",
    "category": "cat12",
    "name": "양털",
    "emoji": "🌤️",
    "aihubWord": "양털",
    "videoFile": "NIA_SL_WORD0306_REAL01_D.mp4"
  },
  {
    "id": "cat12_028",
    "category": "cat12",
    "name": "햇빛",
    "emoji": "🌤️",
    "aihubWord": "햇빛",
    "videoFile": "NIA_SL_WORD2580_REAL01_D.mp4"
  },
  {
    "id": "cat12_029",
    "category": "cat12",
    "name": "홍수",
    "emoji": "🌤️",
    "aihubWord": "홍수",
    "videoFile": "NIA_SL_WORD2581_REAL01_D.mp4"
  },
  {
    "id": "cat12_030",
    "category": "cat12",
    "name": "먹구름",
    "emoji": "🌤️",
    "aihubWord": "먹구름",
    "videoFile": "NIA_SL_WORD2544_REAL01_D.mp4"
  },
  {
    "id": "cat12_031",
    "category": "cat12",
    "name": "강물",
    "emoji": "🌤️",
    "aihubWord": "강물",
    "videoFile": "NIA_SL_WORD2533_REAL01_D.mp4"
  },
  {
    "id": "cat12_032",
    "category": "cat12",
    "name": "별",
    "emoji": "🌤️",
    "aihubWord": "별",
    "videoFile": "NIA_SL_WORD2551_REAL01_D.mp4"
  },
  {
    "id": "cat12_033",
    "category": "cat12",
    "name": "호수",
    "emoji": "🌤️",
    "aihubWord": "호수",
    "videoFile": "NIA_SL_WORD2561_REAL01_D.mp4"
  },
  {
    "id": "cat13_001",
    "category": "cat13",
    "name": "갈색",
    "emoji": "🎨",
    "aihubWord": "갈색",
    "videoFile": "NIA_SL_WORD0310_REAL01_D.mp4"
  },
  {
    "id": "cat13_002",
    "category": "cat13",
    "name": "보라색",
    "emoji": "🎨",
    "aihubWord": "보라색",
    "videoFile": "NIA_SL_WORD0322_REAL01_D.mp4"
  },
  {
    "id": "cat13_003",
    "category": "cat13",
    "name": "황금색",
    "emoji": "🎨",
    "aihubWord": "황금색",
    "videoFile": "NIA_SL_WORD0348_REAL01_D.mp4"
  },
  {
    "id": "cat13_004",
    "category": "cat13",
    "name": "흑백",
    "emoji": "🎨",
    "aihubWord": "흑백",
    "videoFile": "NIA_SL_WORD0349_REAL01_D.mp4"
  },
  {
    "id": "cat13_005",
    "category": "cat13",
    "name": "노랑",
    "emoji": "🎨",
    "aihubWord": "노랑",
    "videoFile": "NIA_SL_WORD1323_REAL01_D.mp4"
  },
  {
    "id": "cat13_006",
    "category": "cat13",
    "name": "빨강",
    "emoji": "🎨",
    "aihubWord": "빨강",
    "videoFile": "NIA_SL_WORD1322_REAL01_D.mp4"
  },
  {
    "id": "cat13_007",
    "category": "cat13",
    "name": "파랑",
    "emoji": "🎨",
    "aihubWord": "파랑",
    "videoFile": "NIA_SL_WORD1325_REAL01_D.mp4"
  },
  {
    "id": "cat13_008",
    "category": "cat13",
    "name": "초록",
    "emoji": "🎨",
    "aihubWord": "초록",
    "videoFile": "NIA_SL_WORD1324_REAL01_D.mp4"
  },
  {
    "id": "cat13_009",
    "category": "cat13",
    "name": "흰",
    "emoji": "🎨",
    "aihubWord": "흰",
    "videoFile": "NIA_SL_WORD1121_REAL01_D.mp4"
  },
  {
    "id": "cat13_010",
    "category": "cat13",
    "name": "검정",
    "emoji": "🎨",
    "aihubWord": "검정",
    "videoFile": "NIA_SL_WORD1321_REAL01_D.mp4"
  },
  {
    "id": "cat13_011",
    "category": "cat13",
    "name": "분홍조명",
    "emoji": "🎨",
    "aihubWord": "분홍조명",
    "videoFile": "NIA_SL_WORD0323_REAL01_D.mp4"
  },
  {
    "id": "cat13_012",
    "category": "cat13",
    "name": "최대",
    "emoji": "🎨",
    "aihubWord": "최대",
    "videoFile": "NIA_SL_WORD0342_REAL01_D.mp4"
  },
  {
    "id": "cat13_013",
    "category": "cat13",
    "name": "최소",
    "emoji": "🎨",
    "aihubWord": "최소",
    "videoFile": "NIA_SL_WORD0343_REAL01_D.mp4"
  },
  {
    "id": "cat13_014",
    "category": "cat13",
    "name": "최상급",
    "emoji": "🎨",
    "aihubWord": "최상급",
    "videoFile": "NIA_SL_WORD0311_REAL01_D.mp4"
  },
  {
    "id": "cat13_015",
    "category": "cat13",
    "name": "갑절",
    "emoji": "🎨",
    "aihubWord": "갑절",
    "videoFile": "NIA_SL_WORD2232_REAL01_D.mp4"
  },
  {
    "id": "cat13_016",
    "category": "cat13",
    "name": "한명",
    "emoji": "🎨",
    "aihubWord": "한명",
    "videoFile": "NIA_SL_WORD1109_REAL01_D.mp4"
  },
  {
    "id": "cat13_017",
    "category": "cat13",
    "name": "두명",
    "emoji": "🎨",
    "aihubWord": "두명",
    "videoFile": "NIA_SL_WORD1305_REAL01_D.mp4"
  },
  {
    "id": "cat13_018",
    "category": "cat13",
    "name": "세명",
    "emoji": "🎨",
    "aihubWord": "세명",
    "videoFile": "NIA_SL_WORD1306_REAL01_D.mp4"
  },
  {
    "id": "cat13_019",
    "category": "cat13",
    "name": "네명",
    "emoji": "🎨",
    "aihubWord": "네명",
    "videoFile": "NIA_SL_WORD1307_REAL01_D.mp4"
  },
  {
    "id": "cat13_020",
    "category": "cat13",
    "name": "다섯명",
    "emoji": "🎨",
    "aihubWord": "다섯명",
    "videoFile": "NIA_SL_WORD1308_REAL01_D.mp4"
  },
  {
    "id": "cat13_021",
    "category": "cat13",
    "name": "여섯명",
    "emoji": "🎨",
    "aihubWord": "여섯명",
    "videoFile": "NIA_SL_WORD1309_REAL01_D.mp4"
  },
  {
    "id": "cat13_022",
    "category": "cat13",
    "name": "한국어",
    "emoji": "🎨",
    "aihubWord": "한국어",
    "videoFile": "NIA_SL_WORD2199_REAL01_D.mp4"
  },
  {
    "id": "cat13_023",
    "category": "cat13",
    "name": "독일어",
    "emoji": "🎨",
    "aihubWord": "독일어",
    "videoFile": "NIA_SL_WORD0143_REAL01_D.mp4"
  },
  {
    "id": "cat13_024",
    "category": "cat13",
    "name": "영어",
    "emoji": "🎨",
    "aihubWord": "영어",
    "videoFile": "NIA_SL_WORD2596_REAL01_D.mp4"
  },
  {
    "id": "cat13_025",
    "category": "cat13",
    "name": "외국어",
    "emoji": "🎨",
    "aihubWord": "외국어",
    "videoFile": "NIA_SL_WORD0158_REAL01_D.mp4"
  },
  {
    "id": "cat14_001",
    "category": "cat14",
    "name": "배드민턴",
    "emoji": "⚽",
    "aihubWord": "배드민턴",
    "videoFile": "NIA_SL_WORD0038_REAL01_D.mp4"
  },
  {
    "id": "cat14_002",
    "category": "cat14",
    "name": "유도",
    "emoji": "⚽",
    "aihubWord": "유도",
    "videoFile": "NIA_SL_WORD1523_REAL01_D.mp4"
  },
  {
    "id": "cat14_003",
    "category": "cat14",
    "name": "권투",
    "emoji": "⚽",
    "aihubWord": "권투",
    "videoFile": "NIA_SL_WORD1505_REAL01_D.mp4"
  },
  {
    "id": "cat14_004",
    "category": "cat14",
    "name": "마라톤",
    "emoji": "⚽",
    "aihubWord": "마라톤",
    "videoFile": "NIA_SL_WORD1525_REAL01_D.mp4"
  },
  {
    "id": "cat14_005",
    "category": "cat14",
    "name": "수영",
    "emoji": "⚽",
    "aihubWord": "수영",
    "videoFile": "NIA_SL_WORD1545_REAL01_D.mp4"
  },
  {
    "id": "cat14_006",
    "category": "cat14",
    "name": "테니스",
    "emoji": "⚽",
    "aihubWord": "테니스",
    "videoFile": "NIA_SL_WORD1564_REAL01_D.mp4"
  },
  {
    "id": "cat14_007",
    "category": "cat14",
    "name": "야구",
    "emoji": "⚽",
    "aihubWord": "야구",
    "videoFile": "NIA_SL_WORD1552_REAL01_D.mp4"
  },
  {
    "id": "cat14_008",
    "category": "cat14",
    "name": "낚시",
    "emoji": "⚽",
    "aihubWord": "낚시",
    "videoFile": "NIA_SL_WORD1511_REAL01_D.mp4"
  },
  {
    "id": "cat14_009",
    "category": "cat14",
    "name": "탈춤",
    "emoji": "⚽",
    "aihubWord": "탈춤",
    "videoFile": "NIA_SL_WORD0353_REAL01_D.mp4"
  },
  {
    "id": "cat14_010",
    "category": "cat14",
    "name": "동아리",
    "emoji": "⚽",
    "aihubWord": "동아리",
    "videoFile": "NIA_SL_WORD0146_REAL01_D.mp4"
  },
  {
    "id": "cat14_011",
    "category": "cat14",
    "name": "올림픽경기",
    "emoji": "⚽",
    "aihubWord": "올림픽경기",
    "videoFile": "NIA_SL_WORD0056_REAL01_D.mp4"
  },
  {
    "id": "cat14_012",
    "category": "cat14",
    "name": "운동경기",
    "emoji": "⚽",
    "aihubWord": "운동경기",
    "videoFile": "NIA_SL_WORD0059_REAL01_D.mp4"
  },
  {
    "id": "cat14_013",
    "category": "cat14",
    "name": "결승전",
    "emoji": "⚽",
    "aihubWord": "결승전",
    "videoFile": "NIA_SL_WORD0030_REAL01_D.mp4"
  },
  {
    "id": "cat14_014",
    "category": "cat14",
    "name": "코치",
    "emoji": "⚽",
    "aihubWord": "코치",
    "videoFile": "NIA_SL_WORD0171_REAL01_D.mp4"
  },
  {
    "id": "cat14_015",
    "category": "cat14",
    "name": "동메달",
    "emoji": "⚽",
    "aihubWord": "동메달",
    "videoFile": "NIA_SL_WORD0488_REAL01_D.mp4"
  },
  {
    "id": "cat14_016",
    "category": "cat14",
    "name": "우승",
    "emoji": "⚽",
    "aihubWord": "우승",
    "videoFile": "NIA_SL_WORD0756_REAL01_D.mp4"
  },
  {
    "id": "cat14_017",
    "category": "cat14",
    "name": "골키퍼",
    "emoji": "⚽",
    "aihubWord": "골키퍼",
    "videoFile": "NIA_SL_WORD1502_REAL01_D.mp4"
  },
  {
    "id": "cat14_018",
    "category": "cat14",
    "name": "승부차기",
    "emoji": "⚽",
    "aihubWord": "승부차기",
    "videoFile": "NIA_SL_WORD1546_REAL01_D.mp4"
  },
  {
    "id": "cat14_019",
    "category": "cat14",
    "name": "등산",
    "emoji": "⚽",
    "aihubWord": "등산",
    "videoFile": "NIA_SL_WORD1162_REAL01_D.mp4"
  },
  {
    "id": "cat14_020",
    "category": "cat14",
    "name": "물놀이",
    "emoji": "⚽",
    "aihubWord": "물놀이",
    "videoFile": "NIA_SL_WORD2130_REAL01_D.mp4"
  },
  {
    "id": "cat14_021",
    "category": "cat14",
    "name": "관광",
    "emoji": "⚽",
    "aihubWord": "관광",
    "videoFile": "NIA_SL_WORD2057_REAL01_D.mp4"
  },
  {
    "id": "cat15_001",
    "category": "cat15",
    "name": "축하",
    "emoji": "🎉",
    "aihubWord": "축하",
    "videoFile": "NIA_SL_WORD0258_REAL01_D.mp4"
  },
  {
    "id": "cat15_002",
    "category": "cat15",
    "name": "생일",
    "emoji": "🎉",
    "aihubWord": "생일",
    "videoFile": "NIA_SL_WORD2136_REAL01_D.mp4"
  },
  {
    "id": "cat15_003",
    "category": "cat15",
    "name": "결혼",
    "emoji": "🎉",
    "aihubWord": "결혼",
    "videoFile": "NIA_SL_WORD1497_REAL01_D.mp4"
  },
  {
    "id": "cat15_004",
    "category": "cat15",
    "name": "결혼식",
    "emoji": "🎉",
    "aihubWord": "결혼식",
    "videoFile": "NIA_SL_WORD2116_REAL01_D.mp4"
  },
  {
    "id": "cat15_005",
    "category": "cat15",
    "name": "환갑",
    "emoji": "🎉",
    "aihubWord": "환갑",
    "videoFile": "NIA_SL_WORD2171_REAL01_D.mp4"
  },
  {
    "id": "cat15_006",
    "category": "cat15",
    "name": "백일잔치",
    "emoji": "🎉",
    "aihubWord": "백일잔치",
    "videoFile": "NIA_SL_WORD0561_REAL01_D.mp4"
  },
  {
    "id": "cat15_007",
    "category": "cat15",
    "name": "채팅",
    "emoji": "🎉",
    "aihubWord": "채팅",
    "videoFile": "NIA_SL_WORD0169_REAL01_D.mp4"
  },
  {
    "id": "cat15_008",
    "category": "cat15",
    "name": "화상채팅",
    "emoji": "🎉",
    "aihubWord": "화상채팅",
    "videoFile": "NIA_SL_WORD0182_REAL01_D.mp4"
  },
  {
    "id": "cat15_009",
    "category": "cat15",
    "name": "후원",
    "emoji": "🎉",
    "aihubWord": "후원",
    "videoFile": "NIA_SL_WORD0185_REAL01_D.mp4"
  },
  {
    "id": "cat15_010",
    "category": "cat15",
    "name": "명예",
    "emoji": "🎉",
    "aihubWord": "명예",
    "videoFile": "NIA_SL_WORD0517_REAL01_D.mp4"
  },
  {
    "id": "cat15_011",
    "category": "cat15",
    "name": "희생",
    "emoji": "🎉",
    "aihubWord": "희생",
    "videoFile": "NIA_SL_WORD0186_REAL01_D.mp4"
  },
  {
    "id": "cat15_012",
    "category": "cat15",
    "name": "병문안",
    "emoji": "🎉",
    "aihubWord": "병문안",
    "videoFile": "NIA_SL_WORD0028_REAL01_D.mp4"
  },
  {
    "id": "cat15_013",
    "category": "cat15",
    "name": "회복",
    "emoji": "🎉",
    "aihubWord": "회복",
    "videoFile": "NIA_SL_WORD0057_REAL01_D.mp4"
  },
  {
    "id": "cat15_014",
    "category": "cat15",
    "name": "국기",
    "emoji": "🎉",
    "aihubWord": "국기",
    "videoFile": "NIA_SL_WORD0423_REAL01_D.mp4"
  },
  {
    "id": "cat15_015",
    "category": "cat15",
    "name": "태극기",
    "emoji": "🎉",
    "aihubWord": "태극기",
    "videoFile": "NIA_SL_WORD0903_REAL01_D.mp4"
  },
  {
    "id": "cat15_016",
    "category": "cat15",
    "name": "독립",
    "emoji": "🎉",
    "aihubWord": "독립",
    "videoFile": "NIA_SL_WORD0424_REAL01_D.mp4"
  },
  {
    "id": "cat15_017",
    "category": "cat15",
    "name": "금연",
    "emoji": "🎉",
    "aihubWord": "금연",
    "videoFile": "NIA_SL_WORD0437_REAL01_D.mp4"
  },
  {
    "id": "cat15_018",
    "category": "cat15",
    "name": "금주",
    "emoji": "🎉",
    "aihubWord": "금주",
    "videoFile": "NIA_SL_WORD0439_REAL01_D.mp4"
  },
  {
    "id": "cat15_019",
    "category": "cat15",
    "name": "금식",
    "emoji": "🎉",
    "aihubWord": "금식",
    "videoFile": "NIA_SL_WORD0435_REAL01_D.mp4"
  },
  {
    "id": "cat15_020",
    "category": "cat15",
    "name": "장애인",
    "emoji": "🎉",
    "aihubWord": "장애인",
    "videoFile": "NIA_SL_WORD0020_REAL01_D.mp4"
  },
  {
    "id": "cat15_021",
    "category": "cat15",
    "name": "농인",
    "emoji": "🎉",
    "aihubWord": "농인",
    "videoFile": "NIA_SL_WORD0461_REAL01_D.mp4"
  },
  {
    "id": "cat15_022",
    "category": "cat15",
    "name": "회개",
    "emoji": "🎉",
    "aihubWord": "회개",
    "videoFile": "NIA_SL_WORD0259_REAL01_D.mp4"
  },
  {
    "id": "cat15_023",
    "category": "cat15",
    "name": "구조",
    "emoji": "🎉",
    "aihubWord": "구조",
    "videoFile": "NIA_SL_WORD1588_REAL01_D.mp4"
  },
  {
    "id": "cat15_024",
    "category": "cat15",
    "name": "보호",
    "emoji": "🎉",
    "aihubWord": "보호",
    "videoFile": "NIA_SL_WORD0363_REAL01_D.mp4"
  }
];

const STUDY_CATEGORY_META = {
  jamo:    { label: '지문자', emoji: '🤟' },
  numbers: { label: '지숫자', emoji: '🔢' },
  greet:   { label: '인사',   emoji: '👋' },
  school:  { label: '학교',   emoji: '📚' },
  traffic: { label: '교통',   emoji: '🚌' },
};

const STUDY_CATEGORY_WORDS = {
  greet: [
    ['소개', '소개'], ['상담', '상담'], ['어떻게', '어떻게'], ['얼굴', '얼굴'],
    ['인사법', '인사법'], ['가다', '가다'], ['알다', '알다'], ['모르다', '모르다'],
  ],
  school: [
    ['고등학교', '고등학교'], ['청소년', '청소년'], ['교수', '교수'], ['교실', '교실'],
    ['개학', '개학'], ['평일', '평일'], ['등교', '등교'], ['교탁', '교탁'], ['교육자', '교육자'],
  ],
  traffic: [
    ['관광버스', '관광버스'], ['마을버스', '마을버스'], ['버스값', '버스값'],
    ['기차역', '기차역'], ['가다', '가다'], ['오다', '오다'], ['받다', '받다'],
  ],
};

Object.keys(CATEGORY_META).forEach(key => delete CATEGORY_META[key]);
Object.assign(CATEGORY_META, STUDY_CATEGORY_META);

const NUMBER_SIGNS = SIGNS.filter(sign =>
  sign.category === 'numbers'
  && !['0', '백', '천', '만'].includes(sign.name)
);

const NUMBER_FINGER_POSES = {
  thumb: {
    open: [[-0.22, -0.12, 0], [-0.42, -0.04, 0], [-0.58, 0.02, 0], [-0.74, 0.08, 0]],
    folded: [[-0.22, -0.12, 0.02], [-0.18, -0.28, 0.08], [-0.06, -0.33, 0.12], [0.05, -0.29, 0.14]],
  },
  index: {
    open: [[-0.16, 0.18, 0], [-0.20, 0.50, 0], [-0.20, 0.78, 0], [-0.20, 1.04, 0]],
    folded: [[-0.16, 0.18, 0.04], [-0.10, 0.34, 0.10], [-0.06, 0.16, 0.15], [-0.02, -0.02, 0.18]],
  },
  middle: {
    open: [[0.00, 0.20, 0], [0.00, 0.58, 0], [0.00, 0.90, 0], [0.00, 1.18, 0]],
    folded: [[0.00, 0.20, 0.04], [0.02, 0.38, 0.11], [0.04, 0.17, 0.16], [0.05, -0.03, 0.18]],
  },
  ring: {
    open: [[0.17, 0.17, 0], [0.22, 0.50, 0], [0.24, 0.78, 0], [0.26, 1.02, 0]],
    folded: [[0.17, 0.17, 0.04], [0.16, 0.34, 0.11], [0.13, 0.15, 0.16], [0.11, -0.04, 0.18]],
  },
  pinky: {
    open: [[0.34, 0.10, 0], [0.42, 0.40, 0], [0.46, 0.64, 0], [0.50, 0.88, 0]],
    folded: [[0.34, 0.10, 0.04], [0.30, 0.26, 0.10], [0.22, 0.10, 0.15], [0.18, -0.07, 0.18]],
  },
};

function makeNumberPose(openFingers) {
  const open = new Set(openFingers);
  return [
    [0, -0.22, 0],
    ...(open.has('thumb') ? NUMBER_FINGER_POSES.thumb.open : NUMBER_FINGER_POSES.thumb.folded),
    ...(open.has('index') ? NUMBER_FINGER_POSES.index.open : NUMBER_FINGER_POSES.index.folded),
    ...(open.has('middle') ? NUMBER_FINGER_POSES.middle.open : NUMBER_FINGER_POSES.middle.folded),
    ...(open.has('ring') ? NUMBER_FINGER_POSES.ring.open : NUMBER_FINGER_POSES.ring.folded),
    ...(open.has('pinky') ? NUMBER_FINGER_POSES.pinky.open : NUMBER_FINGER_POSES.pinky.folded),
  ];
}

const NUMBER_STATIC_POSES = {
  '1': makeNumberPose(['index']),
  '2': makeNumberPose(['index', 'middle']),
  '3': makeNumberPose(['index', 'middle', 'ring']),
  '4': makeNumberPose(['index', 'middle', 'ring', 'pinky']),
  '5': makeNumberPose(['thumb', 'index', 'middle', 'ring', 'pinky']),
  '6': makeNumberPose(['thumb', 'pinky']),
  '7': makeNumberPose(['thumb', 'ring', 'pinky']),
  '8': makeNumberPose(['thumb', 'middle', 'ring', 'pinky']),
  '9': makeNumberPose(['thumb', 'index', 'middle', 'ring']),
  '10': makeNumberPose(['thumb']),
};

NUMBER_SIGNS.forEach(sign => {
  const pose = NUMBER_STATIC_POSES[sign.name];
  if (!pose) return;

  delete sign.aihubWord;
  sign.pose = pose;
  sign.sequence = null;
  sign.source = 'number_static';
  sign.dataFormat = 'jamo';
  sign.hands = 1;
  sign.description = `${sign.name} 지숫자 손모양입니다`;
  sign.hint = `${sign.name} 지숫자 손모양을 카메라 앞에서 잠시 유지하세요`;
});

const STUDY_SIGNS = Object.entries(STUDY_CATEGORY_WORDS).flatMap(([category, words]) =>
  words.map(([name, aihubWord], index) => ({
    id: `${category}_${String(index + 1).padStart(2, '0')}`,
    category,
    name,
    emoji: STUDY_CATEGORY_META[category].emoji,
    aihubWord,
  }))
);

SIGNS.splice(0, SIGNS.length, ...NUMBER_SIGNS, ...STUDY_SIGNS);
