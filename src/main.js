import * as THREE from 'three';
import { stages } from './data.js';

const SAVE_KEY='hidden-master-33-v2';
const state={stage:1,influence:0,peace:50,chaos:0,balance:50,trust:50,history:[]};

const ui={
  canvas:document.querySelector('#scene'),
  intro:document.querySelector('#intro'),
  decision:document.querySelector('#decision'),
  result:document.querySelector('#result'),
  start:document.querySelector('#start'),
  cont:document.querySelector('#continue'),
  restart:document.querySelector('#restart'),
  question:document.querySelector('#question'),
  options:document.querySelector('#options'),
  narration:document.querySelector('#narration'),
  location:document.querySelector('#location'),
  resultTitle:document.querySelector('#resultTitle'),
  resultText:document.querySelector('#resultText'),
  stageLabel:document.querySelector('#stageLabel'),
  stats:document.querySelector('#stats')
};

let scene,camera,renderer,clock;
let worldGroup,orb,ring,cityGroup;
let running=false;

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function save(){localStorage.setItem(SAVE_KEY,JSON.stringify(state));}
function load(){try{const x=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(x){Object.assign(state,x);state.stage=clamp(Number(state.stage)||1,1,33);if(!Array.isArray(state.history))state.history=[];}}catch(e){}}
function updateStats(){
  ui.stageLabel.textContent=`الدرجة ${String(state.stage).padStart(2,'0')} / 33`;
  ui.stats.innerHTML=`<div class="stat">النفوذ: <b>${Math.round(state.influence)}</b></div><div class="stat">السلام: <b>${Math.round(state.peace)}</b></div><div class="stat">الفوضى: <b>${Math.round(state.chaos)}</b></div><div class="stat">التوازن: <b>${Math.round(state.balance)}</b></div><div class="stat">الثقة: <b>${Math.round(state.trust)}</b></div>`;
}
function hexFor(path){return path==='peace'?0x3ed58b:path==='power'?0xff8b3d:path==='chaos'?0xff3040:0x7c84ff;}
function buildWorld(){
  scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2(0x02040a,0.045);
  camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.1,120);
  camera.position.set(0,2.2,7.5);
  clock=new THREE.Clock();
  worldGroup=new THREE.Group();scene.add(worldGroup);

  const hemi=new THREE.HemisphereLight(0x9bb8ff,0x081018,1.25);scene.add(hemi);
  const key=new THREE.DirectionalLight(0xffe8b0,2.2);key.position.set(5,7,4);scene.add(key);
  const fill=new THREE.PointLight(0x416cff,22,30);fill.position.set(-5,2,1);scene.add(fill);

  const floor=new THREE.Mesh(new THREE.PlaneGeometry(28,28),new THREE.MeshStandardMaterial({color:0x05080d,roughness:.92,metalness:.08}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-1.15;worldGroup.add(floor);

  orb=new THREE.Mesh(new THREE.IcosahedronGeometry(1.45,2),new THREE.MeshStandardMaterial({color:0xe8c66c,emissive:0x5b4310,emissiveIntensity:1.6,metalness:.35,roughness:.25}));
  orb.position.set(0,.45,0);worldGroup.add(orb);

  ring=new THREE.Mesh(new THREE.TorusGeometry(2.2,.018,12,96),new THREE.MeshBasicMaterial({color:0xe8c66c,transparent:true,opacity:.62}));
  ring.rotation.x=Math.PI/2;ring.position.y=.45;worldGroup.add(ring);

  cityGroup=new THREE.Group();
  for(let i=0;i<24;i++){
    const h=.6+((i*17)%12)/7;
    const m=new THREE.MeshStandardMaterial({color:0x18212c,roughness:1});
    const b=new THREE.Mesh(new THREE.BoxGeometry(.32,h,.32),m);
    b.position.set((i-12)*.55,-1.15+h/2,-1.8-Math.abs(i-12)*.15);
    cityGroup.add(b);
  }
  worldGroup.add(cityGroup);

  tryRenderer();
  animate();
}

async function tryRenderer(){
  try{
    const R=THREE.WebGPURenderer;
    renderer=new R({antialias:true,canvas:ui.canvas,powerPreference:'high-performance'});
    await renderer.init();
  }catch(e){
    renderer=new THREE.WebGLRenderer({antialias:true,canvas:ui.canvas,powerPreference:'high-performance'});
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
  renderer.setSize(innerWidth,innerHeight,false);
}
function resize(){if(camera)camera.aspect=innerWidth/innerHeight;if(camera)camera.updateProjectionMatrix();if(renderer)renderer.setSize(innerWidth,innerHeight,false);}
addEventListener('resize',resize);

function setWorld(path){
  const c=hexFor(path);
  orb.material.color.setHex(c);
  ring.material.color.setHex(c);
  orb.material.emissive.setHex(c);
  cityGroup.children.forEach(m=>m.material.color.setHex(path==='chaos'?0x301318:path==='power'?0x2b1711:path==='peace'?0x123d2a:0x1a1d2e));
}
function animate(){
  requestAnimationFrame(animate);
  if(!renderer||!scene)return;
  const t=clock.getElapsedTime();
  orb.rotation.x=t*.16;orb.rotation.y=t*.23;
  ring.rotation.z=t*.08;
  camera.position.x=Math.sin(t*.13)*.5;
  camera.position.y=2.2+Math.sin(t*.2)*.12;
  camera.lookAt(0,.25,-.6);
  renderer.render(scene,camera);
}

function speak(text){
  if(!('speechSynthesis' in window))return;
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ar-SA';u.rate=.9;u.pitch=.55;u.volume=.9;speechSynthesis.speak(u);}catch(e){}
}
function narration(text){ui.narration.textContent=text;speak(text);}
function showDecision(){
  const s=stages[state.stage-1];
  ui.location.textContent=s.location;
  ui.question.textContent=s.question;
  ui.options.innerHTML='';
  s.options.forEach(item=>{
    const b=document.createElement('button');b.className='option';b.type='button';b.textContent=item.text;
    b.onclick=()=>choose(item,b);ui.options.appendChild(b);
  });
  ui.decision.classList.remove('hidden');
}
function apply(item){
  state.influence+=item.influence;state.peace=clamp(state.peace+item.peace,0,100);state.chaos=clamp(state.chaos+item.chaos,0,100);state.balance=clamp(state.balance+item.balance,0,100);state.trust=clamp(state.trust+item.trust,0,100);
  state.history.push({stage:state.stage,id:item.id,path:item.path});save();updateStats();
}
function choose(item,b){
  if(running)return;running=true;
  ui.options.querySelectorAll('.option').forEach(x=>x.classList.add('locked'));b.style.borderColor='#e8c66c';
  apply(item);setWorld(item.path);ui.decision.classList.add('hidden');
  narration(item.result);
  setTimeout(()=>{ui.resultTitle.textContent=item.title;ui.resultText.textContent=item.result;ui.result.classList.remove('hidden');running=false;},900);
}
function beginStage(){
  const s=stages[state.stage-1];
  ui.result.classList.add('hidden');ui.decision.classList.add('hidden');updateStats();setWorld('balance');narration(s.narration[0]);ui.location.textContent=s.location;
  setTimeout(()=>{narration(s.narration[1]);},1600);
  setTimeout(()=>{narration(s.narration[2]);},3200);
  setTimeout(showDecision,5000);
}
ui.start.onclick=()=>{ui.intro.classList.add('hidden');beginStage();};
ui.cont.onclick=()=>{if(state.stage>=33){finish();return;}state.stage++;save();beginStage();};
ui.restart.onclick=()=>{Object.assign(state,{stage:1,influence:0,peace:50,chaos:0,balance:50,trust:50,history:[]});localStorage.removeItem(SAVE_KEY);ui.intro.classList.remove('hidden');ui.result.classList.add('hidden');ui.decision.classList.add('hidden');updateStats();setWorld('balance');};
function finish(){
  ui.result.classList.remove('hidden');
  const winner=state.chaos>Math.max(state.peace,state.balance,state.influence*.3)?'الفوضى':state.peace>state.balance+10?'السلام':state.influence>170?'النفوذ':'التوازن';
  ui.resultTitle.textContent=`النهاية: ${winner}`;
  ui.resultText.textContent=`بلغت الدرجة 33. بصمتك الاستراتيجية أصبحت جزءاً من هذا العالم. النتيجة النهائية: ${winner}.`;
  ui.cont.textContent='إعادة اللعبة من الدرجة 01';
  ui.cont.onclick=()=>ui.restart.onclick();
}
load();buildWorld();updateStats();
