import {writeFile,rename,unlink} from 'node:fs/promises';
export async function atomicWrite(path,text){
 const temporary=path+'.'+crypto.randomUUID()+'.tmp';
 try{
  await writeFile(temporary,text,'utf8');
  for(let attempt=0;;attempt++){
   try{await rename(temporary,path);return;}
   catch(error){if(!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=9)throw error;await new Promise(r=>setTimeout(r,50*(attempt+1)));}
  }
 }finally{await unlink(temporary).catch(()=>{});}
}
