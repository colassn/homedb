import {springFrames,initAdaptiveEffects} from './motion-system.mjs';
// Visual interactions only. No persistence, Firebase or record mutations here.
const reduced=()=>document.documentElement.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
let returnFocus=null,lastTrigger=null,selectOpen=null;
const run=(el,frames,options)=>!reduced()&&el?.animate?el.animate(frames,options):null;
export function sheetEnter(d,wasOpen){
 if(!wasOpen)returnFocus=lastTrigger;
 run(d.querySelector('.sheet-body'),[{opacity:.85,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:180,easing:'ease-out'});
 enhanceSelects(d);
}
export function sheetExit(d){
 closeSelect();
 if(!d.open)return;
 d.close();
 if(returnFocus?.isConnected&&document.activeElement!==returnFocus)returnFocus.focus({preventScroll:true});
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
  function sync(){trigger.textContent=select.selectedOptions[0]?.textContent||'請選擇';trigger.setAttribute('aria-label',label+' · '+trigger.textContent);trigger.disabled=select.disabled;list.replaceChildren();Array.from(select.options).forEach((option,i)=>{const b=document.createElement('button');b.type='button';b.textContent=option.textContent;b.setAttribute('role','option');b.setAttribute('aria-selected',option.selected);b.disabled=option.disabled;b.tabIndex=-1;b.onclick=e=>{e.preventDefault();e.stopPropagation();select.selectedIndex=i;sync();closeSelect();trigger.focus();select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));};list.append(b);});}
  sync();select.addEventListener('change',sync);
  function open(){closeSelect();list.hidden=false;trigger.setAttribute('aria-expanded','true');selectOpen={list,trigger,wrap};const r=list.getBoundingClientRect();wrap.classList.toggle('open-up',r.bottom>innerHeight-12&&trigger.getBoundingClientRect().top>r.height+12);run(list,[{opacity:0,transform:'translateY(-6px) scale(.97)'},{opacity:1,transform:'none'}],{duration:170,easing:'ease-out'});(list.querySelector('[aria-selected=true]')||list.querySelector('button'))?.focus();}
  trigger.onclick=e=>{e.preventDefault();e.stopPropagation();if(selectOpen?.trigger===trigger)closeSelect();else open();};
  trigger.onkeydown=e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();open();}};
  list.onkeydown=e=>{const bs=[...list.querySelectorAll('button:not(:disabled)')],i=bs.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();bs[e.key==='Home'?0:e.key==='End'?bs.length-1:(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length]?.focus();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSelect();trigger.focus();}if(e.key==='Tab')closeSelect();};
 });
}
function enableSheetDrag(dialog){
 let gesture=null,settle=null;
 const reset=()=>{
  if(!gesture)return;
  const offset=gesture.offset;
  gesture=null;
  dialog.style.removeProperty('translate');
  settle?.cancel();
  if(offset&&dialog.open)settle=run(dialog,[{translate:'0 '+offset+'px'},{translate:'0 0'}],{duration:160,easing:'ease-out'});
 };
 dialog.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||event.target.closest('button,input,textarea,select')||!event.target.closest('.sheet-head'))return;
  settle?.cancel();
  gesture={id:event.pointerId,y:event.clientY,offset:0};
  dialog.setPointerCapture(event.pointerId);
 });
 dialog.addEventListener('pointermove',event=>{
  if(gesture?.id!==event.pointerId)return;
  gesture.offset=Math.min(100,Math.max(0,event.clientY-gesture.y));
  if(!reduced())dialog.style.translate='0 '+gesture.offset+'px';
 });
 dialog.addEventListener('pointerup',event=>{
  if(gesture?.id!==event.pointerId)return;
  if(gesture.offset>=72)dialog.querySelector('[data-act="close-sheet"]')?.click();
  reset();
 });
 for(const type of ['pointercancel','lostpointercapture','close'])dialog.addEventListener(type,reset);
}
export function initStudio(){
 initAdaptiveEffects();
 enableSheetDrag(document.querySelector("#sheet"));
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.closest('#sheet'))lastTrigger=b;},true);
 document.addEventListener('pointerdown',e=>{if(selectOpen&&!selectOpen.wrap.contains(e.target))closeSelect();const b=e.target.closest('button');if(!b||b.disabled)return;
  if(reduced()||document.documentElement.dataset.effects==='simple')return;const r=b.getBoundingClientRect(),ink=document.createElement('span');ink.className='touch-ring';ink.setAttribute('aria-hidden','true');ink.style.left=(e.clientX-r.left)+'px';ink.style.top=(e.clientY-r.top)+'px';b.append(ink);setTimeout(()=>ink.remove(),550);
 },true);
 let raf=0;document.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||reduced()||raf)return;const b=e.target.closest('.dock-button,.tool-card,.sd-card');if(!b)return;raf=requestAnimationFrame(()=>{const r=b.getBoundingClientRect();b.style.setProperty('--pointer-x',((e.clientX-r.x)/r.width*100)+'%');b.style.setProperty('--pointer-y',((e.clientY-r.y)/r.height*100)+'%');raf=0;});},{passive:true});
 document.addEventListener('focusin',e=>{if(selectOpen&&!selectOpen.wrap.contains(e.target))closeSelect();});
 new MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes){
   if(node.nodeType!==1)continue;
   if(node.matches('select:not([data-custom])'))enhanceSelects(node.parentElement);
   else if(node.querySelector('select:not([data-custom])'))enhanceSelects(node);
  }
 }).observe(document.getElementById('app'),{childList:true,subtree:true});
 enhanceSelects();
}

// Animate the live page so controls can receive taps during the transition.
let routeAnimation=null;
export function routeTransition(draw,next,previous){
 const indicator=document.querySelector(".sp-indicator")?.getBoundingClientRect();
 routeAnimation?.cancel();
 draw();
 transitionBox(document.querySelector(".sp-indicator"),indicator);
 const main=document.querySelector('#main');
 if(!main)return;
 const offset=next==='home'||next==='display'?-8:previous==='settings'?-5:8;
 routeAnimation=run(main,[{opacity:.82,transform:`translateY(${offset}px)`},{opacity:1,transform:'none'}],
  {duration:260,easing:'cubic-bezier(.2,.8,.2,1)'});
}

// Delegated spring feedback; touch scrolling keeps native browser inertia.
const spring=springFrames();
const rebounds=new WeakMap();
let pressed=null,pressAnimation=null;
document.addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(!b||b.disabled||!e.isPrimary||e.button!==0||reduced())return;rebounds.get(b)?.cancel();pressed=b;pressAnimation?.cancel();pressAnimation=run(b,[{transform:'scale(1)'},{transform:'scale(.965)'}],{duration:120,fill:'forwards',easing:'ease-out'});},{passive:true});
function release(){if(!pressed)return;pressAnimation?.cancel();if(!reduced()){rebounds.set(pressed,run(pressed,spring.frames,{duration:spring.duration,easing:'linear'}));}pressed=null;}
document.addEventListener('pointerup',release,{passive:true});document.addEventListener('pointercancel',release,{passive:true});window.addEventListener('blur',release);

// Keep exact endpoint values in the DOM for assistive technology and reduced motion.
const lastNumbers=new Map();
const currency=new Intl.NumberFormat('en-HK',{style:'currency',currency:'HKD'});
export function animateDashboard(root){
 for(const label of root.querySelectorAll('[data-counter]')){
  const key=label.dataset.counter,end=Number(label.dataset.cents),start=lastNumbers.get(key);
  lastNumbers.set(key,end);
  if(start===undefined||start===end||reduced())continue;
  const began=performance.now();
  function frame(now){
   if(!label.isConnected)return;
   const t=reduced()?1:Math.min(1,(now-began)/280);
   label.textContent=currency.format(Math.round(start+(end-start)*(1-(1-t)**3))/100);
   if(t<1)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
 }
}
export function transitionBox(element,from){
 if(!element||!from||reduced())return;
 const to=element.getBoundingClientRect();
 if(!from.width||!to.width)return;
 const dx=from.left-to.left,dy=from.top-to.top;
 if(Math.abs(dx)+Math.abs(dy)<2)return;
 run(element,[{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:220,easing:'cubic-bezier(.22,.76,.22,1)'});
}

// Restrict pointer attraction to navigation icons on precise input devices.
const precisePointer=matchMedia('(hover:hover) and (pointer:fine)');
document.addEventListener('pointerover',event=>{
 const button=event.target.closest('.sidebar .nav button');
 if(!button||button.contains(event.relatedTarget)||!precisePointer.matches||reduced())return;
 const icon=button.querySelector('.icon'),rect=button.getBoundingClientRect();
 const dx=(event.clientX-rect.left-rect.width/2)*.08,dy=(event.clientY-rect.top-rect.height/2)*.12;
 run(icon,[{transform:'none'},{transform:`translate(${dx}px,${dy}px)`,offset:.55},{transform:'none'}],{duration:200,easing:'ease-out'});
},{passive:true});
