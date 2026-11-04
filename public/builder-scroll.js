export function initBuilderScroll(){
 const frame=document.querySelector('#preview'),editor=document.querySelector('.editor'),panel=document.querySelector('.preview-panel');if(!frame||!editor)return;
 let raf=0;
 function sync(){raf=0;if(panel.classList.contains('fullscreen')){frame.contentWindow?.postMessage({type:'portfolio:mode',expanded:true},'*');return;}frame.contentWindow?.postMessage({type:'portfolio:mode',expanded:false},'*');const stacked=matchMedia('(max-width:900px)').matches;const r=(stacked?panel:editor).getBoundingClientRect();const start=20;const range=Math.max(stacked?innerHeight*.7:240,r.height-innerHeight+start+30);const ratio=Math.max(0,Math.min(1,(start-r.top)/range));frame.contentWindow?.postMessage({type:'portfolio:scroll',ratio},'*');}
 function schedule(){if(!raf)raf=requestAnimationFrame(sync);}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});frame.addEventListener('load',schedule);
 addEventListener('message',e=>{
  if(e.source!==frame.contentWindow)return;if(e.data?.type==='portfolio:close'&&panel.classList.contains('fullscreen')){document.querySelector('#fullscreen')?.click();return;}
  if(e.data?.type==='portfolio:ready')schedule();
  if(e.data?.type==='portfolio:wheel'&&typeof e.data.delta==='number'&&Number.isFinite(e.data.delta)){
   const factor=e.data.mode===1?18:e.data.mode===2?innerHeight:1;if(panel.classList.contains('fullscreen')){frame.contentWindow.postMessage({type:'portfolio:local',delta:e.data.delta*factor},'*');return;}
   scrollBy({top:Math.max(-innerHeight,Math.min(innerHeight,e.data.delta*factor)),behavior:'instant'});
  }
 });
 new ResizeObserver(schedule).observe(editor);
 new MutationObserver(schedule).observe(panel,{attributes:true,attributeFilter:['class']});schedule();
}
