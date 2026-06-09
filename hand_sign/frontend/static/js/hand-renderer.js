/**
 * Three.js 3D 손 렌더러
 */

const HAND_BONE_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],        // 엄지
  [0,5],[5,6],[6,7],[7,8],        // 검지
  [0,9],[9,10],[10,11],[11,12],   // 중지
  [0,13],[13,14],[14,15],[15,16], // 약지
  [0,17],[17,18],[18,19],[19,20], // 새끼
  [5,9],[9,13],[13,17],           // 손바닥 횡연결
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

// 뼈대별 (위쪽r, 아래쪽r): 손목 쪽이 굵고 끝쪽이 가늘게
const _boneRadius = HAND_BONE_CONNECTIONS.map(([a, b]) => {
  const toTip  = [4,8,12,16,20].includes(b);
  const toDIP  = [3,7,11,15,19].includes(b);
  const toWrist = a === 0;
  const lateral = (a === 5 && b === 9) || (a === 9 && b === 13) || (a === 13 && b === 17);
  if (toWrist)  return [0.014, 0.015];
  if (lateral)  return [0.010, 0.010];
  if (toTip)    return [0.005, 0.008];
  if (toDIP)    return [0.007, 0.010];
  return        [0.009, 0.011];
});

// 손바닥 삼각형 (인덱스는 21개 랜드마크 번호)
const PALM_TRIS = [
  0,1,5,   0,5,9,   0,9,13,   0,13,17,   // 손목 → MCP 팬
];

class HandRenderer {
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

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(W, H);
    this.renderer.setClearColor(0x0d1117, 1);

    this.scene    = new THREE.Scene();
    this.handGroup = new THREE.Group();
    this.scene.add(this.handGroup);

    this.camera = new THREE.PerspectiveCamera(42, W / H, 0.01, 100);
    this.camera.position.set(0, 0, 4.2);
    this.camera.lookAt(0, 0, 0);

    // 조명
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(2, 5, 4);
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(0x6c63ff, 0.35);
    fill.position.set(-3, 0, -2);
    this.scene.add(fill);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping   = true;
    this.controls.dampingFactor   = 0.06;
    this.controls.minDistance     = 1.5;
    this.controls.maxDistance     = 8;
    this.controls.enablePan       = false;
    this.controls.addEventListener('start', () => { this._autoRotate = false; });

    new ResizeObserver(() => this.resize()).observe(this.canvas);
  }

  // ── 손 메시 생성 ─────────────────────────────────────────────────────────
  _buildHandMesh() {
    // 관절 구체
    this.joints = [];
    for (let i = 0; i < 21; i++) {
      const isTip   = [4,8,12,16,20].includes(i);
      const isWrist = i === 0;
      const isMCP   = [5,9,13,17].includes(i);
      const r = isWrist ? 0.050 : isTip ? 0.032 : isMCP ? 0.028 : 0.022;
      const geo = new THREE.SphereGeometry(r, 12, 10);
      const mat = new THREE.MeshPhongMaterial({ color: COLOR_DEFAULT, shininess: 90 });
      if (isTip) mat.emissive = new THREE.Color(0x002233);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.handGroup.add(mesh);
      this.joints.push(mesh);
    }

    // 뼈대 실린더 (테이퍼 적용)
    this.bones = [];
    for (let i = 0; i < HAND_BONE_CONNECTIONS.length; i++) {
      const [rTop, rBot] = _boneRadius[i];
      const geo = new THREE.CylinderGeometry(rTop, rBot, 1, 8);
      const mat = new THREE.MeshPhongMaterial({ color: COLOR_BONE_DEF, shininess: 60 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.handGroup.add(mesh);
      this.bones.push(mesh);
    }

    // 손바닥 반투명 면
    const palmGeo = new THREE.BufferGeometry();
    palmGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(21 * 3), 3));
    palmGeo.setIndex(PALM_TRIS);
    this.palmMesh = new THREE.Mesh(palmGeo, new THREE.MeshPhongMaterial({
      color: 0x0088bb, transparent: true, opacity: 0.18,
      side: THREE.DoubleSide, depthWrite: false,
    }));
    this.palmMesh.visible = false;
    this.handGroup.add(this.palmMesh);

    this.secondaryJoints = [];
    for (let i = 0; i < 21; i++) {
      const isTip   = [4,8,12,16,20].includes(i);
      const isWrist = i === 0;
      const isMCP   = [5,9,13,17].includes(i);
      const r = isWrist ? 0.050 : isTip ? 0.032 : isMCP ? 0.028 : 0.022;
      const geo = new THREE.SphereGeometry(r, 12, 10);
      const mat = new THREE.MeshPhongMaterial({ color: 0xff8a3d, shininess: 90 });
      if (isTip) mat.emissive = new THREE.Color(0x331600);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.handGroup.add(mesh);
      this.secondaryJoints.push(mesh);
    }

    this.secondaryBones = [];
    for (let i = 0; i < HAND_BONE_CONNECTIONS.length; i++) {
      const [rTop, rBot] = _boneRadius[i];
      const geo = new THREE.CylinderGeometry(rTop, rBot, 1, 8);
      const mat = new THREE.MeshPhongMaterial({ color: 0xffb86b, shininess: 60 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.handGroup.add(mesh);
      this.secondaryBones.push(mesh);
    }

    const secondaryPalmGeo = new THREE.BufferGeometry();
    secondaryPalmGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(21 * 3), 3));
    secondaryPalmGeo.setIndex(PALM_TRIS);
    this.secondaryPalmMesh = new THREE.Mesh(secondaryPalmGeo, new THREE.MeshPhongMaterial({
      color: 0xd97706, transparent: true, opacity: 0.18,
      side: THREE.DoubleSide, depthWrite: false,
    }));
    this.secondaryPalmMesh.visible = false;
    this.handGroup.add(this.secondaryPalmMesh);
  }

  // ── 뼈대 방향·길이 업데이트 ──────────────────────────────────────────────
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
      mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0), nd.y > 0 ? 0 : Math.PI);
    } else {
      const axis  = up.clone().cross(nd).normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(nd))));
      mesh.quaternion.setFromAxisAngle(axis, angle);
    }
  }

  // ── 포즈 업데이트 (자동 센터링 + 스케일) ─────────────────────────────────
  setPose(landmarks, flipX = false, flipZ = false) {
    if (!landmarks) return;
    this.currentPose = landmarks;

    let src = landmarks;
    if (flipX && flipZ) src = landmarks.map(([x,y,z]) => [-x, y, -z]);
    else if (flipX)     src = landmarks.map(([x,y,z]) => [-x, y,  z]);
    else if (flipZ)     src = landmarks.map(([x,y,z]) => [ x, y, -z]);

    this._hideSecondaryHand();

    // 1) 경계 박스 계산
    let minX=Infinity,minY=Infinity,minZ=Infinity;
    let maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
    for (const [x,y,z] of src) {
      if (x<minX) minX=x; if (x>maxX) maxX=x;
      if (y<minY) minY=y; if (y>maxY) maxY=y;
      if (z<minZ) minZ=z; if (z>maxZ) maxZ=z;
    }
    const cx = (minX+maxX)/2, cy = (minY+maxY)/2, cz = (minZ+maxZ)/2;
    const maxDim = Math.max(maxX-minX, maxY-minY, maxZ-minZ, 0.1);

    // 2) 최대 치수를 1.9 단위로 정규화, 화면 중앙 정렬
    const scale = 1.9 / maxDim;
    const positions = src.map(([x,y,z]) =>
      new THREE.Vector3((x-cx)*scale, (y-cy)*scale, (z-cz)*scale)
    );

    // 3) 관절
    this.joints.forEach((j, i) => { j.position.copy(positions[i]); j.visible = true; });

    // 4) 뼈대
    HAND_BONE_CONNECTIONS.forEach(([a,b], i) => {
      this._orientBone(this.bones[i], positions[a], positions[b]);
    });

    // 5) 손바닥 면
    const posAttr = this.palmMesh.geometry.attributes.position;
    positions.forEach((p,i) => posAttr.setXYZ(i, p.x, p.y, p.z));
    posAttr.needsUpdate = true;
    this.palmMesh.geometry.computeVertexNormals();
    this.palmMesh.visible = true;
  }

  // ── 손가락별 색상 피드백 ──────────────────────────────────────────────────
  setHandPose(handPose) {
    if (!handPose) return;
    const mirrorPose = pose => pose.map(([x, y, z]) => [-x, y, z]);
    const left = Array.isArray(handPose.left) ? handPose.left : null;
    const right = Array.isArray(handPose.right) ? mirrorPose(handPose.right) : null;
    const primary = right || left;
    if (!primary) return;

    if (!left || !right) {
      this.setPose(primary);
      return;
    }

    this.currentPose = primary;
    const apply = (src, joints, bones, palmMesh, offsetX) => {
      let minX=Infinity,minY=Infinity,minZ=Infinity;
      let maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
      for (const [x,y,z] of src) {
        if (x<minX) minX=x; if (x>maxX) maxX=x;
        if (y<minY) minY=y; if (y>maxY) maxY=y;
        if (z<minZ) minZ=z; if (z>maxZ) maxZ=z;
      }
      const cx = (minX+maxX)/2, cy = (minY+maxY)/2, cz = (minZ+maxZ)/2;
      const maxDim = Math.max(maxX-minX, maxY-minY, maxZ-minZ, 0.1);
      const scale = 1.55 / maxDim;
      const positions = src.map(([x,y,z]) =>
        new THREE.Vector3((x-cx)*scale + offsetX, (y-cy)*scale, (z-cz)*scale)
      );

      joints.forEach((j, i) => { j.position.copy(positions[i]); j.visible = true; });
      HAND_BONE_CONNECTIONS.forEach(([a,b], i) => {
        this._orientBone(bones[i], positions[a], positions[b]);
      });

      const posAttr = palmMesh.geometry.attributes.position;
      positions.forEach((p,i) => posAttr.setXYZ(i, p.x, p.y, p.z));
      posAttr.needsUpdate = true;
      palmMesh.geometry.computeVertexNormals();
      palmMesh.visible = true;
    };

    apply(right, this.joints, this.bones, this.palmMesh, -0.95);
    apply(left, this.secondaryJoints, this.secondaryBones, this.secondaryPalmMesh, 0.95);
  }

  _hideSecondaryHand() {
    this.secondaryJoints?.forEach(j => j.visible = false);
    this.secondaryBones?.forEach(b => b.visible = false);
    if (this.secondaryPalmMesh) this.secondaryPalmMesh.visible = false;
  }

  setFingerColors(scores) {
    for (const [finger, score] of Object.entries(scores)) {
      const color = score > 0.75 ? COLOR_GOOD : score > 0.45 ? COLOR_WARN : COLOR_BAD;
      for (const i of FINGER_JOINT_MAP[finger]) {
        this.joints[i].material.color.setHex(color);
      }
    }
    HAND_BONE_CONNECTIONS.forEach(([a,b], i) => {
      const finger = this._fingerOfJoint(a) || this._fingerOfJoint(b);
      if (finger && scores[finger] !== undefined) {
        const s = scores[finger];
        this.bones[i].material.color.setHex(s > 0.75 ? COLOR_GOOD : s > 0.45 ? COLOR_WARN : COLOR_BAD);
      }
    });
  }

  _fingerOfJoint(idx) {
    for (const [f, indices] of Object.entries(FINGER_JOINT_MAP))
      if (indices.includes(idx)) return f;
    return null;
  }

  resetColors() {
    this.joints.forEach(j => j.material.color.setHex(COLOR_DEFAULT));
    this.bones.forEach(b  => b.material.color.setHex(COLOR_BONE_DEF));
    this.secondaryJoints?.forEach(j => j.material.color.setHex(0xff8a3d));
    this.secondaryBones?.forEach(b  => b.material.color.setHex(0xffb86b));
  }

  setVisible(v) {
    this.joints.forEach(j => j.visible = v);
    this.bones.forEach(b  => b.visible = v);
    if (this.palmMesh) this.palmMesh.visible = v && !!this.currentPose;
    this.secondaryJoints?.forEach(j => j.visible = false);
    this.secondaryBones?.forEach(b => b.visible = false);
    if (this.secondaryPalmMesh) this.secondaryPalmMesh.visible = false;
  }

  // ── 렌더링 루프 ──────────────────────────────────────────────────────────
  _startLoop() {
    const loop = () => {
      requestAnimationFrame(loop);
      this.controls.update();
      if (this._autoRotate && this.currentPose) {
        this._rotY += 0.008;
        this.handGroup.rotation.y = 0.28 * Math.sin(this._rotY);
      }
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  resize() {
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    if (!W || !H) return;
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(W, H);
  }
}
