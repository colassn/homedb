// Damped spring sampled into compositor-friendly keyframes.
export function springFrames({from=.965,to=1,velocity=0,mass=1,stiffness=320,damping=25}={}){
 const dt=1/120;let x=from,v=velocity;const frames=[{transform:`scale(${x})`,offset:0}];let steps=0;
 for(;steps<120;steps++){v+=(-stiffness*(x-to)-damping*v)/mass*dt;x+=v*dt;frames.push({transform:`scale(${x})`});if(Math.abs(x-to)<.0002&&Math.abs(v)<.002)break;}
 const n=frames.length-1;frames.forEach((f,i)=>f.offset=i/n);frames[n].transform=`scale(${to})`;return {frames,duration:Math.max(120,Math.round(n*dt*1000))};
}
export function motionAllowed(){return document.documentElement.dataset.motion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;}
export function initAdaptiveEffects(){
 const root=document.documentElement,host=document.querySelector('.ambient-glow');
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 let controller,failed=false;
 function fallback(){failed=true;refresh();}
 function refresh(){
  const mode=root.dataset.quality||'auto';
  const constrained=navigator.connection?.saveData||navigator.deviceMemory<=4||navigator.hardwareConcurrency<=4;
  const tablet=navigator.maxTouchPoints>1&&/iPad|Macintosh/.test(navigator.userAgent);
  const lite=mode==='lite'||!motionAllowed()||(mode==='auto'&&(constrained||tablet));
  const gpu=!lite&&!failed&&!!navigator.gpu&&(mode==='auto'||mode==='ultra');
  root.dataset.effects=lite?'simple':'full';
  if(!gpu||document.hidden||!['display','home'].includes(document.body.dataset.page)){
   controller?.abort();controller=null;return;
  }
  if(controller)return;
  controller=new AbortController();
  const {signal}=controller;
  import('./ambient.mjs').then(m=>m.mountAmbient(host,signal,fallback)).then(ok=>{
   if(!ok&&!signal.aborted)fallback();
  }).catch(()=>{if(!signal.aborted)fallback();});
 }
 const observer=new MutationObserver(refresh);
 observer.observe(root,{attributes:true,attributeFilter:['data-quality','data-motion']});
 observer.observe(document.body,{attributes:true,attributeFilter:['data-page']});
 document.addEventListener('visibilitychange',refresh);
 navigator.connection?.addEventListener?.('change',refresh);
 media.addEventListener('change',refresh);refresh();
}
