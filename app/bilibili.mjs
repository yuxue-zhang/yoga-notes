const BV=/^BV[A-Za-z0-9]{10}$/;
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateDuration,DOWNLOAD_TIMEOUT_MS} from './limits.mjs';
export function bilibiliPage(raw){
 let url;try{url=new URL(raw);}catch{throw Error('请输入完整视频链接。');}
 if(!['https:','http:'].includes(url.protocol)||!['www.bilibili.com','m.bilibili.com','bilibili.com'].includes(url.hostname)||url.username||url.password||url.port)throw Error('不是支持的B站课程链接。');
 const match=url.pathname.match(/^\/video\/(BV[A-Za-z0-9]{10})\/?$/);
 if(!match||!BV.test(match[1]))throw Error('目前仅支持B站 BV 视频页面。');
 const part=url.searchParams.get('p');if(part&&part!=='1')throw Error('当前仅支持视频第1P，请提供单独的课程视频。');
 return {bvid:match[1],url:`https://www.bilibili.com/video/${match[1]}/`};
}
export function isBilibili(raw){try{return ['www.bilibili.com','m.bilibili.com','bilibili.com'].includes(new URL(raw).hostname);}catch{return false;}}
export function embeddedJSON(html,name){
 const pattern=name==='__playinfo__'?/(?:window\.)?__playinfo__\s*=/:/(?:window\.)?__INITIAL_STATE__\s*=/;
 const marker=pattern.exec(html);if(!marker)throw Error('页面没有公开提供视频数据。');
 const start=html.indexOf('{',marker.index+marker[0].length);if(start<0)throw Error('视频数据格式不可读取。');
 let depth=0,quote=false,escape=false;
 for(let i=start;i<html.length;i++){
  const c=html[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quote=false;continue;}
  if(c==='"')quote=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){try{return JSON.parse(html.slice(start,i+1));}catch{throw Error('视频数据格式不可读取。');}}
 }
 throw Error('视频数据不完整。');
}
export function mediaURL(raw){
 let u;try{u=new URL(raw);}catch{throw Error('视频地址无效。');}
 if(u.protocol!=='https:'||!u.hostname.endsWith('.bilivideo.com')||u.username||u.password||(u.port&&u.port!=='443'))throw Error('视频地址不在受支持的B站媒体域名内。');
 return u.href;
}
export function publicTrack(html,bvid){
 const play=embeddedJSON(html,'__playinfo__'),state=embeddedJSON(html,'__INITIAL_STATE__');
 const info=state.videoData;
 if(!info||info.bvid!==bvid)throw Error('页面返回了其他视频，已停止处理。');
 if(play.code!==0||play.data?.is_preview||play.data?.need_login||info.rights?.is_upower_exclusive||info.is_upower_exclusive)throw Error('该视频需要额外访问权限，目前无法读取。');
 const data=play.data,duration=Number(data?.dash?.duration),sourceDuration=Number(info.duration);
 validateDuration(duration);
 if(!Number.isFinite(sourceDuration)||Math.abs(duration-sourceDuration)>3)throw Error('页面可能只提供试看片段，已停止处理。');
 const available=(data.dash.video||[]).filter(t=>t.id===data.quality&&t.mimeType==='video/mp4');
 const track=available.find(t=>t.codecs?.startsWith('avc1'))||available[0];
 if(!track)throw Error('页面没有提供可读取的视频轨道。');
 return {url:mediaURL(track.baseUrl||track.base_url),title:typeof info.title==='string'?info.title.slice(0,100):bvid,
  duration,width:track.width,height:track.height,bvid,sourcePage:`https://www.bilibili.com/video/${bvid}/`};
}
async function windowsPage(bvid){
 return new Promise((resolve,reject)=>{
  const child=spawn('pwsh.exe',['-NoProfile','-File',fileURLToPath(new URL('./fetch-bilibili-page.ps1',import.meta.url)),'-Bvid',bvid],{windowsHide:true});
  let size=0;const chunks=[];
  const timer=setTimeout(()=>{child.kill();reject(Error('B站页面读取超时。'));},35000);
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>8*1024*1024){child.kill();reject(Error('课程页面过大。'));}else chunks.push(chunk);});
  child.stderr.resume();
  child.on('error',()=>{clearTimeout(timer);reject(Error('无法启动系统网页读取工具。'));});
  child.on('close',code=>{clearTimeout(timer);if(code===0)resolve(Buffer.concat(chunks).toString('utf8'));else reject(Error('B站没有提供可读取的正常课程页面。'));});
 });
}
export async function resolveBilibili(raw,{fetcher=fetch,native=process.platform==='win32'}={}){
 const page=bilibiliPage(raw);
 // Ordinary anonymous request: no cookies, browser impersonation, playback signatures,
 // Referer spoofing, undocumented playurl calls or access-control workarounds.
 if(native)return publicTrack(await windowsPage(page.bvid),page.bvid);
 const response=await fetcher(page.url,{redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`B站拒绝读取页面（HTTP ${response.status}），本次未生成结果。`);
 if(!response.headers.get('content-type')?.includes('text/html'))throw Error('B站没有返回正常课程页面。');
 let html='',size=0;const decoder=new TextDecoder();
 for await(const bytes of response.body){size+=bytes.length;if(size>8*1024*1024)throw Error('课程页面过大，无法解析。');html+=decoder.decode(bytes,{stream:true});}
 html+=decoder.decode();return publicTrack(html,page.bvid);
}
export async function openBilibiliMedia(raw,{fetcher=fetch,probe=false}={}){
 const url=mediaURL(raw);
 const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(probe?20000:DOWNLOAD_TIMEOUT_MS),...(probe?{headers:{Range:'bytes=0-1023'}}:{})});
 if(!response.ok)throw Error(`B站视频服务器拒绝读取（HTTP ${response.status}），本次未生成结果。`);
 return response;
}
