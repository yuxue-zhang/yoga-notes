import {mkdir,readFile,writeFile,unlink,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicWrite} from './atomic-file.mjs';
import {NEXT_BASE_URL} from './next-provider.mjs';
const catalog=JSON.parse(await readFile(new URL('./pose-catalog.json',import.meta.url),'utf8'));
const poses=new Map(catalog.entries.map(p=>[p.id,p]));
const validId=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
export function imageBytes(data){
 if(typeof data!=='string'||data.length>9_000_000)throw Error('请选择6 MB以内的照片。');
 const m=data.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/);if(!m)throw Error('请选择 JPG 或 PNG 图片。');
 const bytes=Buffer.from(m[2],'base64');
 if(bytes.length>6*1024*1024||bytes.length<16)throw Error('照片大小不合适，请重新选择。');
 const png=bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(m[1]==='png'?!png:!jpg)throw Error('图片内容和格式不一致。');return {bytes,mime:png?'image/png':'image/jpeg'};
}
export async function editCharacter(images,prompt,env,{fetcher=fetch}={}){
 if(!env.NEXT_API_KEY)throw Error('请先连接提供的额度。');
 // Read the complete list; the settings preview intentionally caps its list at 200.
 const list=await fetcher(NEXT_BASE_URL+'/models',{headers:{Authorization:`Bearer ${env.NEXT_API_KEY}`},redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!list.ok){await list.body?.cancel();throw Error('无法读取绘图模型，请检查已连接的额度。');}
 const ids=(await list.json()).data?.map(m=>m.id)||[];
 const model=['gpt-image-1.5','gpt-image-1'].find(id=>ids.includes(id));
 if(!model)throw Error('当前额度接口未列出支持参考图编辑的绘图模型，尚未发送照片。');
 const form=new FormData();form.set('model',model);form.set('prompt',prompt);form.set('size','1024x1024');form.set('n','1');form.set('response_format','b64_json');
 for(const [i,img]of images.entries())form.append('image[]',new Blob([img.bytes],{type:img.mime}),`reference-${i}.${img.mime==='image/png'?'png':'jpg'}`);
 const res=await fetcher(NEXT_BASE_URL+'/images/edits',{method:'POST',headers:{Authorization:`Bearer ${env.NEXT_API_KEY}`},body:form,redirect:'error',signal:AbortSignal.timeout(240000)});
 if(!res.ok){await res.body?.cancel();throw Error(res.status===429?'绘图服务暂时繁忙，已保存进度，可点击继续。':`绘图接口未完成（HTTP ${res.status}），已保存进度；不会自动重复扣费。`);}
 const data=await res.json(),b64=data.data?.[0]?.b64_json;
 // No remote output URLs: never fetch arbitrary URLs returned by a gateway.
 if(!b64){const item=data.data?.[0];throw Error('绘图接口没有返回图片数据（'+(item?.url?'返回了图片链接':Object.keys(data).filter(k=>/^[a-z_]+$/.test(k)).join(','))+'），未保存为成功。');}
 const output=imageBytes('data:image/png;base64,'+b64);return output.bytes;
}
const identity='Use image 1 as the ONLY identity reference. Preserve the same face, hairstyle, hair color, skin tone, body proportions and outfit across every output. Balanced cute hand-drawn watercolor ADULT yoga sticker, approximately 4.5 heads tall; the head including hair occupies only 20-22 percent of total standing height. Compact rounded torso, moderately shortened softly rounded arms and legs, small simplified rounded hands and feet, gently simplified eyes, tiny nose and smile. Stylize the ENTIRE body equally, not just the face. Fine warm pencil outlines, flat soft watercolor fills and paper texture. No realistic muscles, skin rendering, tendons or long slender fashion-model limbs; no giant head, no baby proportions, barefoot, plain ivory background. One full body person, no text, no watermark, no panels. Keep limbs readable and anatomically plausible.';
const outfits={original:'muted lavender sleeveless yoga tank and sage green fitted yoga pants',blue:'mist blue fitted short-sleeve athletic T-shirt (not sleeveless, no logos) and charcoal gray full-length yoga leggings',wrap:'white soft short-sleeve cross-over wrap top, overlapping diagonal front panels forming a modest V-shaped crossover neckline, securely closed, no logos; muted medium purple loose lantern-style yoga harem trousers with generous rounded volume through hips and thighs and gathered ankle cuffs, NOT tight leggings'};
const clothing=p=>' Clothing: '+outfits[p.outfit||'original']+'.';
const avatarPrompt=p=>identity.replace(' and outfit','')+clothing(p)+' Keep the exact face, hair length and haircut of the input person. Do not change short hair into a bun or ponytail. '+(p.outfitOnly?'Redesign the ENTIRE illustrated character including torso, arms, hands, legs and feet, not only the face. Preserve the identifiable facial traits and exact short haircut, but correct the proportions to a balanced 4.5-head-tall figure: head plus hair only 20-22 percent of total height, smaller than an exaggerated chibi head. Moderately shorten and round the torso and limbs together; use simple soft shapes, small rounded hands and feet, flat watercolor fills, no realistic muscle or skin shading. Keep the adult identity, standing pose and ivory background. Apply the specified new clothing to this complete hand-drawn redesign.':'Transform the photograph into one full-body illustrated person standing upright, arms relaxed. Preserve recognizable personal features.');
export async function createCharacterStore({directory=new URL('./runtime/characters/',import.meta.url),env=process.env,edit=editCharacter}={}){
 directory=directory instanceof URL?(await import('node:url')).fileURLToPath(directory):directory;await mkdir(directory,{recursive:true});let busy=false;
 const folder=id=>{if(!validId(id))throw Error('没有找到这个专属小人。');return join(directory,id);};
 const get=async id=>JSON.parse(await readFile(join(folder(id),'profile.json'),'utf8'));
 const save=async p=>{const path=join(folder(p.id),'profile.json');await atomicWrite(path,JSON.stringify(p));};
 const run=(id,task)=>{busy=true;(async()=>{let p=await get(id);try{await task(p);p.status='ready';p.message='专属小人已保存';delete p.error;}catch(e){p.status='failed';p.error=e.message.startsWith('绘图')||e.message.startsWith('当前额度')||e.message.startsWith('无法读取')?e.message:'生成未完成，已保存成功的图片。可以继续重试。';p.message=p.error;}finally{await save(p);}})().catch(()=>{}).finally(()=>busy=false);};
 const api={
  async list(){const result=[];for(const id of await readdir(directory)){if(validId(id)){try{let p=await get(id);if(p.status==='generating'&&!busy){p.status='failed';p.message='上次生成中断，可以继续。';await save(p);}result.push(p);}catch{}}}return result.sort((a,b)=>b.createdAt-a.createdAt);},get,
  async create(photo,{outfit='original',outfitOnly=false,parentId=null}={}){if(busy)throw Error('正在生成专属小人，请稍等。');if(!env.NEXT_API_KEY)throw Error('请先连接提供的额度。');if(!outfits[outfit])throw Error('服装选项无效。');const img=imageBytes(photo),id=randomUUID();await mkdir(folder(id));await writeFile(join(folder(id),'photo'),img.bytes);const p={id,createdAt:Date.now(),status:'generating',message:'正在把照片变成专属小人…',photoMime:img.mime,outfit,outfitOnly,parentId,style:'balanced-handdrawn-v2',poses:{}};await save(p);run(id,async p=>{const bytes=await edit([img],avatarPrompt(p),env);await writeFile(join(folder(id),'avatar.png'),bytes);p.avatar=true;await unlink(join(folder(id),'photo'));delete p.photoMime;});return p;},
  async resume(id){if(busy)throw Error('正在生成，请稍等。');const p=await get(id);if(p.avatar)return p;const img={bytes:await readFile(join(folder(id),'photo')),mime:p.photoMime};delete p.error;p.status='generating';p.message='正在继续生成人物…';await save(p);run(id,async p=>{await writeFile(join(folder(id),'avatar.png'),await edit([img],avatarPrompt(p),env));p.avatar=true;await unlink(join(folder(id),'photo'));delete p.photoMime;});return p;},
  async generate(id,requests){if(busy)throw Error('正在生成，请稍等。');const p=await get(id);if(!p.avatar)throw Error('请先完成人物生成。');if(!Array.isArray(requests)||!requests.length||requests.length>128)throw Error('请选择课程或动作。');const seen=new Set();const work=requests.map(x=>{if(!poses.has(x.poseId)||seen.has(x.poseId))throw Error('动作不在动作库中或重复。');seen.add(x.poseId);return {pose:poses.get(x.poseId),reference:imageBytes(x.reference)};}).filter(x=>!p.poses[x.pose.id]);if(!work.length)return p;
   delete p.error;p.status='generating';p.message=`准备生成 ${work.length} 个动作…`;await save(p);run(id,async p=>{for(const [i,x]of work.entries()){p.message=`正在生成 ${x.pose.name}（${i+1}/${work.length}）`;await save(p);let bytes;try{bytes=await edit([x.reference],(identity+clothing(p)).replace('Use image 1 as the ONLY identity reference.','The input is a two-panel reference board: LEFT panel is the ONLY identity reference; RIGHT panel is ONLY the body pose reference.')+` Reproduce the RIGHT panel body arrangement, orientation and limb placement, while keeping the person from the LEFT panel. Pose: ${x.pose.english}. ${x.pose.description}. Never copy the RIGHT panel face, hair or identity. Output ONLY ONE full body person without panels.`,env);}catch(e){p.error=e.message;throw e;}await writeFile(join(folder(id),x.pose.id+'.png'),bytes);p.poses[x.pose.id]=true;await save(p);}});return p;},
  async outfit(id){const p=await get(id);if(!p.avatar)throw Error('请先完成人物生成。');const bytes=await readFile(join(folder(id),'avatar.png'));return api.create('data:image/png;base64,'+bytes.toString('base64'),{outfit:p.outfit==='wrap'?'original':'wrap',outfitOnly:true,parentId:id});},
  async asset(id,name){if(!/^(avatar|[a-z][a-z0-9-]{0,80})\.png$/.test(name))throw Error('图片不存在。');return readFile(join(folder(id),name));},
  async remove(id){if(busy)throw Error('请等待生成结束再删除。');const target=folder(id);const {rm}=await import('node:fs/promises');await rm(target,{recursive:true,force:true});}
 };
 let submitting=false;
 for(const name of ['create','resume','generate','remove']){const original=api[name];api[name]=async(...args)=>{if(submitting)throw Error('正在提交，请稍等。');submitting=true;try{return await original(...args);}finally{submitting=false;}};}
 return api;
}
