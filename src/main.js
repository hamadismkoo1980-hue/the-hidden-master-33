(function(){
  'use strict';

  const canvas = document.getElementById('scene');
  const status = document.getElementById('status');
  const caption = document.getElementById('caption');
  const intro = document.getElementById('intro');
  const decision = document.getElementById('decision');
  const result = document.getElementById('result');
  const resultTitle = document.getElementById('resultTitle');
  const resultText = document.getElementById('resultText');
  const start = document.getElementById('start');
  const again = document.getElementById('again');
  const choiceButtons = Array.from(document.querySelectorAll('.choices button'));

  let mode = 'intro';
  let path = 'balance';
  let soundEnabled = true;
  let speechStarted = false;
  let threeReady = false;
  let three = null;
  let scene = null;
  let camera = null;
  let renderer = null;
  let rig = null;
  let ring = null;
  let globe = null;
  let globeWire = null;
  let continents = null;
  let cyan = null;
  let panels = [];
  let particles = null;
  let starGroup = null;
  let cameraTarget = null;
  let clock = null;
  let fallbackCtx = null;
  let fallbackRunning = false;
  let currentColor = null;
  let targetColor = null;

  const narration = [
    'الساعة الثالثة وسبع عشرة دقيقة.',
    'في مكان لا يظهر على أي خريطة، تجتمع الشاشات وتراقب عالماً يقترب من نقطة التحول.',
    'أمامك أربعة مسارات... وكل واحد منها سيترك أثراً مختلفاً.'
  ];

  function setStatus(text){
    if(status) status.textContent = text;
  }

  function wait(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function safeSpeak(text){
    if(!soundEnabled || !('speechSynthesis' in window)) return;
    try{
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ar-SA';
      u.rate = 0.86;
      u.pitch = 0.55;
      u.volume = 0.92;
      window.speechSynthesis.speak(u);
    }catch(_e){}
  }

  function stopSpeak(){
    try{
      if('speechSynthesis' in window) window.speechSynthesis.cancel();
    }catch(_e){}
  }

  function typeCaption(text){
    caption.textContent = '';
    const speed = Math.max(22, Math.min(48, 1600 / Math.max(text.length, 1)));
    let i = 0;
    return new Promise(resolve => {
      const timer = setInterval(() => {
        i += 1;
        caption.textContent = text.slice(0, i);
        if(i >= text.length){
          clearInterval(timer);
          resolve();
        }
      }, speed);
    });
  }

  function flash(color, alpha){
    const el = document.createElement('div');
    el.style.position='fixed';
    el.style.inset='0';
    el.style.background=color;
    el.style.opacity=String(alpha);
    el.style.zIndex='50';
    el.style.pointerEvents='none';
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),220);
  }

  function shake(){
    const game = document.getElementById('app');
    if(!game || !game.animate) return;
    game.animate([
      {transform:'translate(0,0)'},
      {transform:'translate(-7px,3px)'},
      {transform:'translate(5px,-4px)'},
      {transform:'translate(-4px,4px)'},
      {transform:'translate(0,0)'}
    ],{duration:480,easing:'ease-out'});
  }

  function tone(frequency, duration, volume, type){
    if(!soundEnabled) return;
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return;
      window.__hmAudio = window.__hmAudio || new AC();
      const ac = window.__hmAudio;
      if(ac.state === 'suspended') ac.resume();
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(frequency, t);
      gain.gain.setValueAtTime(.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(volume,.001), t+.03);
      gain.gain.exponentialRampToValueAtTime(.0001, t+duration);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t+duration+.03);
    }catch(_e){}
  }

  function choosePathVisual(next){
    path = next;
    if(next === 'peace'){
      targetColor.set(0x59e69d);
      setStatus('المسار: السلام');
      tone(261.6,.2,.03,'sine');
      tone(329.6,.25,.025,'sine');
    }else if(next === 'power'){
      targetColor.set(0xff813c);
      setStatus('المسار: القوة');
      tone(88,.3,.045,'sawtooth');
      tone(132,.22,.03,'square');
    }else if(next === 'chaos'){
      targetColor.set(0xff2943);
      setStatus('المسار: الفوضى');
      tone(50,.5,.06,'sawtooth');
      flash('#ff2020',.28);
      shake();
    }else{
      targetColor.set(0x8e8aff);
      setStatus('المسار: التوازن');
      tone(220,.18,.025,'triangle');
      tone(293.7,.22,.02,'triangle');
    }
  }

  function showDecision(){
    mode='decision';
    decision.classList.remove('hidden');
    setStatus('اختر قرارك');
  }

  function choose(p){
    if(mode !== 'decision') return;
    mode='result';
    choosePathVisual(p);
    decision.classList.add('hidden');
    result.classList.remove('hidden');
    const data = {
      peace:['قرار السلام','فتحت نافذة للتفاوض، وبدأت مؤشرات التوتر بالانخفاض.'],
      power:['قرار القوة','ارتفع النفوذ، لكن المدينة أصبحت أكثر توتراً.'],
      balance:['قرار التوازن','تم منع طرف واحد من السيطرة على المشهد.'],
      chaos:['قرار الفوضى','اشتعلت المؤشرات وتحولت الغرفة إلى حالة إنذار.']
    }[p] || ['قرار جديد','تم تسجيل اختيارك.'];
    resultTitle.textContent = data[0];
    resultText.textContent = data[1];
    if(threeReady){
      cameraTarget.set(p === 'chaos' ? 4 : p === 'power' ? -4 : 0, 4.5, 9.5);
    }
  }

  choiceButtons.forEach(btn => {
    btn.addEventListener('click', function(){
      choose(btn.dataset.path);
    });
  });

  start.addEventListener('click', async function(){
    if(mode !== 'intro') return;
    mode='film';
    intro.classList.add('hidden');
    setStatus(threeReady ? 'المشهد ثلاثي الأبعاد جاهز' : 'المشهد البديل يعمل');
    speechStarted=true;
    for(const line of narration){
      await typeCaption(line);
      safeSpeak(line);
      await wait(800);
    }
    caption.textContent='';
    showDecision();
  });

  again.addEventListener('click', function(){
    stopSpeak();
    mode='intro';
    result.classList.add('hidden');
    decision.classList.add('hidden');
    intro.classList.remove('hidden');
    caption.textContent='';
    path='balance';
    if(threeReady){
      targetColor.set(0x4cbfff);
      cameraTarget.set(0,5.5,13.5);
    }
    setStatus(threeReady ? 'النظام جاهز' : 'المشهد البديل جاهز');
  });

  function buildFallback(){
    if(fallbackRunning) return;
    fallbackRunning = true;
    try{
      fallbackCtx = canvas.getContext('2d');
      canvas.width = Math.max(1, Math.floor(innerWidth * Math.min(devicePixelRatio || 1, 1.5)));
      canvas.height = Math.max(1, Math.floor(innerHeight * Math.min(devicePixelRatio || 1, 1.5)));
      canvas.style.width = innerWidth+'px';
      canvas.style.height = innerHeight+'px';
      const scale = Math.min(devicePixelRatio || 1,1.5);
      fallbackCtx.setTransform(scale,0,0,scale,0,0);
      setStatus('تم تشغيل وضع العرض البديل');
      const draw = () => {
        if(!fallbackCtx) return;
        const w=innerWidth,h=innerHeight,t=performance.now()*.001;
        fallbackCtx.clearRect(0,0,w,h);
        const g=fallbackCtx.createRadialGradient(w*.5,h*.43,20,w*.5,h*.43,Math.max(w,h)*.55);
        const c = path==='peace'?'34,122,88':path==='power'?'143,62,25':path==='chaos'?'130,20,30':'42,38,104';
        g.addColorStop(0,`rgba(${c},.35)`);
        g.addColorStop(1,'rgba(0,0,0,.9)');
        fallbackCtx.fillStyle=g;
        fallbackCtx.fillRect(0,0,w,h);
        fallbackCtx.strokeStyle='rgba(92,203,255,.35)';
        fallbackCtx.lineWidth=2;
        const r=Math.min(w,h)*.16;
        fallbackCtx.beginPath();
        fallbackCtx.arc(w*.5,h*.42,r,0,Math.PI*2);
        fallbackCtx.stroke();
        fallbackCtx.beginPath();
        fallbackCtx.ellipse(w*.5,h*.42,r*1.35,r*.42,t*.15,0,Math.PI*2);
        fallbackCtx.stroke();
        fallbackCtx.fillStyle='rgba(255,255,255,.28)';
        for(let i=0;i<70;i++){
          const x=(i*47)%w;
          const y=(i*83+t*15*(i%3+1))%(h*.7);
          fallbackCtx.fillRect(x,y,1.2,1.2);
        }
        requestAnimationFrame(draw);
      };
      draw();
    }catch(_e){
      setStatus('وضع العرض الأساسي جاهز');
    }
  }

  function initThree(THREE){
    try{
      three = THREE;
      renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.5));
      renderer.setSize(window.innerWidth,window.innerHeight,false);
      if('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace=THREE.SRGBColorSpace;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x02050b);
      scene.fog = new THREE.FogExp2(0x02050b,.045);

      camera = new THREE.PerspectiveCamera(52,window.innerWidth/window.innerHeight,.1,200);
      camera.position.set(0,5.5,13.5);
      rig = new THREE.Group();
      scene.add(rig);
      rig.add(camera);

      const hemi = new THREE.HemisphereLight(0x7f97c7,0x080b12,1.7);
      scene.add(hemi);
      const key = new THREE.DirectionalLight(0xffffff,2.4);
      key.position.set(4,10,5);
      scene.add(key);
      cyan = new THREE.PointLight(0x4cbfff,2.8,18);
      cyan.position.set(0,4,-2);
      scene.add(cyan);
      const amber = new THREE.PointLight(0xe8bd63,1.8,14);
      amber.position.set(-4,2,3);
      scene.add(amber);

      const room=new THREE.Group();
      scene.add(room);
      const floorMat=new THREE.MeshStandardMaterial({color:0x0a0e16,roughness:.72,metalness:.25});
      const wallMat=new THREE.MeshStandardMaterial({color:0x111722,roughness:.8,metalness:.15});
      const trimMat=new THREE.MeshStandardMaterial({color:0x252e3b,roughness:.5,metalness:.6});
      const floor=new THREE.Mesh(new THREE.PlaneGeometry(28,24),floorMat);
      floor.rotation.x=-Math.PI/2;
      room.add(floor);
      function wall(x,y,z,sx,sy,sz){
        const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),wallMat);
        m.position.set(x,y,z); room.add(m);
      }
      wall(0,7,-10,28,14,.4);
      wall(-14,7,0,.4,14,20);
      wall(14,7,0,.4,14,20);
      const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(28,20),new THREE.MeshStandardMaterial({color:0x06080d,roughness:1}));
      ceiling.rotation.x=Math.PI/2;
      ceiling.position.y=14;
      room.add(ceiling);
      for(let i=0;i<7;i++){
        const strip=new THREE.Mesh(new THREE.BoxGeometry(.14,.12,14),trimMat);
        strip.position.set(-9+i*3,4.5,-9.7);
        room.add(strip);
      }

      const tableBase=new THREE.Mesh(new THREE.CylinderGeometry(3.9,4.5,.7,64),new THREE.MeshStandardMaterial({color:0x0a1019,roughness:.3,metalness:.75}));
      tableBase.position.y=.4; room.add(tableBase);
      const tableTop=new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.2,.25,96),new THREE.MeshStandardMaterial({color:0x131b29,roughness:.24,metalness:.65,emissive:0x020812,emissiveIntensity:.3}));
      tableTop.position.y=.78; room.add(tableTop);
      ring=new THREE.Mesh(new THREE.TorusGeometry(4.25,.035,12,96),new THREE.MeshBasicMaterial({color:0x58c7ff,transparent:true,opacity:.48}));
      ring.position.y=.95; room.add(ring);

      globe=new THREE.Group();
      globe.position.y=2.6;
      room.add(globe);
      const globeMesh=new THREE.Mesh(new THREE.SphereGeometry(1.65,48,32),new THREE.MeshStandardMaterial({color:0x0d1b35,emissive:0x071a2b,emissiveIntensity:1.1,roughness:.5,metalness:.4}));
      globe.add(globeMesh);
      globeWire=new THREE.Mesh(new THREE.SphereGeometry(1.69,32,20),new THREE.MeshBasicMaterial({color:0x4ab7ff,wireframe:true,transparent:true,opacity:.25}));
      globe.add(globeWire);
      for(let i=0;i<5;i++){
        const r=new THREE.Mesh(new THREE.TorusGeometry(1.8+i*.22,.012,8,96),new THREE.MeshBasicMaterial({color:i%2?0x6e74ff:0x4cbfff,transparent:true,opacity:.22}));
        r.rotation.x=Math.random()*Math.PI;
        r.rotation.z=Math.random()*Math.PI;
        globe.add(r);
      }
      continents=new THREE.Group(); globe.add(continents);
      for(let i=0;i<18;i++){
        const dot=new THREE.Mesh(new THREE.SphereGeometry(.028+Math.random()*.035,8,8),new THREE.MeshBasicMaterial({color:0x8ed7ff}));
        const a=Math.random()*Math.PI*2;
        const b=(Math.random()-.5)*Math.PI;
        const rr=1.66;
        dot.position.set(rr*Math.cos(b)*Math.cos(a),rr*Math.sin(b),rr*Math.cos(b)*Math.sin(a));
        continents.add(dot);
      }

      function makeScreen(x,z,rotY,color){
        const g=new THREE.Group(); g.position.set(x,4.2,z); g.rotation.y=rotY; room.add(g);
        const frame=new THREE.Mesh(new THREE.BoxGeometry(3.9,2.3,.16),new THREE.MeshStandardMaterial({color:0x111722,roughness:.32,metalness:.7})); g.add(frame);
        const panel=new THREE.Mesh(new THREE.PlaneGeometry(3.55,1.95),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.72})); panel.position.z=.1; g.add(panel);
        const grid=new THREE.GridHelper(3.1,10,0x7ed0ff,0x27445c); grid.rotation.x=Math.PI/2; grid.position.z=.11; grid.material.transparent=true; grid.material.opacity=.2; g.add(grid);
        return {panel};
      }
      panels=[
        makeScreen(-7.2,-7.6,.12,0x14334e).panel,
        makeScreen(0,-9.2,0,0x162447).panel,
        makeScreen(7.2,-7.6,-.12,0x3b1b18).panel
      ];

      particles=new THREE.Group(); scene.add(particles);
      for(let i=0;i<90;i++){
        const p=new THREE.Mesh(new THREE.SphereGeometry(.018,6,6),new THREE.MeshBasicMaterial({color:i%3?0x64cfff:0xe5c66c,transparent:true,opacity:.45}));
        p.position.set((Math.random()-.5)*18,1+Math.random()*10,(Math.random()-.5)*15);
        p.userData.speed=.002+Math.random()*.008;
        particles.add(p);
      }
      starGroup=new THREE.Group(); scene.add(starGroup);
      for(let i=0;i<180;i++){
        const p=new THREE.Mesh(new THREE.SphereGeometry(.012,5,5),new THREE.MeshBasicMaterial({color:0x8fb6ff,transparent:true,opacity:.3}));
        p.position.set((Math.random()-.5)*60,Math.random()*28+4,(Math.random()-.5)*60-15);
        starGroup.add(p);
      }

      cameraTarget=new THREE.Vector3(0,5.5,13.5);
      const cameraLook=new THREE.Vector3(0,2.2,0);
      currentColor=new THREE.Color(0x4cbfff);
      targetColor=new THREE.Color(0x4cbfff);
      clock=new THREE.Clock();
      threeReady=true;
      setStatus('المشهد ثلاثي الأبعاد جاهز');

      function onResize(){
        if(!renderer || !camera) return;
        camera.aspect=window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth,window.innerHeight,false);
      }
      window.addEventListener('resize',onResize);

      function animate(){
        requestAnimationFrame(animate);
        const t=clock.getElapsedTime();
        currentColor.lerp(targetColor,.025);
        cyan.color.copy(currentColor);
        ring.material.color.copy(currentColor);
        globeWire.material.color.copy(currentColor);
        globe.rotation.y += .0025;
        globeWire.rotation.y -= .0015;
        continents.rotation.y += .0025;
        ring.rotation.z += .0012;
        ring.scale.setScalar(1+Math.sin(t*.8)*.015);
        panels.forEach((p,i)=>{p.material.opacity=.55+.12*Math.sin(t*1.2+i);});
        particles.children.forEach((p,i)=>{
          p.position.y += p.userData.speed;
          if(p.position.y>11) p.position.y=1;
          p.position.x += Math.sin(t*.2+i)*.0007;
        });
        starGroup.rotation.y += .00008;
        camera.position.lerp(cameraTarget,.035);
        const look=new THREE.Vector3(0,2.2,0);
        camera.lookAt(look);
        if(mode==='film'){
          cameraTarget.x=Math.sin(t*.18)*.55;
          cameraTarget.z=10.5+Math.cos(t*.15)*.55;
        }
        renderer.render(scene,camera);
      }
      animate();
    }catch(error){
      threeReady=false;
      console.error(error);
      buildFallback();
    }
  }

  function loadThree(){
    if(window.THREE){
      initThree(window.THREE);
      return;
    }

    setStatus('جاري تحميل محرك 3D...');

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.min.js';
    script.async = true;

    script.onload = function(){
      if(window.THREE){
        initThree(window.THREE);
      }else{
        console.error('Three.js loaded but window.THREE is unavailable.');
        buildFallback();
        setStatus('تعذر تهيئة محرك 3D');
      }
    };

    script.onerror = function(error){
      console.error('Three.js CDN load failed.', error);
      buildFallback();
      setStatus('تعذر تحميل محرك 3D — تم تشغيل الوضع البديل');
    };

    document.head.appendChild(script);
  }

  loadThree();
})();
