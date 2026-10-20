import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {matchArtwork,parseSegment,mergeSegments} from '../sequence.mjs';
import {JobStore} from '../job-store.mjs';
import {createApp} from '../automation-server.mjs';
const p={name:'双手双脚支撑倒V形',start:0,end:3,base:'hands_feet',arms:'support_straight',legs:'together',spine:'inverted_v',side:'symmetric',cue:'臀部上提',evidence:'双手撑地，臀部高于肩部',uncertainties:[]};
test('插画按形态匹配；错误名称不会选择错误图片',()=>{
 assert.equal(matchArtwork(p),12);
 assert.equal(matchArtwork({...p,name:'弓步单臂上伸',base:'kneeling',legs:'lunge_knee_down',arms:'both_up',spine:'neutral'}),null);
 assert.equal(matchArtwork({...p,base:'standing',legs:'together',spine:'fold'}),null);
});
test('不确定项保留；没有左右证据不会编造左右',()=>{
 const [item]=parseSegment({complete:true,items:[{...p,side:'left',sideEvidence:''}]},{offset:60,duration:10});
 assert.equal(item.time,60);assert.equal(item.side,'侧别未确认');assert.ok(item.warnings.length);
 const [unknown]=parseSegment({complete:true,items:[{...p,name:'左腿前伸',cue:'左腿前伸',side:'unknown'}]},{offset:0,duration:10});
 assert.ok(!unknown.name.includes('左'));assert.ok(!unknown.cue.includes('左'));
 assert.throws(()=>parseSegment({complete:true,items:[{...p,end:20}]},{offset:0,duration:10}));
 assert.throws(()=>parseSegment({complete:true,items:[{...p,name:'从平板过渡到眼镜蛇式再回到下犬式'}]},{offset:0,duration:10}));
});
test('跨片段保持合并，但返回同一动作仍保留',()=>{
 const a=parseSegment({complete:true,items:[{...p,end:60}]},{offset:0,duration:60});
 const b=parseSegment({complete:true,items:[{...p,end:4},{...p,start:7,end:9,name:'返回下犬'}]},{offset:60,duration:10});
 const merged=mergeSegments([a,b]);assert.equal(merged.length,2);assert.equal(merged[0].endTime,64);assert.equal(merged[1].time,67);
});
test('长课片头只能在明确记录非练习原因时为空，不能静默丢失片段',()=>{
 assert.deepEqual(parseSegment({complete:true,noExercise:true,reason:'片头标题，无练习者画面',items:[]},{offset:0,duration:60}),[]);
 assert.throws(()=>parseSegment({complete:true,items:[]},{offset:0,duration:60}));
 assert.throws(()=>parseSegment({complete:true,noExercise:true,reason:'',items:[]},{offset:0,duration:60}));
});
test('任务重启后保留结果；中断视频可恢复且到期清理',async()=>{
 const root=await mkdtemp(join(tmpdir(),'yoga-store-')),one=new JobStore(root);await one.init();
 const done=await one.create('课程');await one.update(done.id,{status:'completed',result:{items:[{name:'示例仅测试'}]}});
 const working=await one.create('处理中');await writeFile(join(one.directory(working.id),'input.mp4'),'temporary');
 const two=new JobStore(root);await two.init();assert.equal(two.get(done.id).status,'completed');assert.equal(two.get(working.id).status,'failed');assert.ok((await readdir(two.directory(working.id))).includes('input.mp4'));
 await two.update(working.id,{expiresAt:Date.now()-1});await two.expire();assert.ok(!(await readdir(two.directory(working.id))).includes('input.mp4'));
});
test('模型返回未知枚举保留动作并缺图，不冒充确定姿态',()=>{
 const [item]=parseSegment({complete:true,items:[{...p,arms:'unrecognized_shape'}]},{offset:0,duration:10});assert.equal(item.kind,null);assert.equal(item.posture.arms,'unknown');assert.ok(item.warnings.includes('手臂姿态未确认'));
});
test('上传→任务→结果→重启读取全流程（隔离模型，不消耗额度）',async()=>{
 const root=await mkdtemp(join(tmpdir(),'yoga-flow-')),store=new JobStore(root);
 const env={DASHSCOPE_API_KEY:'test',BAILIAN_WORKSPACE_ID:'test',BAILIAN_FREE_QUOTA_CONFIRMED:'true'};
 let received=false;
 const server=await createApp({store,env,mediaCheck:async()=>true,generate:async(input,dir,{update})=>{received=(await readFile(input)).length>4;await update({progress:50,message:'内部测试'});return {items:[{name:'测试动作'}]};}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base=`http://127.0.0.1:${server.address().port}`;
  const response=await fetch(base+'/api/jobs',{method:'POST',headers:{'Content-Type':'video/webm'},body:Buffer.from('1a45dfa300000000','hex')});
  assert.equal(response.status,202);const {id}=await response.json();let job;
  for(let i=0;i<30;i++){job=await(await fetch(base+'/api/jobs/'+id)).json();if(job.status==='completed')break;await new Promise(r=>setTimeout(r,10));}
  assert.equal(job.status,'completed');assert.equal(received,true);
  assert.equal((await fetch(base+'/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:'https://www.bilibili.com/video/test'})})).status,400);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
