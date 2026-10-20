import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DOWNLOAD_TIMEOUT_MS} from './limits.mjs';
export function isXiaohongshu(raw){try{return new URL(raw).hostname==='www.xiaohongshu.com';}catch{return false;}}
export function xiaohongshuPage(raw){
 let u;try{u=new URL(raw);}catch{throw Error('请输入完整小红书分享链接。');}
 if(u.protocol!=='https:'||u.hostname!=='www.xiaohongshu.com'||u.username||u.password||(u.port&&u.port!=='443'))throw Error('不是支持的小红书分享链接。');
 const match=u.pathname.match(/^\/(?:discovery\/item|explore)\/([a-fA-F0-9]{24})\/?$/);if(!match)throw Error('请粘贴小红书笔记的完整分享链接，不是主页或搜索页。');
 const out=new URL(`https://www.xiaohongshu.com/discovery/item/${match[1]}`);
 for(const key of ['source','xhsshare','xsec_token','xsec_source'])if(u.searchParams.has(key))out.searchParams.set(key,u.searchParams.get(key));
 return {id:match[1],url:out.href};
}
function decode(value){return value.replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));}
export function xiaohongshuMediaURL(raw){
 let u;try{u=new URL(raw);}catch{throw Error('小红书视频地址无效。');}
 if(u.protocol!=='https:'||!u.hostname.endsWith('.xhscdn.com')||u.username||u.password||(u.port&&u.port!=='443'))throw Error('没有取得受支持的小红书公开视频地址。');
 return u.href;
}
export function xiaohongshuTrack(html,id){
 const metadata=new Map();
 for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
  const attrs={};for(const match of tag.matchAll(/([a-zA-Z_:]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[match[1].toLowerCase()]=decode(match[2]??match[3]);
  if(attrs.property&&attrs.content)metadata.set(attrs.property,attrs.content);
 }
 const raw=metadata.get('og:video')||metadata.get('og:video:secure_url');
 if(!raw)throw Error('分享页没有提供公开视频地址，可能需要登录或链接已失效。');
 return {url:xiaohongshuMediaURL(raw),title:(metadata.get('og:title')||'小红书瑜伽课程').slice(0,100),sourceId:id};
}
async function nativePage(url){
 return new Promise((resolve,reject)=>{
  const child=spawn('pwsh.exe',['-NoProfile','-File',fileURLToPath(new URL('./fetch-xiaohongshu-page.ps1',import.meta.url))],{windowsHide:true});
  const chunks=[];let size=0;
  const timer=setTimeout(()=>{child.kill();reject(Error('小红书分享页读取超时。'));},35000);
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>8*1024*1024){child.kill();reject(Error('分享页过大，无法解析。'));}else chunks.push(chunk);});
  child.stderr.resume();child.stdin.on('error',()=>{});
  child.on('error',()=>{clearTimeout(timer);reject(Error('无法启动系统网页读取工具。'));});
  child.on('close',code=>{clearTimeout(timer);if(code===0)resolve(Buffer.concat(chunks).toString('utf8'));else reject(Error('小红书未提供正常公开页面，请确认完整分享链接仍可用。'));});
  // Share tokens travel only over stdin, never command arguments or logs.
  child.stdin.end(JSON.stringify({url}));
 });
}
export async function resolveXiaohongshu(raw,{native=process.platform==='win32',fetcher=fetch}={}){
 const page=xiaohongshuPage(raw);let html;
 if(native)html=await nativePage(page.url);
 else{
  const response=await fetcher(page.url,{redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`小红书拒绝访问（HTTP ${response.status}）。`);
  if(!response.headers.get('content-type')?.includes('text/html'))throw Error('小红书没有返回正常分享页面。');
  let size=0;const chunks=[];for await(const bytes of response.body){size+=bytes.length;if(size>8*1024*1024)throw Error('分享页过大。');chunks.push(Buffer.from(bytes));}html=Buffer.concat(chunks).toString('utf8');
 }
 return xiaohongshuTrack(html,page.id);
}
export async function openXiaohongshuMedia(raw,{fetcher=fetch,probe=false}={}){
 const response=await fetcher(xiaohongshuMediaURL(raw),{redirect:'error',signal:AbortSignal.timeout(probe?20000:DOWNLOAD_TIMEOUT_MS),...(probe?{headers:{Range:'bytes=0-1023'}}:{})});
 if(!response.ok)throw Error(`小红书视频服务器拒绝读取（HTTP ${response.status}）。`);
 if(!response.headers.get('content-type')?.split(';')[0].includes('video/mp4')){await response.body?.cancel();throw Error('分享链接返回的不是MP4视频。');}
 return response;
}
