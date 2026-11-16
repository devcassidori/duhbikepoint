/* Cena 3D do hero (Three.js r128): logo em moeda 3D + roda de bike + partículas, reagindo a mouse e scroll. */
(function () {
  const canvas = document.getElementById('hero3d');
  if (!canvas || !window.THREE) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => innerWidth < 860;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile() ? 1.5 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0c0b, 9, 22);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  // Luzes
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(4, 5, 6); scene.add(key);
  const rim = new THREE.PointLight(0x19d11f, 3, 18); rim.position.set(-4, -2, 3); scene.add(rim);
  const rim2 = new THREE.PointLight(0x7dff7a, 1.6, 14); rim2.position.set(4, 3, -2); scene.add(rim2);

  const root = new THREE.Group(); scene.add(root);

  // ---- Moeda com o logo ----
  const tex = new THREE.TextureLoader().load(window.LOGO_DATA_URL || 'assets/logo-512.png');
  tex.encoding = THREE.sRGBEncoding;
  tex.center.set(0.5, 0.5); tex.rotation = Math.PI / 2; // alinha o topo do logo com o topo da moeda
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const coinGeo = new THREE.CylinderGeometry(1.55, 1.55, 0.24, 96, 1);
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x0f8f15, metalness: 0.75, roughness: 0.28 });
  const faceMat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.15, roughness: 0.45 });
  const coin = new THREE.Mesh(coinGeo, [sideMat, faceMat, faceMat]);
  coin.rotation.x = Math.PI / 2;
  const coinPivot = new THREE.Group(); coinPivot.add(coin); root.add(coinPivot);

  // anel cromado em volta da moeda
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 16, 120), new THREE.MeshStandardMaterial({ color: 0xdfe8e1, metalness: 1, roughness: 0.2 }));
  coinPivot.add(bezel);

  // ---- Roda (aro + pneu + raios) ----
  const wheel = new THREE.Group();
  const R = 2.75;
  const tire = new THREE.Mesh(new THREE.TorusGeometry(R + 0.14, 0.13, 20, 160), new THREE.MeshStandardMaterial({ color: 0x151816, roughness: 0.9, metalness: 0.05 }));
  const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(R, 0.07, 16, 160), new THREE.MeshStandardMaterial({ color: 0x19d11f, emissive: 0x0a5a0d, metalness: 0.6, roughness: 0.3 }));
  wheel.add(tire, rimMesh);
  const spokePts = [];
  const spokes = 28;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const hubA = a + (i % 2 ? 0.35 : -0.35); // raios cruzados
    const z = i % 2 ? 0.08 : -0.08;
    spokePts.push(new THREE.Vector3(Math.cos(hubA) * 0.35, Math.sin(hubA) * 0.35, z), new THREE.Vector3(Math.cos(a) * (R - 0.05), Math.sin(a) * (R - 0.05), 0));
  }
  const spokeGeo = new THREE.BufferGeometry().setFromPoints(spokePts);
  const spokeLines = new THREE.LineSegments(spokeGeo, new THREE.LineBasicMaterial({ color: 0xbfc9c2, transparent: true, opacity: 0.35 }));
  wheel.add(spokeLines);
  // marcações no pneu (pontos de cravo)
  const studs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.12, 0.2), new THREE.MeshStandardMaterial({ color: 0x222724, roughness: 1 }), 72);
  const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const s1 = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    q.setFromEuler(new THREE.Euler(0, 0, a));
    m4.compose(new THREE.Vector3(Math.cos(a) * (R + 0.27), Math.sin(a) * (R + 0.27), 0), q, s1);
    studs.setMatrixAt(i, m4);
  }
  wheel.add(studs);
  wheel.position.z = -0.6;
  root.add(wheel);

  // ---- Coroa (chainring) flutuante ----
  function makeChainring(r, teeth, color) {
    const g = new THREE.Group();
    const ringMat = new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.25 });
    g.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 10, 64), ringMat));
    const tooth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.14, 0.06), ringMat, teeth);
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      q.setFromEuler(new THREE.Euler(0, 0, a - Math.PI / 2));
      m4.compose(new THREE.Vector3(Math.cos(a) * (r + 0.08), Math.sin(a) * (r + 0.08), 0), q, s1);
      tooth.setMatrixAt(i, m4);
    }
    g.add(tooth);
    for (let i = 0; i < 5; i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, r, 0.05), ringMat);
      arm.position.set(Math.cos(i * 1.2566) * r / 2, Math.sin(i * 1.2566) * r / 2, 0);
      arm.rotation.z = i * 1.2566 - Math.PI / 2;
      g.add(arm);
    }
    return g;
  }
  const ring1 = makeChainring(0.7, 34, 0xd9e2db); ring1.position.set(-1.4, 2.5, -1.5);
  const ring2 = makeChainring(0.42, 22, 0x19d11f); ring2.position.set(3.4, -2.2, 0.6);
  root.add(ring1, ring2);

  // ---- Partículas ----
  const N = isMobile() ? 380 : 900;
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 3.5 + Math.random() * 7; const a = Math.random() * Math.PI * 2; const y = (Math.random() - 0.5) * 10;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(a) * r - 4;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dots = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x3ff03a, size: 0.035, transparent: true, opacity: 0.75, depthWrite: false }));
  scene.add(dots);

  // ---- Layout responsivo ----
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (w < 860) { root.position.set(w < 600 ? 1.1 : 2, h > w ? 2.1 : 1.2, -1); root.scale.setScalar(w < 600 ? 0.62 : 0.7); }
    else if (w < 1200) { root.position.set(3.1, 0, 0); root.scale.setScalar(0.72); }
    else { root.position.set(3.7 * Math.min(1, (w / h) / 1.6), -0.1, 0); root.scale.setScalar(0.82); }
    ring2.visible = w >= 860; ring1.visible = w >= 600;
    baseX = root.position.x; baseY = root.position.y;
  }
  let baseX = 0, baseY = 0;
  addEventListener('resize', layout);

  // ---- Interação ----
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  let scrollP = 0;
  window.HeroScene = {
    setProgress(p) { scrollP = p; },
    setLogo(url) {
      const l = new THREE.TextureLoader(); l.setCrossOrigin('anonymous');
      l.load(url, (t) => { t.encoding = THREE.sRGBEncoding; t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; faceMat.map = t; faceMat.needsUpdate = true; });
    }
  };

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = clock.getElapsedTime();
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    const sp = reduce ? 0 : 1;

    wheel.rotation.z = -t * 0.35 * sp - scrollP * 6;
    coinPivot.rotation.y = Math.sin(t * 0.6) * 0.35 * sp + mouse.x * 0.5 + scrollP * Math.PI * 1.5;
    coinPivot.rotation.x = mouse.y * 0.35 + Math.sin(t * 0.8) * 0.06 * sp;
    coinPivot.position.y = Math.sin(t * 1.1) * 0.08 * sp;
    wheel.rotation.x = mouse.y * 0.2 + scrollP * 0.9;
    wheel.rotation.y = mouse.x * 0.25 - scrollP * 0.6;
    ring1.rotation.z = t * 0.6 * sp; ring1.rotation.x = 0.6 + mouse.y * 0.4;
    ring2.rotation.z = -t * 0.9 * sp; ring2.rotation.y = 0.5 + mouse.x * 0.4;
    ring1.position.y = 2.5 + Math.sin(t * 0.9) * 0.15 * sp;
    ring2.position.y = -2.2 + Math.cos(t * 0.8) * 0.15 * sp;
    dots.rotation.y = t * 0.03 * sp + scrollP * 0.8;

    root.position.y = baseY + scrollP * 2.2;
    root.position.x = baseX - scrollP * (isMobile() ? 0 : 1.2);
    camera.position.z = 10 + scrollP * 3;
    camera.position.x = mouse.x * 0.4; camera.position.y = -mouse.y * 0.3;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  layout();
  tick();
})();
