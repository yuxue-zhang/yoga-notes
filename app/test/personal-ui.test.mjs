import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('专属人物匹配不忽略明确的姿态冲突，缺图不混用原人物',async()=>{
 const context=vm.createContext({localStorage:{getItem:()=>null},YOGA_POSE_CATALOG:JSON.parse(await readFile(new URL('../pose-catalog.json',import.meta.url),'utf8')),esc:s=>String(s)});
 vm.runInContext(await readFile(new URL('../dist/personal.js',import.meta.url),'utf8'),context);
 assert.equal(vm.runInContext("personalPose({name:'山式'}).id",context),'mountain');
 assert.equal(vm.runInContext("personalPose({name:'山式',posture:{base:'supine'}})",context),null);
 assert.equal(vm.runInContext("personalPose({poseId:'mountain',posture:{base:'supine'}})",context),undefined);
 vm.runInContext("personalProfiles=[{id:'example',poses:{mountain:true}}];personalSelected='example';",context);
 assert.match(vm.runInContext("personalFigure({poseId:'mountain',name:'山式'})",context),/\/api\/characters\/example\/mountain.png/);
 const missing=vm.runInContext("personalFigure({poseId:'tree',name:'树式'})",context);assert.match(missing,/专属动作尚未生成/);assert.doesNotMatch(missing,/<image/);
});
test('预览与打印保持原版人物，专属样张不改课程数据',async()=>{
 const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
 const body=app.slice(app.indexOf('function itemFigure(p){'),app.indexOf('function timeLabel(p)'));
 const ctx=vm.createContext({generatedArt:()=>null,figure:kind=>'original-'+kind,personalFigure:()=>{throw Error('不应调用专属人物');}});
 vm.runInContext(body,ctx);assert.equal(vm.runInContext('itemFigure({kind:0})',ctx),'original-0');
 assert.doesNotMatch(app,/embedPersonalImages/);
 const personal=await readFile(new URL('../dist/personal.js',import.meta.url),'utf8');
 const preview=personal.slice(personal.indexOf('function personalPreviewThree()'));
 assert.doesNotMatch(preview,/state\s*=|navigate\('export'\)/);
 assert.match(preview,/dialog.showModal/);
});
