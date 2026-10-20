import http from 'node:http';
import {readFile} from 'node:fs/promises';
const page=`<!doctype html><meta charset="utf-8"><title>内部视频逐帧核查</title><style>body{font:14px sans-serif}#frames{display:grid;grid-template-columns:repeat(4,240px);gap:8px}canvas{width:240px}p{margin:0}</style><h1>公开授权视频关键帧（非用户课程）</h1><p>Joseph RENGER · CC BY-SA 3.0 · Wikimedia Commons</p><div id="frames"></div><video muted src="/video" preload="auto" style="display:none"></video><script>
const video=document.querySelector('video');video.onloadedmetadata=async()=>{for(const time of [0,2,5,8,10,12,16,19,22,25,29,32,35,38,43,48]){await new Promise(resolve=>{video.onseeked=resolve;video.currentTime=time+.1});const el=document.createElement('div'),canvas=document.createElement('canvas');canvas.width=384;canvas.height=288;canvas.getContext('2d').drawImage(video,0,0,384,288);const label=document.createElement('p');label.textContent=time+' 秒';el.append(label,canvas);document.querySelector('#frames').append(el)}document.title='关键帧已就绪'};
</script>`;
http.createServer(async(req,res)=>{
 if(req.url==='/video'){const bytes=await readFile(new URL('./test-media/surya-namaskar.webm',import.meta.url));res.writeHead(200,{'Content-Type':'video/webm','Content-Length':bytes.length});res.end(bytes);}
 else {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(page);}
}).listen(8788,'127.0.0.1');
