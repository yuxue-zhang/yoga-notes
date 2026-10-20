import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const plan=JSON.parse(await readFile(new URL('./atlas-plan.json',import.meta.url),'utf8'));
const fixes=['half-lotus','half-boat','supported-bridge','lizard','half-moon','revolved-half-moon','revolved-triangle','fire-log'];
const registry={version:1,characterId:'original-girl-v1',identity:'原版棕色丸子头小女孩、淡紫色背心、灰绿色长裤；使用原版00/03/12作人物参考。',generationTool:'built-in-image_gen',reviewNotice:'人物一致性经目视比对，动作细节为候选稿，尚未完成专业体式审核。',atlases:{},poses:{}};
let previous={atlases:{},poses:{}};try{previous=JSON.parse(await readFile(new URL('character-assets.json',root),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const groups=[plan.first,...plan.groups,fixes];
for(let i=0;i<groups.length;i++){
 const key=String(i+1).padStart(2,'0'),file=new URL(`dist/assets/original-girl-atlas-${key}.png`,root);
 let bytes;try{bytes=await readFile(file);}catch(error){if(error.code==='ENOENT'&&key==='08')continue;throw error;}
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),rows=groups[i].length/4;
 if(Math.abs(width/height-4/rows)>.01)throw Error('图集比例不符合登记格数：'+key);
 registry.atlases[key]={url:`/assets/original-girl-atlas-${key}.png`,width,height,columns:4,rows,sha256:createHash('sha256').update(bytes).digest('hex')};
 for(let cell=0;cell<groups[i].length;cell++){
  const id=groups[i][cell];registry.poses[id]={id:'original-girl-v1-'+id,characterId:registry.characterId,atlas:key,cell,...(key==='08'&&cell<4?{cropBottom:.1}:{}),styleReview:'accepted',poseReview:'draft',referenceAssetIds:['original-00','original-03','original-12']};
 }
}
for(const [id,asset] of Object.entries(registry.poses)){const old=previous.poses[id];if(old?.bounds&&old.atlas===asset.atlas&&old.cell===asset.cell&&previous.atlases[old.atlas]?.sha256===registry.atlases[asset.atlas].sha256){asset.bounds=old.bounds;delete asset.cropBottom;}}
if(!registry.atlases['08'])for(const id of fixes)delete registry.poses[id];
await writeFile(new URL('character-assets.json',root),JSON.stringify(registry,null,2)+'\n');
await writeFile(new URL('dist/character-atlases.js',root),'const YOGA_CHARACTER_ASSETS='+JSON.stringify(registry)+';\n');
console.log(JSON.stringify({atlases:Object.keys(registry.atlases).length,newPoses:Object.keys(registry.poses).length,correctionsReady:Boolean(registry.atlases['08'])}));

