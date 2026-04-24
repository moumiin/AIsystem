/**
 * Three.js 3D 손 렌더러
 *
 * 요구 CDN:
 *   Three.js r134, OrbitControls
 */

const HAND_BONE_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],       // 엄지
  [0,5],[5,6],[6,7],[7,8],       // 검지
  [0,9],[9,10],[10,11],[11,12],  // 중지
  [0,13],[13,14],[14,15],[15,16],// 약지
  [0,17],[17,18],[18,19],[19,20],// 새끼
  [5,9],[9,13],[13,17],          // 손바닥 횡연결
];

// 손가락별 관절 인덱스
const FINGER_JOINT_MAP = {
  thumb:  [1,2,3,4],
  index:  [5,6,7,8],
  middle: [9,10,11,12],
  ring:   [13,14,15,16],
  pinky:  [17,18,19,20],
};

const COLOR_DEFAULT  = 0x00d2ff;
const COLOR_BONE_DEF = 0x4fc3f7;
const COLOR_GOOD     = 0x22c55e;
const COLOR_WARN     = 0xf59e0b;
const COLOR_BAD      = 0xef4444;

class HandRenderer {
  /**
   * @param {HTMLCanvasElement} canvasEl - Three.js 렌더링 캔버스
   */
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this._initScene();
    this._buildHandMesh();
    this._startLoop();
    this.currentPose = null;
    this._autoRotate = true;
    this._rotY = 0;
  }

  // ── 씬 초기화 ────────────────────────────────────────────────────────────
  _initScene() {
    const W = this.canvas.clientWidth  || 480;
    const H = this.canvas.clientHeight || 360;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(W, H);
    this.renderer.setClearColor(0x0d1117, 1);

    this.scene = new THREE.Scene();
    this.handGroup = new THREE.Group();
    this.scene.add(this.handGroup);

    // 카메라: 손 전체가 보이도록 위치 설정
    this.camera = new THREE.PerspectiveCamera(42, W / H, 0.01, 100);
    this.camera.position.set(0, 1.05, 3.6);
    this.camera.lookAt(0, 1.0, 0);

    // 조명
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(2, 5, 4);
    this.scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x6c63ff, 0.35);
    fillLight.position.set(-3, 0, -2);
    this.scene.add(fillLight);

    // OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 8;
    this.controls.enablePan = false;

    // 사용자가 드래그하면 자동회전 해제
    this.controls.addEventListener('start', () => { this._autoRotate = false; });

    // 반응형 리사이즈
    new ResizeObserver(() => this.resize()).observe(this.canvas);
  }

  // ── 손 메시 생성 ─────────────────────────────────────────────────────────
  _buildHandMesh() {
    // 관절 구체 21개
    this.joints = [];
    for (let i = 0; i < 21; i++) {
      const isTip = [4,8,12,16,20].includes(i);
      const isWrist = i === 0;
      const r = isWrist ? 0.045 : isTip ? 0.032 : 0.025;

      const geo = new THREE.SphereGeometry(r, 12, 12);
      const mat = new THREE.MeshPhongMaterial({ color: COLOR_DEFAULT, shininess: 100 });
      if (isTip) mat.emissive = new THREE.Color(0x003344);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.handGroup.add(mesh);
      this.joints.push(mesh);
    }

    // 뼈대 실린더
    this.bones = [];
    for (let i = 0; i < HAND_BONE_CONNECTIONS.length; i++) {
      const geo = new THREE.CylinderGeometry(0.011, 0.011, 1, 8);
      const mat = new THREE.MeshPhongMaterial({ color: COLOR_BONE_DEF, shininess: 60 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.handGroup.add(mesh);
      this.bones.push(mesh);
    }
  }

  // ── 뼈대 방향/크기 업데이트 ──────────────────────────────────────────────
  _orientBone(mesh, a, b) {
    const dir = b.clone().sub(a);
    const len = dir.length();
    if (len < 0.001) { mesh.visible = false; return; }

    mesh.visible = true;
    mesh.scale.y = len;
    mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));

    const up = new THREE.Vector3(0, 1, 0);
    const nd = dir.normalize();

    if (Math.abs(up.dot(nd)) > 0.9999) {
      mesh.quaternion.setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        nd.y > 0 ? 0 : Math.PI,
      );
    } else {
      const axis  = up.clone().cross(nd).normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(nd))));
      mesh.quaternion.setFromAxisAngle(axis, angle);
    }
  }

  // ── 포즈 업데이트 ─────────────────────────────────────────────────────────
  /**
   * @param {Array} landmarks - [[x,y,z], ...] 정규화된 Three.js 좌표
   */
  setPose(landmarks) {
    if (!landmarks) return;
    this.currentPose = landmarks;

    const positions = landmarks.map(([x,y,z]) => new THREE.Vector3(x, y, z));

    this.joints.forEach((j, i) => {
      j.position.copy(positions[i]);
      j.visible = true;
    });

    HAND_BONE_CONNECTIONS.forEach(([a, b], i) => {
      this._orientBone(this.bones[i], positions[a], positions[b]);
    });
  }

  // ── 손가락별 색상 피드백 ──────────────────────────────────────────────────
  /**
   * @param {Object} scores - {thumb, index, middle, ring, pinky} 각 0~1
   */
  setFingerColors(scores) {
    for (const [finger, score] of Object.entries(scores)) {
      const color = score > 0.75 ? COLOR_GOOD : score > 0.45 ? COLOR_WARN : COLOR_BAD;
      for (const i of FINGER_JOINT_MAP[finger]) {
        this.joints[i].material.color.setHex(color);
      }
    }
    // 뼈대 색상도 동일하게
    HAND_BONE_CONNECTIONS.forEach(([a, b], i) => {
      const finger = this._fingerOfJoint(a) || this._fingerOfJoint(b);
      if (finger && scores[finger] !== undefined) {
        const score = scores[finger];
        const color = score > 0.75 ? COLOR_GOOD : score > 0.45 ? COLOR_WARN : COLOR_BAD;
        this.bones[i].material.color.setHex(color);
      }
    });
  }

  _fingerOfJoint(idx) {
    for (const [finger, indices] of Object.entries(FINGER_JOINT_MAP)) {
      if (indices.includes(idx)) return finger;
    }
    return null;
  }

  resetColors() {
    this.joints.forEach(j => j.material.color.setHex(COLOR_DEFAULT));
    this.bones.forEach(b => b.material.color.setHex(COLOR_BONE_DEF));
  }

  setVisible(v) {
    this.joints.forEach(j => j.visible = v);
    this.bones.forEach(b => b.visible = v);
  }

  // ── 렌더링 루프 ──────────────────────────────────────────────────────────
  _startLoop() {
    const loop = () => {
      requestAnimationFrame(loop);
      this.controls.update();

      // 자동 회전 (드래그 전까지)
      if (this._autoRotate && this.currentPose) {
        this._rotY += 0.008;
        this.handGroup.rotation.y = 0.3 * Math.sin(this._rotY);
      }

      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  resize() {
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    if (!W || !H) return;
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(W, H);
  }
}
