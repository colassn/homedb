import {build} from 'esbuild';import{copyFile,mkdir,rm,readdir}from'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const f of ['index.html','style.css','app.mjs','core.mjs','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','sw.js','studio.css','studio.mjs','noto-tc-400.woff2','noto-tc-600.woff2','outfit-500.woff2','round-600.woff2','round-800.woff2','playful.css','lime.css','flagship.css','weather-icons.mjs','motion-system.mjs','design-tokens.css'])await copyFile(f,'dist/'+f);
await build({entryPoints:['cloud.mjs'],bundle:true,format:'esm',outfile:'dist/cloud.bundle.mjs',minify:true,legalComments:'eof'});

for(const f of await readdir('.'))if(/^(weather-\d+\.png|warning-[\w-]+\.gif)$/.test(f))await copyFile(f,'dist/'+f);
