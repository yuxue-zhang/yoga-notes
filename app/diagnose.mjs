import {readFile,writeFile} from 'node:fs/promises';
import {analyze} from './pipeline.mjs';
const env={};
for(const line of (await readFile(new URL('./.env',import.meta.url),'utf8')).split(/\r?\n/)) {
  const match=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(match)env[match[1]]=match[2].trim();
}
const started=Date.now();
const output = process.argv[2] || 'diagnostic.json';
const input = process.argv[3] || 'surya-namaskar.webm';
if (!/^[a-zA-Z0-9-]+\.json$/.test(output)) throw Error('Invalid output filename');
if (!/^[a-zA-Z0-9-]+\.(webm|mp4)$/.test(input)) throw Error('Invalid input filename');
try {
  const video=await readFile(new URL('./test-media/'+input,import.meta.url));
  const result=await analyze('data:video/'+input.split('.').pop()+';base64,'+video.toString('base64'),env);
  await writeFile(new URL('./test-media/'+output,import.meta.url),JSON.stringify({ok:true,elapsedMs:Date.now()-started,result},null,2));
  console.log(JSON.stringify({ok:true,items:result.items.length,usage:result.usage}));
} catch(e) {
  const message=e.message.startsWith('百炼') || e.message.startsWith('模型') || e.message.startsWith('视频') || e.message.startsWith('动作') || e.message.startsWith('左右') ? e.message : '网络连接或请求失败';
  const code=typeof e.cause?.code==='string' && /^[A-Z_0-9]{1,50}$/.test(e.cause.code)?e.cause.code:null;
  const diagnostic={ok:false,elapsedMs:Date.now()-started,error:message,networkCode:code,details:e.diagnostic || null};
  await writeFile(new URL('./test-media/'+output,import.meta.url),JSON.stringify(diagnostic,null,2));console.log(JSON.stringify(diagnostic));
}
