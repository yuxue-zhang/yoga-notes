import {mkdir,readFile,writeFile,readdir,unlink,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {partialFromCache} from './analysis-cache.mjs';
import {atomicWrite} from './atomic-file.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export class JobStore{
 constructor(root=fileURLToPath(new URL('./runtime/jobs/',import.meta.url))){this.root=root;this.jobs=new Map();this.saves=new Map();}
 async init(){
  await mkdir(this.root,{recursive:true});
  for(const id of await readdir(this.root)){
   if(!UUID.test(id))continue;
   try{
    const job=JSON.parse(await readFile(join(this.root,id,'job.json'),'utf8'));
    if(job.id!==id||!Number.isFinite(job.createdAt))continue;
    this.jobs.set(id,job);
    if(job.status==='processing'){await this.update(id,{status:'failed',stage:'failed',canResume:['preparing','analyzing','waiting','layout'].includes(job.stage),error:'上次处理被中断，可继续处理已读取的视频。',message:'上次处理已中断'});}
    if(['failed','cached'].includes(job.status)&&!job.partialResult&&job.expiresAt>Date.now()){
     const partialResult=await partialFromCache(this.directory(id),job.source);if(partialResult)await this.update(id,{partialResult});
    }
   }catch{}
  }
  await this.expire();
 }
 directory(id){if(!UUID.test(id))throw Error('无效任务');return join(this.root,id);}
 async create(source){
  const id=crypto.randomUUID();await mkdir(this.directory(id),{recursive:true});
  const job={id,status:'processing',stage:'uploading',progress:0,message:'正在接收视频…',source,createdAt:Date.now(),expiresAt:Date.now()+24*3600000};
  this.jobs.set(id,job);await this.save(id);return job;
 }
 async save(id){const text=JSON.stringify(this.jobs.get(id));const previous=this.saves.get(id)||Promise.resolve();const next=previous.catch(()=>{}).then(()=>atomicWrite(join(this.directory(id),'job.json'),text));this.saves.set(id,next);try{await next;}finally{if(this.saves.get(id)===next)this.saves.delete(id);}}
 async update(id,patch){Object.assign(this.jobs.get(id),patch);await this.save(id);}
 get(id){const job=this.jobs.get(id);return job&&job.expiresAt>Date.now()?job:null;}
 async cleanMedia(id){for(const name of await readdir(this.directory(id))){if(/^(input\.(mp4|webm)|segment-\d+\.mp4|frame-\d+-\d+\.jpg)$/.test(name))await unlink(join(this.directory(id),name)).catch(()=>{});}}
 async expire(){for(const [id,job]of this.jobs){if(job.expiresAt>Date.now()||job.status==='processing')continue;await this.cleanMedia(id);for(const name of await readdir(this.directory(id)))if(/^(analysis-\d+\.json(?:\.tmp)?|job\.tmp|job\.json)$/.test(name))await unlink(join(this.directory(id),name)).catch(()=>{});this.jobs.delete(id);}}
}
