import http from 'node:http';
import {readFile,open,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {readiness,sourceURL} from './pipeline.mjs';
import {generateFile,ffmpegPath} from './generator.mjs';
import {JobStore} from './job-store.mjs';
import {isBilibili,resolveBilibili,openBilibiliMedia} from './bilibili.mjs';
import {isXiaohongshu,resolveXiaohongshu,openXiaohongshuMedia} from './xiaohongshu.mjs';
import {MAX_BYTES,MAX_SECONDS,DOWNLOAD_TIMEOUT_MS} from './limits.mjs';
import {partialFromCache} from './analysis-cache.mjs';
import {modelProvider,visionModel} from './model-policy.mjs';
import {saveZhipuKey,validateZhipuKey} from './provider-settings.mjs';
import {discoverNextModels,saveNextConnection,nextStatus} from './next-provider.mjs';
import {createCharacterStore} from './personal-character.mjs';
const root=new URL('./dist/',import.meta.url),limit=MAX_BYTES;
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function smallBody(req){let total=0;const chunks=[];for await(const c of req){total+=c.length;if(total>8192)throw Error('提交内容过长。');chunks.push(c);}return Buffer.concat(chunks).toString('utf8');}
async function writeVideo(stream,path,mime,onBytes=async()=>{}){
 const handle=await open(path,'w');let size=0,header=Buffer.alloc(0),last=0;
 try{for await(const chunk of stream){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>limit)throw Error('视频超过1 GB，请使用较小的视频。');if(header.length<16)header=Buffer.concat([header,bytes.subarray(0,16-header.length)]);await handle.writeFile(bytes);if(Date.now()-last>1000){await onBytes(size);last=Date.now();}}}
 finally{await handle.close();}
 if(size===0||(mime==='video/mp4'?header.subarray(4,8).toString()!=='ftyp':header.subarray(0,4).toString('hex')!=='1a45dfa3'))throw Error('文件不是有效的 MP4 / WebM 视频。');
}
async function openRemote(raw,env){
 if(isXiaohongshu(raw)){const track=await resolveXiaohongshu(raw);return {response:await openXiaohongshuMedia(track.url),mime:'video/mp4',title:track.title};}
 if(isBilibili(raw)){const track=await resolveBilibili(raw);return {response:await openBilibiliMedia(track.url),mime:'video/mp4',title:track.title};}
 const url=sourceURL(raw,env.VIDEO_ALLOWED_HOSTS);
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)});
 return {response,mime:response.headers.get('content-type')?.split(';')[0],title:'视频直链'};
}
export async function createApp({store=new JobStore(),generate=generateFile,env=process.env,mediaCheck=ffmpegPath,resolveRemote=openRemote,saveProvider=saveZhipuKey,validateProvider=validateZhipuKey,discoverNext=discoverNextModels,saveNext=saveNextConnection,characterStore=null}={}){
 await store.init();const characters=characterStore||await createCharacterStore({env});let active=false,currentCompletion=null;
 const timer=setInterval(()=>store.expire().catch(()=>{}),3600000);timer.unref();
 const processJob=(job,input,remoteURL=null)=>{
    currentCompletion=(async()=>{
     if(remoteURL){
      const {response,mime,title}=await resolveRemote(remoteURL,env);remoteURL=null;
      if(!response.ok||!['video/mp4','video/webm'].includes(mime)){await response.body?.cancel();throw Error('这个地址没有返回可读取的视频。');}
      if(Number(response.headers.get('content-length'))>limit){await response.body?.cancel();throw Error('视频超过1 GB。');}
      input=join(store.directory(job.id),mime==='video/mp4'?'input.mp4':'input.webm');
      await store.update(job.id,{source:title,stage:'downloading',progress:1,message:'正在读取公开视频…'});
      await writeVideo(response.body,input,mime,bytes=>store.update(job.id,{stage:'downloading',progress:3,message:`正在读取视频，已接收 ${Math.ceil(bytes/1024/1024)} MB…`}));
     }
     return generate(input,store.directory(job.id),{env,update:patch=>store.update(job.id,patch)});
    })()
     .then(result=>store.update(job.id,{status:'completed',stage:'completed',progress:100,message:'练习提示草稿已生成',result:{...result,title:job.source.replace(/\.[a-z0-9]+$/i,'')||'我的瑜伽练习',source:job.source}}))
     .catch(async error=>{const reading=['source','downloading'].includes(job.stage);const partialResult=await partialFromCache(store.directory(job.id),job.source).catch(()=>null);return store.update(job.id,{status:'failed',stage:'failed',canResume:!reading,errorCode:error.code||null,partialResult,error:error.name==='TimeoutError'?(reading?'视频读取超时，请稍后重试或使用较小视频。':'模型处理超时，请稍后继续。'):error.message.startsWith('fetch')?(reading?'无法连接视频来源，请检查链接后重试。':'无法连接模型服务，请检查网络后重试。'):error.message,message:partialResult?'部分内容已保存，课程尚未完成':'本次没有生成结果'});})
     .catch(()=>{}).finally(async()=>{remoteURL=null;if(store.get(job.id)?.status==='completed')await store.cleanMedia(job.id).catch(()=>{});active=false;});
 };
 const server=http.createServer(async(req,res)=>{
  try{
   if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'不允许跨站提交。'});
   if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||''))return json(res,403,{error:'仅允许本机访问。'});
   const path=new URL(req.url,'http://localhost').pathname;
   if(path==='/api/characters'&&req.method==='GET')return json(res,200,await characters.list());
   const characterAsset=path.match(/^\/api\/characters\/([a-f0-9-]{36})\/([a-z0-9-]+\.png)$/);
   if(characterAsset&&req.method==='GET'){const bytes=await characters.asset(characterAsset[1],characterAsset[2]);res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);return;}
   const characterAction=path.match(/^\/api\/characters\/([a-f0-9-]{36})(?:\/(poses|resume|delete|outfit))?$/);
   if(characterAction&&req.method==='GET'&&!characterAction[2])return json(res,200,await characters.get(characterAction[1]));
   if(req.method==='POST'&&(path==='/api/characters'||characterAction)){
    if(req.headers.origin!==`http://${req.headers.host}`||!req.headers['content-type']?.startsWith('application/json'))return json(res,403,{error:'请从本机网页提交。'});
    let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>24*1024*1024)throw Error('图片内容过大，请减少本次动作数量。');chunks.push(c);}const data=JSON.parse(Buffer.concat(chunks).toString());
    if(path==='/api/characters')return json(res,202,await characters.create(data.photo));
    const [_,id,action]=characterAction;
    if(action==='outfit')return json(res,202,await characters.outfit(id));
    if(action==='poses')return json(res,202,await characters.generate(id,data.poses));
    if(action==='resume')return json(res,202,await characters.resume(id));
    if(action==='delete'){await characters.remove(id);return json(res,200,{deleted:true});}
    return json(res,404,{error:'操作不存在。'});
   }
   if(req.method==='GET'&&path==='/api/settings/next')return json(res,200,nextStatus(env));
   if(req.method==='POST'&&path==='/api/settings/next'){
    if(req.headers.origin!==`http://${req.headers.host}`||!req.headers['content-type']?.startsWith('application/json'))return json(res,403,{error:'请从本机网页连接。'});
    const data=JSON.parse(await smallBody(req));const models=await discoverNext(data.apiKey);await saveNext(data.apiKey,models,env);
    return json(res,200,nextStatus(env));
   }
   if(req.method==='POST'&&path==='/api/settings/zhipu'){
    if(req.headers.origin!==`http://${req.headers.host}`||!req.headers['content-type']?.startsWith('application/json'))return json(res,403,{error:'请在本机网页中连接模型。'});
    if(active)return json(res,409,{error:'请等待当前课程处理结束后再连接。'});
    const data=JSON.parse(await smallBody(req));await validateProvider(data.apiKey);await saveProvider(data.apiKey,env);
    const resumable=[...store.jobs.values()].filter(j=>j.expiresAt>Date.now()&&j.canResume&&['failed','cached'].includes(j.status)).sort((a,b)=>b.createdAt-a.createdAt)[0];
    return json(res,200,{saved:true,provider:modelProvider(env),model:visionModel(env),resumableId:resumable?.id||null});
   }
   if(req.method==='GET'&&path==='/api/config'){
    let mediaReady=false;try{await mediaCheck();mediaReady=true;}catch{}
    return json(res,200,{ready:readiness(env)&&mediaReady,provider:modelProvider(env),model:visionModel(env),maxBytes:limit,maxSeconds:MAX_SECONDS,mediaReady,retentionHours:24,linkPlatforms:['xiaohongshu','bilibili-public','direct-video']});
   }
   if(req.method==='GET'&&path.startsWith('/api/jobs/')){const job=store.get(path.slice(10));return json(res,job?200:404,job||{error:'结果已过期，请重新提交。'});}
   const resume=path.match(/^\/api\/jobs\/([a-f0-9-]{36})\/resume$/);
   if(req.method==='POST'&&resume){
    if(!readiness(env))return json(res,503,{error:'模型配置或免费额度保护未完成。'});
    await mediaCheck();if(active&&store.get(resume[1])?.status==='failed'&&currentCompletion)await currentCompletion;if(active)return json(res,429,{error:'已有课程正在处理。'});
    const job=store.get(resume[1]);if(!job||!['failed','cached'].includes(job.status))return json(res,404,{error:'没有可恢复的课程。'});
    active=true;let input;
    try{for(const name of ['input.mp4','input.webm']){const candidate=join(store.directory(job.id),name);try{if((await stat(candidate)).size>0){input=candidate;break;}}catch{}}if(!input)throw Error('视频临时文件已清理，请重新提交链接。');await store.update(job.id,{status:'processing',stage:'preparing',progress:5,error:null,errorCode:null,canResume:false,expiresAt:Date.now()+24*3600000,message:'正在继续处理，已完成的片段会直接复用…'});}
    catch(error){active=false;throw error;}
    json(res,202,{id:job.id});processJob(job,input);return;
   }
   if(req.method==='POST'&&path==='/api/jobs'){
    if(!readiness(env))return json(res,503,{error:'模型配置或免费额度保护未完成，视频未提交。'});
    await mediaCheck();
    if(active)return json(res,429,{error:'正在处理上一份练习，请完成后再提交。'});
    active=true;let job,input,remoteURL=null;
    try{
     let source='本地视频',stream=req,mime=req.headers['content-type'];
     if(mime?.startsWith('application/json')){
      const data=JSON.parse(await smallBody(req));
      if(typeof data.url!=='string'||data.url.length>4096)throw Error('请输入有效视频链接。');
      // Validate supported URL shape before creating a job; tokens never enter persistence.
      if(isXiaohongshu(data.url)){const {xiaohongshuPage}=await import('./xiaohongshu.mjs');xiaohongshuPage(data.url);source='小红书课程';}
      else if(isBilibili(data.url)){const {bilibiliPage}=await import('./bilibili.mjs');bilibiliPage(data.url);source='B站课程';}
      else{sourceURL(data.url,env.VIDEO_ALLOWED_HOSTS);source='视频直链';}
      remoteURL=data.url;mime='video/mp4';
     }else if(!['video/mp4','video/webm'].includes(mime))throw Error('请选择 MP4 / WebM 视频。');
    if(!req.headers['content-type']?.startsWith('application/json')&&req.headers['x-source-name']){try{source=decodeURIComponent(req.headers['x-source-name']).slice(0,100);}catch{}}
     job=await store.create(source);input=join(store.directory(job.id),mime==='video/mp4'?'input.mp4':'input.webm');
     if(!remoteURL){await writeVideo(stream,input,mime);await store.update(job.id,{stage:'preparing',message:'视频已接收，正在自动处理…'});}
     else await store.update(job.id,{stage:'source',message:'正在读取公开分享页面…'});
    }catch(error){if(job){await store.update(job.id,{status:'failed',error:error.message,stage:'failed'});await store.cleanMedia(job.id);}active=false;throw error;}
    json(res,202,{id:job.id});
    processJob(job,input,remoteURL);return;
   }
   if(req.method!=='GET')return json(res,405,{error:'不支持的请求。'});
   if(/^\/assets\/original-girl-atlas-0[1-8]\.png$/.test(path)){
    const content=await readFile(new URL('.'+path,root));res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'});res.end(content);return;
   }
   const names={'/':'index.html','/library':'index.html','/character':'index.html','/personal.js':'personal.js','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/api.js':'api.js','/pose-catalog.js':'pose-catalog.js','/library.js':'library.js','/character-atlases.js':'character-atlases.js','/character-assets.js':'character-assets.js','/artwork.js':'artwork.js','/original.js':'original.js','/original.pdf':'original.pdf'};
   if(!names[path])return json(res,404,{error:'页面不存在。'});
   const content=await readFile(new URL(names[path],root));
   res.writeHead(200,{'Content-Type':({html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',pdf:'application/pdf'})[names[path].split('.').pop()],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(content);
  }catch(error){if(!res.headersSent)json(res,400,{error:error.message});else res.end();}
 });
 server.requestTimeout=DOWNLOAD_TIMEOUT_MS;server.on('close',()=>clearInterval(timer));return server;
}
