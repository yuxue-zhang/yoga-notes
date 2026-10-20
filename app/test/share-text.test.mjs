import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const script=readFileSync(new URL('../dist/api.js',import.meta.url),'utf8');
const shareURL=vm.runInNewContext(script.slice(0,script.indexOf('function progress('))+';shareURL');
test('直接粘贴小红书分享文字，只抽取网址且保留分享参数',()=>{
 const url='https://www.xiaohongshu.com/discovery/item/69b0cd95000000001d013ed0?xsec_token=example%3D&xsec_source=pc_share';
 assert.equal(shareURL('86 【60min哈他瑜伽】 😆 分享口令 😆 '+url),url);
 assert.equal(shareURL('('+url+')'),url);
 assert.throws(()=>shareURL(url+'，https://www.bilibili.com/video/BV1Kq4y1H76Y/'));
});
