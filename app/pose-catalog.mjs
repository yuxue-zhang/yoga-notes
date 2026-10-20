import {readFile} from 'node:fs/promises';
export const poseCatalog=JSON.parse(await readFile(new URL('./pose-catalog.json',import.meta.url),'utf8'));
const normalize=text=>String(text||'').normalize('NFKD').replace(/[\u0300-\u036f\s·-]/g,'').toLocaleLowerCase();
export function findPoseCandidates(text){
 const value=normalize(text);if(!value)return [];
 return poseCatalog.entries.filter(p=>[p.name,p.english,p.sanskrit,...p.aliases].filter(Boolean).some(label=>normalize(label)===value));
}
export function identifyPose(name,posture){
 if(!posture||posture.base==='unknown')return null;
 const candidates=findPoseCandidates(name).filter(p=>p.posture.base===posture.base&&['arms','legs','spine'].every(k=>p.posture[k]==='other'||p.posture[k]==='unknown'||posture[k]===p.posture[k]));
 return candidates.length===1?candidates[0].id:null;
}
