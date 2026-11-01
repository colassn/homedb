// Damped spring sampled into compositor-friendly keyframes.
export function springFrames({from=.965,to=1,velocity=0,mass=1,stiffness=320,damping=25}={}){
 const dt=1/120;let x=from,v=velocity;const frames=[{transform:`scale(${x})`,offset:0}];let steps=0;
 for(;steps<120;steps++){v+=(-stiffness*(x-to)-damping*v)/mass*dt;x+=v*dt;frames.push({transform:`scale(${x})`});if(Math.abs(x-to)<.0002&&Math.abs(v)<.002)break;}
 const n=frames.length-1;frames.forEach((f,i)=>f.offset=i/n);frames[n].transform=`scale(${to})`;return {frames,duration:Math.max(120,Math.round(n*dt*1000))};
}
export function motionAllowed(){return document.documentElement.dataset.motion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;}
export function initAdaptiveEffects(){
 const connection=navigator.connection;
 const refresh=()=>{document.documentElement.dataset.effects=connection?.saveData||(navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4)?'simple':'full';};
 refresh();connection?.addEventListener?.('change',refresh);
}
