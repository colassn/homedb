import {springFrames,initAdaptiveEffects} from './motion-system.mjs';
// Visual interactions only. No persistence, Firebase or record mutations here.
const reduced=()=>document.documentElement.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
let origin=null,returnFocus=null,lastTrigger=null,selectOpen=null;
const run=(el,frames,options)=>!reduced()&&el?.animate?el.animate(frames,options):null;
export function sheetEnter(d,wasOpen){
 const rect=d.getBoundingClientRect();
 if(!wasOpen){returnFocus=lastTrigger;const dx=origin?origin.x-rect.x-rect.width/2:0,dy=origin?origin.y-rect.y-rect.height/2:30;
 run(d,[{opacity:0,transform:`translate(${dx*.25}px,${dy*.25}px) scale(.87)`},{opacity:1,transform:'translate(0,0) scale(1.012)',offset:.75},{opacity:1,transform:'none'}],{duration:360,easing:'cubic-bezier(.2,.8,.2,1)'});
 }else run(d.querySelector('.sheet-body'),[{opacity:.25,transform:'translateY(9px)'},{opacity:1,transform:'none'}],{duration:180,easing:'ease-out'});
 enhanceSelects(d);
}
export function sheetExit(d){
 closeSelect();
 if(!d.open)return;
 if(!reduced()){
  const r=d.getBoundingClientRect(),ghost=d.cloneNode(true);ghost.removeAttribute('id');ghost.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));ghost.removeAttribute('open');ghost.setAttribute('aria-hidden','true');ghost.inert=true;ghost.classList.add('sheet-ghost');
  Object.assign(ghost.style,{display:'flex',position:'fixed',margin:'0',left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px',pointerEvents:'none'});document.body.append(ghost);
  const dx=origin?(origin.x-r.x-r.width/2)*.18:0,dy=origin?(origin.y-r.y-r.height/2)*.18:28;
  const a=run(ghost,[{opacity:1,transform:'none'},{opacity:0,transform:`translate(${dx}px,${dy}px) scale(.9)`}],{duration:220,easing:'cubic-bezier(.4,0,1,1)'});a?.finished.catch(()=>{}).finally(()=>ghost.remove());if(!a)ghost.remove();
 }
 d.close();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
}
export function numberPop(el){run(el,[{transform:'translateY(5px)',opacity:.45},{transform:'translateY(-2px)',opacity:1,offset:.75},{transform:'none',opacity:1}],{duration:180,easing:'ease-out'});}
function closeSelect(){if(selectOpen){selectOpen.list.hidden=true;selectOpen.trigger.setAttribute('aria-expanded','false');selectOpen=null;}}
export function enhanceSelects(root=document){
 root.querySelectorAll('select:not([data-custom])').forEach(select=>{
  select.dataset.custom='true';select.hidden=true;select.tabIndex=-1;
  const wrap=document.createElement('span');wrap.className='custom-select';select.after(wrap);
  const trigger=document.createElement('button');trigger.type='button';trigger.className='select-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
  const label=select.closest('label')?.innerText.trim()||select.getAttribute('aria-label')||'選擇';trigger.setAttribute('aria-label',label);
  const list=document.createElement('span');list.className='select-list';list.setAttribute('role','listbox');list.setAttribute('aria-label',label);list.id='choices-'+Math.random().toString(36).slice(2);trigger.setAttribute('aria-controls',list.id);list.hidden=true;wrap.append(trigger,list);
  function sync(){trigger.textContent=select.selectedOptions[0]?.textContent||'請選擇';trigger.disabled=select.disabled;list.replaceChildren();Array.from(select.options).forEach((option,i)=>{const b=document.createElement('button');b.type='button';b.textContent=option.textContent;b.setAttribute('role','option');b.setAttribute('aria-selected',option.selected);b.disabled=option.disabled;b.tabIndex=-1;b.onclick=e=>{e.preventDefault();e.stopPropagation();select.selectedIndex=i;sync();closeSelect();trigger.focus();select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));};list.append(b);});}
  sync();select.addEventListener('change',sync);
  function open(){closeSelect();list.hidden=false;trigger.setAttribute('aria-expanded','true');selectOpen={list,trigger,wrap};const r=list.getBoundingClientRect();wrap.classList.toggle('open-up',r.bottom>innerHeight-12&&trigger.getBoundingClientRect().top>r.height+12);run(list,[{opacity:0,transform:'translateY(-6px) scale(.97)'},{opacity:1,transform:'none'}],{duration:170,easing:'ease-out'});(list.querySelector('[aria-selected=true]')||list.querySelector('button'))?.focus();}
  trigger.onclick=e=>{e.preventDefault();e.stopPropagation();if(selectOpen?.trigger===trigger)closeSelect();else open();};
  trigger.onkeydown=e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();open();}};
  list.onkeydown=e=>{const bs=[...list.querySelectorAll('button:not(:disabled)')],i=bs.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();bs[e.key==='Home'?0:e.key==='End'?bs.length-1:(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length]?.focus();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSelect();trigger.focus();}if(e.key==='Tab')closeSelect();};
 });
}
export function initStudio(){
 initAdaptiveEffects();
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.closest('#sheet')){lastTrigger=b;const r=b.getBoundingClientRect();origin={x:r.x+r.width/2,y:r.y+r.height/2};}},true);
 document.addEventListener('pointerdown',e=>{if(selectOpen&&!selectOpen.wrap.contains(e.target))closeSelect();const b=e.target.closest('button');if(!b||b.disabled)return;
  if(!b.closest('#sheet')){const r=b.getBoundingClientRect();origin={x:r.x+r.width/2,y:r.y+r.height/2};}
  if(reduced())return;const r=b.getBoundingClientRect(),ink=document.createElement('span');ink.className='touch-ring';ink.setAttribute('aria-hidden','true');ink.style.left=(e.clientX-r.left)+'px';ink.style.top=(e.clientY-r.top)+'px';b.append(ink);setTimeout(()=>ink.remove(),550);
 },true);
 let raf=0;document.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||reduced()||raf)return;const b=e.target.closest('.dock-button,.tool-card,.sd-card');if(!b)return;raf=requestAnimationFrame(()=>{const r=b.getBoundingClientRect();b.style.setProperty('--pointer-x',((e.clientX-r.x)/r.width*100)+'%');b.style.setProperty('--pointer-y',((e.clientY-r.y)/r.height*100)+'%');raf=0;});},{passive:true});
 document.addEventListener('focusin',e=>{if(selectOpen&&!selectOpen.wrap.contains(e.target))closeSelect();});
 new MutationObserver(()=>enhanceSelects()).observe(document.getElementById('app'),{childList:true,subtree:true});
 enhanceSelects();
}

// One transition owns a route change. Business data is never touched here.
let activeTransition=null,launchRoute=null;
export function routeTransition(draw,next){
 activeTransition?.skipTransition();
 document.querySelectorAll('.launch-surface').forEach(e=>e.classList.remove('launch-surface'));
 const from=document.body.dataset.page;
 const entering=['home','display'].includes(from)&&!['home','display'].includes(next);
 const exiting=!['home','display'].includes(from)&&['home','display'].includes(next);
 const source=entering?document.querySelector(`.dock-button[data-route="${next}"]`):exiting?document.querySelector('.page-title'):null;
 source?.classList.add('launch-surface');
 const apply=()=>{draw();const target=entering?document.querySelector('.page-title'):exiting?document.querySelector(`.dock-button[data-route="${from}"]`):null;target?.classList.add('launch-surface');};
 if(reduced()||!document.startViewTransition){apply();document.querySelectorAll('.launch-surface').forEach(e=>e.classList.remove('launch-surface'));return;}
 const transition=document.startViewTransition(apply);activeTransition=transition;
 transition.finished.catch(()=>{}).finally(()=>{if(activeTransition===transition){document.querySelectorAll('.launch-surface').forEach(e=>e.classList.remove('launch-surface'));activeTransition=null;}});
 return transition.updateCallbackDone;
}

// Delegated spring feedback; touch scrolling keeps native browser inertia.
let pressed=null,pressAnimation=null;
document.addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(!b||b.disabled||reduced())return;pressed=b;pressAnimation?.cancel();pressAnimation=run(b,[{transform:'scale(1)'},{transform:'scale(.965)'}],{duration:120,fill:'forwards',easing:'ease-out'});},{passive:true});
function release(){if(!pressed)return;pressAnimation?.cancel();if(!reduced()){const spring=springFrames();run(pressed,spring.frames,{duration:spring.duration,easing:'linear'});}pressed=null;}
document.addEventListener('pointerup',release,{passive:true});document.addEventListener('pointercancel',release,{passive:true});
