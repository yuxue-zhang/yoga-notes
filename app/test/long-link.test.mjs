import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {JobStore} from '../job-store.mjs';
import {createApp} from '../automation-server.mjs';
test('长课链接立即返回任务，异步读取，分享参数不写入持久记录',async()=>{
 const store=new JobStore(await mkdtemp(join(tmpdir(),'yoga-long-link-')));
 let unblock;const blocked=new Promise(resolve=>{unblock=resolve;});
 const env={DASHSCOPE_API_KEY:'test',BAILIAN_WORKSPACE_ID:'test',BAILIAN_FREE_QUOTA_CONFIRMED:'true'};
 const server=await createApp({store,env,mediaCheck:async()=>true,
  resolveRemote:async()=>{await blocked;return {response:new Response(Buffer.from('000000186674797069736f6d','hex'),{headers:{'Content-Type':'video/mp4'}}),mime:'video/mp4',title:'60分钟测试课程'};},
  generate:async()=>({items:[{name:'隔离模型测试'}],duration:3600})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base=`http://127.0.0.1:${server.address().port}`;
  const response=await fetch(base+'/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:'https://www.xiaohongshu.com/discovery/item/69b0cd95000000001d013ed0?xsec_token=private-share-test'})});
  assert.equal(response.status,202);const {id}=await response.json();
  assert.equal((await(await fetch(base+'/api/jobs/'+id)).json()).status,'processing');
  unblock();let job;
  for(let i=0;i<50;i++){job=await(await fetch(base+'/api/jobs/'+id)).json();if(job.status==='completed')break;await new Promise(r=>setTimeout(r,10));}
  assert.equal(job.status,'completed');assert.equal(job.result.duration,3600);assert.equal(job.result.title,'60分钟测试课程');
  const saved=await readFile(join(store.directory(id),'job.json'),'utf8');assert.ok(!saved.includes('private-share-test'));assert.ok(!saved.includes('xsec_token'));
 }finally{unblock();await new Promise(resolve=>server.close(resolve));}
});
