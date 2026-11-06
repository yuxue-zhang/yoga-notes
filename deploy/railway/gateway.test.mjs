import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createGateway} from './gateway.mjs';
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
test('gateway authenticates, rejects foreign origins and hides local APIs',async()=>{
 const upstream=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({host:req.headers.host,origin:req.headers.origin,authorization:req.headers.authorization}));});
 await listen(upstream);
 const options={upstreamPort:upstream.address().port,username:'owner',password:'test-password-123456',publicOrigin:'https://yoga.example'};
 const gateway=createGateway(options);await listen(gateway);
 const url='http://127.0.0.1:'+gateway.address().port;
 const auth={Authorization:'Basic '+Buffer.from(options.username+':'+options.password).toString('base64')};
 try{
  assert.equal((await fetch(url+'/healthz')).status,200);
  assert.equal((await fetch(url+'/api/config')).status,401);
  assert.equal((await fetch(url+'/api/config',{headers:{...auth,Origin:'https://evil.example'}})).status,403);
  for(const path of ['/api/settings/next','/api/settings/zhipu','/api/characters'])assert.equal((await fetch(url+path,{headers:auth})).status,404);
  const response=await fetch(url+'/api/config',{headers:{...auth,Origin:options.publicOrigin}});
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json();assert.equal(body.host,'127.0.0.1:'+options.upstreamPort);assert.equal(body.origin,'http://'+body.host);assert.equal(body.authorization,undefined);
 }finally{await Promise.all([new Promise(r=>gateway.close(r)),new Promise(r=>upstream.close(r))]);}
});
test('missing credentials and invalid public origins fail closed',()=>{
 assert.throws(()=>createGateway({}),/YOGA_WEB/);
 assert.throws(()=>createGateway({username:'a',password:'1234567890123456',publicOrigin:'http://example.com'}),/HTTPS/);
});
