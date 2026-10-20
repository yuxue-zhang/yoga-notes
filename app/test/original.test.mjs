import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('完整原版保留30提示、复合动作和未核实A/B',()=>{
 const data=vm.runInNewContext(readFileSync(new URL('../dist/original.js',import.meta.url),'utf8')+'; ORIGINAL_SEQUENCE');
 assert.equal(data.items.length,30);
 assert.equal(data.items[10].kinds.join(','),'8,9');
 assert.equal(data.items[24].kinds.join(','),'10,11,12');
 assert.equal(data.items[6].side,'A侧 · 左右未核实');
 assert.equal(data.items[29].timeLabel,'19:50');
 assert.ok(data.items.every(p=>p.kinds.every(i=>Number.isInteger(i)&&i>=0&&i<24)));
 assert.equal(data.reference,true);assert.equal(data.demo,false);
});
