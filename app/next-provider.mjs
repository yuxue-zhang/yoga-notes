import {readFile} from 'node:fs/promises';
import {atomicWrite} from './atomic-file.mjs';
export const NEXT_BASE_URL='https://api.openai-next.com/v1';
function validKey(key){if(typeof key!=='string'||key.length<12||key.length>512||!/^[\x21-\x7E]+$/.test(key))throw Error('请粘贴这个平台提供的完整 API Key。');}
export async function discoverNextModels(key,{fetcher=fetch}={}){
 validKey(key);
 const response=await fetcher(NEXT_BASE_URL+'/models',{headers:{Authorization:`Bearer ${key}`},redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!response.ok){await response.body?.cancel();throw Error(response.status===401?'这个平台没有认可此 Key，请确认使用的是该平台的 API Key。':response.status===403?'该 Key 没有访问权限，请检查平台账户权限。':response.status===429?'平台暂时限流，请稍后连接。':`接口验证失败（HTTP ${response.status}），尚未保存。`);}
 const data=await response.json();if(!Array.isArray(data.data))throw Error('平台没有返回标准模型列表，尚未保存。');
 const models=[...new Set(data.data.map(x=>x?.id).filter(x=>typeof x==='string'&&/^[A-Za-z0-9_.:/-]{1,150}$/.test(x)))].slice(0,200);
 if(!models.length)throw Error('该 Key 暂无可用模型，尚未保存。');return models;
}
export async function saveNextConnection(key,models,env,path=new URL('./.env',import.meta.url)){
 validKey(key);const entries={NEXT_API_KEY:key,NEXT_BASE_URL,NEXT_AVAILABLE_MODELS:JSON.stringify(models)};
 let text=await readFile(path,'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;});
 for(const [name,value]of Object.entries(entries)){const pattern=new RegExp('^'+name+'=.*$','gm');text=pattern.test(text)?text.replace(pattern,()=>name+'='+value):text.trimEnd()+'\n'+name+'='+value+'\n';}
 await atomicWrite(typeof path==='string'?path:(await import('node:url')).fileURLToPath(path),text);Object.assign(env,entries);
}
export function nextStatus(env){let models=[];try{models=JSON.parse(env.NEXT_AVAILABLE_MODELS||'[]');}catch{}return {configured:Boolean(env.NEXT_API_KEY),baseURL:NEXT_BASE_URL,models:Array.isArray(models)?models:[]};}
