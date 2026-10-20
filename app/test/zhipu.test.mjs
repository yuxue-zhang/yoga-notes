import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {visionRequest,parseModelJSON} from '../vision-request.mjs';
import {saveZhipuKey,validateZhipuKey} from '../provider-settings.mjs';
import {readiness} from '../pipeline.mjs';
import {createApp} from '../automation-server.mjs';
import {JobStore} from '../job-store.mjs';
test('兼容模型在JSON前后的解释和代码块，不能将错误内容当作动作结果',()=>{
 assert.deepEqual(parseModelJSON('说明：\n```json\n{"complete":true,"items":[]}\n```'),{complete:true,items:[]});
 assert.deepEqual(parseModelJSON([{text:'{"complete":true}'}]),{complete:true});assert.throws(()=>parseModelJSON('无法观察视频'),/格式/);
});
test('验证失败保持未连接，成功必须包含真实模型响应',async()=>{
 await assert.rejects(validateZhipuKey('test-key-123456',{fetcher:async()=>new Response('{}',{status:401})}),/未认可/);
 await assert.rejects(validateZhipuKey('test-key-123456',{fetcher:async()=>Response.json({})}),/有效响应/);
 await validateZhipuKey('test-key-123456',{fetcher:async()=>Response.json({choices:[{message:{content:'1'}}]})});
});
test('平台临时繁忙采用有上限的延时重试，不把 Key 错误反复重试',async()=>{
 let calls=0;const delays=[];
 await validateZhipuKey('test-key-123456',{sleep:async ms=>delays.push(ms),fetcher:async()=>++calls<3?Response.json({error:{code:'1305'}},{status:429}):Response.json({choices:[{}]})});
 assert.equal(calls,3);assert.deepEqual(delays,[5000,15000]);
 calls=0;await assert.rejects(validateZhipuKey('test-key-123456',{sleep:async()=>{},fetcher:async()=>{calls++;return Response.json({error:{code:'1305'}},{status:429});}}),/1305/);assert.equal(calls,4);
});
test('视频画面识别遇到临时拥挤会自行重试，保留原请求而不切换模型',async()=>{
 let calls=0;const delays=[];
 const result=await visionRequest(Buffer.from('video'),'记录动作',{YOGA_PROVIDER:'zhipu',ZHIPU_API_KEY:'test'},{frames:[Buffer.from('image')],sleep:async ms=>delays.push(ms),fetcher:async()=>++calls===1?Response.json({error:{code:'1305'}},{status:429}):Response.json({choices:[{finish_reason:'stop',message:{content:'{"complete":true}'}}]})});
 assert.equal(result.parsed.complete,true);assert.equal(calls,2);assert.deepEqual(delays,[10000]);
});
test('视频等待通知与重试次数有上限，持续拥挤不谎报完成',async()=>{
 let calls=0;const notices=[];
 await assert.rejects(visionRequest(Buffer.from('video'),'记录动作',{YOGA_PROVIDER:'zhipu',ZHIPU_API_KEY:'test'},{frames:[Buffer.from('image')],sleep:async()=>{},onRetry:async value=>notices.push(value),fetcher:async()=>{calls++;return Response.json({error:{code:'1305'}},{status:429});}}),/仍然拥挤/);
 assert.equal(calls,9);assert.equal(notices.length,8);assert.equal(notices.at(-1).delay,60000);assert.equal(notices.at(-1).attempt,8);
});
test('本机设置拒绝跨站和缺少来源的提交，不回显密钥，返回可接续任务',async()=>{
 const store=new JobStore(await mkdtemp(join(tmpdir(),'yoga-settings-'))),env={};let saved=0;
 const job=await store.create('课程');await store.update(job.id,{status:'failed',canResume:true});
 const server=await createApp({store,env,validateProvider:async()=>{},saveProvider:async(key,env)=>{assert.equal(key,'secret-key');saved++;Object.assign(env,{YOGA_PROVIDER:'zhipu',ZHIPU_API_KEY:key});}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const send=origin=>fetch(base+'/api/settings/zhipu',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify({apiKey:'secret-key'})});
  assert.equal((await send()).status,403);assert.equal((await send('https://external.example')).status,403);assert.equal(saved,0);
  const response=await send(base);assert.equal(response.status,200);const data=await response.json();assert.equal(data.resumableId,job.id);assert.equal(data.model,'glm-4.6v-flash');assert.equal(JSON.stringify(data).includes('secret-key'),false);
 }finally{await new Promise(r=>server.close(r));}
});
test('智谱只允许免费视觉型号，使用独立密钥和时间标记的图片请求',async()=>{
 const env={YOGA_PROVIDER:'zhipu',ZHIPU_API_KEY:'zhipu-test',YOGA_VISION_MODEL:'glm-4.6v-flash',DASHSCOPE_API_KEY:'must-not-send'};
 assert.equal(readiness(env),true);assert.equal(readiness({...env,YOGA_VISION_MODEL:'glm-4.6v'}),false);
 let captured;
 await visionRequest(Buffer.from('video'),'观察动作',env,{frames:[Buffer.from('image1'),Buffer.from('image2')],fetcher:async(url,options)=>{
  captured={url,...options,body:JSON.parse(options.body)};return Response.json({choices:[{finish_reason:'stop',message:{content:'{"complete":true}'}}]});
 }});
 assert.equal(captured.url,'https://open.bigmodel.cn/api/paas/v4/chat/completions');assert.equal(captured.headers.Authorization,'Bearer zhipu-test');
 assert.equal(captured.body.model,'glm-4.6v-flash');assert.equal(captured.body.thinking.type,'disabled');assert.equal(captured.body.messages[0].content[2].text,'片段内第 2 秒画面');
 await assert.rejects(visionRequest(Buffer.from('video'),'text',env),/抽取/);
});
test('另一个官方免费视觉模型沿用Key，保留默认思考模式',async()=>{
 const env={YOGA_PROVIDER:'zhipu',ZHIPU_API_KEY:'test',YOGA_VISION_MODEL:'glm-4.1v-thinking-flash'};assert.equal(readiness(env),true);
 await visionRequest(Buffer.from('video'),'记录动作',env,{frames:[Buffer.from('image')],fetcher:async(url,options)=>{
  const body=JSON.parse(options.body);assert.equal(body.model,'glm-4.1v-thinking-flash');assert.equal(body.thinking,undefined);assert.equal(body.max_tokens,16384);
  return Response.json({choices:[{finish_reason:'stop',message:{content:'{"complete":true}'}}]});
 }});
});
test('连接密钥持久保存但不丢失百炼配置，拒绝换行注入',async()=>{
 const path=join(await mkdtemp(join(tmpdir(),'yoga-provider-')),'.env'),env={};await writeFile(path,'DASHSCOPE_API_KEY=old-key\nYOGA_PROVIDER=bailian\n');
 await assert.rejects(saveZhipuKey('key\nYOGA_PROVIDER=evil',env,path),/完整/);
 await saveZhipuKey('new-zhipu-key-123',env,path);const text=await readFile(path,'utf8');
 assert.match(text,/DASHSCOPE_API_KEY=old-key/);assert.match(text,/YOGA_PROVIDER=zhipu/);assert.equal(env.YOGA_VISION_MODEL,'glm-4.6v-flash');assert.equal(readiness(env),true);
});
