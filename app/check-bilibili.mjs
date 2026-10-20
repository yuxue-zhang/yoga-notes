import {resolveBilibili,openBilibiliMedia} from './bilibili.mjs';
try{
 const track=await resolveBilibili('https://www.bilibili.com/video/BV1Kq4y1H76Y/');
 const response=await openBilibiliMedia(track.url,{probe:true});
 const reader=response.body.getReader();const {value}=await reader.read();await reader.cancel();
 console.log(JSON.stringify({ok:true,title:track.title,duration:track.duration,width:track.width,height:track.height,mediaStatus:response.status,bytesRead:value?.length||0}));
}catch(e){console.log(JSON.stringify({ok:false,error:e.message.startsWith('fetch')?'网络请求失败':e.message}));process.exitCode=1;}
