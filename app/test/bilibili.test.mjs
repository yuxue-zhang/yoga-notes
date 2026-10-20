import test from 'node:test';
import assert from 'node:assert/strict';
import {bilibiliPage,embeddedJSON,mediaURL,publicTrack,resolveBilibili} from '../bilibili.mjs';
const id='BV1Kq4y1H76Y';
function html(patch={}){
 const playback={code:0,data:{quality:32,dash:{duration:60,video:[{id:32,mimeType:'video/mp4',codecs:'avc1',baseUrl:'https://upos-test.bilivideo.com/video.mp4',width:852,height:480}]},...patch}};
 return '<script>window.__playinfo__ = '+JSON.stringify(playback)+'</script><script>window.__INITIAL_STATE__='+JSON.stringify({videoData:{bvid:id,title:'测试课程',duration:60}})+';(function(){})</script>';
}
test('课程链接去掉追踪参数，拒绝其他域名和分P',()=>{
 assert.equal(bilibiliPage(`https://www.bilibili.com/video/${id}?vd_source=tracking`).url,`https://www.bilibili.com/video/${id}/`);
 assert.throws(()=>bilibiliPage(`https://www.bilibili.com/video/${id}?p=2`));
 assert.throws(()=>bilibiliPage(`https://evil.example/video/${id}`));
});
test('公开播放JSON正确解析，不执行页面脚本',()=>{
 const result=publicTrack(html(),id);assert.equal(result.height,480);assert.equal(result.duration,60);
 assert.equal(embeddedJSON('window.__playinfo__={"a":"}\\\"{","b":{"c":1}};','__playinfo__').b.c,1);
});
test('拒绝试看、登录要求及非媒体域名',()=>{
 assert.throws(()=>publicTrack(html({is_preview:1}),id));
 assert.throws(()=>publicTrack(html({need_login:true}),id));
 assert.throws(()=>mediaURL('http://localhost/private.mp4'));
 assert.throws(()=>mediaURL('https://bilivideo.com.evil.example/private.mp4'));
});
test('平台拒绝时停止，不更换身份重试',async()=>{
 let calls=0;await assert.rejects(resolveBilibili(`https://www.bilibili.com/video/${id}`,{native:false,fetcher:async()=>{calls++;return new Response('',{status:403});}}));assert.equal(calls,1);
});
