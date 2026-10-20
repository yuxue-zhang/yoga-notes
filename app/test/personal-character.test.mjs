import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCharacterStore,imageBytes,editCharacter} from '../personal-character.mjs';
import {createApp} from '../automation-server.mjs';
import {JobStore} from '../job-store.mjs';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jPz8AAAAASUVORK5CYII=','base64'),photo='data:image/png;base64,'+png.toString('base64');
async function finished(store,id){for(let i=0;i<1000;i++){const p=await store.get(id);if(p.status!=='generating')return p;await new Promise(r=>setTimeout(r,10));}throw Error('timeout');}
test('照片校验拒绝伪图片和过大的输入',()=>{assert.equal(imageBytes(photo).mime,'image/png');assert.throws(()=>imageBytes('data:image/jpeg;base64,'+png.toString('base64')),/不一致/);assert.throws(()=>imageBytes('data:text/html;base64,aaaa'),/JPG/);assert.throws(()=>imageBytes('x'.repeat(9_000_001)),/6 MB/);});
test('人物固定母版、动作缓存、失败接续、照片删除以及路径隔离',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'yoga-character-'));let calls=[],fail=false;
 const store=await createCharacterStore({directory,env:{NEXT_API_KEY:'test'},edit:async(images,prompt)=>{calls.push({images,prompt});if(fail)throw Error('绘图服务暂时繁忙');return png;}});
 const created=await store.create(photo);const ready=await finished(store,created.id);assert.equal(ready.avatar,true);await assert.rejects(access(join(directory,created.id,'photo')));
 await store.generate(created.id,[{poseId:'mountain',reference:photo}]);assert.equal((await finished(store,created.id)).poses.mountain,true);assert.ok(calls[1].images[0].bytes.equals(png));assert.equal(calls[1].images.length,1);
 await store.generate(created.id,[{poseId:'mountain',reference:photo}]);assert.equal(calls.length,2);
 fail=true;await store.generate(created.id,[{poseId:'tree',reference:photo}]);let failed=await finished(store,created.id);assert.equal(failed.status,'failed');assert.equal(failed.poses.mountain,true);assert.match(failed.error,/繁忙/);assert.equal(failed.poses.tree,undefined);
 fail=false;await store.generate(created.id,[{poseId:'tree',reference:photo}]);assert.equal((await finished(store,created.id)).poses.tree,true);
 await assert.rejects(store.asset(created.id,'../.env'));await assert.rejects(store.get('../'));await assert.rejects(store.generate(created.id,[{poseId:'fake',reference:photo}]));
 const reopened=await createCharacterStore({directory});assert.equal((await reopened.list())[0].poses.mountain,true);assert.ok((await reopened.asset(created.id,'avatar.png')).equals(png));
 await reopened.remove(created.id);assert.deepEqual(await reopened.list(),[]);
});
test('绘图接口使用参考图编辑，拒绝网关返回外部图片网址及泄漏错误',async()=>{
 const env={NEXT_API_KEY:'private-key'};let sent=0;
 const fetcher=async(url,options)=>{if(url.endsWith('/models'))return Response.json({data:[{id:'gpt-image-1'}]});sent++;assert.ok(url.endsWith('/images/edits'));assert.equal(options.redirect,'error');assert.equal(options.body.getAll('image[]').length,2);return Response.json({data:[{b64_json:png.toString('base64')}]});};
 assert.ok((await editCharacter([{bytes:png,mime:'image/png'},{bytes:png,mime:'image/png'}],'test',env,{fetcher})).equals(png));assert.equal(sent,1);
 await assert.rejects(editCharacter([],'test',env,{fetcher:async url=>url.endsWith('/models')?Response.json({data:[{id:'gpt-image-1'}]}):Response.json({data:[{url:'http://127.0.0.1/private'}]})}),/没有返回图片/);
});
test('网页照片提交、状态查询、专属图片与删除入口可用；拒绝跨站上传',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'yoga-personal-api-'));
 const characters=await createCharacterStore({directory:join(directory,'characters'),env:{NEXT_API_KEY:'test-key'},edit:async()=>png});
 const server=await createApp({store:new JobStore(join(directory,'jobs')),characterStore:characters,env:{}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await fetch(base+'/character')).status,200);
  assert.equal((await fetch(base+'/personal.js')).status,200);
  assert.equal((await fetch(base+'/api/characters',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:JSON.stringify({photo})})).status,403);
  const response=await fetch(base+'/api/characters',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({photo})});assert.equal(response.status,202);const p=await response.json();await finished(characters,p.id);
  const list=await (await fetch(base+'/api/characters')).json();assert.equal(list[0].avatar,true);assert.equal(JSON.stringify(list).includes('test-key'),false);assert.equal(JSON.stringify(list).includes(photo),false);
  const image=await fetch(base+'/api/characters/'+p.id+'/avatar.png');assert.equal(image.headers.get('content-type'),'image/png');assert.ok(Buffer.from(await image.arrayBuffer()).equals(png));
  assert.equal((await fetch(base+'/api/characters/'+p.id+'/photo')).status,404);
  const deleted=await fetch(base+'/api/characters/'+p.id+'/delete',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:'{}'});assert.equal(deleted.status,200);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('更换衣服建立独立版本，不复用旧衣服动作；人物失败后可恢复',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'yoga-outfit-'));let fail=true,prompts=[];
 const store=await createCharacterStore({directory,env:{NEXT_API_KEY:'test'},edit:async(images,prompt)=>{prompts.push(prompt);assert.equal(images.length,1);if(fail)throw Error('绘图服务暂时繁忙');return png;}});
 const p=await store.create(photo);assert.equal((await finished(store,p.id)).status,'failed');fail=false;await store.resume(p.id);assert.equal((await finished(store,p.id)).avatar,true);
 await store.generate(p.id,[{poseId:'mountain',reference:photo}]);await finished(store,p.id);
 const changed=await store.outfit(p.id);assert.notEqual(changed.id,p.id);const ready=await finished(store,changed.id);assert.equal(ready.outfit,'wrap');assert.equal(ready.parentId,p.id);assert.deepEqual(ready.poses,{});assert.equal((await store.get(p.id)).poses.mountain,true);assert.match(prompts.at(-1),/short-sleeve/);assert.match(prompts.at(-1),/purple/);assert.match(prompts.at(-1),/Redesign the ENTIRE illustrated character/);
});
