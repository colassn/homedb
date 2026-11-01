// Firebase Functions v2. Deploy only to the existing app1-bd629 project.
const {onDocumentWritten}=require('firebase-functions/v2/firestore');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {getMessaging}=require('firebase-admin/messaging');
initializeApp();
exports.memoNotification=onDocumentWritten({document:'spaces/{space}/memos/{memoId}',region:'asia-east2',retry:true},async event=>{
 const after=event.data.after,before=event.data.before;if(!after.exists)return;const data=after.data();
 if(data.deleted||data.done||(before.exists&&before.data().operation===data.operation))return;
 const db=getFirestore(),space=event.params.space,membership=await db.doc(`spaces/${space}`).get();
 if(!membership.exists)return;const members=membership.data().members||[];
 const targets=await db.collection(`spaces/${space}/webPush`).get();
 // A deterministic tag deduplicates OS notifications on retry; never claim exactly-once delivery.
 const tag=`memo-${event.params.memoId}-${data.version||0}`;
 for(const d of targets.docs){if(!members.includes(d.id)||String(data.operation||'').startsWith(d.id+':'))continue;
  const token=d.data().token;if(!token)continue;
  try{await getMessaging().send({token,data:{title:'PersonalOS · 備忘更新',body:'你的私人空間有新內容，點一下查看。',tag},webpush:{headers:{TTL:'86400'},fcmOptions:{link:process.env.PERSONALOS_SITE_URL||'https://app1-bd629.web.app/'}}});}
  catch(e){if(!['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(e.code))throw e;}
 }
});
