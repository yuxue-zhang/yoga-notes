import test from 'node:test';
import assert from 'node:assert/strict';
import {xiaohongshuPage,xiaohongshuTrack,openXiaohongshuMedia,resolveXiaohongshu} from '../xiaohongshu.mjs';
import {MAX_BYTES,MAX_SECONDS,validateDuration} from '../limits.mjs';
const id='69b0cd95000000001d013ed0';
test('60分钟与90分钟通过时长检查，超过90分钟拒绝',()=>{
 assert.equal(validateDuration(3600),3600);assert.equal(validateDuration(5400),5400);
 assert.throws(()=>validateDuration(5401));assert.equal(MAX_SECONDS,5400);assert.equal(MAX_BYTES,1073741824);
});
test('小红书保留必要分享参数，拒绝其他网站和凭证URL',()=>{
 const page=xiaohongshuPage(`https://www.xiaohongshu.com/explore/${id}?source=webshare&xhsshare=pc_web&xsec_token=sample%3D&xsec_source=pc_share&tracking=remove`);
 const url=new URL(page.url);assert.equal(url.searchParams.get('xsec_token'),'sample=');assert.equal(url.searchParams.has('tracking'),false);assert.equal(url.searchParams.get('xhsshare'),'pc_web');
 assert.throws(()=>xiaohongshuPage(`https://user:secret@www.xiaohongshu.com/explore/${id}`));
 assert.throws(()=>xiaohongshuPage(`https://evil.example/explore/${id}`));
});
test('公开meta解析兼容属性顺序并拒绝伪媒体域',()=>{
 const html=`<meta content='公开课程 &amp; 全身舒展' property='og:title'><meta content="https://sns-video-v6.xhscdn.com/test.mp4?a=1&amp;b=2" property="og:video">`;
 const track=xiaohongshuTrack(html,id);assert.equal(track.title,'公开课程 & 全身舒展');assert.ok(track.url.includes('&b=2'));
 assert.throws(()=>xiaohongshuTrack('<meta property="og:video" content="https://localhost/private.mp4">',id));
 assert.throws(()=>xiaohongshuTrack('<title>需要登录</title>',id));
});
test('不跟随重定向，不附带登录身份',async()=>{
 let options;
 await assert.rejects(openXiaohongshuMedia('https://sns-video-v6.xhscdn.com/test.mp4',{fetcher:async(url,opts)=>{options=opts;return new Response('',{status:403});}}));
 assert.equal(options.redirect,'error');assert.equal(options.headers,undefined);
 await assert.rejects(resolveXiaohongshu(`https://www.xiaohongshu.com/explore/${id}`,{native:false,fetcher:async()=>new Response('',{status:403})}));
});
