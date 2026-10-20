import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {JobStore} from '../job-store.mjs';
import {createApp} from '../automation-server.mjs';
test('分析失败后复用视频继续，不重新读取来源',async()=>{
 const store=new JobStore(await mkdtemp(join(tmpdir(),'yoga-resume-')));let calls=0;
 const env={DASHSCOPE_API_KEY:'test',BAILIAN_WORKSPACE_ID:'test',BAILIAN_FREE_QUOTA_CONFIRMED:'true'};
 const server=await createApp({store,env,mediaCheck:async()=>true,generate:async()=>{if(++calls===1)throw Error('返回格式需修正');return {items:[{name:'恢复测试'}]};}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 async function finished(id){for(let i=0;i<50;i++){const job=await(await fetch(base+'/api/jobs/'+id)).json();if(job.status!=='processing')return job;await new Promise(r=>setTimeout(r,10));}throw Error('test timed out');}
 try{
  const response=await fetch(base+'/api/jobs',{method:'POST',headers:{'Content-Type':'video/webm'},body:Buffer.from('1a45dfa300000000','hex')});const {id}=await response.json();
  const failed=await finished(id);assert.equal(failed.canResume,true);assert.ok((await readdir(store.directory(id))).includes('input.webm'));
  const resume=await fetch(base+'/api/jobs/'+id+'/resume',{method:'POST'});assert.equal(resume.status,202);
  assert.equal((await finished(id)).status,'completed');assert.equal(calls,2);
 }finally{await new Promise(r=>server.close(r));}
});
