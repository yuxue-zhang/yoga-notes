const supported=new Set(['qwen3-vl-plus','qwen3.7-plus','qwen3.8-flash','qwen3.7-flash','qwen3.6-plus','qwen3.6-flash']);
export function modelProvider(env=process.env){return env.YOGA_PROVIDER||'bailian';}
export function visionModel(env=process.env){
 if(modelProvider(env)==='zhipu'){const model=env.YOGA_VISION_MODEL||'glm-4.6v-flash';return ['glm-4.6v-flash','glm-4.1v-thinking-flash'].includes(model)?model:null;}
 if(modelProvider(env)!=='bailian')return null;
 const model=env.YOGA_VISION_MODEL||'qwen3-vl-plus';return supported.has(model)?model:null;
}
export function freeProtectionConfirmed(env=process.env){
 if(modelProvider(env)==='zhipu')return Boolean(visionModel(env));
 const model=visionModel(env);if(!model||env.BAILIAN_FREE_QUOTA_CONFIRMED!=='true')return false;
 const confirmed=new Set((env.BAILIAN_FREE_QUOTA_CONFIRMED_MODELS||'').split(',').map(x=>x.trim()).filter(Boolean));
 // Existing confirmation applies only to the originally configured model.
 confirmed.add('qwen3-vl-plus');return confirmed.has(model);
}
