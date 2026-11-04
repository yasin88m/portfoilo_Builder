export function initLandingMotion(){
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(pointer: fine)');
 const stage=document.querySelector('.hero-stage');
 const nodes=[...document.querySelectorAll('.hero-copy,.hero-stage,.section-title,.gallery-card,.process-grid article,.manifesto,.faq')];
 let observer;
 if(!reduce.matches){
  nodes.forEach((n,i)=>{n.classList.add('motion-reveal');n.style.setProperty('--reveal-delay',`${(i%3)*65}ms`);});
  observer=new IntersectionObserver(items=>items.forEach(item=>{if(item.isIntersecting){item.target.classList.add('motion-visible');observer.unobserve(item.target);}}),{threshold:.08});nodes.forEach(n=>observer.observe(n));
 }
 const canvas=document.createElement('canvas');canvas.className='cursor-dust';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
 const ctx=canvas.getContext('2d');if(!ctx)return;
 let particles=[],raf=0,last=0,old=null,position=null;
 function size(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
 function stop(){cancelAnimationFrame(raf);raf=0;particles=[];old=null;position=null;ctx.clearRect(0,0,innerWidth,innerHeight);stage?.style.setProperty('--pointer-x','0px');stage?.style.setProperty('--pointer-y','0px');}
 function draw(now){
  raf=0;const dt=Math.min(40,now-last||16);last=now;ctx.clearRect(0,0,innerWidth,innerHeight);
  particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=dt;p.x+=p.vx*dt/16;p.y+=p.vy*dt/16;const a=Math.max(0,p.life/p.total);ctx.beginPath();ctx.fillStyle=`rgba(173,121,255,${a*.7})`;ctx.arc(p.x,p.y,p.r*a,0,Math.PI*2);ctx.fill();}
  if(position&&stage){stage.style.setProperty('--pointer-x',`${(position.x/innerWidth-.5)*9}px`);stage.style.setProperty('--pointer-y',`${(position.y/innerHeight-.5)*7}px`);}
  if(particles.length)raf=requestAnimationFrame(draw);
 }
 function move(e){
  if(reduce.matches||!fine.matches||e.pointerType!=='mouse'||document.hidden)return;
  position={x:e.clientX,y:e.clientY};if(old&&Math.hypot(position.x-old.x,position.y-old.y)<5)return;
  const from=old||position;const count=Math.min(5,Math.max(1,Math.ceil(Math.hypot(position.x-from.x,position.y-from.y)/10)));
  for(let i=1;i<=count;i++){const life=400+Math.random()*300;particles.push({x:from.x+(position.x-from.x)*i/count,y:from.y+(position.y-from.y)*i/count,r:.9+Math.random()*1.6,vx:(Math.random()-.5)*.2,vy:-.15-Math.random()*.3,life,total:life});}
  particles=particles.slice(-90);old=position;if(!raf){last=performance.now();raf=requestAnimationFrame(draw);}
 }
 addEventListener('pointermove',move,{passive:true});document.documentElement.addEventListener('pointerleave',()=>{old=null;});addEventListener('resize',size,{passive:true});addEventListener('scroll',()=>{old=null;},{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});reduce.addEventListener('change',()=>{stop();if(reduce.matches){observer?.disconnect();nodes.forEach(n=>n.classList.add('motion-visible'));}});fine.addEventListener('change',stop);size();
}
