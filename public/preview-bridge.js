// Only injected into the builder preview; never exported with the user's website.
(()=>{
 if(window.parent===window)return;
 let ratio=0;
 const max=()=>Math.max(0,document.documentElement.scrollHeight-innerHeight);
 const apply=()=>window.scrollTo(0,max()*ratio);
 addEventListener('message',e=>{if(e.source!==parent)return;if(e.data?.type==='portfolio:local'&&Number.isFinite(e.data.delta)){ratio=Math.max(0,Math.min(1,ratio+e.data.delta/Math.max(1,max())));apply();return;}if(e.data?.type!=='portfolio:scroll')return;const value=e.data.ratio;if(typeof value==='number'&&Number.isFinite(value)){ratio=Math.max(0,Math.min(1,value));apply();}});
 addEventListener('wheel',e=>{if(e.ctrlKey)return;e.preventDefault();parent.postMessage({type:'portfolio:wheel',delta:e.deltaY,mode:e.deltaMode},'*');},{passive:false});
 let touchY=null;
 addEventListener('touchstart',e=>{touchY=e.touches.length===1?e.touches[0].clientY:null;},{passive:true});
 addEventListener('touchmove',e=>{if(touchY===null||e.touches.length!==1)return;const y=e.touches[0].clientY;e.preventDefault();parent.postMessage({type:'portfolio:wheel',delta:touchY-y,mode:0},'*');touchY=y;},{passive:false});
 addEventListener('touchend',()=>{touchY=null;},{passive:true});
 addEventListener('keydown',e=>{const d={ArrowDown:60,ArrowUp:-60,PageDown:innerHeight*.8,PageUp:-innerHeight*.8,' ':innerHeight*.8}[e.key];if(d){e.preventDefault();parent.postMessage({type:'portfolio:wheel',delta:d,mode:0},'*');}});
 new ResizeObserver(apply).observe(document.documentElement);
 addEventListener('load',()=>{apply();parent.postMessage({type:'portfolio:ready'},'*');});
})();
