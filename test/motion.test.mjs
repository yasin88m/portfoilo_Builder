import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('hero floats, paints purple pointer trails and supports an explicit reduced-motion override',async()=>{
 const code=(await readFile(new URL('../public/motion.js',import.meta.url),'utf8')).replace('export function','function');
 for(const reduced of [false,true]){
  const events={},frames=[];let arcs=0;const showcase={style:{}},toggle={setAttribute(){}};
  const ctx={setTransform(){},clearRect(){},beginPath(){},arc(){arcs++;},fill(){}};
  const stage={querySelector:()=>showcase,style:{setProperty(){}}};
  const document={hidden:false,querySelector:s=>s==='#motionToggle'?toggle:stage,createElement:()=>({setAttribute(){},getContext:()=>ctx}),body:{append(){}},documentElement:{dataset:{},addEventListener(){}},addEventListener(){}};
  const context={document,window:{PointerEvent:true},localStorage:{getItem:()=>null,setItem(){}},matchMedia:()=>({matches:reduced,addEventListener(){}}),addEventListener:(name,fn)=>events[name]=fn,requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame(){frames.length=0;},devicePixelRatio:1,innerWidth:1366,innerHeight:768,Math};
  vm.runInNewContext(code+';initLandingMotion();',context);
  if(reduced){assert.equal(frames.length,0);assert.equal(document.documentElement.dataset.motion,'off');toggle.onclick();}
  assert.equal(document.documentElement.dataset.motion,'on');events.pointermove({pointerType:'mouse',clientX:400,clientY:300});frames.shift()(16);const first=showcase.style.transform;frames.shift()(48);assert.notEqual(showcase.style.transform,first);assert.ok(arcs>0);assert.equal(ctx.shadowColor,'#b478ff');toggle.onclick();assert.equal(document.documentElement.dataset.motion,'off');assert.equal(frames.length,0);
 }
});
