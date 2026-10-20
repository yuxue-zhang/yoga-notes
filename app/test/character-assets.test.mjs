import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const registry=JSON.parse(await readFile(new URL('../character-assets.json',import.meta.url),'utf8'));
const catalog=JSON.parse(await readFile(new URL('../pose-catalog.json',import.meta.url),'utf8'));
test('128个体式均有同人物固定素材，不混用被拒绝的矢量角色',async()=>{
 assert.equal(Object.keys(registry.poses).length,104);let count=0;
 for(const pose of catalog.entries){
  assert.equal(pose.artwork.characterId,'original-girl-v1');
  if(pose.artwork.assetIndexes.length){count++;continue;}
  const asset=registry.poses[pose.id];assert.ok(asset);assert.equal(asset.characterId,'original-girl-v1');assert.equal(asset.styleReview,'accepted');assert.equal(pose.artwork.assetId,asset.id);count++;
 }
 assert.equal(count,128);
 for(const atlas of Object.values(registry.atlases)){
  const bytes=await readFile(new URL('../dist'+atlas.url,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),atlas.sha256);
  assert.equal(bytes.readUInt32BE(16),atlas.width);assert.equal(bytes.readUInt32BE(20),atlas.height);
 }
});
test('每个体式映射到合法图格且重复渲染使用相同素材',async()=>{
 const code=await readFile(new URL('../dist/character-assets.js',import.meta.url),'utf8');
 const context=vm.createContext({YOGA_CHARACTER_ASSETS:registry,esc:s=>String(s)});vm.runInContext(code,context);
 for(const [id,asset]of Object.entries(registry.poses)){
  const atlas=registry.atlases[asset.atlas];assert.ok(asset.cell>=0&&asset.cell<atlas.columns*atlas.rows);
  const render=()=>vm.runInContext(`characterFigure(${JSON.stringify(id)},'体式')`,context);
  assert.equal(render(),render());assert.match(render(),/data-character="original-girl-v1"/);assert.ok(!render().includes('pose-diagram'));
 }
 assert.equal(registry.poses['supported-bridge'].atlas,'08');assert.equal(registry.poses['half-boat'].atlas,'08');
});
test('每个新增插画使用单独完整人物边界，避免邻格残肢和等分裁切',async()=>{
 const code=await readFile(new URL('../dist/character-assets.js',import.meta.url),'utf8');
 const context=vm.createContext({YOGA_CHARACTER_ASSETS:registry,esc:s=>String(s)});vm.runInContext(code,context);
 for(const [id,asset]of Object.entries(registry.poses)){
  const a=registry.atlases[asset.atlas];assert.equal(asset.bounds?.length,4,id);
  const [x,y,w,h]=asset.bounds;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=a.width&&y+h<=a.height,id);
  const svg=vm.runInContext(`characterFigure(${JSON.stringify(id)},'体式')`,context);
  assert.ok(svg.includes(`viewBox="${x} ${y} ${w} ${h}"`),id);assert.ok(!asset.cropBottom,id);
 }
 const browserCode=await readFile(new URL('../dist/character-atlases.js',import.meta.url),'utf8');
 const browser=vm.createContext({});vm.runInContext(browserCode,browser);
 assert.equal(vm.runInContext('JSON.stringify(YOGA_CHARACTER_ASSETS)',browser),JSON.stringify(registry));
});
