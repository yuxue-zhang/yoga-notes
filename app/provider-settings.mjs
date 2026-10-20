import {readFile,writeFile,rename} from 'node:fs/promises';
const defaultPath=new URL('./.env',import.meta.url);
export async function validateZhipuKey(key,{fetcher=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),attempt=0}={}){
 if(typeof key!=='string'||!/^[A-Za-z0-9._-]{12,256}$/.test(key))throw Error('请粘贴完整的智谱 API Key。');
 const response=await fetcher('https://open.bigmodel.cn/api/paas/v4/chat/completions',{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(25000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
  body:JSON.stringify({model:'glm-4.6v-flash',thinking:{type:'disabled'},max_tokens:8,messages:[{role:'user',content:'回复1'}]})
 });
 if(!response.ok){
  const data=await response.json().catch(()=>({}));const raw=String(data.error?.code||data.code||'unknown');const code=/^[A-Za-z0-9_.-]{1,80}$/.test(raw)?raw:'unknown';
  if(response.status===429&&['1302','1305'].includes(code)&&attempt<3){await sleep([5000,15000,30000][attempt]);return validateZhipuKey(key,{fetcher,sleep,attempt:attempt+1});}
  const reasons={'1302':'账户调用频率受限','1305':'免费模型当前访问量过大','1308':'账户已达到使用量限制','1310':'账户已达到使用量限制','1113':'账户余额或资源包不足'};
  throw Error(response.status===401?'智谱未认可这个 Key：请从智谱 API Key 页面复制完整密钥，不能使用编号或其他平台的 Key。':`智谱连接暂未通过：${reasons[code]||'平台拒绝或繁忙'}（HTTP ${response.status}，${code}）。未覆盖原配置。`);
 }
 const data=await response.json();if(!data.choices?.length)throw Error('智谱未返回有效响应，未覆盖原配置。');
}
export async function saveZhipuKey(key,env,path=defaultPath){
 if(typeof key!=='string'||!/^[A-Za-z0-9._-]{12,256}$/.test(key))throw Error('请粘贴完整的智谱 API Key。');
 const entries={ZHIPU_API_KEY:key,YOGA_PROVIDER:'zhipu',YOGA_VISION_MODEL:'glm-4.6v-flash'};
 let text=await readFile(path,'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
 for(const [name,value]of Object.entries(entries)){
  const line=new RegExp('^'+name+'=.*$','gm');
  text=line.test(text)?text.replace(line,name+'='+value):text.trimEnd()+'\n'+name+'='+value+'\n';
 }
 const tmp=typeof path==='string'?path+'.tmp':new URL('./.env.tmp',path);
 await writeFile(tmp,text,{mode:0o600});await rename(tmp,path);Object.assign(env,entries);
}
