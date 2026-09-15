import * as THREE from 'three';
import { stages } from './data.js';

const SAVE_KEY = 'hidden-master-33-v3';
const state = {
  stage: 1,
  influence: 0,
  peace: 50,
  chaos: 0,
  balance: 50,
  trust: 50,
  history: []
};

const ui = {
  canvas: document.querySelector('#scene'),
  intro: document.querySelector('#intro'),
  decision: document.querySelector('#decision'),
  result: document.querySelector('#result'),
  start: document.querySelector('#start'),
  cont: document.querySelector('#continue'),
  restart: document.querySelector('#restart'),
  question: document.querySelector('#question'),
  options: document.querySelector('#options'),
  narration: document.querySelector('#narration'),
  location: document.querySelector('#location'),
  resultTitle: document.querySelector('#resultTitle'),
  resultText: document.querySelector('#resultText'),
  stageLabel: document.querySelector('#stageLabel'),
  stats: document.querySelector('#stats')
};

let scene;
let camera;
let renderer;
let clock;
let worldGroup;
let roomGroup;
let hologramGroup;
let cityGroup;
let consolesGroup;
let cameraTarget = new THREE.Vector3(0, 1.2, 0);
let running = false;
let audioContext = null;
let soundEnabled = true;
let cinematicTimer = null;

const objects = {
  globe: null,
  globeGlow: null,
  globeRingA: null,
  globeRingB: null,
  globeRingC: null,
  floorRing: null,
  cityLights: [],
  screens: [],
  beacons: [],
  particles: [],
  keyLight: null,
  fillLight: null,
  rimLight: null,
  atmosphere: null
};

const CAMERA_PRESETS = {
  establish: {
    position: new THREE.Vector3(8.8, 4.4, 10.8),
    target: new THREE.Vector3(0, 1.35, -0.5)
  },
  command: {
    position: new THREE.Vector3(5.4, 2.75, 7.0),
    target: new THREE.Vector3(0, 1.2, -0.9)
  },
  globe: {
    position: new THREE.Vector3(3.8, 2.15, 4.7),
    target: new THREE.Vector3(0, 1.5, -0.7)
  },
  result: {
    position: new THREE.Vector3(-4.8, 2.8, 6.5),
    target: new THREE.Vector3(0, 1.35, -1.0)
  }
};

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (_) {}
}

function load() {
  try {
    const x = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (x) {
      Object.assign(state, x);
      state.stage = clamp(Number(state.stage) || 1, 1, 33);
      if (!Array.isArray(state.history)) state.history = [];
    }
  } catch (_) {}
}

function updateStats() {
  ui.stageLabel.textContent = `الدرجة ${String(state.stage).padStart(2, '0')} / 33`;
  ui.stats.innerHTML = `
    <div class="stat">النفوذ: <b>${Math.round(state.influence)}</b></div>
    <div class="stat">السلام: <b>${Math.round(state.peace)}</b></div>
    <div class="stat">الفوضى: <b>${Math.round(state.chaos)}</b></div>
    <div class="stat">التوازن: <b>${Math.round(state.balance)}</b></div>
    <div class="stat">الثقة: <b>${Math.round(state.trust)}</b></div>
  `;
}

function pathColor(path) {
  if (path === 'peace') return 0x3be39a;
  if (path === 'power') return 0xff8d42;
  if (path === 'chaos') return 0xff3048;
  return 0x8d8dff;
}

function pathBackground(path) {
  if (path === 'peace') return 0x04150e;
  if (path === 'power') return 0x180b05;
  if (path === 'chaos') return 0x1b0407;
  return 0x080718;
}

function hexMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: options.metalness ?? 0.45,
    roughness: options.roughness ?? 0.3,
    emissive: options.emissive ?? color,
    emissiveIntensity: options.emissiveIntensity ?? 0.2,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide
  });
}

function makeTextPlane(text, color = '#dbe7ff', width = 2.5) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.font = '700 48px Segoe UI, Arial';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = color;
  c.shadowColor = color;
  c.shadowBlur = 20;
  c.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.25), mat);
  return mesh;
}

function buildRoom() {
  roomGroup = new THREE.Group();
  roomGroup.name = 'command-room';
  worldGroup.add(roomGroup);

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x06090f,
    metalness: 0.55,
    roughness: 0.62
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.2;
  roomGroup.add(floor);

  const floorInset = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 13),
    new THREE.MeshBasicMaterial({ color: 0x0b1019, transparent: true, opacity: 0.6 })
  );
  floorInset.rotation.x = -Math.PI / 2;
  floorInset.position.set(0, -1.18, -1.2);
  roomGroup.add(floorInset);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x080c13,
    metalness: 0.25,
    roughness: 0.9
  });

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(22, 8, 0.5), wallMat);
  backWall.position.set(0, 2.65, -6.2);
  roomGroup.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 14), wallMat);
  leftWall.position.set(-10.75, 2.65, 0);
  roomGroup.add(leftWall);

  const rightWall = leftWall.clone();
  rightWall.position.x = 10.75;
  roomGroup.add(rightWall);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(24, 15), new THREE.MeshStandardMaterial({ color: 0x020409, roughness: 1 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 6.7;
  roomGroup.add(ceiling);

  for (let i = -5; i <= 5; i++) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.012, 12),
      new THREE.MeshBasicMaterial({ color: 0x25324a })
    );
    strip.position.set(i * 1.55, -1.14, -0.3);
    roomGroup.add(strip);
  }

  for (let i = -4; i <= 4; i++) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.012, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x25324a })
    );
    strip.position.set(0, -1.13, -4.6 + i * 1.12);
    roomGroup.add(strip);
  }

  const title = makeTextPlane('THE HIDDEN MASTER 33', '#d6b85f', 4.7);
  title.position.set(0, 4.65, -5.88);
  roomGroup.add(title);

  const sub = makeTextPlane('GLOBAL DECISION SYSTEM', '#6b86b2', 3.5);
  sub.position.set(0, 4.05, -5.86);
  roomGroup.add(sub);
}

function buildCentralTable() {
  const table = new THREE.Group();
  table.name = 'central-table';

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(2.85, 3.15, 0.35, 64),
    hexMaterial(0x101722, { metalness: 0.82, roughness: 0.2 })
  );
  body.position.y = -0.72;
  table.add(body);

  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 0.08, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0x152436,
      roughness: 0.08,
      metalness: 0.55,
      transmission: 0.35,
      transparent: true,
      opacity: 0.72
    })
  );
  glass.position.y = -0.47;
  table.add(glass);

  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.25 - i * 0.22, 0.018, 12, 120),
      new THREE.MeshBasicMaterial({ color: 0x344c72, transparent: true, opacity: 0.55 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.38 + i * 0.01;
    table.add(ring);
  }

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.7, 0.72, 32),
    hexMaterial(0x0e141e, { metalness: 0.72, roughness: 0.22 })
  );
  pedestal.position.y = -1.05;
  table.add(pedestal);

  worldGroup.add(table);
}

function buildHologram() {
  hologramGroup = new THREE.Group();
  hologramGroup.position.y = 0.95;
  worldGroup.add(hologramGroup);

  const geo = new THREE.SphereGeometry(1.48, 40, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x88a6ff,
    emissive: 0x334b9c,
    emissiveIntensity: 1.4,
    metalness: 0.45,
    roughness: 0.22,
    transparent: true,
    opacity: 0.9,
    wireframe: true
  });
  objects.globe = new THREE.Mesh(geo, mat);
  hologramGroup.add(objects.globe);

  const solid = new THREE.Mesh(
    new THREE.SphereGeometry(1.36, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0x17253d, transparent: true, opacity: 0.24 })
  );
  hologramGroup.add(solid);

  objects.globeGlow = new THREE.PointLight(0x6f8dff, 26, 11);
  objects.globeGlow.position.set(0, 0.1, 0);
  hologramGroup.add(objects.globeGlow);

  objects.globeRingA = new THREE.Mesh(
    new THREE.TorusGeometry(2.0, 0.018, 12, 120),
    new THREE.MeshBasicMaterial({ color: 0x7e8cff, transparent: true, opacity: 0.65 })
  );
  objects.globeRingA.rotation.x = Math.PI / 2;
  hologramGroup.add(objects.globeRingA);

  objects.globeRingB = objects.globeRingA.clone();
  objects.globeRingB.rotation.x = 0.52;
  objects.globeRingB.rotation.z = 0.25;
  objects.globeRingB.scale.setScalar(0.82);
  hologramGroup.add(objects.globeRingB);

  objects.globeRingC = objects.globeRingA.clone();
  objects.globeRingC.rotation.x = 1.2;
  objects.globeRingC.rotation.z = -0.4;
  objects.globeRingC.scale.setScalar(0.74);
  hologramGroup.add(objects.globeRingC);

  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(1.78, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0x6f8dff, transparent: true, opacity: 0.035, side: THREE.BackSide })
  );
  hologramGroup.add(aura);
}

function buildConsoles() {
  consolesGroup = new THREE.Group();
  worldGroup.add(consolesGroup);

  const positions = [
    [-4.9, 0.35, -2.8],
    [4.9, 0.35, -2.8],
    [-5.2, 0.2, 1.3],
    [5.2, 0.2, 1.3]
  ];

  positions.forEach((p, idx) => {
    const station = new THREE.Group();
    station.position.set(...p);
    station.rotation.y = idx % 2 === 0 ? 0.35 : -0.35;

    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.28, 1.25),
      hexMaterial(0x0d141e, { metalness: 0.72, roughness: 0.28 })
    );
    desk.position.y = -0.45;
    station.add(desk);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.0, 0.09),
      new THREE.MeshBasicMaterial({ color: 0x10243a })
    );
    screen.position.set(0, 0.25, -0.24);
    station.add(screen);

    const glow = new THREE.PointLight(0x3f84ff, 3.6, 3.6);
    glow.position.set(0, 0.15, -0.8);
    station.add(glow);

    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 0.72),
      new THREE.MeshBasicMaterial({ color: 0x4e9cff, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, -0.29, -0.25);
    station.add(line);

    objects.screens.push(screen);
    consolesGroup.add(station);
  });
}

function buildCity() {
  cityGroup = new THREE.Group();
  cityGroup.position.z = -4.0;
  worldGroup.add(cityGroup);

  for (let i = 0; i < 54; i++) {
    const w = 0.18 + ((i * 11) % 5) * 0.06;
    const d = 0.18 + ((i * 7) % 4) * 0.055;
    const h = 0.35 + ((i * 17) % 11) * 0.11;

    const building = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        color: 0x101924,
        metalness: 0.15,
        roughness: 0.92,
        emissive: 0x05080e,
        emissiveIntensity: 0.35
      })
    );

    const a = (i / 54) * Math.PI * 2;
    const radius = 3.25 + ((i * 13) % 10) * 0.08;
    building.position.set(Math.cos(a) * radius, -0.38 + h / 2, Math.sin(a) * radius - 0.55);
    cityGroup.add(building);

    if (i % 2 === 0) {
      const light = new THREE.PointLight(0xd8be73, 0.13, 1.1);
      light.position.copy(building.position);
      light.position.y += h * 0.5;
      cityGroup.add(light);
      objects.cityLights.push(light);
    }
  }
}

function buildFloatingParticles() {
  const count = 520;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 2.2 + Math.random() * 5.5;
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = -0.3 + Math.random() * 4.8;
    positions[i * 3 + 2] = -1.5 + Math.sin(angle) * r;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x7894c8,
    size: 0.018,
    transparent: true,
    opacity: 0.65,
    depthWrite: false
  });
  const points = new THREE.Points(geo, mat);
  points.name = 'atmosphere-particles';
  objects.atmosphere = points;
  worldGroup.add(points);
}

function buildWorld() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02050b);
  scene.fog = new THREE.FogExp2(0x02050b, 0.032);

  camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 160);
  camera.position.copy(CAMERA_PRESETS.establish.position);
  cameraTarget.copy(CAMERA_PRESETS.establish.target);

  clock = new THREE.Clock();
  worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const hemi = new THREE.HemisphereLight(0xadc6ff, 0x061018, 1.25);
  scene.add(hemi);

  objects.keyLight = new THREE.DirectionalLight(0xffe7b0, 3.0);
  objects.keyLight.position.set(4.5, 7.5, 4.5);
  scene.add(objects.keyLight);

  objects.fillLight = new THREE.PointLight(0x426dff, 22, 30);
  objects.fillLight.position.set(-5, 3, 1);
  scene.add(objects.fillLight);

  objects.rimLight = new THREE.PointLight(0xb14dff, 12, 22);
  objects.rimLight.position.set(5, 3, -5);
  scene.add(objects.rimLight);

  buildRoom();
  buildCentralTable();
  buildHologram();
  buildConsoles();
  buildCity();
  buildFloatingParticles();

  tryRenderer();
}

async function tryRenderer() {
  try {
    const R = THREE.WebGPURenderer;
    if (R) {
      renderer = new R({ antialias: true, canvas: ui.canvas, powerPreference: 'high-performance' });
      await renderer.init();
    }
  } catch (_) {
    renderer = null;
  }

  if (!renderer) {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: ui.canvas,
      powerPreference: 'high-performance'
    });
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.45));
  renderer.setSize(innerWidth, innerHeight, false);
  animate();
  startStageCinematic();
}

function resize() {
  if (!camera || !renderer) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
}

addEventListener('resize', resize);

function smoothCamera(presetName, duration = 1800) {
  const preset = CAMERA_PRESETS[presetName] || CAMERA_PRESETS.command;
  const fromPos = camera.position.clone();
  const fromTarget = cameraTarget.clone();
  const start = performance.now();

  return new Promise(resolve => {
    function step(now) {
      const t = clamp((now - start) / duration, 0, 1);
      const e = t * t * (3 - 2 * t);
      camera.position.lerpVectors(fromPos, preset.position, e);
      cameraTarget.lerpVectors(fromTarget, preset.target, e);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

function animate() {
  requestAnimationFrame(animate);
  if (!renderer || !scene) return;

  const t = clock.getElapsedTime();
  animationTime = t;

  if (objects.globe) {
    objects.globe.rotation.y = t * 0.23;
    objects.globe.rotation.x = Math.sin(t * 0.17) * 0.08;
  }
  if (objects.globeRingA) objects.globeRingA.rotation.z = t * 0.08;
  if (objects.globeRingB) objects.globeRingB.rotation.y = -t * 0.12;
  if (objects.globeRingC) objects.globeRingC.rotation.x = 0.7 + Math.sin(t * 0.35) * 0.1;
  if (objects.atmosphere) objects.atmosphere.rotation.y = t * 0.018;

  objects.screens.forEach((screen, i) => {
    screen.material.color.offsetHSL(0, 0, Math.sin(t * 0.9 + i) * 0.002);
  });

  objects.cityLights.forEach((light, i) => {
    light.intensity = 0.08 + 0.07 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 0.7));
  });

  camera.lookAt(cameraTarget);
  renderer.render(scene, camera);
}

function applyWorld(path) {
  const c = pathColor(path);
  const bg = pathBackground(path);

  scene.background.setHex(bg);
  if (scene.fog) scene.fog.color.setHex(bg);

  if (objects.globe) {
    objects.globe.material.color.setHex(c);
    objects.globe.material.emissive.setHex(c);
    objects.globe.material.emissiveIntensity = path === 'chaos' ? 2.8 : path === 'power' ? 2.2 : 1.6;
  }
  if (objects.globeGlow) objects.globeGlow.color.setHex(c);
  if (objects.globeRingA) objects.globeRingA.material.color.setHex(c);
  if (objects.globeRingB) objects.globeRingB.material.color.setHex(c);
  if (objects.globeRingC) objects.globeRingC.material.color.setHex(c);

  if (objects.fillLight) objects.fillLight.color.setHex(c);
  if (objects.rimLight) objects.rimLight.color.setHex(c);

  const cityColor = path === 'chaos' ? 0x34141a : path === 'power' ? 0x2d1711 : path === 'peace' ? 0x11372a : 0x181b2f;
  cityGroup.traverse(obj => {
    if (obj.isMesh && obj.material && obj.material.color) obj.material.color.setHex(cityColor);
  });
}

/* =========================================================
   Audio feedback
========================================================= */

function initAudio() {
  if (!soundEnabled) return;
  try {
    if (!audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioContext = new Ctx();
    }
    if (audioContext.state === 'suspended') audioContext.resume();
  } catch (_) {}
}

function tone(freq, duration = 0.2, volume = 0.03, type = 'sine', delay = 0) {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (!audioContext) return;
    const start = audioContext.currentTime + delay;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.001), start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  } catch (_) {}
}

function playPathSound(path) {
  if (path === 'peace') {
    tone(261.6, 0.22, 0.03, 'sine');
    tone(329.6, 0.28, 0.025, 'sine', 0.08);
    tone(392, 0.32, 0.02, 'sine', 0.16);
  } else if (path === 'power') {
    tone(90, 0.35, 0.045, 'sawtooth');
    tone(135, 0.28, 0.03, 'square', 0.09);
  } else if (path === 'chaos') {
    tone(48, 0.48, 0.055, 'sawtooth');
    tone(70, 0.36, 0.03, 'triangle', 0.08);
  } else {
    tone(220, 0.18, 0.025, 'triangle');
    tone(294, 0.22, 0.022, 'triangle', 0.1);
    tone(349, 0.28, 0.017, 'triangle', 0.18);
  }
}

function playUiSound() {
  tone(620, 0.08, 0.018, 'sine');
  tone(880, 0.1, 0.012, 'sine', 0.05);
}

/* =========================================================
   Narrative + UI flow
========================================================= */

function speak(text) {
  if (!soundEnabled || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA';
    u.rate = 0.86;
    u.pitch = 0.52;
    u.volume = 0.9;
    speechSynthesis.speak(u);
  } catch (_) {}
}

function showNarration(text) {
  ui.narration.textContent = text;
  speak(text);
}

function clearTimer() {
  if (cinematicTimer) clearTimeout(cinematicTimer);
  cinematicTimer = null;
}

function showDecision() {
  const s = stages[state.stage - 1];
  if (!s) return;

  ui.location.textContent = s.location;
  ui.question.textContent = s.question;
  ui.options.innerHTML = '';

  s.options.forEach(item => {
    const b = document.createElement('button');
    b.className = 'option';
    b.type = 'button';
    b.textContent = item.text;
    b.addEventListener('click', () => choose(item, b), { once: true });
    ui.options.appendChild(b);
  });

  ui.decision.classList.remove('hidden');
}

function applyDecision(item) {
  state.influence += item.influence;
  state.peace = clamp(state.peace + item.peace, 0, 100);
  state.chaos = clamp(state.chaos + item.chaos, 0, 100);
  state.balance = clamp(state.balance + item.balance, 0, 100);
  state.trust = clamp(state.trust + item.trust, 0, 100);
  state.history.push({ stage: state.stage, id: item.id, path: item.path });
  save();
  updateStats();
}

async function choose(item, button) {
  if (running) return;
  running = true;
  clearTimer();
  playUiSound();

  ui.options.querySelectorAll('.option').forEach(x => x.classList.add('locked'));
  button.style.borderColor = '#e8c66c';

  applyDecision(item);
  applyWorld(item.path);
  playPathSound(item.path);
  ui.decision.classList.add('hidden');
  showNarration(item.result);

  await smoothCamera(item.path === 'chaos' ? 'result' : 'globe', 900);

  if (item.path === 'chaos') {
    game.classList.add('shake');
    setTimeout(() => game.classList.remove('shake'), 600);
  }

  ui.resultTitle.textContent = item.title;
  ui.resultText.textContent = item.result;
  ui.result.classList.remove('hidden');
  running = false;
}

async function beginStage() {
  clearTimer();
  const s = stages[state.stage - 1];
  if (!s) return;

  ui.result.classList.add('hidden');
  ui.decision.classList.add('hidden');
  updateStats();
  applyWorld('balance');
  await smoothCamera('establish', 1100);

  const lines = s.narration || [];
  if (lines[0]) showNarration(lines[0]);
  await new Promise(r => { cinematicTimer = setTimeout(r, 1600); });
  if (lines[1]) showNarration(lines[1]);
  await new Promise(r => { cinematicTimer = setTimeout(r, 1600); });
  if (lines[2]) showNarration(lines[2]);
  await new Promise(r => { cinematicTimer = setTimeout(r, 1400); });
  showDecision();
}

function finishGame() {
  ui.result.classList.remove('hidden');
  const ending = state.chaos >= Math.max(state.peace, state.balance, state.influence * 0.3)
    ? 'الفوضى'
    : state.peace > state.balance + 10
      ? 'السلام'
      : state.influence > 170
        ? 'النفوذ'
        : 'التوازن';

  currentSceneType = ending === 'السلام' ? 'peace' : ending === 'الفوضى' ? 'chaos' : ending === 'النفوذ' ? 'power' : 'balance';
  applyWorld(ending === 'السلام' ? 'peace' : ending === 'الفوضى' ? 'chaos' : ending === 'النفوذ' ? 'power' : 'balance');

  ui.resultTitle.textContent = `النهاية: ${ending}`;
  ui.resultText.textContent = `لقد وصلت إلى الدرجة 33. هذه النتيجة تمثل بصمتك داخل المحاكاة: ${ending}.`;
  ui.cont.textContent = 'إعادة اللعبة من الدرجة 01';
}

ui.start.addEventListener('click', () => {
  initAudio();
  ui.intro.classList.add('hidden');
  beginStage();
});

ui.cont.addEventListener('click', () => {
  if (state.stage >= 33) {
    restartGame();
    return;
  }
  state.stage += 1;
  save();
  beginStage();
});

function restartGame() {
  running = false;
  clearTimer();
  try { speechSynthesis.cancel(); } catch (_) {}
  Object.assign(state, {
    stage: 1,
    influence: 0,
    peace: 50,
    chaos: 0,
    balance: 50,
    trust: 50,
    history: []
  });
  localStorage.removeItem(SAVE_KEY);
  ui.intro.classList.remove('hidden');
  ui.decision.classList.add('hidden');
  ui.result.classList.add('hidden');
  ui.narration.textContent = '';
  updateStats();
  applyWorld('balance');
}

ui.restart.addEventListener('click', restartGame);

/* =========================================================
   Start
========================================================= */

load();
buildWorld();
updateStats();
