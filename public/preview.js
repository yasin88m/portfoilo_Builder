// Fit a complete fixed-width website canvas into each preview viewport.
// This scales previews only: form controls and page text keep readable sizes.
export function frameSize(available, mobile=false, thumbnail=false){
 const width=mobile?Math.min(360,Math.max(1,available)):1000;
 const scale=Math.min(1,Math.max(1,available)/width);
 return {width,scale,thumbnail};
}
export function initPreviews(root=document){
 const selector='.frame-wrap,.gallery-preview,.template-art';
 const watched=new WeakSet();
 function fit(container){
  const frame=container.querySelector('iframe');if(!frame)return;
  const {width,scale}=frameSize(container.clientWidth,container.classList.contains('mobile'));
  frame.style.setProperty('--canvas-width',`${width}px`);
  frame.style.setProperty('--canvas-height',`${Math.ceil(container.clientHeight/scale)}px`);
  frame.style.setProperty('--canvas-scale',scale);
 }
 const resize=new ResizeObserver(entries=>entries.forEach(({target})=>fit(target)));
 function scan(){root.querySelectorAll(selector).forEach(el=>{if(!watched.has(el)){resize.observe(el);watched.add(el);}fit(el);});}
 const mutations=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'))scan();else records.forEach(r=>{if(r.target.matches?.(selector))fit(r.target);});});
 mutations.observe(root.documentElement||root,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});scan();
 return ()=>{resize.disconnect();mutations.disconnect();};
}
