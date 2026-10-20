import {resolveXiaohongshu,openXiaohongshuMedia} from './xiaohongshu.mjs';
// One URL supplied through hidden stdin; never put share tokens in source or logs.
if(process.stdin.isTTY)process.stdin.setRawMode(true);
process.stdout.write('READY_FOR_URL\n');
const raw=await new Promise(resolve=>{
 let text='';process.stdin.setEncoding('utf8');process.stdin.resume();
 const onData=chunk=>{text+=chunk;if(text.length>8192)process.exit(1);if(/[\r\n]/.test(text)){process.stdin.off('data',onData);process.stdin.pause();if(process.stdin.isTTY)process.stdin.setRawMode(false);resolve(text.split(/[\r\n]/)[0]);}};
 process.stdin.on('data',onData);
});
try{
 const track=await resolveXiaohongshu(raw);const response=await openXiaohongshuMedia(track.url,{probe:true});
 const reader=response.body.getReader();let bytes;
 try{bytes=(await reader.read()).value;}finally{await reader.cancel();}
 const header=bytes&&bytes.length>=8?Buffer.from(bytes).subarray(4,8).toString('ascii'):'';
 console.log(JSON.stringify({ok:header==='ftyp',title:track.title,status:response.status,bytesRead:bytes?.length||0,contentType:response.headers.get('content-type'),modelCalls:0}));
}catch(error){console.log(JSON.stringify({ok:false,error:error.message.startsWith('fetch')?'网络请求失败':error.message,modelCalls:0}));process.exitCode=1;}
