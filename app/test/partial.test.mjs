import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {partialFromCache} from '../analysis-cache.mjs';
import {modelFailure} from '../model-error.mjs';
const pose={name:'盘坐',start:0,end:60,base:'seated',arms:'relaxed',legs:'crossed',spine:'neutral',side:'symmetric',cue:'保持坐姿',evidence:'双腿交叉，双手放在膝上',uncertainties:[]};
test('中断预览只使用连续完成的片段，不能越过缺失部分冒充全课',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'yoga-partial-'));
 assert.equal(await partialFromCache(dir,'课程'),null);
 const save=async i=>writeFile(join(dir,`analysis-${i}.json`),JSON.stringify({version:1,offset:i*60,length:60,attempts:[{parsed:{complete:true,items:[pose]},usage:{total_tokens:100}}]}));
 await save(0);await save(2);
 const partial=await partialFromCache(dir,'原课程');
 assert.equal(partial.partial,true);assert.equal(partial.processedDuration,60);assert.equal(partial.completedSegments,1);assert.equal(partial.title,'原课程');assert.equal(partial.usage.total_tokens,100);
 await save(1);
 const resumed=await partialFromCache(dir,'原课程');assert.equal(resumed.processedDuration,180);assert.equal(resumed.items.length,1);assert.equal(resumed.items[0].endTime,180);
});
test('免费额度耗尽与权限错误分别提示，不把服务端原始消息暴露给用户',async()=>{
 const quota=await modelFailure(new Response(JSON.stringify({error:{code:'insufficient_quota',message:'Free quota exhausted'}}),{status:403}));
 assert.equal(quota.code,'insufficient_quota');assert.match(quota.message,/免费额度已用完/);
 const permission=await modelFailure(new Response(JSON.stringify({error:{code:'AccessDenied',message:'sensitive server detail'}}),{status:403}));
 assert.match(permission.message,/权限/);assert.ok(!permission.message.includes('sensitive'));assert.ok(!permission.message.includes('额度已用完'));
});
