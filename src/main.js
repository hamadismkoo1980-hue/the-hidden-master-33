import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02050b);
scene.fog = new THREE.FogExp2(0x02050b, 0.045);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth/window.innerHeight, 0.1, 200);
camera.position.set(0, 5.5, 13.5);

const rig = new THREE.Group();
scene.add(rig);
rig.add(camera);

const hemi = new THREE.HemisphereLight(0x7f97c7, 0x080b12, 1.7);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 2.5);
key.position.set(4,10,5);
scene.add(key);

const cyan = new THREE.PointLight(0x4cbfff, 2.8, 18);
cyan.position.set(0,4,-2);
scene.add(cyan);

const amber = new THREE.PointLight(0xe8bd63, 1.8, 14);
amber.position.set(-4,2,3);
scene.add(amber);

const room = new THREE.Group();
scene.add(room);

const floorMat = new THREE.MeshStandardMaterial({color:0x0a0e16,roughness:.72,metalness:.25});
const wallMat = new THREE.MeshStandardMaterial({color:0x111722,roughness:.8,metalness:.15});
const trimMat = new THREE.MeshStandardMaterial({color:0x252e3b,roughness:.5,metalness:.6});

const floor = new THREE.Mesh(new THREE.PlaneGeometry(28,24),floorMat);
floor.rotation.x=-Math.PI/2;
room.add(floor);

function wall(x,y,z,sx,sy,sz){
  const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),wallMat);
  m.position.set(x,y,z); room.add(m); return m;
}
wall(0,7,-10,28,14,.4);
wall(-14,7,0,.4,14,20);
wall(14,7,0,.4,14,20);

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(28,20),new THREE.MeshStandardMaterial({color:0x06080d,roughness:1}));
ceiling.rotation.x=Math.PI/2;
ceiling.position.y=14;
room.add(ceiling);

for(let i=0;i<7;i++){
  const strip=new THREE.Mesh(new THREE.BoxGeometry(.14,.12,14),trimMat);
  strip.position.set(-9+i*3,4.5,-9.7);
  room.add(strip);
}

const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(3.9,4.5,.7,64),new THREE.MeshStandardMaterial({color:0x0a1019,roughness:.3,metalness:.75}));
tableBase.position.y=.4;
room.add(tableBase);

const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.2,.25,96),new THREE.MeshStandardMaterial({color:0x131b29,roughness:.24,metalness:.65,emissive:0x020812,emissiveIntensity:.3}));
tableTop.position.y=.78;
room.add(tableTop);

const ring = new THREE.Mesh(new THREE.TorusGeometry(4.25,.035,12,96),new THREE.MeshBasicMaterial({color:0x58c7ff,transparent:true,opacity:.48}));
ring.rotation.x=0; ring.position.y=.95; room.add(ring);

const globe = new THREE.Group();
globe.position.y=2.6;
room.add(globe);

const globeMesh = new THREE.Mesh(new THREE.SphereGeometry(1.65,48,32),new THREE.MeshStandardMaterial({color:0x0d1b35,emissive:0x071a2b,emissiveIntensity:1.1,roughness:.5,metalness:.4}));
globe.add(globeMesh);

const wire = new THREE.Mesh(new THREE.SphereGeometry(1.69,32,20),new THREE.MeshBasicMaterial({color:0x4ab7ff,wireframe:true,transparent:true,opacity:.25}));
globe.add(wire);

for(let i=0;i<5;i++){
  const r = new THREE.Mesh(new THREE.TorusGeometry(1.8+i*.22,.012,8,96),new THREE.MeshBasicMaterial({color:i%2?0x6e74ff:0x4cbfff,transparent:true,opacity:.22}));
  r.rotation.x = Math.random()*Math.PI;
  r.rotation.z = Math.random()*Math.PI;
  globe.add(r);
}

const continents = new THREE.Group();
globe.add(continents);
for(let i=0;i<18;i++){
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.028+Math.random()*.035,8,8),new THREE.MeshBasicMaterial({color:0x8ed7ff}));
  const a=Math.random()*Math.PI*2;
  const b=(Math.random()-.5)*Math.PI;
  const rr=1.66;
  dot.position.set(rr*Math.cos(b)*Math.cos(a),rr*Math.sin(b),rr*Math.cos(b)*Math.sin(a));
  continents.add(dot);
}

function makeScreen(x,z,rotY,color){
  const g=new THREE.Group();
  g.position.set(x,4.2,z);
  g.rotation.y=rotY;
  room.add(g);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(3.9,2.3,.16),new THREE.MeshStandardMaterial({color:0x111722,roughness:.32,metalness:.7}));
  g.add(frame);
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(3.55,1.95),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.72}));
  panel.position.z=.1;
  g.add(panel);
  const grid=new THREE.GridHelper(3.1,10,0x7ed0ff,0x27445c);
  grid.rotation.x=Math.PI/2;
  grid.position.z=.11;
  grid.material.transparent=true;
  grid.material.opacity=.2;
  g.add(grid);
  return {g,panel};
}

const screens=[
  makeScreen(-7.2,-7.6,.12,0x14334e),
  makeScreen(0,-9.2,0,0x162447),
  makeScreen(7.2,-7.6,-.12,0x3b1b18)
];

const panels = screens.map(s=>s.panel);

for(let i=0;i<6;i++){
  const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.06,12),new THREE.MeshBasicMaterial({color:i%2?0x63d4ff:0xe5c66c}));
  beacon.position.set(-5+i*2,1.08,0);
  room.add(beacon);
}

const particles = new THREE.Group();
scene.add(particles);
for(let i=0;i<90;i++){
  const p=new THREE.Mesh(new THREE.SphereGeometry(.018,6,6),new THREE.MeshBasicMaterial({color:i%3?0x64cfff:0xe5c66c,transparent:true,opacity:.45}));
  p.position.set((Math.random()-.5)*18,1+Math.random()*10,(Math.random()-.5)*15);
  p.userData.speed=.002+Math.random()*.008;
  particles.add(p);
}

const starGroup = new THREE.Group();
scene.add(starGroup);
for(let i=0;i<180;i++){
  const p=new THREE.Mesh(new THREE.SphereGeometry(.012,5,5),new THREE.MeshBasicMaterial({color:0x8fb6ff,transparent:true,opacity:.3}));
  p.position.set((Math.random()-.5)*60,Math.random()*28+4,(Math.random()-.5)*60-15);
  starGroup.add(p);
}

const caption=document.getElementById('caption');
const status=document.getElementById('status');
const intro=document.getElementById('intro');
const decision=document.getElementById('decision');
const result=document.getElementById('result');
const resultTitle=document.getElementById('resultTitle');
const resultText=document.getElementById('resultText');
const start=document.getElementById('start');
const again=document.getElementById('again');

let mode='intro';
let path='balance';
let cameraTarget=new THREE.Vector3(0,5.5,13.5);
let cameraLook=new THREE.Vector3(0,1.8,0);
let targetColor=new THREE.Color(0x4cbfff);
let currentColor=new THREE.Color(0x4cbfff);

const narration=[
  'الساعة الثالثة وسبع عشرة دقيقة.',
  'في مكان لا يظهر على أي خريطة، تجتمع الشاشات وتراقب عالماً يقترب من نقطة التحول.',
  'أمامك أربعة مسارات... وكل واحد منها سيترك أثراً مختلفاً.'
];

async function typeCaption(text){
  caption.textContent='';
  const ms=Math.max(22,Math.min(46,1500/Math.max(text.length,1)));
  for(let i=1;i<=text.length;i++){
    caption.textContent=text.slice(0,i);
    await new Promise(r=>setTimeout(r,ms));
  }
}

function setPathVisual(next){
  path=next;
  if(next==='peace'){
    targetColor.set(0x59e69d);
    status.textContent='المسار: السلام';
  }else if(next==='power'){
    targetColor.set(0xff813c);
    status.textContent='المسار: القوة';
  }else if(next==='chaos'){
    targetColor.set(0xff2943);
    status.textContent='المسار: الفوضى';
  }else{
    targetColor.set(0x8e8aff);
    status.textContent='المسار: التوازن';
  }
}

function showDecision(){
  mode='decision';
  decision.classList.remove('hidden');
  status.textContent='اختر قرارك';
}

function choose(p){
  mode='result';
  setPathVisual(p);
  decision.classList.add('hidden');
  result.classList.remove('hidden');
  const data={
    peace:['قرار السلام','فتحت نافذة للتفاوض، وبدأت مؤشرات التوتر بالانخفاض.'],
    power:['قرار القوة','ارتفع النفوذ، لكن المدينة أصبحت أكثر توتراً.'],
    balance:['قرار التوازن','تم منع طرف واحد من السيطرة على المشهد.'],
    chaos:['قرار الفوضى','اشتعلت المؤشرات وتحولت الغرفة إلى حالة إنذار.']
  }[p];
  resultTitle.textContent=data[0];
  resultText.textContent=data[1];
  targetColor.copy(currentColor);
  if(p==='chaos'){ flash(); shake(); }
}

function flash(){
  const el=document.createElement('div');
  el.style.position='fixed'; el.style.inset='0'; el.style.background='#ff1025'; el.style.opacity='.3'; el.style.zIndex='25'; el.style.pointerEvents='none';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),160);
}

function shake(){
  document.getElementById('game').animate([
    {transform:'translate(0,0)'},{transform:'translate(-7px,3px)'},{transform:'translate(5px,-4px)'},{transform:'translate(-4px,4px)'},{transform:'translate(0,0)'}
  ],{duration:480,easing:'ease-out'});
}

start.addEventListener('click',async()=>{
  intro.classList.add('hidden');
  mode='film';
  cameraTarget.set(0,4.8,10.5);
  cameraLook.set(0,2.2,0);
  for(const line of narration){
    await typeCaption(line);
    await new Promise(r=>setTimeout(r,650));
  }
  caption.textContent='';
  showDecision();
});

document.querySelectorAll('.choices button').forEach(btn=>{
  btn.addEventListener('click',()=>choose(btn.dataset.path));
});

again.addEventListener('click',()=>location.reload());

function onResize(){
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight,false);
}
window.addEventListener('resize',onResize);

const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const t=clock.getElapsedTime();

  currentColor.lerp(targetColor,.025);
  cyan.color.copy(currentColor);
  ring.material.color.copy(currentColor);
  wire.material.color.copy(currentColor);

  globe.rotation.y += .0025;
  wire.rotation.y -= .0015;
  continents.rotation.y += .0025;

  ring.rotation.z += .0012;
  ring.scale.setScalar(1+Math.sin(t*.8)*.015);

  panels.forEach((p,i)=>{
    p.material.opacity=.55 + .12*Math.sin(t*1.2+i);
  });

  particles.children.forEach((p,i)=>{
    p.position.y += p.userData.speed;
    if(p.position.y>11) p.position.y=1;
    p.position.x += Math.sin(t*.2+i)*.0007;
  });

  starGroup.rotation.y += .00008;

  const lerpPos=.035;
  camera.position.lerp(cameraTarget,lerpPos);
  const look=new THREE.Vector3().lerpVectors(cameraLook,new THREE.Vector3(0,2.2,0),0);
  camera.lookAt(look);

  if(mode==='film'){
    cameraTarget.x=Math.sin(t*.18)*.55;
    cameraTarget.z=10.5+Math.cos(t*.15)*.55;
  }

  renderer.render(scene,camera);
}

animate();
