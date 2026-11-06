import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export function createGateway({upstreamPort,username,password,publicOrigin}) {
 if(!username || !password || password.length<16) throw Error('Set YOGA_WEB_USER and YOGA_WEB_PASSWORD (at least 16 characters).');
 const origin=new URL(publicOrigin);
 if(origin.protocol!=='https:' || origin.origin!==publicOrigin) throw Error('YOGA_PUBLIC_ORIGIN must be an exact HTTPS origin.');
 const expected=Buffer.from('Basic '+Buffer.from(username+':'+password).toString('base64'));
 return http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/healthz'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}');return;}
  const actual=Buffer.from(req.headers.authorization||'');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected)){
   res.writeHead(401,{'WWW-Authenticate':'Basic realm="Yoga Tape", charset="UTF-8"'});res.end('Authentication required');return;
  }
  if(req.headers.origin && req.headers.origin!==origin.origin){res.writeHead(403);res.end('Origin denied');return;}
  // Cloud deployment is for course stickers; local-only settings and personal photos stay private.
  if(path.startsWith('/api/')&&!(/^\/api\/jobs(?:\/[a-f0-9-]{36}(?:\/resume)?)?$/.test(path)||path==='/api/config')){
   res.writeHead(404,{'Content-Type':'application/json'});res.end('{"error":"此在线入口仅提供课程贴纸服务。"}');return;
  }
  const headers={...req.headers,host:'127.0.0.1:'+upstreamPort};
  delete headers.authorization;delete headers.cookie;delete headers['forwarded'];
  for(const key of Object.keys(headers))if(key.startsWith('x-forwarded-'))delete headers[key];
  if(req.headers.origin)headers.origin='http://127.0.0.1:'+upstreamPort;
  const upstream=http.request({hostname:'127.0.0.1',port:upstreamPort,path:req.url,method:req.method,headers},response=>{
   res.writeHead(response.statusCode,{...response.headers,'cache-control':'no-store'});response.pipe(res);
  });
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('Processing service unavailable');});
  req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());req.pipe(upstream);
 });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {createApp}=await import('../../app/automation-server.mjs');
 const internal=await createApp();
 await new Promise(resolve=>internal.listen(0,'127.0.0.1',resolve));
 const gateway=createGateway({upstreamPort:internal.address().port,username:process.env.YOGA_WEB_USER,password:process.env.YOGA_WEB_PASSWORD,publicOrigin:process.env.YOGA_PUBLIC_ORIGIN});
 gateway.requestTimeout=900000;
 gateway.listen(Number(process.env.PORT||8787),'0.0.0.0',()=>console.log('Yoga Tape gateway ready'));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{gateway.close();internal.close();setTimeout(()=>process.exit(0),10000).unref();});
}
