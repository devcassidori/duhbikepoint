/* Bike 3D (Three.js r128): speed de carbono modelada em primitivas, com reflexos de estúdio (PMREM),
   sombras e materiais físicos. Monta peça por peça conforme o scroll. */
(function () {
  const section = document.getElementById('bike');
  const canvas = document.getElementById('bike3d');
  if (!section || !canvas || !window.THREE) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => innerWidth < 800;
  const V3 = THREE.Vector3;
  const P = (x, y, z = 0) => new V3(x, y, z);

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return; }
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);

  // ---------- Ambiente de estúdio (reflexos) ----------
  (function studio() {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x0c0f0d, side: THREE.BackSide })));
    const panel = (w, h, color, pos, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); m.position.copy(pos); m.rotation.set(rot.x, rot.y, rot.z); env.add(m); };
    panel(6, 2.2, 0xffffff, P(0, 4.9, 0), P(Math.PI / 2, 0, 0));
    panel(2.5, 4, 0xdfe8e2, P(-4.9, 1, 1), P(0, Math.PI / 2, 0));
    panel(2.5, 4, 0x9aa59e, P(4.9, 0.5, -1), P(0, -Math.PI / 2, 0));
    panel(4, 0.6, 0x19d11f, P(0, 1.2, -4.9), P(0, 0, 0));
    panel(3, 1.2, 0xffffff, P(1.5, 2, 4.9), P(0, Math.PI, 0));
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.035).texture;
    pmrem.dispose();
  })();

  scene.add(new THREE.HemisphereLight(0xeef3ef, 0x0a0c0b, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(1.2, 3.2, 1.6); key.castShadow = true;
  key.shadow.mapSize.set(small() ? 1024 : 2048, small() ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.5, far: 8 });
  key.shadow.bias = -0.0004; key.shadow.radius = 4;
  scene.add(key);
  const rimL = new THREE.PointLight(0x19d11f, 1.8, 5); rimL.position.set(-1.6, 1.1, -1.3); scene.add(rimL);

  // ---------- Texturas geradas ----------
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  const drawDecal = (x, w, h) => {
    x.clearRect(0, 0, w, h); x.font = '900 92px "Big Shoulders Display", Impact, sans-serif'; x.textBaseline = 'middle';
    x.fillStyle = '#19d11f'; x.fillText('DUH', 24, h / 2 + 4);
    x.fillStyle = '#eef3ef'; x.fillText('BIKE POINT', 210, h / 2 + 4);
  };
  const decalTex = canvasTex(1024, 128, drawDecal);
  const rimTex = canvasTex(2048, 64, (x, w, h) => {
    x.fillStyle = '#151816'; x.fillRect(0, 0, w, h);
    x.font = '900 30px "Big Shoulders Display", Impact, sans-serif'; x.textBaseline = 'middle';
    for (let k = 0; k < 3; k++) { const ox = k * (w / 3) + 120; x.fillStyle = '#eef3ef'; x.fillText('DUH  CARBON 50', ox, h * 0.27); x.fillText('DUH  CARBON 50', ox, h * 0.73); x.fillStyle = '#19d11f'; x.fillRect(ox - 40, h * 0.27 - 4, 24, 8); x.fillRect(ox - 40, h * 0.73 - 4, 24, 8); }
  });
  rimTex.wrapS = THREE.RepeatWrapping; rimTex.repeat.x = -1; // texto do aro na leitura certa
  const tapeTex = canvasTex(64, 64, (x, w, h) => { x.fillStyle = '#121413'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a2f2c'; x.lineWidth = 6; for (let i = -64; i < 128; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, h); x.stroke(); } }, [1, 18]);
  const rotorTex = canvasTex(256, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.fillStyle = '#fff'; x.beginPath(); x.arc(128, 128, 127, 0, Math.PI * 2); x.arc(128, 128, 88, 0, Math.PI * 2, true); x.fill();
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; x.beginPath(); x.arc(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108, 5, 0, Math.PI * 2); x.fill(); }
    x.globalCompositeOperation = 'source-over'; x.beginPath(); x.arc(128, 128, 34, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; x.save(); x.translate(128, 128); x.rotate(a); x.fillRect(-6, 30, 12, 62); x.restore(); }
  });

  // ---------- Materiais ----------
  const M = {
    frame: new THREE.MeshPhysicalMaterial({ color: 0x0f1512, metalness: 0.55, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04 }),
    green: new THREE.MeshPhysicalMaterial({ color: 0x19d11f, metalness: 0.25, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x053a08 }),
    carbon: new THREE.MeshPhysicalMaterial({ map: rimTex, metalness: 0.35, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.1, side: THREE.DoubleSide }),
    alloy: new THREE.MeshStandardMaterial({ color: 0x1b1f1d, metalness: 0.8, roughness: 0.32 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xd3dad6, metalness: 1, roughness: 0.2 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0b0c0b, metalness: 0, roughness: 0.92 }),
    tan: new THREE.MeshStandardMaterial({ color: 0xa8804f, metalness: 0, roughness: 0.85, side: THREE.DoubleSide }),
    tape: new THREE.MeshStandardMaterial({ map: tapeTex, metalness: 0.1, roughness: 0.75 }),
    saddle: new THREE.MeshPhysicalMaterial({ color: 0x141614, metalness: 0.1, roughness: 0.55, clearcoat: 0.3 }),
    rotor: new THREE.MeshStandardMaterial({ color: 0xc9d0cc, metalness: 1, roughness: 0.25, alphaMap: rotorTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }),
    decal: new THREE.MeshBasicMaterial({ map: decalTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    bottle: new THREE.MeshPhysicalMaterial({ color: 0x19d11f, metalness: 0, roughness: 0.35, clearcoat: 0.6 })
  };

  // tubo (opcionalmente cônico e achatado na lateral = perfil aero)
  function tube(a, b, r1, mat, r2 = r1, flat = 1, seg = 20) {
    const d = new V3().subVectors(b, a); const len = d.length();
    const g = new THREE.CylinderGeometry(r2, r1, len, seg, 1); if (flat !== 1) g.scale(1, 1, flat);
    const m = new THREE.Mesh(g, mat);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
    return m;
  }
  const joint = (p, r, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat); m.position.copy(p); return m; };

  // pontos-chave (metros): rodas com raio ≈0.335, chão em y=0
  const R = P(-0.5, 0.335), F = P(0.5, 0.335), BB = P(-0.07, 0.265);
  const ST = P(-0.205, 0.78), HTt = P(0.36, 0.77), HTb = P(0.41, 0.6);

  const bike = new THREE.Group(); scene.add(bike);
  const parts = [];
  // spot = [x, z] onde a peça fica no chão antes de montar; rot = Euler (x, y, z) da peça deitada
  function part(name, group, spot, rot, t0, t1) {
    const pivot = new THREE.Group(); pivot.add(group); bike.add(pivot);
    parts.push({ name, pivot, spot, rot, t0, t1 }); return pivot;
  }
  // caixa da peça no espaço da bike (ignora InstancedMesh, cuja geometria-base não representa as instâncias)
  const box = new THREE.Box3(), tmpBox = new THREE.Box3();
  function partBox(pivot) {
    box.makeEmpty();
    pivot.updateMatrix(); pivot.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(bike.matrixWorld).invert();
    pivot.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      tmpBox.copy(o.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      box.union(tmpBox);
    });
    return box;
  }
  // calcula a pose "no chão": gira, apoia a parte mais baixa em y=0 e centraliza no ponto escolhido
  function settleParts() {
    bike.updateMatrixWorld(true);
    parts.forEach((pt) => {
      pt.restQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(pt.rot.x, pt.rot.y, pt.rot.z));
      pt.pivot.position.set(0, 0, 0); pt.pivot.quaternion.copy(pt.restQ);
      const b = partBox(pt.pivot), c = b.getCenter(new V3());
      pt.restP = P(pt.spot[0] - c.x, -b.min.y + 0.002, pt.spot[1] - c.z);
    });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = P(1, 1, 1);

  // ---------- Quadro ----------
  const frame = new THREE.Group();
  frame.add(tube(ST, HTt, 0.019, M.frame, 0.022, 0.8));
  frame.add(tube(BB, HTb, 0.036, M.frame, 0.03, 0.72));
  frame.add(tube(BB, ST, 0.026, M.frame, 0.02, 0.7));
  frame.add(tube(P(0.418, 0.565), P(0.352, 0.8), 0.036, M.frame, 0.029, 0.85));
  [-1, 1].forEach((s) => {
    frame.add(tube(P(BB.x - 0.02, BB.y, 0.035 * s), P(R.x + 0.02, R.y, 0.058 * s), 0.016, M.frame, 0.011));
    frame.add(tube(P(-0.19, 0.66, 0.022 * s), P(R.x + 0.015, R.y + 0.01, 0.058 * s), 0.012, M.frame, 0.009));
    const drop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.008), M.alloy); drop.position.set(R.x, R.y, 0.06 * s); frame.add(drop);
  });
  frame.add(joint(BB, 0.04, M.frame));
  const bbShell = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.1, 24), M.frame); bbShell.rotation.x = Math.PI / 2; bbShell.position.copy(BB); frame.add(bbShell);
  frame.add(joint(ST, 0.021, M.frame)); frame.add(joint(P(0.36, 0.77), 0.03, M.frame));
  frame.add(tube(new V3().lerpVectors(BB, HTb, 0.78), new V3().lerpVectors(BB, HTb, 0.86), 0.0335, M.green, 0.0325, 0.72));
  frame.add(tube(new V3().lerpVectors(ST, HTt, 0.04), new V3().lerpVectors(ST, HTt, 0.1), 0.0215, M.green, 0.0218, 0.8));
  const dtAngle = Math.atan2(HTb.y - BB.y, HTb.x - BB.x);
  [-1, 1].forEach((s) => {
    const len = BB.distanceTo(HTb) * 0.5;
    const dec = new THREE.Mesh(new THREE.PlaneGeometry(len, len / 8), M.decal);
    const mid = new V3().lerpVectors(BB, HTb, 0.45);
    dec.position.set(mid.x, mid.y, 0.0262 * s);
    dec.rotation.set(0, s < 0 ? Math.PI : 0, s < 0 ? -dtAngle : dtAngle);
    dec.castShadow = false;
    frame.add(dec);
  });
  // caramanhola
  const bottleG = new THREE.Group();
  const btl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.19, 24), M.bottle);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.03, 20), M.rubber); cap.position.y = 0.108;
  const cageB = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.003, 6, 24, Math.PI), M.alloy); cageB.rotation.y = Math.PI / 2; cageB.position.y = -0.04;
  bottleG.add(btl, cap, cageB);
  const dtDir = new V3().subVectors(HTb, BB).normalize();
  bottleG.position.copy(new V3().lerpVectors(BB, HTb, 0.45)).add(P(-dtDir.y * 0.064, dtDir.x * 0.064, 0));
  bottleG.quaternion.setFromUnitVectors(new V3(0, 1, 0), dtDir);
  frame.add(bottleG);
  part('frame', frame, [0.05, -0.4], P(-Math.PI / 2, 0.12, 0), 0.0, 0.18);

  // ---------- Garfo ----------
  const fork = new THREE.Group();
  [-1, 1].forEach((s) => {
    const curve = new THREE.CatmullRomCurve3([P(0.418, 0.565, 0.04 * s), P(0.45, 0.47, 0.054 * s), P(0.488, 0.38, 0.058 * s), P(F.x, F.y, 0.058 * s)]);
    fork.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.015, 12, false), M.frame));
    const dropF = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.008), M.alloy); dropF.position.set(F.x, F.y, 0.06 * s); fork.add(dropF);
  });
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.13), M.frame); crown.position.set(0.418, 0.567, 0); crown.rotation.z = -0.25; fork.add(crown);
  const caliperF = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.03), M.alloy); caliperF.position.set(F.x - 0.035, F.y + 0.055, -0.05); caliperF.rotation.z = 0.6; fork.add(caliperF);
  part('fork', fork, [0.85, -0.1], P(-Math.PI / 2, 0.6, 0), 0.04, 0.2);

  // ---------- Rodas ----------
  const rimGeo = (() => {
    const prof = [[0.304, -0.0115], [0.299, -0.0135], [0.285, -0.0128], [0.268, -0.0085], [0.258, -0.003], [0.256, 0], [0.258, 0.003], [0.268, 0.0085], [0.285, 0.0128], [0.299, 0.0135], [0.304, 0.0115]].map(([r, z]) => new THREE.Vector2(r, z));
    const g = new THREE.LatheGeometry(prof, 128); g.rotateX(Math.PI / 2); return g;
  })();
  const tireGeo = new THREE.TorusGeometry(0.3205, 0.0145, 16, 128); tireGeo.scale(1, 1, 0.92);
  const sideGeo = new THREE.RingGeometry(0.304, 0.315, 96);
  const spokeGeo = new THREE.BoxGeometry(0.0032, 1, 0.0012);
  function makeWheel(rear) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(tireGeo, M.rubber));
    [-1, 1].forEach((s) => { const side = new THREE.Mesh(sideGeo, M.tan); side.position.z = 0.0128 * s; g.add(side); });
    g.add(new THREE.Mesh(rimGeo, M.carbon));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 20), M.alloy); hub.rotation.x = Math.PI / 2; g.add(hub);
    [-1, 1].forEach((s) => { const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.004, 24), M.steel); fl.rotation.x = Math.PI / 2; fl.position.z = 0.032 * s; g.add(fl); });
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.15, 12), M.steel); axle.rotation.x = Math.PI / 2; g.add(axle);
    const N = 24; const spokes = new THREE.InstancedMesh(spokeGeo, M.steel, N);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, side = i % 2 ? 1 : -1, cross = rear ? side * 0.35 : 0;
      const A = P(Math.cos(a + cross) * 0.026, Math.sin(a + cross) * 0.026, 0.032 * side), B = P(Math.cos(a) * 0.257, Math.sin(a) * 0.257, 0.002 * side);
      const d = new V3().subVectors(B, A); const len = d.length();
      q.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
      m4.compose(new V3().addVectors(A, B).multiplyScalar(0.5), q, P(1, len, 1)); spokes.setMatrixAt(i, m4);
    }
    g.add(spokes);
    const rs = rear ? 0.16 : 0.18;
    const rotor = new THREE.Mesh(new THREE.PlaneGeometry(rs, rs), M.rotor); rotor.position.z = -0.048; g.add(rotor);
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.04, 8), M.steel); valve.position.set(0, -0.25, 0); g.add(valve);
    return g;
  }
  const rearWheel = makeWheel(true); rearWheel.position.copy(R);
  const frontWheel = makeWheel(false); frontWheel.position.copy(F);
  part('rearWheel', rearWheel, [-0.72, 0.32], P(-Math.PI / 2, 0, 0), 0.2, 0.36);
  part('frontWheel', frontWheel, [0.4, 0.42], P(-Math.PI / 2, 0, 0), 0.24, 0.4);

  // ---------- Pedivela ----------
  const crank = new THREE.Group();
  function chainring(r, teeth, z) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r - 0.006, 0.007, 8, 96), M.alloy); ring.position.z = z; g.add(ring);
    const t = new THREE.InstancedMesh(new THREE.BoxGeometry(0.007, 0.01, 0.004), M.steel, teeth);
    for (let i = 0; i < teeth; i++) { const a = (i / teeth) * Math.PI * 2; q.setFromEuler(new THREE.Euler(0, 0, a - Math.PI / 2)); m4.compose(P(Math.cos(a) * (r + 0.003), Math.sin(a) * (r + 0.003), z), q, one); t.setMatrixAt(i, m4); }
    g.add(t); return g;
  }
  crank.add(chainring(0.104, 52, 0.066), chainring(0.078, 36, 0.059));
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; crank.add(tube(P(0, 0, 0.064), P(Math.cos(a) * 0.098, Math.sin(a) * 0.098, 0.064), 0.008, M.alloy, 0.006, 0.6)); }
  [[1, 0.08], [-1, -0.08]].forEach(([s, z]) => {
    const end = P(0.065 * s, -0.16 * s, z + 0.006 * s);
    crank.add(tube(P(0, 0, z), end, 0.013, M.alloy, 0.009, 0.55));
    const pedal = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.065), M.alloy);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.004, 0.05), M.green); plate.position.y = 0.008;
    pedal.add(body, plate); pedal.position.set(end.x, end.y, z + 0.05 * s); crank.add(pedal);
  });
  const crankAxis = new THREE.Group(); crankAxis.position.copy(BB); crankAxis.add(crank);
  part('crank', crankAxis, [-0.17, 0.36], P(-Math.PI / 2, 0, 0), 0.4, 0.5);

  // ---------- Transmissão ----------
  const drive = new THREE.Group();
  [0.056, 0.051, 0.046, 0.042, 0.038, 0.034, 0.031, 0.028, 0.025, 0.022, 0.02].forEach((r, i) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.0024, 36), M.steel); c.rotation.x = Math.PI / 2; c.position.set(R.x, R.y, 0.03 + i * 0.0038); drive.add(c); });
  const cz = 0.066, rdX = R.x + 0.012, rdTop = P(rdX, R.y - 0.075, cz), rdBot = P(rdX + 0.004, R.y - 0.135, cz);
  const chainPts = [];
  for (let i = 0; i <= 18; i++) { const a = -Math.PI / 2 + (i / 18) * Math.PI; chainPts.push(P(BB.x + Math.cos(a) * 0.107, BB.y + Math.sin(a) * 0.107, cz)); }
  for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + (i / 10) * (Math.PI * 0.75); chainPts.push(P(R.x + Math.cos(a) * 0.05, R.y + Math.sin(a) * 0.05, cz)); }
  chainPts.push(P(rdX - 0.012, R.y - 0.07, cz), P(rdX + 0.012, rdTop.y - 0.012, cz), P(rdBot.x - 0.014, rdBot.y + 0.006, cz), P(rdBot.x + 0.01, rdBot.y - 0.012, cz));
  const chainCurve = new THREE.CatmullRomCurve3(chainPts, true, 'centripetal');
  const LINKS = 112; const links = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0125, 0.0075, 0.0072), M.steel, LINKS);
  const pts = chainCurve.getSpacedPoints(LINKS);
  for (let i = 0; i < LINKS; i++) {
    const a = pts[i], b = pts[i + 1]; const d = new V3().subVectors(b, a).normalize();
    q.setFromUnitVectors(new V3(1, 0, 0), d); m4.compose(new V3().addVectors(a, b).multiplyScalar(0.5), q, P(1, 1, i % 2 ? 1 : 0.8)); links.setMatrixAt(i, m4);
  }
  drive.add(links);
  [-1, 1].forEach((s) => { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.085, 0.003), M.alloy); pl.position.set(rdX, R.y - 0.105, cz + 0.009 * s); drive.add(pl); });
  [rdTop, rdBot].forEach((p) => { const pul = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.008, 18), M.rubber); pul.rotation.x = Math.PI / 2; pul.position.copy(p); drive.add(pul); });
  const rdBody = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.025), M.alloy); rdBody.position.set(R.x + 0.005, R.y - 0.035, 0.078); rdBody.rotation.z = 0.3; drive.add(rdBody);
  const fd = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.022, 0.02), M.alloy); fd.position.set(BB.x - 0.04, BB.y + 0.135, 0.06); fd.rotation.z = -0.35; drive.add(fd);
  const caliperR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.03), M.alloy); caliperR.position.set(R.x + 0.06, R.y + 0.02, -0.06); drive.add(caliperR);
  part('drive', drive, [-0.95, -0.3], P(-Math.PI / 2, -0.3, 0), 0.44, 0.58);

  // ---------- Cockpit ----------
  const cockpit = new THREE.Group();
  const stemA = P(0.352, 0.82), stemB = P(0.462, 0.835);
  cockpit.add(tube(P(0.358, 0.79), P(0.349, 0.84), 0.019, M.alloy));
  cockpit.add(tube(stemA, stemB, 0.017, M.alloy, 0.015, 0.75));
  const topBar = tube(P(stemB.x, stemB.y, -0.2), P(stemB.x, stemB.y, 0.2), 0.012, M.alloy, 0.012, 1, 16); topBar.geometry.scale(1.6, 1, 1); cockpit.add(topBar);
  [-1, 1].forEach((s) => {
    const drop = new THREE.CatmullRomCurve3([P(0.462, 0.835, 0.2 * s), P(0.52, 0.832, 0.205 * s), P(0.565, 0.79, 0.21 * s), P(0.565, 0.735, 0.21 * s), P(0.53, 0.7, 0.21 * s), P(0.47, 0.705, 0.21 * s)]);
    cockpit.add(new THREE.Mesh(new THREE.TubeGeometry(drop, 40, 0.0125, 10, false), M.tape));
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.026), M.rubber); hood.position.set(0.545, 0.85, 0.205 * s); hood.rotation.z = -0.35; cockpit.add(hood);
    cockpit.add(tube(P(0.57, 0.84, 0.205 * s), P(0.585, 0.74, 0.21 * s), 0.006, M.alloy, 0.004));
    const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.022), M.green); hoodTop.position.set(0.575, 0.865, 0.205 * s); cockpit.add(hoodTop);
  });
  const computer = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.04), M.rubber); computer.position.set(0.5, 0.85, 0); cockpit.add(computer);
  part('cockpit', cockpit, [0.95, 0.4], P(0, -0.5, 0.35), 0.58, 0.68);

  // ---------- Canote + selim ----------
  const seat = new THREE.Group();
  seat.add(tube(P(-0.206, 0.77), P(-0.24, 0.92), 0.0135, M.frame, 0.0135, 0.8));
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.018, 0.03), M.alloy); clamp.position.set(-0.24, 0.925, 0); seat.add(clamp);
  const shape = new THREE.Shape();
  shape.moveTo(-0.125, -0.06); shape.bezierCurveTo(-0.15, -0.03, -0.15, 0.03, -0.125, 0.06);
  shape.bezierCurveTo(-0.07, 0.07, -0.02, 0.05, 0.04, 0.025); shape.lineTo(0.13, 0.016);
  shape.bezierCurveTo(0.15, 0.012, 0.15, -0.012, 0.13, -0.016); shape.lineTo(0.04, -0.025);
  shape.bezierCurveTo(-0.02, -0.05, -0.07, -0.07, -0.125, -0.06);
  const sg = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 4, curveSegments: 24 });
  sg.rotateX(-Math.PI / 2);
  const saddle = new THREE.Mesh(sg, M.saddle); saddle.position.set(-0.235, 0.935, 0); seat.add(saddle);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.003, 0.008), M.green); stripe.position.set(-0.22, 0.958, 0); seat.add(stripe);
  [-1, 1].forEach((s) => seat.add(tube(P(-0.33, 0.935, 0.025 * s), P(-0.15, 0.935, 0.012 * s), 0.003, M.steel)));
  part('seat', seat, [-0.55, -0.75], P(-Math.PI / 2, 0.4, 0), 0.62, 0.75);

  bike.traverse((o) => { if (o.isMesh && o.material !== M.decal) o.castShadow = true; });
  bike.position.y = -0.48;
  settleParts();

  // ---------- Chão ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.45 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.48; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.GridHelper(6, 30, 0x19d11f, 0x2a332e); grid.position.y = -0.479;
  grid.material.transparent = true; grid.material.opacity = 0.18; scene.add(grid);
  const glowTex = canvasTex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, 'rgba(31,230,40,.35)'); g.addColorStop(1, 'rgba(31,230,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = -0.478; scene.add(glow);

  // ---------- Linhas de velocidade ----------
  const speedPts = [];
  for (let i = 0; i < 40; i++) { const y = -0.4 + Math.random() * 0.9, z = -0.6 + Math.random() * 1.2, x = Math.random() * 4 - 2, l = 0.15 + Math.random() * 0.3; speedPts.push(P(x, y, z), P(x + l, y, z)); }
  const speedGeo = new THREE.BufferGeometry().setFromPoints(speedPts);
  const speedMat = new THREE.LineBasicMaterial({ color: 0x3ff03a, transparent: true, opacity: 0 });
  scene.add(new THREE.LineSegments(speedGeo, speedMat));

  // ---------- UI ----------
  const getSteps = () => [...document.querySelectorAll('#bikeSteps li')];
  const pctEl = document.getElementById('bikePct');
  const STAGES = [0.2, 0.4, 0.58, 0.75];
  let lastStage = -1, lastPct = -1;
  function updateUI(p) {
    const s = STAGES.findIndex((v) => p < v); const stage = s === -1 ? 4 : s;
    const steps = getSteps(); if (steps.length && stage !== lastStage) { steps.forEach((li, i) => { li.classList.toggle('is-active', i === stage); li.classList.toggle('is-done', i < stage); }); lastStage = stage; }
    const pct = Math.round(Math.min(1, Math.max(0, (p - 0.02) / 0.73)) * 100);
    if (pct !== lastPct && pctEl) { pctEl.textContent = pct; lastPct = pct; }
  }

  // ---------- Layout ----------
  let W = 1, H = 1, baseDist = 3;
  function layout() {
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, W < 800 ? 1.5 : 2));
    renderer.setSize(W, H, false);
    const aspect = W / H; camera.aspect = aspect;
    const need = W < 1024 ? 2.1 : 3.0;
    baseDist = Math.max(2.5, need / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect));
    if (W >= 1024) camera.setViewOffset(W, H, -W * 0.15, H * 0.03, W, H);
    else camera.setViewOffset(W, H, 0, H * 0.06, W, H);
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', layout);

  // ---------- Loop ----------
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const IDQ = new THREE.Quaternion();
  let progress = 0, smooth = 0, spin = 0, visible = false, lastScroll = scrollY;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(section);
  function readProgress() { const r = section.getBoundingClientRect(); const total = r.height - innerHeight; progress = total > 0 ? clamp01(-r.top / total) : 0; }

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible) return;
    readProgress();
    smooth += (progress - smooth) * (reduce ? 1 : Math.min(1, dt * 7));
    const p = smooth, t = clock.elapsedTime;

    // peças começam deitadas no chão; ao montar, sobem em arco e encaixam no lugar
    parts.forEach((pt) => {
      const k = ease(clamp01((p - pt.t0) / (pt.t1 - pt.t0))), inv = 1 - k;
      const lift = Math.sin(Math.PI * Math.min(1, k * 1.15)) * 0.28;
      pt.pivot.position.set(pt.restP.x * inv, pt.restP.y * inv + lift, pt.restP.z * inv);
      pt.pivot.quaternion.copy(pt.restQ).slerp(IDQ, k);
    });

    const dy = scrollY - lastScroll; lastScroll = scrollY;
    const ride = clamp01((p - 0.78) / 0.15);
    spin += dy * 0.004 + (reduce ? 0 : ride * dt * 9);
    rearWheel.rotation.z = -spin; frontWheel.rotation.z = -spin;
    crankAxis.rotation.z = -spin * 0.45;

    const e8 = ease(clamp01(p / 0.8));
    const theta = THREE.MathUtils.lerp(0.95, 0.14, e8) + (reduce ? 0 : Math.sin(t * 0.3) * 0.03);
    const elev = THREE.MathUtils.lerp(0.55, 0.1, e8);
    const dist = baseDist * THREE.MathUtils.lerp(1.12, 0.95, e8);
    camera.position.set(Math.sin(theta) * dist, elev, Math.cos(theta) * dist);
    camera.lookAt(0, 0, 0);

    bike.position.y = -0.48 + (reduce ? 0 : ride * Math.sin(t * 9) * 0.003);
    speedMat.opacity = ride * 0.5;
    if (ride > 0 && !reduce) {
      const sp = speedGeo.attributes.position;
      for (let i = 0; i < sp.count; i += 2) { let x = sp.getX(i) - dt * 3.5 * ride; const len = sp.getX(i + 1) - sp.getX(i); if (x < -2.2) x += 4.4; sp.setX(i, x); sp.setX(i + 1, x + len); }
      sp.needsUpdate = true;
    }
    updateUI(p);
    renderer.render(scene, camera);
  }

  layout(); readProgress(); smooth = progress; tick();
  if (document.fonts) document.fonts.ready.then(() => { drawDecal(decalTex.image.getContext('2d'), decalTex.image.width, decalTex.image.height); decalTex.needsUpdate = true; });
  window.Bike3D = { layout };
})();
