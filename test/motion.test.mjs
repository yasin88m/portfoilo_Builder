import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('landing starts floating animation and glowing mouse particles, respecting reduced motion',async()=>{
 const code=(await readFile(new URL('../public/motion.js',import.meta.url),'utf8')).replace('export function','function');
 for(const reduced of [false,true]){
  const events={},frames=[];let arcs=0,cancelled=false;
  const animation={play(){},cancel(){cancelled=true;}};
  const ctx={setTransform(){},clearRect(){},beginPath(){},arc(){arcs++;},fill(){}};
  const stage={querySelector:()=>({animate:()=>animation}),style:{setProperty(){}}};
  const document={hidden:false,querySelector:()=>stage,querySelectorAll:()=>[],createElement:()=>({setAttribute(){},getContext:()=>ctx}),body:{append(){}},documentElement:{addEventListener(){}},addEventListener(){}};
  const context={document,window:{},matchMedia:()=>({matches:reduced,addEventListener(){}}),addEventListener:(name,fn)=>events[name]=fn,requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame(){},devicePixelRatio:1,innerWidth:1366,innerHeight:768,performance:{now:()=>0},Math};
  vm.runInNewContext(code+';initLandingMotion();',context);
  events.pointermove({pointerType:'mouse',clientX:400,clientY:300});
  if(reduced){assert.ok(cancelled);assert.equal(frames.length,0);}else{assert.equal(frames.length,1);frames.shift()(16);assert.ok(arcs>0);assert.equal(ctx.shadowColor,'#b478ff');}
 }
});
