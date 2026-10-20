import {readFile} from 'node:fs/promises';
const id=process.argv[2];if(!/^[a-f0-9-]{36}$/.test(id||''))throw Error('Invalid job id');
let previous='';
for(;;){
 let job;try{job=JSON.parse(await readFile(new URL(`./runtime/jobs/${id}/job.json`,import.meta.url),'utf8'));}catch{await new Promise(r=>setTimeout(r,2000));continue;}
 const summary=JSON.stringify({id,status:job.status,stage:job.stage,message:job.message,error:job.error,items:job.result?.items?.length,missing:job.result?.missingArtwork,usage:job.result?.usage});
 if(summary!==previous){console.log(summary);previous=summary;}
 if(job.status!=='processing')break;
 await new Promise(resolve=>setTimeout(resolve,20000));
}
