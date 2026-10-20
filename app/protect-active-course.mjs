import {readFile,copyFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {JobStore} from './job-store.mjs';
const id=process.argv[2];if(!/^[a-f0-9-]{36}$/.test(id||''))throw Error('Invalid job id');
const store=new JobStore(),directory=store.directory(id);
for(;;){
 const job=JSON.parse(await readFile(join(directory,'job.json'),'utf8'));
 if(job.status!=='processing'){console.log(JSON.stringify({cached:false,status:job.status}));break;}
 if(['preparing','analyzing','layout'].includes(job.stage)){
  const input=join(directory,'input.mp4');const size=(await stat(input)).size;
  const backup=await store.create(job.source);
  await store.update(backup.id,{status:'cached',stage:'cached',message:'本次课程临时恢复副本，24小时到期',parentJob:id});
  await copyFile(input,join(store.directory(backup.id),'input.mp4'));
  console.log(JSON.stringify({cached:true,id:backup.id,bytes:size}));break;
 }
 await new Promise(resolve=>setTimeout(resolve,1000));
}
