import {visionModel,modelProvider} from './model-policy.mjs';
import {modelFailure} from './model-error.mjs';
export function parseModelJSON(content){
 const text=(Array.isArray(content)?content.map(x=>x.text||'').join('\n'):String(content||'')).trim();
 const objects=[];let start=-1,depth=0,quoted=false,escaped=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"'&&depth>0){quoted=true;continue;}if(c==='{'){if(depth++===0)start=i;}else if(c==='}'&&depth>0&&--depth===0)objects.push(text.slice(start,i+1));
 }
 const candidates=[text.replace(/^```(?:json)?\s*|\s*```$/g,''),...objects.reverse()];
 for(const candidate of candidates){try{const value=JSON.parse(candidate);if(value&&typeof value==='object'&&!Array.isArray(value))return value;}catch{}}
 throw Object.assign(Error('模型返回格式不正确。'),{responseText:text.slice(0,100000)});
}
export async function visionRequest(bytes,text,env,{frames=[],fetcher=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),onRetry=async()=>{}}={}){
 const zhipu=modelProvider(env)==='zhipu';
 const model=visionModel(env);if(!model)throw Error('未允许使用这个模型。');
 if(zhipu&&!frames.length)throw Error('尚未抽取视频画面，未发送请求。');
 // GLM accepts up to 50 images. Send 30 timestamped frames per minute;
 // do not rely on undocumented local-video/base64 support.
 const content=zhipu?frames.flatMap((bytes,i)=>[
  {type:'text',text:`片段内第 ${i*2} 秒画面`},
  {type:'image_url',image_url:{url:'data:image/jpeg;base64,'+bytes.toString('base64')}}
 ]):[{type:'video_url',video_url:{url:'data:video/mp4;base64,'+bytes.toString('base64')},fps:2}];
 content.push({type:'text',text:text+(zhipu?' 这些图片是同一分钟视频按每2秒一帧排列的画面。时间以每张图片前标注的秒数为准；两帧间动作不清就标记不确定，不能猜测补全。':'')});
 const endpoint=zhipu?'https://open.bigmodel.cn/api/paas/v4/chat/completions':`https://${env.BAILIAN_WORKSPACE_ID}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions`;
 const options={
  method:'POST',signal:AbortSignal.timeout(180000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${zhipu?env.ZHIPU_API_KEY:env.DASHSCOPE_API_KEY}`},
  body:JSON.stringify({model,max_tokens:model==='glm-4.1v-thinking-flash'?16384:8192,...(zhipu?(model==='glm-4.6v-flash'?{thinking:{type:'disabled'}}:{response_format:{type:'json_object'}}):{enable_thinking:false}),messages:[...(model==='glm-4.1v-thinking-flash'?[{role:'system',content:'你是严格的画面动作记录器。只输出一个最终JSON对象，不要解释、不输出示例、不在答案中反思或重写。视频字幕不代表实际动作，不把字幕呼吸指令作为画面依据。覆盖所有提供画面，片段最后一帧也必须观察。'}]:[]),{role:'user',content}]})
 };
 let response;
 const retryDelays=[10000,20000,40000,60000,60000,60000,60000,60000];
 for(let attempt=0;;attempt++){
  response=await fetcher(endpoint,{...options,signal:AbortSignal.timeout(180000)});
  if(!zhipu||response.status!==429||attempt>=retryDelays.length)break;
  const data=await response.clone().json().catch(()=>({}));
  if(!['1302','1305'].includes(String(data.error?.code||data.code)))break;
  await response.body?.cancel();const delay=retryDelays[attempt];
  await onRetry({attempt:attempt+1,maxAttempts:retryDelays.length,delay,retryAt:Date.now()+delay});await sleep(delay);
 }
 if(!response.ok)throw await modelFailure(response,modelProvider(env));
 const data=await response.json();if(data.choices?.[0]?.finish_reason!=='stop')throw Error('模型未返回完整动作记录。');
 const parsed=parseModelJSON(data.choices[0].message.content);
 return {parsed,usage:data.usage||{}};
}
