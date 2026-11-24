import {enhanceSelects} from './studio.mjs';
import{ledger,mergeLoans,cents,allocate,resolvePerson}from'./loans-core.mjs';
const KEY='pos-loan-ledger',PENDING='pos-loan-pending',OP='pos-loan-event:',esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=n=>'HK$ '+(n/100).toLocaleString('en-HK',{minimumFractionDigits:2,maximumFractionDigits:2}),date=n=>new Date(n).toLocaleString('zh-HK',{timeZone:'Asia/Hong_Kong',hour12:false}),nowInput=()=>new Date(Date.now()+28800000).toISOString().slice(0,16),parseTime=v=>{const n=Date.parse(v+':00+08:00');if(!Number.isFinite(n))throw Error('請填寫有效日期時間');return n;};
let confirmedIds=new Set();
let status=localStorage.getItem(PENDING)?'等候同步':'已儲存喺本機',syncing=false;
export const loanSyncStatus=()=>status;
export const readLoans=()=>{const e=JSON.parse(localStorage.getItem(KEY)||'[]');const ops=Object.keys(localStorage).filter(k=>k.startsWith(OP)).map(k=>JSON.parse(localStorage.getItem(k)));return mergeLoans(e,ops);};
export function importLoans(events){const all=mergeLoans(readLoans(),events);status='已儲存喺本機 · 等候同步';for(const e of events)localStorage.setItem(OP+e.id,JSON.stringify(e));localStorage.setItem(PENDING,'1');localStorage.setItem(KEY,JSON.stringify(all));syncLoans();window.dispatchEvent(new Event('loanschanged'));}
async function syncLoans(){if(syncing)return;syncing=true;let confirmed=false;try{const cloud=await import('./cloud.bundle.mjs');const sent=readLoans();const all=await cloud.saveLoans(sent);confirmedIds=new Set(all.map(e=>e.id));localStorage.setItem(KEY,JSON.stringify(mergeLoans(readLoans(),all)));if(readLoans().every(e=>all.some(r=>r.id===e.id)))localStorage.removeItem(PENDING);confirmed=true;status=localStorage.getItem(PENDING)?'等候同步':'已同步';}catch(e){status='已儲存喺本機 · 等候同步：'+e.message;}finally{syncing=false;document.querySelectorAll('loan-app').forEach(app=>app.refreshStatus());if(confirmed&&localStorage.getItem(PENDING))queueMicrotask(syncLoans);}}
window.addEventListener('loandata',e=>{try{localStorage.setItem(KEY,JSON.stringify(mergeLoans(readLoans(),e.detail)));status=localStorage.getItem(PENDING)?'等候同步':readLoans().every(e=>confirmedIds.has(e.id))&&confirmedIds.size?'已同步':'已儲存喺本機';if(localStorage.getItem(PENDING))syncLoans();document.querySelectorAll('loan-app').forEach(app=>app.draw());window.dispatchEvent(new Event('loanschanged'));}catch(err){status='同步衝突：'+err.message;document.querySelectorAll('loan-app').forEach(app=>app.refreshStatus());}});
window.addEventListener('loanerror',e=>{status='本機資料保留 · '+e.detail;document.querySelectorAll('loan-app').forEach(app=>app.refreshStatus());});
window.addEventListener('online',()=>{if(localStorage.getItem(PENDING))syncLoans();});window.addEventListener('storage',e=>{if(e.key===KEY)document.querySelectorAll('loan-app').forEach(app=>app.draw());});
class LoanApp extends HTMLElement{
connectedCallback(){if(this.hasAttribute('data-display-editor')){
 this.innerHTML='<dialog class="loan-dialog display-repay-dialog" aria-label="記錄還款"></dialog>';
 return;
}this.filter='open';this.sort='recent';this.query='';this.person='';this.listY=null;this.draw();if(localStorage.getItem(PENDING))syncLoans();}
refreshStatus(){for(const el of this.querySelectorAll('[data-loan-status]'))el.textContent=status;}
draw(){
 if(this.hasAttribute('data-display-editor'))return;
 if(this.querySelector('dialog')?.open){this.refreshStatus();return;}
 let events,data;
 try{events=readLoans();data=ledger(events);}
 catch(e){this.innerHTML=`<p role="alert">${esc(e.message)}。已停止寫入，請先匯出完整備份。</p>`;return;}
 const people=[...new Set(events.filter(e=>e.type==='lend').map(e=>e.person))].map(name=>{
  const loans=data.loans.filter(l=>l.person===name);
  return {name,loans,balance:loans.reduce((sum,l)=>sum+l.balance,0),
   latest:Math.max(...events.filter(e=>e.person===name).map(e=>e.at)),
   due:loans.filter(l=>l.balance&&l.due).map(l=>l.due).sort()[0]||'9999'};
 });
 const today=new Date(Date.now()+28800000).toISOString().slice(0,10);
 const p=people.find(person=>person.name===this.person);
 const shown=people.filter(person=>person===p||(this.filter==='all'||(this.filter==='open'?person.balance>0:person.balance===0))&&person.name.toLowerCase().includes(this.query.toLowerCase()));
 shown.sort((a,b)=>Number(!a.balance)-Number(!b.balance)||(this.sort==='amount'?b.balance-a.balance:this.sort==='due'?a.due.localeCompare(b.due):b.latest-a.latest));
 const historyOpen=this.querySelector('.person-history')?.open;
 this.innerHTML=(`
  <div class="page-title"><h2>借款紀錄</h2><button class="primary" data-loan="lend">＋ 新增借款</button></div>
  <section class="loan-overview" aria-label="借還款總覽"><div class="loan-section-heading"><div><h2>借還款總覽</h2></div></div><div class="loan-stats"><article><small>尚未收回</small><strong>${money(data.balance)}</strong></article><article><small>已收回</small><strong>${money(data.paid)}</strong></article><article><small>未還人數 / 逾期筆數</small><strong>${people.filter(p=>p.balance).length} / ${data.loans.filter(l=>l.balance&&l.due&&l.due<today).length}</strong></article></div><div class="loan-sync"><span data-loan-status role="status">${esc(status)}</span><button data-loan="sync" class="text-button">重試同步</button></div></section>
  <section class="loan-directory" aria-label="借款人">
   <div class="loan-section-heading"><h2>借款人</h2><b>${shown.length} 人</b></div>
   <div class="loan-toolbar"><label>搜尋借款人<input id="loan-search" value="${esc(this.query)}" placeholder="輸入姓名"></label><div class="segmented">${[['open','未還清'],['closed','已還清'],['all','全部']].map(([v,t])=>`<button data-loan="filter" data-value="${v}" class="${this.filter===v?'selected':''}" aria-pressed="${this.filter===v}">${t}</button>`).join('')}</div><label>排序<select id="loan-sort">${[['recent','最近借款'],['amount','未還金額'],['due','到期日']].map(([v,t])=>`<option value="${v}" ${this.sort===v?'selected':''}>${t}</option>`).join('')}</select></label></div>
   <div class="borrower-list">
    ${shown.map(person=>person===p?this.profile(p,events,data,today,true):`<button type="button" class="borrower-card borrower-link ${person.balance?'is-outstanding':'is-settled'}" data-loan="person" data-person="${esc(person.name)}">
     <span class="borrower-identity"><span class="borrower-avatar" aria-hidden="true">${esc(person.name.slice(0,1))}</span>
     <span><strong>${esc(person.name)}</strong><small>${person.loans.length} 筆借款 · 查看個人紀錄</small></span></span>
     <span class="borrower-total"><small>${person.balance?'尚欠':'已還清'}</small><strong>${money(person.balance)}</strong></span>
    </button>`).join('')||'<p class="loan-empty">未有符合條件嘅借款人。</p>'}
   </div>
  </section>`)+`<dialog class="loan-dialog" aria-label="借款紀錄表單"></dialog>`;
 this.querySelectorAll('[data-loan]').forEach(b=>b.onclick=()=>this.action(b));
 const search=this.querySelector('#loan-search');
 if(search){
  search.oninput=e=>{
   const pos=e.target.selectionStart;
   this.query=e.target.value;
   this.draw();
   const input=this.querySelector('#loan-search');
   input.focus();
   input.setSelectionRange(pos,pos);
  };
  this.querySelector('#loan-sort').onchange=e=>{this.sort=e.target.value;this.draw();};
 }
 enhanceSelects(this);
}
profile(p,events,data,today,historyOpen){
 const {name,loans,balance}=p;
 return `<section class="borrower-profile" aria-label="借款人個人紀錄">
  <button class="secondary" data-loan="back">返回借款人</button>
  <div class="borrower-profile-head" tabindex="-1">
   <h2>${esc(name)}</h2>
   <div class="borrower-profile-totals">
    <div><small>尚欠總額</small><strong>${money(balance)}</strong></div>
    <div><small>累計借出</small><b>${money(loans.reduce((sum,l)=>sum+l.amount,0))}</b></div>
    <div><small>已還</small><b>${money(loans.reduce((sum,l)=>sum+l.paid,0))}</b></div>
   </div>
   <div class="button-row"><button class="primary" data-loan="lend" data-person="${esc(name)}">＋ 再借出</button>
    <button class="secondary" data-loan="repay" ${balance?'':'disabled'}>記錄還款</button></div>
  </div>
  <h3>借還款明細</h3><div class="person-history">
   ${events.filter(e=>e.person===p.name||e.type==='void'&&events.find(t=>t.id===e.target)?.person===p.name).sort((a,b)=>b.recorded-a.recorded).map(e=>`<article class="loan-history history-${e.type} ${this.fresh===e.id?'entry-added':''}"><div><strong>${e.type==='lend'?'借出':e.type==='repay'?'還款':'作廢紀錄'} ${e.amount?money(e.amount):''}</strong>${data.voids.has(e.id)?'<span> · 已作廢</span>':''}</div>${e.type==='lend'?`<p>${e.due?'到期 '+esc(e.due)+' · ':''}${data.voids.has(e.id)?'':'尚欠 '+money(data.loans.find(l=>l.id===e.id).balance)}</p>`:''}<small>實際 ${date(e.at)}<br>登記 ${date(e.recorded)}</small><p>${esc(e.method||'')}${e.note?' · '+esc(e.note):''}</p>${e.type!=='void'&&!data.voids.has(e.id)?`<button class="text-button" data-loan="void" data-id="${e.id}">作廢／更正</button>`:''}</article>`).join('')}
  </div>
  <div class="loan-sync"><span data-loan-status role="status">${esc(status)}</span><button data-loan="sync" class="text-button">重試同步</button></div>
 </section>`;
}
async action(b){
 const action=b.dataset.loan;
 if(action==='filter'){
  this.filter=b.dataset.value;
  this.draw();
  this.querySelector('[data-loan="filter"].selected')?.focus({preventScroll:true});
 }else if(action==='person'||action==='back'){
  const previous=this.person;if(action==='person')this.listY=scrollY;
  this.person=action==='person'?b.dataset.person:'';
  this.draw();
  const target=this.person?this.querySelector('.borrower-profile-head'):[...this.querySelectorAll('.borrower-link')].find(link=>link.dataset.person===previous)||this.querySelector('[data-loan="lend"]');
  target?.focus({preventScroll:true});
  if(this.person||this.listY===null)target?.scrollIntoView({block:'nearest'});else scrollTo(0,this.listY);
 }else if(action==='sync'){
  await syncLoans();
 }else{
  this.editor(action,b.dataset.id,action==='lend'?b.dataset.person:'');
 }
}
editor(type,id,prefill=''){const events=readLoans(),data=ledger(events),d=this.querySelector('dialog'),isRepay=type==='repay',isVoid=type==='void',fromDisplay=this.hasAttribute('data-display-editor');if(d.open)return;const names=[...new Set([...events].reverse().filter(e=>e.type==='lend').map(e=>e.person))];const field=(name,label,input)=>`<label>${label}${input}</label>`;d.innerHTML=`<form class="loan-editor-form"><header><h2>${isVoid?'作廢紀錄':isRepay?'記錄還款':'新增借款'}</h2><button type="button" data-close aria-label="關閉">×</button></header><div class="loan-editor-body">${!isVoid?isRepay?`<p>借款人：<strong>${esc(this.person)}</strong></p>`:field('person','借款人',`<input name="person" required maxlength="100" autocomplete="off" value="${esc(prefill)}" ${prefill?'readonly':names.length?'':'autofocus'} placeholder="輸入新姓名，或揀下方已有借款人" aria-describedby="person-match-hint">`):'<p>原紀錄仍會保留。如借款已有還款，需先作廢相關還款。</p>'}${!isVoid&&!isRepay?'<div class="person-suggestions" aria-label="已有借款人"></div><p id="person-match-hint" class="person-match-hint" aria-live="polite"></p>':''}${!isVoid?field('amount',isRepay?'今次收到金額（HK$）':'借出金額（HK$）','<input name="amount" inputmode="decimal" required placeholder="0.00" autocomplete="off"><button type="button" class="keypad-toggle" aria-expanded="false">開啟數字鍵盤</button><div class="amount-keypad" hidden role="group" aria-label="金額數字鍵盤"><button type="button" data-digit="1">1</button><button type="button" data-digit="2">2</button><button type="button" data-digit="3">3</button><button type="button" data-digit="4">4</button><button type="button" data-digit="5">5</button><button type="button" data-digit="6">6</button><button type="button" data-digit="7">7</button><button type="button" data-digit="8">8</button><button type="button" data-digit="9">9</button><button type="button" data-digit=".">.</button><button type="button" data-digit="0">0</button><button type="button" data-digit="back">⌫</button><button type="button" data-digit="clear">清除</button><button type="button" data-digit="done">完成輸入</button></div>'): ''}
${field('note',isVoid?'作廢原因（必填）':isRepay?'備註（選填）':'借款說明（選填）',
 `<textarea name="note" rows="2" maxlength="1000" ${isVoid?'required':'placeholder="例如午餐、代墊車費"'}></textarea>`)}
${!isVoid?`${isRepay?'':'<details class="loan-optional"><summary>日期及到期日</summary>'}
${field('at','實際日期時間（香港）',`<input type="datetime-local" name="at" required value="${nowInput()}">`)}
${isRepay?field('loan','還款分配',`<select name="loan"><option value="">自動：最早借款優先</option>${data.loans.filter(l=>l.person===this.person&&l.balance).map(l=>`<option value="${l.id}">${date(l.at)} · 未還 ${money(l.balance)}</option>`).join('')}</select>`)+field('method','收款方式','<select name="method"><option>轉數快</option><option>現金</option><option>其他</option></select>'):field('due','到期日（選填）','<input type="date" name="due">')+'</details>'}`:''}
<p class="loan-review" aria-live="polite"></p><p class="error" role="alert"></p></div><footer class="loan-editor-actions"><button class="primary" type="submit">${isVoid?'確認作廢':'預覽並核對'}</button></footer></form>`;enhanceSelects(d);const viewport=window.visualViewport;
let frame=0;
const fit=()=>{
 frame=0;
 const height=Math.round(viewport?.height||innerHeight)+'px',top=Math.round(viewport?.offsetTop||0)+'px';
 if(d.style.getPropertyValue('--loan-vh')!==height)d.style.setProperty('--loan-vh',height);
 if(d.style.getPropertyValue('--loan-top')!==top)d.style.setProperty('--loan-top',top);
};
const scheduleFit=()=>{if(!frame)frame=requestAnimationFrame(fit);};
fit();viewport?.addEventListener('resize',scheduleFit);viewport?.addEventListener('scroll',scheduleFit);
d.addEventListener('close',()=>{viewport?.removeEventListener('resize',scheduleFit);viewport?.removeEventListener('scroll',scheduleFit);cancelAnimationFrame(frame);},{once:true});
let saving=false;
const dismiss=()=>{if(!saving){d.close();this.draw();}};
if(prefill||isRepay)d.querySelector('[name=amount]').autofocus=true;
else if(isVoid)d.querySelector('[name=note]').autofocus=true;
else if(names.length)d.querySelector('[data-close]').autofocus=true;
d.showModal();
d.querySelector('[data-close]').onclick=dismiss;
d.addEventListener('cancel',ev=>{ev.preventDefault();dismiss();});
let pending=null;const form=d.querySelector('form');form.addEventListener('invalid',e=>{const details=e.target.closest('details');if(details)details.open=true;},true);const amountInput=form.elements.amount,keypad=form.querySelector('.amount-keypad'),toggle=form.querySelector('.keypad-toggle');if(isRepay){
 const full=document.createElement('button');full.type='button';full.className='secondary';full.textContent='全數還款';
 amountInput.after(full);full.onclick=()=>{form.elements.loan.value='';amountInput.value=(data.loans.filter(l=>l.person===this.person).reduce((sum,l)=>sum+l.balance,0)/100).toFixed(2);amountInput.dispatchEvent(new Event('input',{bubbles:true}));};
}if(keypad){const openPad=open=>{keypad.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'收起數字鍵盤':'開啟數字鍵盤';};toggle.onclick=()=>openPad(keypad.hidden);keypad.querySelectorAll('button').forEach(b=>b.onclick=()=>{const k=b.dataset.digit;if(k==='done'){openPad(false);return;}let v=amountInput.value;if(k==='clear')v='';else if(k==='back')v=v.slice(0,-1);else if(k==='.'){if(v.includes('.'))return;v=(v||'0')+'.';}else{if(v.includes('.')&&v.split('.')[1].length>=2)return;v=v==='0'?k:v+k;if(v.length>12)return;}amountInput.value=v;amountInput.dispatchEvent(new Event('input',{bubbles:true}));});}const personInput=form.elements.person;const updatePeople=()=>{if(!personInput)return;const raw=personInput.value,matched=resolvePerson(raw,events),existing=names.includes(matched),balance=data.loans.filter(l=>l.person===matched).reduce((n,l)=>n+l.balance,0);form.querySelector('#person-match-hint').textContent=existing?`已有借款人 · 目前尚欠 ${money(balance)}，今次借款會加入同一人紀錄。`:raw?'新借款人 · 保存後會建立紀錄。':'可直接選擇以前借過錢嘅人。';const list=form.querySelector('.person-suggestions');list.hidden=Boolean(prefill)||existing;list.innerHTML=list.hidden?'':names.filter(n=>!raw||n.toLocaleLowerCase().includes(raw.toLocaleLowerCase())).map(n=>`<button type="button" class="person-choice" data-name="${esc(n)}"><strong>${esc(n)}</strong><small>尚欠 ${money(data.loans.filter(l=>l.person===n).reduce((s,l)=>s+l.balance,0))}</small></button>`).join('');list.querySelectorAll('button').forEach(b=>b.onclick=()=>{personInput.value=b.dataset.name;personInput.dispatchEvent(new Event('input',{bubbles:true}));form.elements.amount.focus({preventScroll:true});});};updatePeople();form.oninput=()=>{updatePeople();form.querySelector('.error').textContent='';pending=null;form.querySelector('[type=submit]').textContent=isVoid?'確認作廢':'預覽並核對';form.querySelector('.loan-review').textContent='';};form.onsubmit=async ev=>{ev.preventDefault();if(saving)return;form.querySelector('.error').textContent='';const submit=form.querySelector('[type=submit]');try{const fd=new FormData(form);if(!pending){const base={id:crypto.randomUUID(),type,recorded:Date.now(),at:isVoid?Date.now():parseTime(fd.get('at')),note:String(fd.get('note')||'').trim()};if(isVoid){base.target=id;}else{base.amount=cents(fd.get('amount'));base.person=isRepay?this.person:resolvePerson(fd.get('person'),readLoans());if(isRepay){base.parts=allocate(readLoans(),base.person,base.amount,base.at,fd.get('loan'));base.method=fd.get('method');}else base.due=fd.get('due')||'';}mergeLoans(readLoans(),[base]);pending=base;if(!isVoid){form.querySelector('.loan-review').textContent=`${base.person} · ${isRepay?'收回':'借出'} ${money(base.amount)} · ${date(base.at)}${isRepay?'；還款後尚欠 '+money(data.loans.filter(l=>l.person===base.person).reduce((sum,l)=>sum+l.balance,0)-base.amount)+'；分配：'+base.parts.map(p=>date(data.loans.find(l=>l.id===p.loan).at)+' '+money(p.amount)).join('、'):'；原本尚欠 '+money(data.loans.filter(l=>l.person===base.person).reduce((s,l)=>s+l.balance,0))+' → 借出後尚欠 '+money(data.loans.filter(l=>l.person===base.person).reduce((s,l)=>s+l.balance,0)+base.amount)}`;submit.textContent='確認保存';form.querySelector('.loan-review').scrollIntoView({block:'nearest'});return;}}saving=true;submit.disabled=true;submit.textContent='儲存中…';const entry=pending;const save=()=>{
 if(isRepay){const total=items=>ledger(items).loans.filter(l=>l.person===entry.person).reduce((sum,l)=>sum+l.balance,0);
 if(total(events)!==total(readLoans()))throw Error('餘額已更新，請關閉後重新核對還款');}
 importLoans([entry]);};if(navigator.locks)await navigator.locks.request('personalos-loans',save);else save();this.person=entry.person||this.person;this.fresh=entry.id;d.close();this.draw();this.querySelector('.entry-added')?.scrollIntoView({block:'nearest'});this.fresh=null;
if(fromDisplay)window.dispatchEvent(new CustomEvent('displayrepayment',{detail:{person:entry.person}}));
}catch(e){saving=false;form.querySelector('.error').textContent=e.message;pending=null;submit.disabled=false;submit.textContent=isVoid?'確認作廢':'預覽並核對';}};}
}
customElements.define('loan-app',LoanApp);

// The display uses the same repayment editor and ledger as the management page.
class LoanSummary extends HTMLElement {
 connectedCallback(){
  this.refresh=()=>this.draw();
  this.onStorage=e=>{if(e.key===KEY||e.key?.startsWith(OP))this.draw();};
  this.onclick=e=>{
   const button=e.target.closest('[data-display-repay]');
   if(button&&!this.hasAttribute('private'))this.openRepayment(button.dataset.displayRepay);
  };
  window.addEventListener('loanschanged',this.refresh);
  window.addEventListener('storage',this.onStorage);
  this.draw();
 }
 disconnectedCallback(){
  window.removeEventListener('loanschanged',this.refresh);
  window.removeEventListener('storage',this.onStorage);
 }
 findRepayButton(person){
  return [...this.querySelectorAll('[data-display-repay]')].find(button=>button.dataset.displayRepay===person);
 }
 openRepayment(person){
  if(document.querySelector('dialog[open]'))return;
  const editor=document.createElement('loan-app');
  editor.setAttribute('data-display-editor','');
  editor.person=person;
  document.body.append(editor);
  const dialog=editor.querySelector('dialog');
  dialog.addEventListener('close',()=>{
   editor.remove();
   const summary=document.querySelector('.ambient-home loan-summary');
   const focus=summary?.findRepayButton(person)||summary?.querySelector('.display-loan-head');
   focus?.focus({preventScroll:true});
  },{once:true});
  try{editor.editor('repay');}
  catch{
   editor.remove();
   this.draw();
  }
 }
 draw(){
  let html;
  try{
   const data=ledger(readLoans());
   const today=new Date(Date.now()+28800000).toISOString().slice(0,10);
   const open=data.loans.filter(l=>l.balance>0).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||a.at-b.at);
   const masked=this.hasAttribute('private');
   html=`<div class="display-loan-head" tabindex="-1"><strong>未還借款 · ${open.length} 筆</strong><span>${masked?'金額已隱藏':money(data.balance)}</span></div>`;
   if(masked)html+='<p>私隱模式 · 人物及金額已隱藏</p>';
   else if(!open.length)html+='<p class="display-loan-empty">暫時冇未還借款</p>';
   else{
    const people=new Map();
    for(const loan of open)people.set(loan.person,(people.get(loan.person)||0)+loan.balance);
    const cards=[...people].slice(0,3).map(([person,balance])=>`<article class="display-loan-card" data-borrower="${esc(person)}"><button class="display-loan-row" data-act="person-detail" data-person="${esc(person)}"><strong>${esc(person)}</strong><b>尚欠 ${money(balance)}</b></button><button class="display-repay-button" data-display-repay="${esc(person)}">還款</button></article>`);
    html+=`<div class="display-loan-list">${cards.join('')}</div><button class="text-button" data-act="person-detail">查看全部 · ${people.size} 人</button>`;
   }
  }catch{html='<p role="alert">借款資料未能讀取，請到工具檢查。</p>';}
  if(html===this.lastMarkup)return;
  this.lastMarkup=html;
  const focused=this.contains(document.activeElement)?document.activeElement.dataset.displayRepay:undefined;
  this.innerHTML=html;
  if(focused)(this.findRepayButton(focused)||this.querySelector('.display-loan-head'))?.focus({preventScroll:true});
 }
}
customElements.define('loan-summary',LoanSummary);
