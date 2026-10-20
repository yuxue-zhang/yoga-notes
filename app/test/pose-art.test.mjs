import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const code=await readFile(new URL('../dist/pose-art.js',import.meta.url),'utf8');
const art=vm.runInNewContext(code+'\nYogaPoseArt;');
const item=posture=>({name:'练习',posture:{arms:'relaxed',legs:'together',spine:'neutral',...posture}});
test('身体支撑方式明确时，图库外动作也能绘制，姿态不明时不编造人物',()=>{
 for(const base of ['seated','standing','kneeling','hands_knees','hands_feet','prone','supine'])assert.match(art.render(item({base})),/data-illustration="pose-diagram"/);
 assert.equal(art.render(item({base:'unknown'})),null);assert.equal(art.info({}).drawable,false);
});
test('不同手臂、腿和躯干形态改变图形，无法确认的部位显示虚线',()=>{
 const plain=art.render(item({base:'standing'}));
 for(const variant of [{arms:'both_up'},{legs:'wide'},{spine:'sidebend'}])assert.notEqual(art.render(item({base:'standing',...variant})),plain);
 const uncertain=art.render(item({base:'standing',arms:'unknown'}));assert.match(uncertain,/stroke-dasharray/);assert.match(uncertain,/手臂待确认/);
});
test('图形完全内嵌可导出，动作名称按文本转义，不能执行脚本',()=>{
 const svg=art.render({...item({base:'seated'}),name:'<script>alert(1)</script>'});
 assert.ok(!svg.includes('<script>'));assert.ok(!svg.includes('<image'));assert.match(svg,/&lt;script&gt;/);
});
