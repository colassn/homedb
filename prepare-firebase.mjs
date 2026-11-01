import{mkdir,writeFile,copyFile}from'node:fs/promises';
await mkdir('firebase-runtime',{recursive:true});
await copyFile('notifications.cjs','firebase-runtime/index.cjs');
await writeFile('firebase-runtime/package.json',JSON.stringify({name:'personalos-web-notifications',private:true,main:'index.cjs',engines:{node:'22'},dependencies:{'firebase-admin':'^13.0.0','firebase-functions':'^6.0.0'}},null,2));
console.log('已準備 Firebase 部署目錄；尚未部署，未變更雲端資料。');
