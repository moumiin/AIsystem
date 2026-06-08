import { useEffect, useRef, useState } from 'react';
import './App.css';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
];

function rawPoint(arr, index) {
  let x = arr[index * 2];
  let y = arr[index * 2 + 1];
  if (!x || !y) return null;

  if (x <= 1 && y <= 1) {
    x *= 1920;
    y *= 1080;
  }

  return { x, y };
}

function toCanvasPoint(arr, index, width, height, transform) {
  const point = rawPoint(arr, index);
  if (!point) return null;

  if (transform) {
    return {
      x: (point.x - transform.minX) * transform.scale + transform.offsetX,
      y: (point.y - transform.minY) * transform.scale + transform.offsetY,
    };
  }

  return {
    x: point.x / 1920 * width,
    y: point.y / 1080 * height,
  };
}

function buildFrameTransform(feature, width, height) {
  const pose = feature.slice(0, 50);
  const left = feature.slice(50, 100);
  const right = feature.slice(100, 150);
  const points = [];

  [0, 1, 2, 3, 4, 5, 6, 7].forEach(index => {
    const point = rawPoint(pose, index);
    if (point) points.push(point);
  });

  [left, right].forEach(hand => {
    for (let index = 0; index < hand.length / 2; index += 1) {
      const point = rawPoint(hand, index);
      if (point) points.push(point);
    }
  });

  if (points.length < 2) return null;

  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);

  const padX = Math.max(55, (maxX - minX) * 0.14);
  const padY = Math.max(45, (maxY - minY) * 0.12);
  minX -= padX;
  maxX += padX;
  minY -= padY;
  maxY += padY;

  const boxWidth = Math.max(1, maxX - minX);
  const boxHeight = Math.max(1, maxY - minY);
  const scale = Math.min(width / boxWidth, height / boxHeight) * 0.92;
  const offsetX = (width - boxWidth * scale) / 2;
  const offsetY = (height - boxHeight * scale) / 2;

  return { minX, minY, scale, offsetX, offsetY };
}

function drawThickLine(ctx, p1, p2, color, lineWidth = 10) {
  if (!p1 || !p2) return;
  if (Math.hypot(p1.x - p2.x, p1.y - p2.y) > 160) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function drawLine(ctx, points, a, b, width, height, color, transform) {
  const p1 = toCanvasPoint(points, a, width, height, transform);
  const p2 = toCanvasPoint(points, b, width, height, transform);
  if (!p1 || !p2) return;
  if (Math.hypot(p1.x - p2.x, p1.y - p2.y) > 220) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function drawPoints(ctx, arr, width, height, color, size = 2, transform) {
  ctx.fillStyle = color;
  for (let i = 0; i < arr.length; i += 2) {
    const p = toCanvasPoint(arr, i / 2, width, height, transform);
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBodySkeleton(ctx, pose, width, height, transform) {
  const armColor = '#60a5fa';
  [
    [2, 3, armColor, 10],
    [3, 4, armColor, 9],
    [5, 6, armColor, 10],
    [6, 7, armColor, 9],
  ].forEach(([a, b, color, lineWidth]) => {
    drawThickLine(
      ctx,
      toCanvasPoint(pose, a, width, height, transform),
      toCanvasPoint(pose, b, width, height, transform),
      color,
      lineWidth,
    );
  });
}

function drawHead(ctx, pose, width, height, transform) {
  const nose = toCanvasPoint(pose, 0, width, height, transform);
  const neck = toCanvasPoint(pose, 1, width, height, transform);
  if (!nose) return;

  const radius = neck
    ? Math.max(14, Math.min(28, Math.abs(neck.y - nose.y) * 0.8))
    : 18;

  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(nose.x, nose.y - radius * 0.2, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(nose.x - radius * 0.35, nose.y - radius * 0.35, 2.5, 0, Math.PI * 2);
  ctx.arc(nose.x + radius * 0.35, nose.y - radius * 0.35, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawHandSkeleton(ctx, hand, width, height, color, transform) {
  HAND_CONNECTIONS.forEach(([a, b]) => {
    drawLine(ctx, hand, a, b, width, height, color, transform);
  });
}

function drawOpenPoseFrame(ctx, feature, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  if (!feature || feature.length === 0) return;

  const pose = feature.slice(0, 50);
  const left = feature.slice(50, 100);
  const right = feature.slice(100, 150);
  const transform = buildFrameTransform(feature, width, height);

  drawBodySkeleton(ctx, pose, width, height, transform);
  drawHead(ctx, pose, width, height, transform);
  drawHandSkeleton(ctx, left, width, height, '#22c55e', transform);
  drawHandSkeleton(ctx, right, width, height, '#f97316', transform);
  drawPoints(ctx, left, width, height, '#22c55e', 2.4, transform);
  drawPoints(ctx, right, width, height, '#f97316', 2.4, transform);
}

function handLandmarksTo335(results) {
  let feature = [];

  if (results.multiHandLandmarks?.length > 0) {
    for (const landmarks of results.multiHandLandmarks) {
      for (const lm of landmarks) {
        feature.push(lm.x);
        feature.push(lm.y);
      }
    }
  }

  while (feature.length < 335) feature.push(0);
  return feature.slice(0, 335);
}

export default function App() {
  const refCanvasRef = useRef(null);
  const userCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const userSequenceRef = useRef([]);
  const isPracticingRef = useRef(false);

  const [words, setWords] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [currentLabel, setCurrentLabel] = useState('수어 학습');
  const [score, setScore] = useState('-');
  const [feedback, setFeedback] = useState('정답 동작을 선택하세요.');
  const [isPracticing, setIsPracticing] = useState(false);

  useEffect(() => {
    async function loadWords() {
      try {
        const res = await fetch('/api/words');
        const data = await res.json();
        setWords(data.words || []);
        if (data.words?.length > 0) {
          setSelectedFolder(data.words[0].folder);
          setCurrentLabel(data.words[0].label);
        }
      } catch (error) {
        console.error(error);
        setFeedback('단어 목록 로딩 실패');
      }
    }

    loadWords();
    return () => {
      clearInterval(timerRef.current);
      cameraRef.current?.stop?.();
      handsRef.current?.close?.();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = userCanvasRef.current;
    if (!video || !canvas) return;
    if (!window.Hands || !window.Camera) return;

    const ctx = canvas.getContext('2d');
    const hands = new window.Hands({
      locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults(results => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
          const flipped = landmarks.map(lm => ({
            x: 1 - lm.x,
            y: lm.y,
            z: lm.z,
          }));

          window.drawConnectors?.(ctx, flipped, window.HAND_CONNECTIONS, {
            color: '#00ffcc',
            lineWidth: 3,
          });

          window.drawLandmarks?.(ctx, flipped, {
            color: '#ff0066',
            lineWidth: 2,
          });
        }
      }

      if (isPracticingRef.current) {
        userSequenceRef.current.push(handLandmarksTo335(results));
        setFeedback(`사용자 동작 기록 중... ${userSequenceRef.current.length}프레임`);
      }
    });

    const camera = new window.Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
      },
      width: 520,
      height: 390,
    });

    handsRef.current = hands;
    cameraRef.current = camera;
    camera.start().catch(error => {
      console.error(error);
      setFeedback('카메라 시작 실패: 브라우저 권한을 확인해주세요.');
    });
  }, []);

  async function loadReference() {
    const word = words.find(item => item.folder === selectedFolder);
    if (!word) return;

    try {
      const res = await fetch(`/api/reference/${selectedFolder}`);
      const data = await res.json();
      const sequence = data.sequence || [];
      let frameIndex = 0;

      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (sequence.length === 0) return;
        const canvas = refCanvasRef.current;
        drawOpenPoseFrame(
          canvas.getContext('2d'),
          sequence[frameIndex],
          canvas.width,
          canvas.height,
        );
        frameIndex = (frameIndex + 1) % sequence.length;
      }, 33);

      setCurrentLabel(word.label);
      setScore('-');
      setFeedback('정답 수어를 따라해보세요.');
    } catch (error) {
      console.error(error);
      setFeedback('정답 데이터 로딩 실패');
    }
  }

  function startPractice() {
    userSequenceRef.current = [];
    isPracticingRef.current = true;
    setIsPracticing(true);
    setScore('측정 중...');
    setFeedback('사용자 동작 기록 중...');
  }

  async function finishPractice() {
    isPracticingRef.current = false;
    setIsPracticing(false);
    const word = words.find(item => item.folder === selectedFolder);
    if (word) setCurrentLabel(word.label);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder_name: selectedFolder,
          user_sequence: userSequenceRef.current,
        }),
      });
      const data = await res.json();

      if (data.status === 'ok') {
        setScore(`${data.score}%`);
        setFeedback(data.feedback || '채점 완료');
      } else {
        setScore('0%');
        setFeedback(data.message || '채점 실패');
      }
    } catch (error) {
      console.error(error);
      setScore('0%');
      setFeedback('서버 오류 발생');
    }
  }

  return (
    <main className="learning-page">
      <h1>수어 학습 AI</h1>

      <section className="controls">
        <select
          value={selectedFolder}
          onChange={event => {
            const next = words.find(item => item.folder === event.target.value);
            setSelectedFolder(event.target.value);
            if (next) setCurrentLabel(next.label);
          }}
        >
          {words.length === 0 && <option>단어 불러오는 중...</option>}
          {words.map(word => (
            <option key={word.folder} value={word.folder}>{word.label}</option>
          ))}
        </select>
        <button type="button" onClick={loadReference}>정답 동작 보기</button>
        <button type="button" onClick={startPractice}>연습 시작</button>
        <button type="button" onClick={finishPractice}>채점하기</button>
      </section>

      <section className="viewer-grid">
        <article className="panel">
          <h2>정답 수어</h2>
          <canvas ref={refCanvasRef} width="520" height="390" />
        </article>

        <article className="panel">
          <h2>사용자 동작</h2>
          <video ref={videoRef} autoPlay muted playsInline />
          <canvas ref={userCanvasRef} width="520" height="390" />
        </article>
      </section>

      <aside className="status-card">
        <div className="word">{currentLabel}</div>
        <div className="score">점수: {score}</div>
        <div className="feedback">
          {isPracticing ? feedback : feedback}
        </div>
      </aside>
    </main>
  );
}
