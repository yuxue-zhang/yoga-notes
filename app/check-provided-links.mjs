import {resolveBilibili,openBilibiliMedia} from './bilibili.mjs';
import {writeFile} from 'node:fs/promises';
const results=[];
for(const bvid of ['BV1cZ4y1Z74s','BV1xV411y7c2','BV1hpF9eoE4X']){
 const item={bvid,pageReadable:false,playbackReadable:false,mediaReadable:false};
 try{
  const track=await resolveBilibili('https://www.bilibili.com/video/'+bvid+'/');
  Object.assign(item,{pageReadable:true,playbackReadable:true,title:track.title,duration:track.duration,width:track.width,height:track.height});
  const response=await openBilibiliMedia(track.url,{probe:true});
  const reader=response.body.getReader();const {value}=await reader.read();await reader.cancel();
  Object.assign(item,{mediaReadable:Boolean(value?.length),mediaStatus:response.status,bytesRead:value?.length||0});
 }catch(error){item.error=error.message.startsWith('fetch')?'网络请求失败':error.message;}
 results.push(item);console.log(JSON.stringify(item));
}
await writeFile(new URL('./test-media/provided-links.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),modelCalls:0,results},null,2));
