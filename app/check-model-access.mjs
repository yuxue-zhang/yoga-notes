import {readFile} from 'node:fs/promises';
import {readiness} from './pipeline.mjs';
import {visionModel,modelProvider} from './model-policy.mjs';
const env={...process.env};
for(const line of (await readFile(new URL('./.env',import.meta.url),'utf8')).split(/\r?\n/)){
 const match=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(match)env[match[1]]=match[2].trim();
}
if(!readiness(env))throw Error('模型配置未就绪');
const zhipu=modelProvider(env)==='zhipu',key=zhipu?env.ZHIPU_API_KEY:env.DASHSCOPE_API_KEY;
const response=await fetch(zhipu?'https://open.bigmodel.cn/api/paas/v4/chat/completions':`https://${env.BAILIAN_WORKSPACE_ID}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions`,{
 method:'POST',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
 body:JSON.stringify({model:visionModel(env),...(zhipu?{thinking:{type:'disabled'}}:{enable_thinking:false}),max_tokens:8,messages:[{role:'user',content:'回复1'}]})
});
const data=await response.json();
const clean=value=>String(value||'').replaceAll(key,'[redacted]').replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+/g,'[redacted]').slice(0,500);
console.log(JSON.stringify({status:response.status,code:clean(data.error?.code||data.code),message:clean(data.error?.message||data.message)}));
