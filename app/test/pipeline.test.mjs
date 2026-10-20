import test from 'node:test';
import assert from 'node:assert/strict';
import {validateResult,sourceURL,readiness,analyze} from '../pipeline.mjs';
import {createApp} from '../automation-server.mjs';
import {JobStore} from '../job-store.mjs';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const pose={name:'下犬式',time:1,side:'居中',cue:'双手推地',evidence:'髋部向上，双手双脚支撑'};
const result=items=>({title:'短练习',complete:true,uncertainties:[],items});
test('保留重复动作；未知体式缺图，不凑数',()=>{
  const out=validateResult(result([pose,{...pose,time:5},{...pose,name:'未收录体式',time:8}]));
  assert.equal(out.items.length,3);assert.equal(out.items[0].kind,null);assert.equal(out.items[2].kind,null);
});
test('拒绝错序、左右无依据和不完整输出',()=>{
  assert.throws(()=>validateResult(result([pose,{...pose,time:0}])));
  assert.throws(()=>validateResult(result([{...pose,side:'左侧'}])));
  assert.throws(()=>validateResult({...result([pose]),complete:false}));
  assert.throws(()=>validateResult({...result([pose]),uncertainties:['看不清']}));
});
test('网页、未授权域名、非 HTTPS 不读取',()=>{
  assert.throws(()=>sourceURL('https://www.bilibili.com/video/BV1kxsdzgEUZ/','www.bilibili.com'));
  assert.throws(()=>sourceURL('https://example.com/test.mp4',''));
  assert.throws(()=>sourceURL('http://example.com/test.mp4','example.com'));
  assert.equal(sourceURL('https://example.com/test.mp4','example.com'),'https://example.com/test.mp4');
});
test('未确认免费额度保护不能调用',async()=>{
  assert.equal(readiness({DASHSCOPE_API_KEY:'test',BAILIAN_WORKSPACE_ID:'test'}),false);
  await assert.rejects(analyze('invalid',{}));
});
test('真实视频回归：拒绝为了图库而错误命名',()=>{
  assert.throws(()=>validateResult(result([{...pose,name:'弓步单臂上伸',cue:'双臂上举'}])));
  assert.throws(()=>validateResult(result([{...pose,name:'分腿前屈',evidence:'双脚并拢前屈'}])));
  assert.throws(()=>validateResult(result([{...pose,name:'十指交扣上伸',evidence:'双臂上举，掌心朝上'}])));
});
test('本地 API 拒绝跨站提交且不暴露源码',async()=>{
  const server=await createApp({store:new JobStore(await mkdtemp(join(tmpdir(),'yoga-api-'))),env:{},mediaCheck:async()=>true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const base=`http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(base+'/')).status,200);
    assert.equal((await fetch(base+'/api.js')).status,200);
    assert.equal((await fetch(base+'/server.mjs')).status,404);
    assert.equal((await fetch(base+'/api/jobs',{method:'POST',headers:{Origin:'https://other.example'}})).status,403);
    const config=await (await fetch(base+'/api/config')).json();assert.equal(config.maxSeconds,5400);assert.equal(config.maxBytes,1073741824);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
