import {readFile,writeFile,mkdir} from 'node:fs/promises';
const env={...process.env};
for(const line of (await readFile(new URL('./.env',import.meta.url),'utf8')).split(/\r?\n/)){
 const match=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(match)env[match[1]]=match[2].trim();
}
if(!env.DASHSCOPE_API_KEY||!/^ws-[a-z0-9]+$/.test(env.BAILIAN_WORKSPACE_ID||''))throw Error('百炼配置未就绪');
const response=await fetch(`https://${env.BAILIAN_WORKSPACE_ID}.cn-beijing.maas.aliyuncs.com/api/v1/models?capabilities=VU&page_no=1&page_size=100`,{headers:{Authorization:`Bearer ${env.DASHSCOPE_API_KEY}`},signal:AbortSignal.timeout(20000)});
const data=await response.json();
if(!response.ok){console.log(JSON.stringify({status:response.status,code:data.code||data.error?.code,message:String(data.message||data.error?.message||'').replaceAll(env.DASHSCOPE_API_KEY,'[redacted]').slice(0,300)}));process.exitCode=1;}
else{
 await mkdir(new URL('./runtime/',import.meta.url),{recursive:true});await writeFile(new URL('./runtime/bailian-model-catalog.json',import.meta.url),JSON.stringify(data));
 console.log(JSON.stringify({status:response.status,total:data.output?.total,models:data.output?.models?.filter(m=>m.inference_metadata?.request_modality?.includes('Video')).map(m=>m.model)},null,2));
}
