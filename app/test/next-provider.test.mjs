import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {discoverNextModels,saveNextConnection,nextStatus,NEXT_BASE_URL} from '../next-provider.mjs';
test('只向用户指定域名验证Key，不跟随跳转，不接受注入的模型名称',async()=>{
 const models=await discoverNextModels('test-next-key-123',{fetcher:async(url,options)=>{
  assert.equal(url,NEXT_BASE_URL+'/models');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer test-next-key-123');
  return Response.json({data:[{id:'example-vision'},{id:'<script>'},{id:'example-vision'}]});
 }});assert.deepEqual(models,['example-vision']);
 await assert.rejects(discoverNextModels('key\ninjected'),/完整/);
 await assert.rejects(discoverNextModels('test-next-key-123',{fetcher:async()=>new Response('secret error',{status:401})}),/没有认可/);
});
test('连接额外额度不会改动原来的模型或启动视频，状态不回显Key',async()=>{
 const path=join(await mkdtemp(join(tmpdir(),'yoga-next-')),'.env'),env={YOGA_PROVIDER:'zhipu'};await writeFile(path,'ZHIPU_API_KEY=original-key\nYOGA_PROVIDER=zhipu\n');
 await saveNextConnection('test-next-key-123',['example-vision'],env,path);
 assert.match(await readFile(path,'utf8'),/ZHIPU_API_KEY=original-key/);assert.equal(env.YOGA_PROVIDER,'zhipu');
 const status=nextStatus(env);assert.equal(status.configured,true);assert.deepEqual(status.models,['example-vision']);assert.equal(JSON.stringify(status).includes('test-next-key-123'),false);
});
