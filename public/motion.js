export function initLandingMotion(){
 const root=document.documentElement;if(root.dataset.motionInitialized)return;root.dataset.motionInitialized='true';
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),stage=document.querySelector('.hero-stage'),showcase=stage?.querySelector('.showcase-window'),toggle=document.querySelector('#motionToggle');
 let preference=null;try{preference=localStorage.getItem('portfolio-motion');}catch{}
 const canvas=document.createElement('canvas');canvas.className='cursor-dust';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
 const ctx=canvas.getContext('2d');let enabled=false,particles=[],raf=0,last=0,old=null,position=null,elapsed=0;
 function size(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);}
 function stop(){cancelAnimationFrame(raf);raf=0;particles=[];old=null;position=null;last=0;ctx?.clearRect(0,0,innerWidth,innerHeight);stage?.style.setProperty('--pointer-x','0px');stage?.style.setProperty('--pointer-y','0px');}
 function draw(now){
  raf=0;if(!enabled||document.hidden)return;const dt=Math.min(40,last?now-last:16);last=now;elapsed+=dt;
  if(showcase){const wave=(Math.sin(elapsed/850)+1)/2;showcase.style.transform=`rotateY(${9-wave*4}deg) rotate(${-4+wave*1.6}deg) translateY(${-wave*18}px)`;}
  if(ctx){ctx.clearRect(0,0,innerWidth,innerHeight);particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=dt;p.x+=p.vx*dt/16;p.y+=p.vy*dt/16;const a=Math.max(0,p.life/p.total);ctx.beginPath();ctx.shadowColor='#b478ff';ctx.shadowBlur=14;ctx.fillStyle=`rgba(194,145,255,${a*.98})`;ctx.arc(p.x,p.y,p.r*a,0,Math.PI*2);ctx.fill();}}
  if(position&&stage){stage.style.setProperty('--pointer-x',`${(position.x/innerWidth-.5)*18}px`);stage.style.setProperty('--pointer-y',`${(position.y/innerHeight-.5)*14}px`);}
  raf=requestAnimationFrame(draw);
 }
 function update(){enabled=preference==='on'||(preference!=='off'&&!reduce.matches);root.dataset.motion=enabled?'on':'off';if(toggle){toggle.setAttribute('aria-pressed',String(enabled));toggle.textContent=enabled?'افکت‌های حرکت: روشن':'افکت‌های حرکت: خاموش';}stop();if(showcase&&!enabled)showcase.style.transform='rotateY(9deg) rotate(-4deg)';if(enabled&&!document.hidden)raf=requestAnimationFrame(draw);}
 function move(e){
  if(!enabled||document.hidden||(e.pointerType&&e.pointerType!=='mouse'&&e.pointerType!=='pen'))return;
  position={x:e.clientX,y:e.clientY};if(old&&Math.hypot(position.x-old.x,position.y-old.y)<4)return;
  const from=old||position,count=Math.min(12,Math.max(2,Math.ceil(Math.hypot(position.x-from.x,position.y-from.y)/7)));
  for(let i=1;i<=count;i++){const life=750+Math.random()*350;particles.push({x:from.x+(position.x-from.x)*i/count,y:from.y+(position.y-from.y)*i/count,r:1.8+Math.random()*2,vx:(Math.random()-.5)*.3,vy:-.12-Math.random()*.3,life,total:life});}particles=particles.slice(-150);old=position;
 }
 addEventListener('PointerEvent' in window?'pointermove':'mousemove',move,{passive:true});root.addEventListener('pointerleave',()=>{old=null;});addEventListener('resize',size,{passive:true});addEventListener('scroll',()=>{old=null;},{passive:true});document.addEventListener('visibilitychange',update);reduce.addEventListener('change',update);
 if(toggle)toggle.onclick=()=>{preference=enabled?'off':'on';try{localStorage.setItem('portfolio-motion',preference);}catch{}update();};size();update();
}
