import {readFileSync} from 'node:fs';
import {before,after,beforeEach,test} from 'node:test';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,serverTimestamp,writeBatch,getDocs,collection,onSnapshot} from 'firebase/firestore';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-personalos',firestore:{rules:readFileSync('firestore.rules','utf8'),host:'127.0.0.1',port:8085}});});
after(async()=>env?.cleanup());
beforeEach(async()=>env.clearFirestore());
const memo=()=>({title:'整理散銀',note:'由臨時箱轉入主要箱',done:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
test('owner can create and mark complete; strangers cannot read or write',async()=>{
 const own=doc(env.authenticatedContext('owner').firestore(),'users/owner/memos/one');
 await assertSucceeds(setDoc(own,memo()));
 await assertSucceeds(updateDoc(own,{done:true,updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(own));
 const stranger=doc(env.authenticatedContext('stranger').firestore(),'users/owner/memos/one');
 await assertFails(getDoc(stranger));await assertFails(updateDoc(stranger,{done:false,updatedAt:serverTimestamp()}));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'users/owner/memos/one')));
});
test('reject deletion, extra fields, invalid types and replacing creation time',async()=>{
 const own=doc(env.authenticatedContext('owner').firestore(),'users/owner/memos/one');
 await assertSucceeds(setDoc(own,memo()));
 await assertFails(deleteDoc(own));
 await assertFails(updateDoc(own,{done:'yes',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(own,{admin:true,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(own,{title:'',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(own,{createdAt:new Date(0),updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(env.authenticatedContext('owner').firestore(),'users/owner/memos/two'),{...memo(),note:'a'.repeat(10001)}));
});

async function invitation(owner='home',token='a'.repeat(32),space='private') {
 const db=env.authenticatedContext(owner).firestore();
 const batch=writeBatch(db);
 batch.set(doc(db,'spaces/'+space),{owner,members:[owner],invite:token});
 batch.set(doc(db,'pairInvites/'+token),{owner,space,guest:'',expiresAt:new Date(Date.now()+600000)});
 await assertSucceeds(batch.commit());return {token,space};
}
async function join(uid,token='a'.repeat(32),space='private') {
 const db=env.authenticatedContext(uid).firestore(),b=writeBatch(db);
 b.update(doc(db,'pairInvites/'+token),{guest:uid});b.update(doc(db,'spaces/'+space),{members:['home',uid]});return b.commit();
}
test('anonymous pair can exchange memos; outsiders and replay are denied',async()=>{
 await invitation();const guest=env.authenticatedContext('phone').firestore();
 await assertFails(getDoc(doc(guest,'spaces/private/memos/one')));
 await assertSucceeds(getDoc(doc(guest,'pairInvites/'+'a'.repeat(32))));
 await assertFails(getDocs(collection(guest,'pairInvites')));
 await assertSucceeds(join('phone'));
 const home=env.authenticatedContext('home').firestore();
 await assertSucceeds(setDoc(doc(home,'spaces/private/memos/one'),memo()));
 await assertSucceeds(getDoc(doc(guest,'spaces/private/memos/one')));
 await assertSucceeds(updateDoc(doc(guest,'spaces/private/memos/one'),{done:true,updatedAt:serverTimestamp()}));
 await assertFails(join('third'));await assertFails(join('phone'));
 await assertFails(getDoc(doc(env.authenticatedContext('stranger').firestore(),'spaces/private/memos/one')));
 await assertFails(deleteDoc(doc(home,'spaces/private/memos/one')));
});
test('cannot self-enrol, alter ownership or claim invitation without atomic membership',async()=>{
 await invitation();const db=env.authenticatedContext('intruder').firestore();
 await assertFails(updateDoc(doc(db,'spaces/private'),{members:['home','intruder']}));
 await assertFails(updateDoc(doc(db,'pairInvites/'+'a'.repeat(32)),{guest:'intruder'}));
 await assertFails(updateDoc(doc(db,'spaces/private'),{owner:'intruder'}));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'pairInvites/'+'a'.repeat(32))));
});
test('expired and superseded pairing codes are rejected',async()=>{
 await invitation();await env.withSecurityRulesDisabled(async c=>{await updateDoc(doc(c.firestore(),'pairInvites/'+'a'.repeat(32)),{expiresAt:new Date(0)});});
 await assertFails(join('phone'));
 await invitation('home','b'.repeat(32));
 await assertFails(join('phone','a'.repeat(32)));
 await assertSucceeds(join('phone','b'.repeat(32)));
});

test('paired second client receives live completion without refresh',async()=>{
 await invitation();await assertSucceeds(join('phone'));
 const home=env.authenticatedContext('home').firestore(),phone=env.authenticatedContext('phone').firestore();
 await setDoc(doc(home,'spaces/private/memos/live'),memo());
 let stop;const received=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('live update timeout')),10000);stop=onSnapshot(doc(phone,'spaces/private/memos/live'),s=>{if(s.data()?.done===true){clearTimeout(timer);resolve();}},e=>{clearTimeout(timer);reject(e);});});
 try{await updateDoc(doc(home,'spaces/private/memos/live'),{done:true,updatedAt:serverTimestamp()});await received;}finally{stop?.();}
});

test('versioned memo deletion and restore propagate and reject stale clients',async()=>{
 await invitation();await assertSucceeds(join('phone'));
 const home=env.authenticatedContext('home').firestore(),phone=env.authenticatedContext('phone').firestore();
 const a=doc(home,'spaces/private/memos/versioned'),b=doc(phone,'spaces/private/memos/versioned');
 await assertSucceeds(setDoc(a,{...memo(),version:1,operation:'create',deleted:false}));
 await assertSucceeds(updateDoc(b,{deleted:true,version:2,operation:'delete',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(a,{title:'stale overwrite',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(a,{title:'stale version',version:2,updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(a,{deleted:false,version:3,operation:'restore',updatedAt:serverTimestamp()}));
 const state=await getDoc(b);if(state.data().deleted||state.data().version!==3)throw new Error('restore missing');
});
test('only paired member can report own device and unpair revokes guest access',async()=>{
 await invitation();await assertSucceeds(join('phone'));
 const home=env.authenticatedContext('home').firestore(),guest=env.authenticatedContext('phone').firestore(),stranger=env.authenticatedContext('outsider').firestore();
 const info=()=>({model:'Xiaomi 13',name:'屋企手機',lastSeen:serverTimestamp()});
 await assertSucceeds(setDoc(doc(home,'spaces/private/devices/home'),info()));
 await assertSucceeds(getDoc(doc(guest,'spaces/private/devices/home')));
 await assertFails(setDoc(doc(guest,'spaces/private/devices/home'),info()));
 await assertFails(getDocs(collection(stranger,'spaces/private/devices')));
 await assertFails(updateDoc(doc(stranger,'spaces/private'),{members:['home']}));
 await assertSucceeds(updateDoc(doc(guest,'spaces/private'),{members:['home']}));
 await assertFails(getDoc(doc(guest,'spaces/private/devices/home')));
 await assertFails(setDoc(doc(guest,'spaces/private/memos/no'),memo()));
 await assertFails(join('phone'));
});
test('legacy memo can adopt versioning without replacing creation timestamp',async()=>{
 const db=env.authenticatedContext('owner').firestore(),ref=doc(db,'users/owner/memos/legacy');
 await setDoc(ref,memo());const before=await getDoc(ref);
 await assertSucceeds(updateDoc(ref,{version:1,deleted:false,operation:'upgrade',updatedAt:serverTimestamp()}));
 const after=await getDoc(ref);if(!before.data().createdAt.isEqual(after.data().createdAt))throw new Error('creation changed');
 await assertFails(updateDoc(ref,{version:0,updatedAt:serverTimestamp()}));
});
test('offline reconnect preserves conflicting local edit and remote content',async()=>{
 const {runTransaction,disableNetwork,enableNetwork,getDocFromCache}=await import('firebase/firestore');
 const assert=(await import('node:assert/strict')).default;
 await invitation();await assertSucceeds(join('phone'));
 const home=env.authenticatedContext('home').firestore(),phone=env.authenticatedContext('phone').firestore();
 const a=doc(home,'spaces/private/memos/offline'),b=doc(phone,'spaces/private/memos/offline');
 await setDoc(a,{...memo(),version:1,operation:'initial',deleted:false});let stop;
 const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('initial listener timeout')),10000);stop=onSnapshot(b,s=>{if(s.exists()&&!s.metadata.fromCache){clearTimeout(timer);resolve(s.data());}},e=>{clearTimeout(timer);reject(e);});});
 const local=JSON.parse(JSON.stringify({title:'手機離線草稿',note:'保留此內容',base:base.version,operation:'offline-edit'}));
 await disableNetwork(phone);
 try{await updateDoc(a,{title:'屋企已更新',version:2,operation:'home-update',updatedAt:serverTimestamp()});const cached=await getDocFromCache(b);assert.equal(cached.data().version,base.version);assert.equal(local.note,'保留此內容');}finally{await enableNetwork(phone);stop?.();}
 const applied=await runTransaction(phone,async t=>{const current=await t.get(b);if(current.data().version!==local.base)return false;t.update(b,{title:local.title,version:local.base+1,operation:local.operation,updatedAt:serverTimestamp()});return true;});
 assert.equal(applied,false);assert.equal(local.title,'手機離線草稿');assert.equal((await getDoc(a)).data().title,'屋企已更新');
 await setDoc(doc(phone,'spaces/private/memos/conflict-copy'),{...memo(),title:local.title,note:local.note,version:1,operation:'copy',deleted:false});assert.equal((await getDoc(doc(home,'spaces/private/memos/conflict-copy'))).data().title,local.title);
});
test('operation retry is idempotent and stale deletion cannot erase a newer edit',async()=>{
 const {runTransaction}=await import('firebase/firestore');const assert=(await import('node:assert/strict')).default;
 await invitation();await assertSucceeds(join('phone'));
 const home=env.authenticatedContext('home').firestore(),phone=env.authenticatedContext('phone').firestore();const ref=doc(home,'spaces/private/memos/retry');let writes=0;
 const retry=()=>runTransaction(home,async t=>{const current=await t.get(ref);if(current.exists()&&current.data().operation==='fixed-op')return;t.set(ref,{...memo(),version:1,operation:'fixed-op',deleted:false});writes++;});
 await retry();const created=(await getDoc(ref)).data().createdAt;await retry();assert.equal(writes,1);assert.equal((await getDoc(ref)).data().version,1);
 await updateDoc(ref,{title:'已更新版本',version:2,operation:'new-edit',updatedAt:serverTimestamp()});await assertFails(updateDoc(doc(phone,'spaces/private/memos/retry'),{deleted:true,version:2,operation:'stale-delete',updatedAt:serverTimestamp()}));const latest=(await getDoc(ref)).data();assert.equal(latest.deleted,false);assert.equal(latest.title,'已更新版本');assert.ok(latest.createdAt.isEqual(created));
});
test('web shared state preserves optimistic versions and denies destructive delete',async()=>{
 await invitation();await assertSucceeds(join('phone'));
 const home=env.authenticatedContext('home').firestore(),phone=env.authenticatedContext('phone').firestore();
 const ref=doc(home,'spaces/private/webStates/main'),other=doc(phone,'spaces/private/webStates/main');
 const payload=JSON.stringify({revisions:[],cards:[]});
 await assertSucceeds(setDoc(ref,{payload,version:1,operation:'one',updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(other));await assertSucceeds(updateDoc(other,{payload,version:2,operation:'two',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref,{payload,version:2,operation:'stale',updatedAt:serverTimestamp()}));
 await assertFails(deleteDoc(ref));await assertFails(getDoc(doc(env.authenticatedContext('stranger').firestore(),'spaces/private/webStates/main')));
});
test('web notification subscription belongs to member identity only',async()=>{
 await invitation();await assertSucceeds(join('phone'));
 const home=env.authenticatedContext('home').firestore(),phone=env.authenticatedContext('phone').firestore();
 await assertSucceeds(setDoc(doc(home,'spaces/private/webPush/home'),{token:'test-token',updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(phone,'spaces/private/webPush/home'),{token:'not-own',updatedAt:serverTimestamp()}));
 await assertFails(getDoc(doc(phone,'spaces/private/webPush/home')));
});
test('web payload limits fail without replacing prior data',async()=>{
 await invitation();const db=env.authenticatedContext('home').firestore();
 const ref=doc(db,'spaces/private/webStates/main');
 await assertSucceeds(setDoc(ref,{payload:'{}',version:1,operation:'one',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref,{payload:'x'.repeat(700001),version:2,operation:'two',updatedAt:serverTimestamp()}));
 const {strict:assert}=await import('node:assert');assert.equal((await getDoc(ref)).data().payload,'{}');
});
