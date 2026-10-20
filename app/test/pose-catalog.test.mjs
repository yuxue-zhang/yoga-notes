import test from 'node:test';
import assert from 'node:assert/strict';
import {poseCatalog,findPoseCandidates,identifyPose} from '../pose-catalog.mjs';
test('常见体式目录具备唯一ID、可追踪资料及独立的插画状态',()=>{
 assert.equal(poseCatalog.entries.length,128);assert.equal(poseCatalog.categories.length,9);
 const ids=new Set(),variantIds=new Set(),assets=new Set();
 for(const p of poseCatalog.entries){
  assert.ok(!ids.has(p.id));ids.add(p.id);assert.ok(p.name&&p.english&&p.description&&p.distinction);assert.ok(poseCatalog.categories.includes(p.category));assert.equal(p.artwork.characterId,'original-girl-v1');assert.ok(p.sources.every(s=>new URL(s.url).protocol==='https:'));
  for(const v of p.variants){assert.ok(!variantIds.has(v.id));variantIds.add(v.id);}
  for(const i of p.artwork.assetIndexes){assert.ok(Number.isInteger(i)&&i>=0&&i<24);assets.add(i);}
  if(!p.artwork.assetIndexes.length&&!p.artwork.assetId)assert.equal(p.artwork.status,'pending');
 }
 assert.equal(assets.size,24);assert.equal(poseCatalog.entries.filter(p=>p.artwork.assetIndexes.length).length,24);
});
test('支持中英梵文与别名查询，不能将不同支撑姿态仅凭名称匹配',()=>{
 assert.equal(findPoseCandidates('下犬')[0].id,'downward-dog');assert.equal(findPoseCandidates('Mountain Pose')[0].id,'mountain');assert.equal(findPoseCandidates('Uttānāsana')[0].id,'standing-fold');
 assert.equal(identifyPose('前臂平板支撑',{base:'hands_feet',arms:'support_straight',legs:'together',spine:'neutral'}),null);
 assert.equal(identifyPose('前臂平板支撑',{base:'hands_feet',arms:'support_bent',legs:'together',spine:'neutral'}),'forearm-plank');
 assert.equal(identifyPose('下犬式',{base:'unknown'}),null);assert.deepEqual(findPoseCandidates(''),[]);
});
