import {readFile,writeFile} from 'node:fs/promises';
import {readiness} from './pipeline.mjs';
const env={};
for(const line of (await readFile(new URL('./.env',import.meta.url),'utf8')).split(/\r?\n/)){
 const m=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].trim();
}
if(!readiness(env))throw Error('配置或免费额度保护未完成');
const content=[{type:'text',text:'分别描述这5张独立瑜伽画面，不预测前后动作，不根据课程模板补全。每张标记的秒数是本地抽帧时间，照抄。仅描述看得见的身体形态：手臂弯直、躯干方向、腿和骨盆是否能确认接地。左右解剖侧看不清就写unknown，不依据发型、镜头左右猜测。无法分清上犬与眼镜蛇时仅写俯卧支撑后弯。只输出 JSON {"frames":[{"time":0,"name":"朴素动作名称","arms":"straight|bent|unknown","body":"描述","anatomicalSide":"left|right|symmetric|unknown","uncertainties":[]}]}。不要解释呼吸或肌肉发力。'}];
for(const number of [1,4,8,13,16]){
 content.push({type:'text',text:`画面时间 ${(number-1)*0.5+0.25} 秒`});
 content.push({type:'image_url',image_url:{url:'data:image/png;base64,'+(await readFile(new URL(`./test-media/comparison-frames/frame-${String(number).padStart(2,'0')}.png`,import.meta.url))).toString('base64')}});
}
const start=Date.now();
try {
 const response=await fetch(`https://${env.BAILIAN_WORKSPACE_ID}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions`,{method:'POST',signal:AbortSignal.timeout(180000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.DASHSCOPE_API_KEY}`},body:JSON.stringify({model:'qwen3-vl-plus',enable_thinking:false,max_tokens:4096,messages:[{role:'user',content}]})});
 if(!response.ok)throw Error(`HTTP ${response.status}`);
 const data=await response.json();
 const text=data.choices?.[0]?.message?.content;
 const result=JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g,''));
 const output={ok:true,elapsedMs:Date.now()-start,usage:data.usage,result};
 await writeFile(new URL('./test-media/comparison-frames.json',import.meta.url),JSON.stringify(output,null,2));console.log(JSON.stringify(output));
}catch(e){console.log(JSON.stringify({ok:false,error:e.message.startsWith('HTTP')?e.message:'请求或解析失败'}));}
